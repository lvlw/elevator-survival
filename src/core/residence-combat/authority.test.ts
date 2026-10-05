import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createSupplyAuthority } from '../residence-supply/controlled'
import { cycleContext } from '../residence-supply/shared-validation'
import { createCombatAuthority,assertCombatPlanCurrent } from './controlled'
import { readCombatValue } from './validation'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P11 independent ability and complete freshness',()=>{
  it('new protocol is rejected by old authority and copied new ability is not valid',()=>{
    const h=entered(), v=h.value
    expect(()=>createSupplyAuthority(v,{cycle:cycleContext(v.character,h.deps.supply,v.site!.nodeId),missions:v.missions},h.deps.supply)).toThrow()
    const a=h.authorize(v), p=h.action(v,{kind:'metal-pipe-basic-attack'})
    expect(()=>assertCombatPlanCurrent(v,structuredClone(p),a)).toThrow()
    expect(()=>assertCombatPlanCurrent(v,p,{...a})).toThrow()
    expect(()=>assertCombatPlanCurrent(p.snapshot,p,h.authorize(p.snapshot))).toThrow()
    expect(()=>readCombatValue(v,{...h.deps})).toThrow()
  })
  it('independent execution/history and mismatched complete authority cannot self-prove',()=>{
    const h=entered(), other=entered('orderly',{seed:'other-seed'})
    expect(()=>createCombatAuthority(h.value,{cycle:cycleContext(other.value.character,h.deps.supply,other.value.site!.nodeId),
      missions:other.value.missions},h.deps)).toThrow()
    const p=h.action(h.value,{kind:'defend'})
    expect(()=>assertCombatPlanCurrent(p.snapshot,p,h.authorize(h.value))).toThrow()
  })
})
