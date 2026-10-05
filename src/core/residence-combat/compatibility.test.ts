import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import * as ordinary from './index'
import * as controlled from './controlled'
import { readSupplyValue } from '../residence-supply/validation'
const { fixture } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P11 new capability and old strict protocol isolation',()=>{
  it('ordinary exports cannot sign/install/consume or expose test fixtures',()=>{
    expect(Object.keys(ordinary).sort()).toEqual(['queryCombatTerminalEligibility','queryResidenceCombat','readCombatValue'])
    expect(Object.keys(controlled).sort()).toEqual(['assertCombatPlanCurrent','consumeCombatDeath','createCombatAuthority',
      'createResidenceCombatDependencies','establishCombatInitial','planCombatDeparture','planCombatInventory',
      'planCombatMaintenance','planCombatMedical','planCombatMove','planCombatRest','planCombatSource','planCombatTask',
      'planCombatTerminal','planCombatTransfer','planResidenceCombatAction','resolveResidenceCombatAction'].sort())
  })
  it('new pure value is never accepted by the old supply protocol',()=>{
    const h=fixture()
    expect(()=>readSupplyValue(h.value,h.deps.supply)).toThrow()
    expect(()=>ordinary.readCombatValue({...h.value,protocol:'residence-supply-pure-v1'},h.deps)).toThrow()
  })
})
