import { afterEach, describe, expect, it, vi } from 'vitest'
import { context, mutable, quietDraw } from './combat-test-fixtures'
import { validateCombatResidenceAggregate } from './combat-validation'
import { serializeCombatResidenceSave, deserializeCombatResidenceSave } from './combat-codec'
import { restoreCombatResidenceCandidate } from './combat-expected'
import * as energy from '../../core/residence-energy'
import * as cycles from '../../core/character-cycle'
import * as body from '../../core/character-cycle/cycle'
import * as movement from '../../core/residence-location/movement'
import * as location from '../../core/residence-location/controlled'
import * as core from '../../core/residence-combat/controlled'
import * as deathConsumer from '../../core/residence-combat/terminal'
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
    vi.spyOn(core, 'planResidenceCombatAction'), vi.spyOn(core, 'resolveResidenceCombatAction'), vi.spyOn(deathConsumer, 'consumeCombatDeath'),
    vi.spyOn(origins, 'issueSupplyOrigin'), vi.spyOn(origins, 'consumeSupplyUnits'), vi.spyOn(recipe, 'consumeSupplyRecipe'),
    vi.spyOn(medical, 'planSharedMedical'), vi.spyOn(maintenance, 'planSharedMaintenance'),
    vi.spyOn(engine, 'resolveProfiledCombatAction'), vi.spyOn(planner, 'buildCombatTransitionPlan'), vi.spyOn(reducer, 'reduceCombatEffects'),
    vi.spyOn(lifecycle, 'activateMission'), vi.spyOn(lifecycle, 'terminateMission'), vi.spyOn(terminal, 'settleSupplyDomain'),
    vi.spyOn(random, 'drawIntInclusive'), vi.spyOn(Storage.prototype, 'getItem'), vi.spyOn(Storage.prototype, 'setItem'),
    vi.spyOn(EventTarget.prototype, 'dispatchEvent')]
}
import { simultaneous, livingEnemyDeath, callApi, apiNames } from './combat-review-simultaneous-fixtures'

describe('R-F01 pure restore branch counts', () => {
  it.each(apiNames.flatMap(api => ['killed','living'].map(kind => ({api,kind}))))('$api $kind legal and pending-rejected branches have independent zero counts', ({api,kind}) => {
    const draw=vi.fn(quietDraw), pair=kind==='killed'?simultaneous('first-basic',draw):livingEnemyDeath('direct',draw)
    const {h,end}=pair,{e,policy}=context(h,end),bad=mutable(end)
    bad.archives[0].site.pending=kind==='killed'?{kind:'combat-required',enemyId:'orderly'}:{kind:'none'}
    for(const rejected of [false,true]) {
      const input=rejected?bad:mutable(end),saved=structuredClone({input,e,end}),spies=counters()
      draw.mockClear()
      const run=()=>callApi(api,input,e,policy,end)
      if(rejected)expect(run).toThrowError(expect.objectContaining({code:'INVALID_STATE'}))
      else expect(run()).toBeDefined()
      expect(spies.map(s=>s.mock.calls.length)).toEqual(Array(36).fill(0));expect(draw).not.toHaveBeenCalled()
      expect({input,e,end}).toEqual(saved);expect(Object.isFrozen(input)).toBe(false);expect(Object.isFrozen(e)).toBe(false)
      vi.restoreAllMocks()
    }
  })
  it('actual final killing action and death consumer run once outside codec measurements', () => {
    const {h,end,beforeLast}=simultaneous(),spies=[vi.spyOn(engine,'resolveProfiledCombatAction'),
      vi.spyOn(planner,'buildCombatTransitionPlan'),vi.spyOn(reducer,'reduceCombatEffects'),
      vi.spyOn(deathConsumer,'consumeCombatDeath'),vi.spyOn(lifecycle,'terminateMission'),vi.spyOn(terminal,'settleSupplyDomain'),
      vi.spyOn(energy,'planResidenceAction'),vi.spyOn(cycles,'planCharacterCycle'),vi.spyOn(random,'drawIntInclusive')]
    const actual=h.action(beforeLast,{kind:'metal-pipe-basic-attack'}).snapshot
    expect(actual).toEqual(end)
    expect(spies.map(s=>s.mock.calls.length)).toEqual([1,1,1,1,1,1,0,0,0])
    vi.restoreAllMocks()
    const {e,policy}=context(h,actual),codecSpies=counters()
    deserializeCombatResidenceSave(serializeCombatResidenceSave(actual,e,policy),e,policy)
    expect(codecSpies.map(s=>s.mock.calls.length)).toEqual(Array(36).fill(0))
  })
})
