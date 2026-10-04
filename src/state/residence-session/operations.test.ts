import { afterEach, describe, expect, it, vi } from 'vitest'
import * as g2 from '../../core/residence-location'
import * as controlled from '../../core/residence-location/controlled'
import * as cycle from '../../core/character-cycle'
import * as random from '../../core/random'
import { calculateBackpackWeightSubtotal } from '../../core/inventory'
import { deserializeResidenceSave, serializeResidenceSave } from '../residence-save'
import { binding, catalogInput, command, currentActive, firstHarness, fixture, mutable, startFirst, type FirstHarness } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

function rejectUnchanged(h: FirstHarness, request: unknown, code: string) {
  const before = h.owner.getState(); const saved = h.storage.value()
  const writes = h.storage.port.write.mock.calls.length; const notifications = h.listener.mock.calls.length
  expect(() => h.owner.dispatch(request)).toThrowError(expect.objectContaining({ code }))
  expect(h.owner.getState()).toEqual(before); expect(h.owner.getState().current).toBe(before.current)
  expect(h.storage.value()).toBe(saved); expect(h.storage.port.write).toHaveBeenCalledTimes(writes); expect(h.listener).toHaveBeenCalledTimes(notifications)
}
const revealRequest = (h: FirstHarness, sourceId = 'fixed') => ({ kind: 'reveal' as const, ...binding(currentActive(h)), sourceId })
const pickupRequest = (h: FirstHarness, instanceId: string, x = 0, y = 0) =>
  ({ kind: 'pickup' as const, ...binding(currentActive(h)), instanceId, placement: { x, y, rotated: false } })
const restRequest = (h: FirstHarness) => ({ kind: 'rest' as const, ...binding(currentActive(h)) })

describe('G4 A03 real source operations', () => {
  it('fixed reveal commits only ground output and resources with zero draw and one save', () => {
    const h = firstHarness(); startFirst(h); const before = currentActive(h)
    const plan = vi.spyOn(g2, 'planResidenceSourceReveal'); const draw = vi.spyOn(random, 'drawIntInclusive')
    h.owner.dispatch(revealRequest(h)); const s = currentActive(h)
    expect(plan).toHaveBeenCalledTimes(1); expect(draw).not.toHaveBeenCalled()
    expect(s.carried).toEqual(before.carried); expect(s.site.nodeId).toBe('a'); expect(s.character.body.energy).toBe(92)
    expect(s.site.sources[0]).toEqual({ id: 'fixed', claimed: true, drawIndex: 0 })
    expect(s.site.ground[0].items.map((v) => v.definitionId)).toEqual(['pipe', 'lamp'])
    expect(s.itemStates.states.map((v) => v.resource)).toEqual([{ kind: 'durability', current: 2 }, { kind: 'charge', current: 1 }])
    expect(s.site.enemies).toEqual(before.site.enemies); expect(s.site.knowledge).toEqual(before.site.knowledge)
    expect(h.storage.port.write).toHaveBeenCalledTimes(3); expect(h.listener).toHaveBeenCalledTimes(3)
    expect(deserializeResidenceSave(h.storage.value()!, h.policy)).toEqual(s)
  })
  it('choice consumes one stable source draw; same-start copies match and fresh-revision repeat is rejected', () => {
    const a = firstHarness(); const b = firstHarness(); startFirst(a); startFirst(b)
    const draw = vi.spyOn(random, 'drawIntInclusive')
    a.owner.dispatch(revealRequest(a, 'lottery-a')); b.owner.dispatch(revealRequest(b, 'lottery-a'))
    expect(currentActive(a)).toEqual(currentActive(b)); expect(draw).toHaveBeenCalledTimes(2)
    expect(currentActive(a).site.sources[1]).toEqual({ id: 'lottery-a', claimed: true, drawIndex: 1 })
    rejectUnchanged(a, revealRequest(a, 'lottery-a'), 'NOT_AVAILABLE'); expect(draw).toHaveBeenCalledTimes(2)
  })
  it('full backpack does not gate reveal or auto-pickup', () => {
    const h = firstHarness({ mutateFresh: (s) => {
      s.carried.backpack.items.push({ instanceId: 'full', definitionId: 'bulky', quantity: 1 })
      s.carried.backpack.placements.push({ instanceId: 'full', x: 0, y: 0, rotated: false })
      s.itemStates.states.push({ instanceId: 'full', definitionId: 'bulky', resource: { kind: 'none' } })
    } }); startFirst(h); const carried = currentActive(h).carried
    h.owner.dispatch(revealRequest(h)); expect(currentActive(h).carried).toEqual(carried)
    expect(currentActive(h).site.ground[0].items).toHaveLength(2)
  })
  it('E1 last legal reveal reaches E0 and bleeds once; E0 fresh source rejects before draw', () => {
    const h = firstHarness({ mutateFresh: (s) => { s.character.body.energy = 1; s.character.body.condition.bleeding = true } })
    startFirst(h); const draw = vi.spyOn(random, 'drawIntInclusive'); h.owner.dispatch(revealRequest(h))
    expect(currentActive(h).character.body).toMatchObject({ energy: 0, condition: { currentHealth: 11, bleeding: true } })
    rejectUnchanged(h, revealRequest(h, 'lottery-a'), 'ACTION_NOT_AVAILABLE')
    rejectUnchanged(h, revealRequest(h), 'NOT_AVAILABLE'); expect(draw).not.toHaveBeenCalled()
  })
  it.each(['unknown', 'remote', 'hidden', 'blocked', 'stale', 'foreign-binding'])('rejects %s source without draw/save', (mode) => {
    const catalog = catalogInput()
    if (mode === 'hidden') catalog.nodes[0].surfaceSourceIds = ['fixed']
    if (mode === 'blocked') catalog.sources[1].requiredFactIds = ['installed']
    const h = firstHarness({ catalog }); startFirst(h)
    const request = mutable(revealRequest(h, mode === 'unknown' ? 'unknown' : mode === 'remote' ? 'lottery-b' : 'lottery-a'))
    if (mode === 'stale') request.expectedRevision--
    if (mode === 'foreign-binding') request.binding.execution.seed = 'wrong'
    const draw = vi.spyOn(random, 'drawIntInclusive')
    rejectUnchanged(h, request, mode === 'stale' ? 'STALE_COMMAND' : mode === 'foreign-binding' ? 'BINDING_MISMATCH' : 'NOT_AVAILABLE')
    expect(draw).not.toHaveBeenCalled()
  })
})

describe('G4 A04 real whole-instance pickup and leave', () => {
  it('an existing compatible stack never absorbs the explicitly placed new whole instance', () => {
    const catalog = catalogInput(); catalog.sources[0].contents = { kind: 'fixed', grants: [
      { definitionId: 'supply', quantity: 3, resource: { kind: 'none' } }] }
    const h = firstHarness({ catalog, mutateFresh: (s) => {
      s.carried.backpack.items.push({ instanceId: 'owned-stack', definitionId: 'supply', quantity: 1 })
      s.carried.backpack.placements.push({ instanceId: 'owned-stack', x: 0, y: 0, rotated: false })
      s.itemStates.states.push({ instanceId: 'owned-stack', definitionId: 'supply', resource: { kind: 'none' } })
    } }); startFirst(h); h.owner.dispatch(revealRequest(h)); const before = currentActive(h)
    const item = before.site.ground[0].items[0]
    h.owner.dispatch(pickupRequest(h, item.instanceId, 1, 0)); const after = currentActive(h)
    // Canonical constructors sort by instance ID, not insertion order.
    expect(after.carried.backpack.items).toHaveLength(2)
    expect(after.carried.backpack.items.find((v) => v.instanceId === 'owned-stack')).toEqual(before.carried.backpack.items[0])
    expect(after.carried.backpack.items.find((v) => v.instanceId === item.instanceId)).toEqual(item)
    expect(after.carried.backpack.placements).toHaveLength(2)
    expect(after.carried.backpack.placements.find((v) => v.instanceId === 'owned-stack')).toEqual(before.carried.backpack.placements[0])
    expect(after.carried.backpack.placements.find((v) => v.instanceId === item.instanceId))
      .toEqual({ instanceId: item.instanceId, x: 1, y: 0, rotated: false })
    expect(after.itemStates).toEqual(before.itemStates); expect(after.site.ground[0].items).toEqual([])
  })
  it.each(['pipe', 'lamp', 'supply'])('transfers the same %s instance, entire quantity and resource at E0 without bleeding', (definitionId) => {
    const catalog = catalogInput(); catalog.sources[0].contents = { kind: 'fixed', grants: [{ definitionId,
      quantity: definitionId === 'supply' ? 3 : 1, resource: definitionId === 'pipe' ? { kind: 'durability', current: 2 }
        : definitionId === 'lamp' ? { kind: 'charge', current: 1 } : { kind: 'none' } }] }
    const h = firstHarness({ catalog, mutateFresh: (s) => { s.character.body.energy = 1; s.character.body.condition.bleeding = true } })
    startFirst(h); h.owner.dispatch(revealRequest(h)); const before = currentActive(h)
    const item = before.site.ground[0].items[0]; const state = before.itemStates.states[0]
    const plan = vi.spyOn(g2, 'planResidenceItemTransfer')
    h.owner.dispatch(pickupRequest(h, item.instanceId)); const picked = currentActive(h)
    expect(picked.carried.backpack.items).toEqual([item]); expect(picked.itemStates.states).toEqual([state]); expect(picked.site.ground[0].items).toEqual([])
    expect(picked.character.body).toEqual(before.character.body); expect(picked.character.clock).toEqual(before.character.clock)
    expect(plan.mock.results[0].value.steps.map((s: { kind: string }) => s.kind)).toEqual(['primary'])
    h.owner.dispatch({ kind: 'drop', ...binding(currentActive(h)), instanceId: item.instanceId })
    expect(currentActive(h).carried.backpack.items).toEqual([]); expect(currentActive(h).site.ground[0].items).toEqual([item])
    expect(currentActive(h).itemStates.states).toEqual([state]); expect(currentActive(h).character.body).toEqual(before.character.body)
    expect(plan).toHaveBeenCalledTimes(2); expect(h.storage.port.write).toHaveBeenCalledTimes(5); expect(h.listener).toHaveBeenCalledTimes(5)
  })
  it.each(['overlap', 'bounds', 'carry', 'task', 'partial', 'implicit', 'remote', 'duplicate'])('rejects %s whole pickup without partial transfer', (mode) => {
    const catalog = catalogInput()
    if (mode === 'carry' || mode === 'task') catalog.sources[0].contents = { kind: 'fixed', grants: [
      { definitionId: mode === 'carry' ? 'heavy' : 'quest', quantity: 1, resource: { kind: 'none' } }] }
    const h = firstHarness({ catalog, mutateFresh: (s) => {
      if (mode !== 'overlap') return
      s.carried.backpack.items.push({ instanceId: 'occupied', definitionId: 'card', quantity: 1 })
      s.carried.backpack.placements.push({ instanceId: 'occupied', x: 0, y: 0, rotated: false })
      s.itemStates.states.push({ instanceId: 'occupied', definitionId: 'card', resource: { kind: 'none' } })
    } }); startFirst(h); h.owner.dispatch(revealRequest(h)); const item = currentActive(h).site.ground[0].items[0]
    if (mode === 'remote') h.owner.dispatch(command(currentActive(h)))
    if (mode === 'duplicate') h.owner.dispatch(pickupRequest(h, item.instanceId))
    const request = pickupRequest(h, item.instanceId, mode === 'bounds' ? 4 : 0)
    const plan = vi.spyOn(g2, 'planResidenceItemTransfer')
    rejectUnchanged(h, mode === 'partial' ? { ...request, quantity: 1 } : mode === 'implicit' ? { ...request, placement: undefined } : request,
      mode === 'overlap' ? 'OVERLAP' : mode === 'bounds' ? 'OUT_OF_BOUNDS' : mode === 'carry' ? 'CANNOT_CARRY'
        : mode === 'partial' || mode === 'implicit' ? 'INVALID_INPUT' : 'NOT_AVAILABLE')
    expect(plan).toHaveBeenCalledTimes(mode === 'partial' || mode === 'implicit' ? 0 : 1)
  })
  it.each(['task', 'equipment', 'quick-slot', 'ground'])('drop cannot take %s as ordinary backpack stock', (mode) => {
    const h = firstHarness({ mutateFresh: (s) => {
      const item = { instanceId: 'owned', definitionId: mode === 'task' ? 'quest' : mode === 'equipment' ? 'pipe' : 'supply', quantity: 1 }
      if (mode === 'ground') return
      if (mode === 'equipment') s.carried.equipment.weapon = item
      else if (mode === 'quick-slot') s.carried.quickSlots.slots[0] = item
      else { s.carried.backpack.items.push(item); s.carried.backpack.placements.push({ instanceId: item.instanceId, x: 0, y: 0, rotated: false }) }
      s.itemStates.states.push({ instanceId: item.instanceId, definitionId: item.definitionId,
        resource: mode === 'equipment' ? { kind: 'durability', current: 2 } : { kind: 'none' } })
    } }); startFirst(h)
    rejectUnchanged(h, { kind: 'drop', ...binding(currentActive(h)), instanceId: 'owned' }, 'NOT_AVAILABLE')
  })
})

describe('G4 A05/A06 real rest and unsupported consequences', () => {
  it('supplemental strict cold current preserves wounded enemy intent and nonzero risk cursor through actual session rest', () => {
    const f = fixture(); const raw = mutable(f.state)
    raw.site.facts[0].value = true
    Object.assign(raw.site.enemies[0].state, { currentHealth: 3, hasBeenEncountered: true, resolvedActionCount: 1,
      currentIntentActionId: 'bite', nextCycleIndex: 0 })
    raw.site.enemies[0].riskDrawIndex = 7
    const h = firstHarness({ initial: serializeResidenceSave(f.active(raw), f.policy) }); h.owner.bootstrap()
    const before = currentActive(h); h.owner.dispatch(restRequest(h))
    expect(currentActive(h).site).toEqual(before.site); expect(currentActive(h).site.enemies[0].riskDrawIndex).toBe(7)
    expect(currentActive(h).site.enemies[0].state.currentHealth).toBe(3)
    expect(h.factory).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled()
    expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it.each(['A', 'C'] as const)('real %s rest settles bleeding -> infection -> hunger before resets, retaining injuries and entire site', (rest) => {
    const catalog = catalogInput(); catalog.entryNodeId = rest === 'A' ? 'a' : 'b'
    const h = firstHarness({ catalog, mutateFresh: (s) => {
      Object.assign(s.character.body, { energy: 95, infectionProgress: 59, satiety: 2, suppression: 15,
        quotasRemaining: { suppressant: 0, disinfectant: 0, pipe_signature: 0 } })
      Object.assign(s.character.body.condition, { currentHealth: 11, bleeding: true, pendingInfectionExposures: 1,
        painkillerActive: true, minorContusions: 1, openWounds: [{ id: 'w', kind: 'bite', treatment: 'untreated' }] })
    } }); startFirst(h); const before = currentActive(h)
    const plan = vi.spyOn(controlled, 'planResidenceLocationRest'); const body = vi.spyOn(cycle, 'planCharacterCycle')
    h.owner.dispatch(restRequest(h)); const s = currentActive(h)
    expect(body.mock.results[0].value.steps.map((v: { kind: string }) => v.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(body.mock.results[0].value.steps.map((v: { healthAfter: number }) => v.healthAfter)).toEqual([9, 8, 7, 7])
    expect(s.character).toMatchObject({ revision: 2, cycle: 2, clock: { taskDay: 2, startCycle: 1 }, body: {
      energy: rest === 'A' ? 100 : 85, infectionProgress: 74, satiety: 0, suppression: 0,
      quotasRemaining: { suppressant: 1, disinfectant: 1, pipe_signature: 1 }, condition: { currentHealth: 7, bleeding: true,
        minorContusions: 1, painkillerActive: false, pendingInfectionExposures: 0, openWounds: before.character.body.condition.openWounds } } })
    expect(s.site).toEqual(before.site); expect(s.carried).toEqual(before.carried); expect(s.itemStates).toEqual(before.itemStates)
    expect(s.missions).toEqual(before.missions); expect(plan).toHaveBeenCalledTimes(1); expect(body).toHaveBeenCalledTimes(1)
    expect(h.storage.port.write).toHaveBeenCalledTimes(3); expect(h.listener).toHaveBeenCalledTimes(3)
  })
  it('six real rests reach T7; T7 cannot add Day8 and rest cannot be chosen at an ineligible node', () => {
    const h = firstHarness(); startFirst(h)
    for (let day = 2; day <= 7; day++) {
      h.owner.dispatch(restRequest(h)); expect(currentActive(h).character).toMatchObject({ cycle: day, clock: { taskDay: day, startCycle: 1 } })
    }
    rejectUnchanged(h, restRequest(h), 'INVALID_CONTEXT')
    const catalog = catalogInput(); catalog.nodes[0].rest = null
    const noRest = firstHarness({ catalog }); startFirst(noRest)
    rejectUnchanged(noRest, restRequest(noRest), 'NOT_AVAILABLE')
  })
  it.each(['reveal-fixed', 'reveal-random', 'move-death', 'rest-bleed', 'rest-infection', 'rest-hunger'])
  ('%s produces genuine death proposal but commits no partial world', (mode) => {
    const h = firstHarness({ mutateFresh: (s) => {
      s.character.body.condition.currentHealth = mode === 'rest-bleed' ? 2 : 1
      s.character.body.condition.bleeding = ['reveal-fixed', 'reveal-random', 'move-death', 'rest-bleed'].includes(mode)
      if (mode === 'rest-infection') s.character.body.infectionProgress = 60
      if (mode === 'rest-hunger') s.character.body.satiety = 1
    } }); startFirst(h)
    const plan = mode.startsWith('rest') ? vi.spyOn(controlled, 'planResidenceLocationRest')
      : mode === 'move-death' ? vi.spyOn(g2, 'planResidenceMove') : vi.spyOn(g2, 'planResidenceSourceReveal')
    const request = mode.startsWith('rest') ? restRequest(h) : mode === 'move-death' ? command(currentActive(h))
      : revealRequest(h, mode === 'reveal-random' ? 'lottery-a' : 'fixed')
    rejectUnchanged(h, request, 'UNSUPPORTED_RESULT')
    expect(plan).toHaveBeenCalledTimes(1); expect(plan.mock.results[0].value.coordination).toBe('death-required')
    expect(plan.mock.results[0].value.snapshot.character.body.condition.currentHealth).toBe(0)
    expect(currentActive(h).character.body.condition.currentHealth).toBe(mode === 'rest-bleed' ? 2 : 1)
  })
  it.each(['arrival-damage', 'arrival-exposure', 'combat'])('real-first chain rejects %s without partially installing movement', (mode) => {
    const catalog = catalogInput()
    if (mode === 'arrival-damage') catalog.edges[0].arrival.healthLoss = 1
    if (mode === 'arrival-exposure') catalog.edges[0].arrival.exposuresAdded = 1
    if (mode === 'combat') catalog.facts[0].initial = true
    const h = firstHarness({ catalog }); startFirst(h)
    if (mode === 'combat') h.owner.dispatch(command(currentActive(h)))
    const plan = vi.spyOn(g2, 'planResidenceMove')
    rejectUnchanged(h, command(currentActive(h), mode === 'combat' ? 'bc' : 'ab'), 'UNSUPPORTED_RESULT')
    expect(plan).toHaveBeenCalledTimes(mode === 'combat' ? 1 : 0)
  })
  it('transfer respects controlled carry bands, not a hardcoded hospital threshold', () => {
    const catalog = catalogInput(); catalog.sources[0].contents = { kind: 'fixed', grants: [
      { definitionId: 'supply', quantity: 5, resource: { kind: 'none' } }] }
    const h = firstHarness({ catalog }); startFirst(h); h.owner.dispatch(revealRequest(h))
    h.owner.dispatch(pickupRequest(h, currentActive(h).site.ground[0].items[0].instanceId))
    expect(calculateBackpackWeightSubtotal(currentActive(h).carried.backpack, h.catalog.physical)).toBe(10)
    expect(currentActive(h).carried.backpack.items[0].quantity).toBe(5)
  })
})
