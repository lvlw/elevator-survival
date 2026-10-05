import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { readCombatValue } from './validation'
import { verifyCombatBodyTrace } from './trace'
import { parseResidence } from '../residence-config/validation'
import { traceSchema } from './schema'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P11 strict raw aggregate and typed trace',()=>{
  it.each([true,-1,0.5,Number.MAX_SAFE_INTEGER+1,null])('rejects raw original HP %j before overwriting or clipping',(hp)=>{
    const h=entered()
    const v={...h.value,character:{...h.value.character,body:{...h.value.character.body,
      condition:{...h.value.character.body.condition,currentHealth:hp}}}}
    expect(()=>readCombatValue(v,h.deps)).toThrow()
    expect(()=>verifyCombatBodyTrace([],hp as number,1,12)).toThrow()
  })
  it.each([null,[],{}, {protocol:'unknown'}])('rejects malformed/unknown aggregate %j',(v)=>{
    expect(()=>readCombatValue(v,entered().deps)).toThrow()
  })
  it('rejects extra keys, decorated arrays, getters and class instances without evaluating getter',()=>{
    const h=entered()
    expect(()=>readCombatValue({...h.value,nextPhase:'living-hub'},h.deps)).toThrow()
    let count=0;const v={...h.value}
    Object.defineProperty(v,'battle',{enumerable:true,get(){count++;return h.value.battle}})
    expect(()=>readCombatValue(v,h.deps)).toThrow();expect(count).toBe(0)
    class Candidate {protocol='residence-combat-pure-v1'}
    expect(()=>readCombatValue(new Candidate(),h.deps)).toThrow()
  })
  it('rejects HP0 active and absent live combat instead of clearing enemy',()=>{
    const h=entered()
    expect(()=>readCombatValue({...h.value,battle:null},h.deps)).toThrow()
    expect(()=>readCombatValue({...h.value,character:{...h.value.character,body:{...h.value.character.body,
      condition:{...h.value.character.body.condition,currentHealth:0}}}},h.deps)).toThrow()
  })
  it('typed trace rejects wrong tag, extra fields, non-HP mutation and events after HP0',()=>{
    const t={kind:'direct-damage' as const,actionId:'orderly-basic',ctb:70,requested:20,actual:3,
      healthBefore:3,healthAfter:0,reference:null}
    expect(verifyCombatBodyTrace([t],3,0,12,true)).toEqual([t])
    expect(()=>verifyCombatBodyTrace([t,{...t,healthBefore:0}],3,0,12,true)).toThrow()
    expect(()=>verifyCombatBodyTrace([{...t,kind:'exposure'}],3,0,12,true)).toThrow()
    expect(()=>parseResidence(traceSchema,{...t,requested:true})).toThrow()
    expect(()=>parseResidence(traceSchema,{...t,kind:'unknown'})).toThrow()
    expect(()=>parseResidence(traceSchema,{...t,nextState:{}})).toThrow()
    expect(()=>verifyCombatBodyTrace(null,3,0,12,true)).toThrow()
  })
  it('mutable callers are neither frozen nor mutated by canonical validation',()=>{
    const h=entered(), raw=structuredClone(h.value), saved=structuredClone(raw)
    expect(readCombatValue(raw,h.deps)).toEqual(saved)
    expect(raw).toEqual(saved);expect(Object.isFrozen(raw)).toBe(false)
  })
})
