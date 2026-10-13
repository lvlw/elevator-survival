// TEST ONLY. Observe native definitions, never stub gameplay to fabricate a result.
import { vi, expect } from 'vitest'
import * as initial from '../../core/residence-combat/initial'
import * as entry from '../../core/residence-combat/entry'
import * as stable from '../../core/residence-combat/stable'
import * as combat from '../../core/residence-combat/actions'
import * as death from '../../core/residence-combat/terminal'
import * as plans from '../../core/residence-combat/plans'
import * as authority from '../../core/residence-combat/authority'
import * as engine from '../../core/combat/combat-profiled-resolution'
import * as planner from '../../core/combat/combat-transition-plan'
import * as reducer from '../../core/combat/combat-effect-reducer'
import * as energy from '../../core/residence-energy'
import * as cycle from '../../core/character-cycle'
import * as location from '../../core/residence-location/movement'
import * as rest from '../../core/residence-location/controlled'
import * as mission from '../../core/mission-lifecycle/controlled'
import * as origins from '../../core/residence-supply/allocations'
import * as recipe from '../../core/residence-task/plans'
import * as medical from '../../core/residence-supply/shared-medical'
import * as maintenance from '../../core/residence-supply/shared-maintenance'
import * as settlement from '../../core/residence-terminal/supply-settlement-shared'
import * as codec from '../residence-save/combat-codec'
import * as aggregate from '../residence-save/combat-validation'
import type { Harness } from './combat-test-fixtures'
export function observe(h: Harness) {
  const spies = {
    initial:vi.spyOn(initial,'establishCombatInitial'),depart:vi.spyOn(initial,'planCombatDeparture'),
    move:vi.spyOn(entry,'planCombatMove'),rest:vi.spyOn(stable,'planCombatRest'),
    task:vi.spyOn(stable,'planCombatTask'),source:vi.spyOn(stable,'planCombatSource'),
    transfer:vi.spyOn(stable,'planCombatTransfer'),inventory:vi.spyOn(stable,'planCombatInventory'),
    medical:vi.spyOn(stable,'planCombatMedical'),maintenance:vi.spyOn(stable,'planCombatMaintenance'),
    terminal:vi.spyOn(stable,'planCombatTerminal'),combat:vi.spyOn(combat,'resolveResidenceCombatAction'),
    death:vi.spyOn(death,'consumeCombatDeath'),
    authority:vi.spyOn(authority,'createCombatAuthority'),issue:vi.spyOn(plans,'issueCombatPlan'),
    verify:vi.spyOn(plans,'assertCombatPlanCurrent'),ctb:vi.spyOn(engine,'resolveProfiledCombatAction'),
    ctbPlan:vi.spyOn(planner,'buildCombatTransitionPlan'),ctbReduce:vi.spyOn(reducer,'reduceCombatEffects'),
    g1Action:vi.spyOn(energy,'planResidenceAction'),g1Cycle:vi.spyOn(cycle,'planCharacterCycle'),
    g2Move:vi.spyOn(location,'planResidenceBoundMove'),g2Rest:vi.spyOn(rest,'planResidenceLocationRest'),
    activate:vi.spyOn(mission,'activateMission'),terminate:vi.spyOn(mission,'terminateMission'),
    origin:vi.spyOn(origins,'issueSupplyOrigin'),use:vi.spyOn(origins,'consumeSupplyUnits'),
    recipe:vi.spyOn(recipe,'consumeSupplyRecipe'),sharedMedical:vi.spyOn(medical,'planSharedMedical'),
    sharedMaintenance:vi.spyOn(maintenance,'planSharedMaintenance'),settle:vi.spyOn(settlement,'settleSupplyDomain'),
    sharedTerminal:vi.spyOn(settlement,'planSharedTerminal'),
    aggregate:vi.spyOn(aggregate,'validateCombatResidenceAggregate'),
    encode:vi.spyOn(codec,'serializeCombatResidenceSave'),decode:vi.spyOn(codec,'deserializeCombatResidenceSave'),
  }
  let last=h.owner.getState().current,replacements=0,batches=0
  const previous=h.hooks.write
  h.hooks.write=()=>{const value=h.owner.getState().current;if(value!==last){last=value;replacements++}previous()}
  const listener=vi.fn(()=>{batches++});h.owner.subscribe(listener)
  const counts=()=>({...Object.fromEntries(Object.entries(spies).map(([k,s])=>[k,s.mock.calls.length])),
    draw:h.draw.mock.calls.length,materials:h.factory.mock.calls.length,coldExpected:h.coldProvider.mock.calls.length,
    read:h.storage.read.mock.calls.length,write:h.storage.write.mock.calls.length,current:replacements,batches,
    listener1:h.listener.mock.calls.length,listener2:listener.mock.calls.length})
  function clear() {
    for(const spy of Object.values(spies))spy.mockClear()
    for(const spy of [h.draw,h.factory,h.coldProvider,h.storage.read,h.storage.write,h.listener,listener])spy.mockClear()
    last=h.owner.getState().current;replacements=0;batches=0
  }
  return {spies,counts,clear}
}
export function record(label:string,counts:Record<string,number>) {
  console.log('E02-S-COUNTS '+JSON.stringify({label,counts}))
}
export function expectSaveOnly(counts:Record<string,number>) {
  for(const [k,n] of Object.entries(counts))expect(n,k).toBe(k==='aggregate'?2:k==='encode'||k==='write'?1:0)
}
