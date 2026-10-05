import { afterEach, describe, expect, it, vi } from 'vitest'
import { forcedDraw } from '../../core/residence-task/test-fixtures'
import { planSupplyTaskAction } from '../../core/residence-task/actions'
import { createSupplyResidencePolicy } from '../residence-save/supply-policy'
import { cold, current, fixture, atNode, searchAt, pickAlias, readSupplyValue, request, reject, coldLatest, observe, resolvedDanger } from './supply-test-fixtures'
import type { SupplyValue } from '../../core/residence-supply/types'
afterEach(() => vi.restoreAllMocks())
const body = (v: SupplyValue, changes: Partial<SupplyValue['character']['body']>) =>
  ({ ...v, character: { ...v.character, body: { ...v.character.body, ...changes } } })
describe('S04 S05 native supply operations', () => {
  it.each(['cautious', 'direct'] as const)('sample %s dispatch uses the actual task producer and explicit whole-item placement', method => {
    const f = fixture(), v = atNode(f, resolvedDanger(f), 'H5'), h = cold(v, f.policy), e = observe(h)
    vi.clearAllMocks()
    const req = () => request(h, 'task', { actionId: 'sample', method, placement: { x: 0, y: 0, rotated: true } })
    const result = h.owner.dispatch(req())
    expect(result.current.carried.backpack.items).toHaveLength(1)
    expect(result.current.carried.backpack.items[0]).toMatchObject({ definitionId: 'quest_sealed_pathogen_case', quantity: 1 })
    expect(result.current.carried.backpack.placements[0]).toMatchObject({ x: 0, y: 0, rotated: true })
    expect(e.spies.task).toHaveBeenCalledTimes(1); expect(h.storage.write).toHaveBeenCalledTimes(1)
    reject(h, req(), 'NOT_AVAILABLE'); coldLatest(h)
  })
  it('survival first bandage is not refreshed by rest or cold restore; second real bandage heals only one', () => {
    const f = fixture({ hp: 8, specialty: 'survival' }), here = atNode(f, f.value, 'L1')
    const opened = planSupplyTaskAction(here, { kind: 'task', expectedRevision: here.character.revision,
      actionId: 'l1-open', method: 'manual' }, f.authorize(here)).snapshot
    const v = pickAlias(f, searchAt(f, opened, 'L1-cabinet'), 'bandage', 0), h = cold(v, f.policy)
    h.owner.dispatch(request(h, 'medical', { instanceId: v.carried.quickSlots.slots[0]!.instanceId }))
    expect(current(h).character.body.condition.currentHealth).toBe(10)
    h.owner.dispatch(request(h, 'rest'))
    const next = coldLatest(h), before = current(next).character.body.condition.currentHealth
    expect(current(next).choices.firstBandageUsed).toBe(true)
    next.owner.dispatch(request(next, 'medical', { instanceId: current(next).carried.backpack.items[0].instanceId }))
    expect(current(next).character.body.condition.currentHealth).toBe(before + 1)
    coldLatest(next)
  })
  it('spent disinfect quota survives free inventory changes and actual cold load, not inferred from stock', () => {
    const f = forcedDraw(fixture(), 1)
    let v = pickAlias(f, searchAt(f, f.value, 'H2-search'), 'disinfect', 0)
    v = readSupplyValue(body(v, { condition: { ...v.character.body.condition, pendingInfectionExposures: 2 } }), f.dependencies)
    const h = cold(v, createSupplyResidencePolicy(f.dependencies))
    h.owner.dispatch(request(h, 'medical', { instanceId: v.carried.backpack.items[0].instanceId }))
    h.owner.dispatch(request(h, 'inventory', { kind: 'to-backpack', slot: 0, placement: { x: 0, y: 0, rotated: false } }))
    expect(current(h).character.body.quotasRemaining.disinfectant).toBe(0)
    expect(current(h).character.body.condition.pendingInfectionExposures).toBe(1)
    expect(coldLatest(h).owner.getState().current!.character.body.quotasRemaining.disinfectant).toBe(0)
  })
  it.each([['bandage', 1], ['food', 1], ['disinfect', 1], ['painkiller', 36], ['firstaid', 66], ['suppressant', 86]] as const)
  ('E0 %s uses a real unit, target and unchanged P rules', (alias, roll) => {
    const f = forcedDraw(fixture({ hp: 8, specialty: 'survival' }), roll)
    let v = f.value
    if (alias !== 'bandage') {
      v = searchAt(f, v, alias === 'food' ? 'C4-food' : 'H2-search'); v = pickAlias(f, v, alias, 0)
    }
    v = readSupplyValue(body(v, { energy: 0, satiety: 3, condition: { ...v.character.body.condition,
      pendingInfectionExposures: 2, minorContusions: 1, bleeding: true,
      openWounds: [{ id: 'w1', kind: 'bite', treatment: 'untreated' }] } }), f.dependencies)
    const h = cold(v, createSupplyResidencePolicy(f.dependencies)), e = observe(h)
    const item = alias === 'bandage' ? v.carried.quickSlots.slots[0]! : v.carried.backpack.items[0]
    const extra = alias === 'bandage' ? { woundId: 'w1' } : alias === 'firstaid' ? { woundId: 'w1', target: 'wound' } : {}
    reject(h, request(h, 'medical', { instanceId: item.instanceId, quantity: 2, ...extra }), 'INVALID_INPUT')
    const result = h.owner.dispatch(request(h, 'medical', { instanceId: item.instanceId, ...extra }))
    expect(result.current.character.body.energy).toBe(0)
    expect(result.current.dispositions.at(-1)).toMatchObject({ kind: 'consumed', reason: 'medical', item: { instanceId: item.instanceId, quantity: 1 } })
    expect(e.spies.medical).toHaveBeenCalledTimes(1); expect(e.spies.action).toHaveBeenCalledTimes(1)
    expect(h.storage.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
    const b = current(h).character.body
    if (alias === 'bandage') { expect(b.condition.currentHealth).toBe(10); expect(b.condition.bleeding).toBe(false); expect(current(h).choices.firstBandageUsed).toBe(true) }
    if (alias === 'food') { expect(b.satiety).toBe(5); expect(b.condition.currentHealth).toBe(8) }
    if (alias === 'disinfect') expect(b.quotasRemaining.disinfectant).toBe(0)
    if (alias === 'suppressant') expect(b.suppression).toBe(15)
    if (alias === 'painkiller') expect(b.condition.painkillerActive).toBe(true)
    if (alias === 'firstaid') { expect(b.condition.currentHealth).toBe(12); expect(b.condition.openWounds).toEqual([]) }
    coldLatest(h)
    const healthy = body(v, { satiety: f.dependencies.residence.configuration.config.limits.satiety,
      infectionProgress: 0, condition: { ...v.character.body.condition, currentHealth: 12, minorContusions: 0,
        pendingInfectionExposures: 0, openWounds: [], bleeding: false } })
    const noTarget = cold(healthy, h.policy)
    reject(noTarget, request(noTarget, 'medical', { instanceId: item.instanceId }), 'NOT_AVAILABLE')
  })
  it.each(['mechanical', 'coat', 'toolbox', 'recharge'] as const)('%s returns actual resource results and rejects E0/reuse', kind => {
    const f = forcedDraw(fixture({ tool: kind === 'recharge' ? 'lamp' : kind === 'mechanical' ? 'crow' : 'toolbox' }), 41)
    let v = searchAt(f, f.value, kind === 'mechanical' || kind === 'coat' ? 'H1-search' : 'C4-cabinet')
    const aliases = kind === 'mechanical' ? ['metal'] : kind === 'coat' ? ['cloth'] : kind === 'toolbox' ? ['metal', 'electronic'] : ['battery']
    aliases.forEach((a, x) => { v = pickAlias(f, v, a, x) })
    const pipe = v.carried.equipment.weapon!, utility = v.carried.equipment.utility!, coat = v.carried.equipment.armor!
    const ids = kind === 'mechanical' ? [pipe.instanceId, utility.instanceId] : [kind === 'coat' ? coat.instanceId : utility.instanceId]
    v = readSupplyValue({ ...v, itemStates: { states: v.itemStates.states.map(s => ids.includes(s.instanceId) && s.resource.kind !== 'none' ?
      { ...s, resource: { ...s.resource, current: 0 } } : s) } }, f.dependencies)
    const h = cold(v, createSupplyResidencePolicy(f.dependencies))
    const fields = { kind, inputs: v.carried.backpack.items.map(i => ({ instanceId: i.instanceId, quantity: 1 })),
      ...(kind === 'mechanical' ? { allocations: [{ instanceId: ids[0], amount: 10 }, { instanceId: ids[1], amount: 5 }] } : { instanceId: ids[0] }) }
    const zero = cold(body(v, { energy: 0 }), h.policy)
    reject(zero, request(zero, 'maintenance', fields), 'NOT_AVAILABLE')
    if (kind === 'mechanical') reject(h, request(h, 'maintenance', { ...fields,
      allocations: [{ instanceId: ids[0], amount: 15 }, { instanceId: ids[1], amount: 15 }] }), 'INVALID_INPUT')
    const result = h.owner.dispatch(request(h, 'maintenance', fields))
    expect(result.maintenance?.resourceResult.map(r => r.restored)).toEqual(kind === 'mechanical' ? [10, 5] : [kind === 'coat' ? 6 : kind === 'toolbox' ? 3 : 4])
    expect(current(h).carried.backpack.items).toEqual([])
    expect(current(h).dispositions.filter(d => d.reason === 'recipe')).toHaveLength(aliases.length)
    expect(h.storage.write).toHaveBeenCalledTimes(1)
    expect(() => h.owner.dispatch(request(h, 'maintenance', fields))).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.storage.write).toHaveBeenCalledTimes(1); coldLatest(h)
  })
  it('real inventory partial split/merge, move, quick transfer and drop/pickup preserve units and state', () => {
    const f = fixture(), here = atNode(f, f.value, 'L1')
    const opened = planSupplyTaskAction(here, { kind: 'task', expectedRevision: here.character.revision,
      actionId: 'l1-open', method: 'manual' }, f.authorize(here)).snapshot
    const v = pickAlias(f, searchAt(f, opened, 'L1-cabinet'), 'food', 0)
    const h = cold(v, f.policy), original = current(h).carried.backpack.items[0]
    const state = current(h).itemStates.states.find(s => s.instanceId === original.instanceId)
    h.owner.dispatch(request(h, 'inventory', { kind: 'split', instanceId: original.instanceId, quantity: 1, placement: { x: 1, y: 0, rotated: false } }))
    const child = current(h).carried.backpack.items.find(i => i.instanceId !== original.instanceId)!
    h.owner.dispatch(request(h, 'inventory', { kind: 'merge', instanceId: child.instanceId, targetId: original.instanceId, quantity: 1 }))
    h.owner.dispatch(request(h, 'inventory', { kind: 'move', instanceId: original.instanceId, placement: { x: 2, y: 0, rotated: true } }))
    const bandage = current(h).site!.ground.find(g => g.nodeId === 'L1')!.items.find(i => i.definitionId === 'consumable_bandage')!
    h.owner.dispatch(request(h, 'inventory', { kind: 'pickup', instanceId: bandage.instanceId, placement: { x: 0, y: 0, rotated: false } }))
    h.owner.dispatch(request(h, 'inventory', { kind: 'to-quick', instanceId: bandage.instanceId, slot: 1 }))
    const quick = current(h).carried.quickSlots.slots[1]!
    h.owner.dispatch(request(h, 'inventory', { kind: 'to-backpack', slot: 1, placement: { x: 3, y: 0, rotated: false } }))
    h.owner.dispatch(request(h, 'inventory', { kind: 'drop', instanceId: quick.instanceId }))
    h.owner.dispatch(request(h, 'inventory', { kind: 'pickup', instanceId: quick.instanceId, placement: { x: 3, y: 0, rotated: false } }))
    expect(current(h).itemStates.states.find(s => s.instanceId === original.instanceId)).toEqual(state)
    expect(current(h).carried.backpack.items.reduce((n, i) => n + i.quantity, 0)).toBe(original.quantity + bandage.quantity)
    expect(current(h).character.body).toEqual(v.character.body)
    expect(h.storage.write).toHaveBeenCalledTimes(8); coldLatest(h)
  })
})
