import { createStreamId } from '../random'
import { createItemInstance, createBackpackSnapshot, deriveStableSplitInstanceId } from '../inventory'
import { createFullItemState } from '../item-state'
import { sourceItemId } from '../residence-location/identity'
import type { ItemInstance } from '../inventory'
import type { LocationBinding } from '../residence-location'
import { originId, partitionRanges } from './provenance'
import { ensure } from './validation'
import type { SupplyDependencies, SupplyOrigin, SupplyDisposition } from './types'
import type { SupplyDomain } from './shared-types'

export function carriedSupplyItem(v: SupplyDomain, id: string) {
  const item = [...v.carried.backpack.items, ...v.carried.quickSlots.slots.filter(i => i !== null)].find(i => i.instanceId === id)
  ensure(item, 'No material/consumable in backpack or quick slot', 'NOT_AVAILABLE')
  return item
}
export function replaceCarriedQuantity<V extends SupplyDomain>(v: V, id: string, quantity: number, deps: SupplyDependencies): V {
  const bp = v.carried.backpack
  const backpack = createBackpackSnapshot({ ...bp, items: bp.items.flatMap(i => i.instanceId === id ? quantity ? [{ ...i, quantity }] : [] : [i]),
    placements: bp.placements.filter(p => quantity || p.instanceId !== id) }, deps.catalog.physical)
  return { ...v, carried: { ...v.carried, backpack, quickSlots: { slots: v.carried.quickSlots.slots.map(i =>
    i?.instanceId === id ? quantity ? { ...i, quantity } : null : i) } },
    itemStates: { states: v.itemStates.states.filter(s => quantity || s.instanceId !== id) } }
}
export function consumeSupplyUnits<V extends SupplyDomain>(v: V, id: string, quantity: number, deps: SupplyDependencies,
  kind: SupplyDisposition['kind'] = 'consumed', reason: SupplyDisposition['reason'] = 'recipe'): V {
  ensure(Number.isSafeInteger(quantity) && quantity > 0, 'Invalid consumed quantity')
  const item = carriedSupplyItem(v, id)
  ensure(quantity <= item.quantity, 'Insufficient actual units', 'NOT_AVAILABLE')
  const allocation = v.allocations.find(a => a.instanceId === id)!
  const ranges = partitionRanges(allocation.ranges, quantity)
  const state = v.itemStates.states.find(s => s.instanceId === id)!
  const next = replaceCarriedQuantity(v, id, item.quantity - quantity, deps)
  ensure(v.site, 'Consumption requires actual execution')
  const disposition: SupplyDisposition = { binding: v.site.binding, id: createStreamId('supply-disposition-v1', id, String(v.character.revision),
    String(v.dispositions.length), kind), kind, reason, cycle: v.character.cycle, revision: v.character.revision, item: { ...item, quantity }, state, ranges: ranges.taken }
  return { ...next, allocations: next.allocations.flatMap(a => a.instanceId === id ?
    ranges.kept.length ? [{ ...a, ranges: ranges.kept }] : [] : [a]), dispositions: [...next.dispositions, disposition] }
}
export function issueSupplyOrigin<V extends SupplyDomain>(v: V, binding: LocationBinding, placeId: string, nodeId: string,
  producerId: string, ordinal: number, definitionId: string, quantity: number, kind: SupplyOrigin['kind'], drawIndex: number,
  deps: SupplyDependencies): { value: V; items: readonly ItemInstance[] } {
  const bare = { binding, placeId, nodeId, producerId, ordinal, definitionId, quantity, kind, drawIndex,
    initialSpecialty: kind === 'initial' ? v.choices.specialty : null }
  const origin: SupplyOrigin = { ...bare, id: originId(bare) }
  ensure(!v.origins.some(o => o.id === origin.id || (o.kind === kind && o.producerId === producerId &&
    o.ordinal === ordinal && o.binding.execution.runId === binding.execution.runId)), 'Source already issued', 'NOT_AVAILABLE')
  const root = sourceItemId(binding, placeId, nodeId, producerId, ordinal)
  const physical = deps.catalog.physical.get(definitionId)
  const max = physical.stacking.kind === 'none' ? 1 : physical.stacking.maxQuantity
  const items: ItemInstance[] = [], allocations = [...v.allocations], lineage = [...v.lineage], states = [...v.itemStates.states], transfers = [...v.unitTransfers]
  lineage.push({ instanceId: root, originId: origin.id, parentId: null, revision: v.character.revision, quantityBefore: quantity, quantity })
  let remaining = quantity, offset = 0
  while (remaining > 0) {
    const amount = Math.min(max, remaining)
    const first = offset === 0
    const id = first ? root : deriveStableSplitInstanceId({ scope: 'supply-v1:' + v.character.revision,
      sourceInstanceId: root, sourceQuantityBeforeSplit: quantity, quantity: amount })
    // Issued grants never need multiple equal-sized children with the approved bounded quantities.
    ensure(!allocations.some(a => a.instanceId === id), 'Duplicate issued child')
    if (!first) {
      lineage.push({ instanceId: id, originId: null, parentId: root, revision: v.character.revision, quantityBefore: quantity, quantity: amount })
      transfers.push({ from: root, to: id, revision: v.character.revision, kind: 'split', ranges: [{ originId: origin.id, start: offset, end: offset + amount }] })
    }
    const item = createItemInstance({ instanceId: id, definitionId, quantity: amount }, deps.catalog.physical)
    items.push(item); allocations.push({ instanceId: id, ranges: [{ originId: origin.id, start: offset, end: offset + amount }] })
    states.push(createFullItemState(item, deps.catalog.resources))
    offset += amount; remaining -= amount
  }
  return { items, value: { ...v, origins: [...v.origins, origin], allocations, lineage, unitTransfers: transfers, itemStates: { states } } }
}
