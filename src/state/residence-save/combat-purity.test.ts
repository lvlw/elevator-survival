import { afterEach, describe, expect, it, vi } from 'vitest'
import { context, entered, fixture, mutable, quietDraw, wire } from './combat-test-fixtures'
import { validateCombatResidenceAggregate } from './combat-validation'
import { serializeCombatResidenceSave, deserializeCombatResidenceSave } from './combat-codec'
import { restoreCombatResidenceCandidate } from './combat-expected'
import * as energy from '../../core/residence-energy'
import * as cycles from '../../core/character-cycle'
import * as body from '../../core/character-cycle/cycle'
import * as movement from '../../core/residence-location/movement'
import * as location from '../../core/residence-location/controlled'
import * as core from '../../core/residence-combat/controlled'
import * as origins from '../../core/residence-supply/allocations'
import * as recipe from '../../core/residence-task/plans'
import * as medical from '../../core/residence-supply/shared-medical'
import * as maintenance from '../../core/residence-supply/shared-maintenance'
import * as engine from '../../core/combat/combat-profiled-resolution'
import * as planner from '../../core/combat/combat-transition-plan'
import * as reducer from '../../core/combat/combat-effect-reducer'
import * as lifecycle from '../../core/mission-lifecycle/controlled'
import * as terminal from '../../core/residence-terminal/supply-settlement-shared'
import * as random from '../../core/random'

afterEach(() => vi.restoreAllMocks())
function counters() {
  return [vi.spyOn(energy, 'planResidenceAction'), vi.spyOn(cycles, 'planCharacterCycle'), vi.spyOn(body, 'planActionBodyConsequences'),
    vi.spyOn(movement, 'planResidenceMove'), vi.spyOn(movement, 'planResidenceBoundMove'), vi.spyOn(location, 'planResidenceLocationRest'),
    vi.spyOn(core, 'establishCombatInitial'), vi.spyOn(core, 'createCombatAuthority'), vi.spyOn(core, 'planCombatDeparture'),
    vi.spyOn(core, 'planCombatMove'), vi.spyOn(core, 'planCombatInventory'), vi.spyOn(core, 'planCombatTask'),
    vi.spyOn(core, 'planCombatSource'), vi.spyOn(core, 'planCombatTransfer'), vi.spyOn(core, 'planCombatMedical'),
    vi.spyOn(core, 'planCombatMaintenance'), vi.spyOn(core, 'planCombatRest'), vi.spyOn(core, 'planCombatTerminal'),
    vi.spyOn(core, 'planResidenceCombatAction'), vi.spyOn(core, 'resolveResidenceCombatAction'), vi.spyOn(core, 'consumeCombatDeath'),
    vi.spyOn(origins, 'issueSupplyOrigin'), vi.spyOn(origins, 'consumeSupplyUnits'), vi.spyOn(recipe, 'consumeSupplyRecipe'),
    vi.spyOn(medical, 'planSharedMedical'), vi.spyOn(maintenance, 'planSharedMaintenance'),
    vi.spyOn(engine, 'resolveProfiledCombatAction'), vi.spyOn(planner, 'buildCombatTransitionPlan'), vi.spyOn(reducer, 'reduceCombatEffects'),
    vi.spyOn(lifecycle, 'activateMission'), vi.spyOn(lifecycle, 'terminateMission'), vi.spyOn(terminal, 'settleSupplyDomain'),
    vi.spyOn(random, 'drawIntInclusive'), vi.spyOn(Storage.prototype, 'getItem'), vi.spyOn(Storage.prototype, 'setItem'),
    vi.spyOn(EventTarget.prototype, 'dispatchEvent')]
}
describe('R11 independently measured no gameplay replay', () => {
  it.each(['aggregate', 'encode', 'decode', 'same-progress'] as const)('%s legal and rejected branch each has all-zero counters', api => {
    const draw = vi.fn(quietDraw), h = entered('orderly', { draw })
    const v = h.action(h.value, { kind: 'metal-pipe-basic-attack' }).snapshot, { e, policy } = context(h, v)
    const bad = mutable(v); bad.battle!.decision!.trace[0].requested = 999
    for (const rejected of [false, true]) {
      const input = rejected ? bad : v, before = structuredClone({ input, e, committed: v }), spies = counters()
      draw.mockClear()
      const run = () => api === 'aggregate' ? validateCombatResidenceAggregate(input, e, policy) : api === 'encode'
        ? serializeCombatResidenceSave(input, e, policy) : api === 'decode' ? deserializeCombatResidenceSave(wire(input), e, policy)
          : restoreCombatResidenceCandidate(input, v, e, policy)
      if (rejected) expect(run).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
      else expect(run()).toBeDefined()
      expect(spies.map(s => s.mock.calls.length)).toEqual(Array(spies.length).fill(0)); expect(draw).not.toHaveBeenCalled()
      expect({ input, e, committed: v }).toEqual(before); vi.restoreAllMocks()
    }
  })
  it('codec and real continuation are counted separately: decoder issues no authority', () => {
    const h = fixture(), { e, policy } = context(h, h.value), spies = counters()
    const decoded = deserializeCombatResidenceSave(wire(h.value), e, policy)
    expect(spies.map(s => s.mock.calls.length)).toEqual(Array(spies.length).fill(0)); vi.restoreAllMocks()
    const move = vi.spyOn(movement, 'planResidenceBoundMove'), action = vi.spyOn(energy, 'planResidenceAction')
    h.move(decoded.value, 'H1')
    expect([move.mock.calls.length, action.mock.calls.length]).toEqual([1, 1])
  })
})
