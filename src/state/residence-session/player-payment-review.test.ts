import { afterEach, describe, expect, it, vi } from 'vitest'
import { bodyBoundary } from './combat-test-fixtures'
import { createCombatTestFactory } from '../../core/residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { readCombatValue } from '../../core/residence-combat/validation'
import { drawIntInclusive } from '../../core/random'
import { addItemToBackpack } from '../../core/inventory'
import * as itemState from '../../core/item-state'
import * as context from './player-context'
import { queryPlayerActionMetadata } from '../../core/residence-supply/player-metadata'
import { fromValue, allActions, ready, normalize, choose, counts } from './player-test-fixtures'
import { observe, expectSaveOnly } from './combat-test-observers'
import { createPreplayController } from '../../app/infected-preplay/controller'
import type { PlayerCoreCommand } from '../../core/residence-combat/player-query-types'
import type { PlayerRequest } from './player-types'

const factory = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const miss = (c: Parameters<typeof drawIntInclusive>[0], min: number, max: number) => ({ ...drawIntInclusive(c, min, max), value: max })
function atSample(boundary: 'normal' | 0 | 1 | 'unequipped' = 'normal') {
  const h = factory.entered('orderly', { draw: miss }); let v = h.move(factory.win(h, h.value), 'H5').snapshot
  const armor = v.carried.equipment.armor!
  if (typeof boundary === 'number') v = readCombatValue({ ...v, itemStates: { states: v.itemStates.states.map(s => s.instanceId === armor.instanceId
    ? { ...s, resource: { kind: 'integrity', current: boundary } } : s) } }, h.deps)
  if (boundary === 'unequipped') v = readCombatValue({ ...v, carried: { ...v.carried, equipment: { ...v.carried.equipment, armor: null },
    backpack: addItemToBackpack(v.carried.backpack, armor, { instanceId: armor.instanceId, x: 4, y: 0, rotated: false }, h.deps.supply.catalog.physical) } }, h.deps)
  return { h, v, armor }
}
function sampleRequest(h: ReturnType<typeof fromValue>, method: 'cautious' | 'direct'): PlayerRequest {
  const choices = allActions(ready(h.player)).filter(a => a.family === 'task' && a.method === method)
  expect(choices).toHaveLength(1)
  return { action: choices[0].selector, placement: { x: 0, y: 0, rotated: false } }
}
afterEach(() => vi.restoreAllMocks())

describe('R-M01 actual facade/controller sample payment boundary', () => {
  for (const method of ['cautious', 'direct'] as const) it.each(['normal', 1, 0, 'unequipped'] as const)(`${method} %s has zero-effect previews then exactly one native payment/commit`, boundary => {
    const f = atSample(boundary), h = fromValue(f.v, f.h.deps), app = createPreplayController(h), request = sampleRequest(h, method)
    const raw = h.owner.getState().current!, disk = h.disk(), o = observe(h), consume = vi.spyOn(itemState, 'consumeCommittedResource'), contexts = vi.spyOn(context, 'createPlayerContext')
    const core: PlayerCoreCommand = { kind: 'task', command: { kind: 'task', actionId: 'sample', expectedRevision: raw.character.revision, method, placement: request.placement! } }
    const before = raw.itemStates.states.find(i => i.instanceId === f.armor.instanceId)!.resource
    if (before.kind !== 'integrity') throw new Error('TEST needs integrity')
    const pays = boundary !== 0 && boundary !== 'unequipped'
    const windows = [() => queryPlayerActionMetadata(raw, core, h.deps), () => h.preplay.inspect(request), () => app.preview(request), () => { app.beginDraft(request); app.cancel() }]
    for (const window of windows) {
      o.clear(); h.dispatch.mockClear(); consume.mockClear(); contexts.mockClear(); window()
      expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0))
      expect(h.dispatch).not.toHaveBeenCalled(); expect(consume).not.toHaveBeenCalled(); expect(contexts).not.toHaveBeenCalled()
      expect(h.owner.getState().current).toBe(raw); expect(h.disk()).toBe(disk)
    }
    const metadata = app.preview(request)
    expect(metadata.qualification.kind).toBe('available')
    expect(metadata.facts!.resources).toEqual(pays ? [{ name: '厚实外套', kind: 'integrity', before: before.current, requested: 1, consumed: 1, after: before.current - 1 }] : [])
    o.clear(); h.dispatch.mockClear(); consume.mockClear()
    expect(app.execute(request).kind).toBe('committed')
    const current = h.owner.getState().current!, actual = current.itemStates.states.find(i => i.instanceId === f.armor.instanceId)!.resource
    expect(actual.kind === 'integrity' && actual.current).toBe(before.current - (pays ? 1 : 0))
    expect(current.character.revision).toBe(raw.character.revision + 1)
    expect(current.carried.backpack.items.filter(i => i.definitionId === 'quest_sealed_pathogen_case')).toHaveLength(1)
    expect(current.origins.filter(i => i.producerId === 'sample')).toHaveLength(1)
    expect(allActions(ready(h.player)).filter(a => a.family === 'task' && ['cautious', 'direct'].includes(a.method ?? ''))).toEqual([])
    const n: Record<string, number> = o.counts()
    expect(h.dispatch).toHaveBeenCalledTimes(1); expect(consume).toHaveBeenCalledTimes(pays ? 1 : 0)
    expect(n.task).toBe(1); expect(n.g1Action).toBe(1); expect(n.g1Cycle).toBe(0); expect(n.ctb).toBe(0)
    expect(n.origin).toBe(1); expect(n.current).toBe(1); expect(n.write).toBe(1); expect(n.batches).toBe(1)
    expect(n.draw).toBe(method === 'cautious' && pays ? 0 : 1)
    o.clear(); h.dispatch.mockClear(); consume.mockClear()
    expect(app.execute(request).kind).toBe('rejected')
    expect(h.dispatch).not.toHaveBeenCalled(); expect(consume).not.toHaveBeenCalled()
    expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0)); expect(h.owner.getState().current).toBe(current)
  })

  it.each(['cautious', 'direct'] as const)('%s failed save retains one payment/sample and retry is save-only', method => {
    const f = atSample(), h = fromValue(f.v, f.h.deps), app = createPreplayController(h)
    h.draw.mockImplementation((c, min, max) => ({ ...drawIntInclusive(c, min, max), value: min }))
    const request = sampleRequest(h, method), o = observe(h), consume = vi.spyOn(itemState, 'consumeCommittedResource')
    h.faults.write = true; o.clear(); h.dispatch.mockClear(); consume.mockClear()
    expect(app.execute(request).kind).toBe('committed')
    expect(ready(h.player).persistence.feedback).toBe('save-failed')
    const committed = h.owner.getState().current!, feed = app.getSnapshot().feed, n: Record<string, number> = o.counts()
    expect(consume).toHaveBeenCalledTimes(1); expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(n.task).toBe(1); expect(n.origin).toBe(1); expect(n.current).toBe(1); expect(n.write).toBe(1); expect(n.batches).toBe(1)
    expect(n.draw).toBe(method === 'direct' ? 1 : 0)
    h.faults.write = false; o.clear(); consume.mockClear(); h.dispatch.mockClear(); app.retrySave()
    expectSaveOnly(o.counts()); expect(consume).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(committed); expect(app.getSnapshot().feed).toBe(feed)
    expect(ready(h.player).persistence.feedback).toBe('saved')
  })

  it.each(['overlap', 'out-of-bounds'] as const)('%s rejects the whole sample before dispatch/payment', placementKind => {
    const f = atSample(); let v = f.v
    if (placementKind === 'overlap') v = f.h.inventory(v, 'to-backpack', { slot: 0, placement: { x: 0, y: 0, rotated: false } }).snapshot
    const h = fromValue(v, f.h.deps), app = createPreplayController(h), base = sampleRequest(h, 'direct')
    const request = { ...base, placement: placementKind === 'overlap' ? base.placement : { x: v.carried.backpack.width - 1, y: v.carried.backpack.height - 1, rotated: false } }
    const o = observe(h), consume = vi.spyOn(itemState, 'consumeCommittedResource'), raw = h.owner.getState().current
    o.clear(); h.dispatch.mockClear()
    expect(app.preview(request).qualification.kind).toBe('unavailable'); expect(app.execute(request).kind).toBe('rejected')
    expect(h.dispatch).not.toHaveBeenCalled(); expect(consume).not.toHaveBeenCalled()
    expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0)); expect(h.owner.getState().current).toBe(raw)
  })

  it('stale and cross-session sample selections cannot bind to a still legal task', () => {
    const f = atSample(), a = fromValue(f.v, f.h.deps), b = fromValue(f.v, f.h.deps), app = createPreplayController(a), other = createPreplayController(b)
    const request = sampleRequest(a, 'direct'), draft = app.beginDraft(request), beforeB = counts(b)
    expect(other.preview(request).qualification.kind).toBe('invalid-selection'); expect(other.execute(request).kind).toBe('rejected'); expect(counts(b)).toEqual(beforeB)
    const quick = ready(a.player).carried.find(i => i.container === 'quick')!
    expect(a.player.execute({ action: choose(a.player, 'inventory', '放入背包'), item: quick.selector, placement: { x: 4, y: 0, rotated: false } }).kind).toBe('committed')
    app.synchronize(); const o = observe(a); o.clear(); a.dispatch.mockClear()
    expect(app.executeDraft(draft).kind).toBe('rejected'); expect(app.execute(request).kind).toBe('rejected')
    expect(a.dispatch).not.toHaveBeenCalled(); expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0))
  })

  it.each(['cautious', 'direct'] as const)('%s full safe metadata/view is independent of hidden progress/pending and future draw', method => {
    const f = atSample(), pair = [0, 1].map(n => {
      const v = bodyBoundary(f.v, f.h.deps, { infectionProgress: n ? 89 : 61, condition: { ...f.v.character.body.condition, pendingInfectionExposures: n ? 2 : 0 } })
      const h = fromValue(v, f.h.deps), app = createPreplayController(h), request = sampleRequest(h, method)
      h.draw.mockImplementation((c, min, max) => ({ ...drawIntInclusive(c, min, max), value: n ? max : min }))
      return { h, app, request, raw: h.owner.getState().current! }
    })
    expect(normalize(pair[0].app.getSnapshot())).toEqual(normalize(pair[1].app.getSnapshot()))
    const metadata = pair.map(x => x.app.preview(x.request))
    expect(metadata[0]).toEqual(metadata[1]); expect(JSON.stringify(metadata)).not.toMatch(/instanceId|originId|runId|seed|roll|riskPercent|effectiveRiskPercent|pendingInfectionExposures/)
    const exposureAdded = pair.map(({ h, app, request, raw }) => { expect(app.execute(request).kind).toBe('committed'); return h.owner.getState().current!.character.body.condition.pendingInfectionExposures - raw.character.body.condition.pendingInfectionExposures })
    expect(exposureAdded).toEqual(method === 'direct' ? [1, 0] : [0, 0])
  })
})
