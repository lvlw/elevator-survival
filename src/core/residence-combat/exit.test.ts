import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { exitEnergyCost } from './history'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
const { fixture,entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P08 exit costs and receipt',()=>{
  it.each([[0,6],[99,6],[100,6],[101,8],[201,12]])('isolated formal arithmetic %i → %i',(ctb,cost)=>{
    expect(exitEnergyCost(ctb,fixture().deps)).toBe(cost)
  })
  it('real escape closes only once, returns actual from, rejects old/duplicate receipt',()=>{
    const h=entered('orderly',{draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    const p=h.action(h.value,{kind:'escape'})
    expect(p.snapshot.battles).toHaveLength(1)
    expect(p.snapshot.site!.nodeId).toBe('H1')
    expect(p.snapshot.character.body.energy).toBe(Math.max(0,h.value.character.body.energy-p.snapshot.battles[0].requestedEnergy))
    expect(()=>h.action(p.snapshot,{kind:'escape'})).toThrow()
    expect(()=>readCombatValue({...p.snapshot,battles:[...p.snapshot.battles,...p.snapshot.battles]},h.deps)).toThrow()
  })
})
