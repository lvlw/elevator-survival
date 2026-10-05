import { createStreamId } from '../random'
import { deriveStableSplitInstanceId } from '../inventory'
import { sourceItemId } from '../residence-location/identity'
import type { SupplyOrigin, UnitRange } from './types'
import type { SupplyDomain } from './shared-types'
import { SupplyError } from './types'

export function originId(origin: Omit<SupplyOrigin, 'id'>): string {
  const item = sourceItemId(origin.binding, origin.placeId, origin.nodeId, origin.producerId, origin.ordinal)
  return createStreamId('supply-origin-v1', origin.kind, item, origin.definitionId, String(origin.quantity), origin.initialSpecialty ?? 'not-initial')
}
export function originalInstanceId(origin: SupplyOrigin): string {
  return sourceItemId(origin.binding, origin.placeId, origin.nodeId, origin.producerId, origin.ordinal)
}
export function rangeCount(ranges: readonly UnitRange[]): number {
  let total = 0n
  for (const r of ranges) total += BigInt(r.end) - BigInt(r.start)
  if (total < 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) throw new SupplyError('INVALID_PROVENANCE', 'Invalid allocation total')
  return Number(total)
}
export function partitionRanges(ranges: readonly UnitRange[], amount: number) {
  const taken: UnitRange[] = [], kept: UnitRange[] = []; let left = amount
  for (const r of ranges) {
    const count = Math.min(left, r.end - r.start)
    if (count > 0) taken.push({ ...r, end: r.start + count })
    if (count < r.end - r.start) kept.push({ ...r, start: r.start + count })
    left -= count
  }
  if (left !== 0) throw new SupplyError('INVALID_PROVENANCE', 'Not enough allocated units')
  return { taken, kept }
}
export function verifyOriginConservation(value: SupplyDomain, live: readonly { instanceId: string; definitionId: string; quantity: number }[]) {
  const fail = (text: string): never => { throw new SupplyError('INVALID_PROVENANCE', text) }
  const origins = new Map(value.origins.map(o => [o.id, o]))
  if (origins.size !== value.origins.length || new Set(value.allocations.map(a => a.instanceId)).size !== value.allocations.length ||
    value.allocations.length !== live.length) fail('Duplicate/missing origins or allocations')
  const used = new Map<string, UnitRange[]>()
  const lineage = new Map(value.lineage.map(l => [l.instanceId, l]))
  if (lineage.size !== value.lineage.length) fail('Duplicate instance birth')
  const checked = new Set<string>(), pending = new Set<string>()
  const checkBirth = (id: string): void => {
    if (checked.has(id)) return
    if (pending.has(id)) fail('Cyclic split ancestry')
    const l = lineage.get(id)
    if (!l || l.revision > value.character.revision) return fail('Missing or future instance birth')
    pending.add(id)
    if (l.originId !== null) {
      const o = origins.get(l.originId)
      if (!o || l.parentId !== null || id !== originalInstanceId(o) || l.quantity !== o.quantity ||
        l.quantityBefore !== o.quantity) fail('Invalid original instance')
    } else {
      if (!l.parentId || l.quantity >= l.quantityBefore) return fail('Invalid split birth')
      checkBirth(l.parentId)
      if (id !== deriveStableSplitInstanceId({ scope: 'supply-v1:' + l.revision, sourceInstanceId: l.parentId,
        sourceQuantityBeforeSplit: l.quantityBefore, quantity: l.quantity })) fail('Invalid derived child identity')
    }
    pending.delete(id); checked.add(id)
  }
  value.lineage.forEach(l => checkBirth(l.instanceId))
  // Replay interval ownership, not just global totals: equal-definition units may
  // change instance only through an explicit split/merge at a bound revision.
  type Segment = { start: number; end: number; owner: string | null }
  const ownership = new Map<string, Segment[]>()
  const change = (r: UnitRange, from: string, to: string | null) => {
    const rows = ownership.get(r.originId)
    if (!rows || r.start < 0 || r.end <= r.start) return fail('Unborn source transfer')
    let covered = 0
    const changed: Segment[] = []
    for (const s of rows) {
      const start = Math.max(s.start, r.start), end = Math.min(s.end, r.end)
      if (start >= end) { changed.push(s); continue }
      if (s.owner !== from) fail('Source unit belongs to another instance or is already disposed')
      covered += end - start
      if (s.start < start) changed.push({ ...s, end: start })
      changed.push({ start, end, owner: to })
      if (end < s.end) changed.push({ ...s, start: end })
    }
    if (covered !== r.end - r.start) fail('Incomplete transfer range')
    ownership.set(r.originId, changed)
  }
  const revisions = new Set([...value.lineage.map(l => l.revision), ...value.unitTransfers.map(t => t.revision),
    ...value.dispositions.map(d => d.revision)])
  let lastTransfer = -1
  for (const t of value.unitTransfers) {
    if (t.revision < lastTransfer || t.revision > value.character.revision || t.from === t.to) fail('Transfer order/binding')
    lastTransfer = t.revision
  }
  const splitTargets = new Set<string>()
  for (const rev of [...revisions].sort((a, b) => a - b)) {
    for (const l of value.lineage.filter(l => l.revision === rev && l.originId !== null)) {
      const o = origins.get(l.originId!)!
      ownership.set(o.id, [{ start: 0, end: o.quantity, owner: l.instanceId }])
    }
    for (const t of value.unitTransfers.filter(t => t.revision === rev)) {
      const from = lineage.get(t.from), to = lineage.get(t.to)
      if (!from || !to || from.revision > rev || to.revision > rev) return fail('Transfer before instance birth')
      if (t.kind === 'split') {
        if (to.parentId !== t.from || to.revision !== rev || splitTargets.has(t.to) || rangeCount(t.ranges) !== to.quantity)
          fail('Split transfer differs from bound birth')
        splitTargets.add(t.to)
      }
      t.ranges.forEach(r => change(r, t.from, t.to))
    }
    for (const d of value.dispositions.filter(d => d.revision === rev)) d.ranges.forEach(r => change(r, d.item.instanceId, null))
  }
  if (value.lineage.some(l => l.parentId !== null && !splitTargets.has(l.instanceId))) fail('Split has no source transfer')
  for (const a of value.allocations) for (const r of a.ranges) {
    const rows = ownership.get(r.originId) ?? []
    const covered = rows.reduce((n, s) => n + (s.owner === a.instanceId ? Math.max(0, Math.min(s.end, r.end) - Math.max(s.start, r.start)) : 0), 0)
    if (covered !== r.end - r.start) fail('Live allocation substituted units from another origin')
  }
  const record = (ranges: readonly UnitRange[], definitionId: string, quantity: number) => {
    if (rangeCount(ranges) !== quantity) fail('Item quantity differs from its own source units')
    for (const r of ranges) {
      const o = origins.get(r.originId)
      if (!o || o.definitionId !== definitionId || r.start < 0 || r.end <= r.start || r.end > o.quantity) fail('Wrong origin/range')
      used.set(r.originId, [...(used.get(r.originId) ?? []), r])
    }
  }
  for (const item of live) {
    checkBirth(item.instanceId)
    const a = value.allocations.find(a => a.instanceId === item.instanceId)
    if (!a) return fail('Live instance has no allocation')
    record(a.ranges, item.definitionId, item.quantity)
    const taskOrigins = a.ranges.map(r => origins.get(r.originId)!).filter(o => o.kind === 'task')
    if (taskOrigins.length && (taskOrigins.length !== 1 || a.ranges.length !== 1 || item.quantity !== 1 ||
      item.instanceId !== originalInstanceId(taskOrigins[0]) || a.ranges[0].start !== 0 || a.ranges[0].end !== 1)) fail('Task instance was substituted or split')
  }
  for (const d of value.dispositions) { checkBirth(d.item.instanceId); record(d.ranges, d.item.definitionId, d.item.quantity) }
  for (const o of value.origins) {
    if (o.id !== originId(o)) fail('Origin anchor mismatch')
    const rows = [...(used.get(o.id) ?? [])].sort((a, b) => a.start - b.start)
    let end = 0
    for (const r of rows) { if (r.start !== end) fail('Origin units overlap or are missing'); end = r.end }
    if (end !== o.quantity) fail('Origin output missing without a real disposition')
  }
}
