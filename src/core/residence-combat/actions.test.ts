import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const noRisk: Parameters<typeof entered>[1] = { draw: (c,min,max)=>({...drawIntInclusive(c,min,max),value:max}) }
describe('P04 P07 real three-enemy CTB',()=>{
  it.each(['orderly','porter','technician'] as const)('%s charged/basic sequence reaches real victory, no per-action E',(id)=>{
    const h=entered(id,noRisk); let v=h.value
    const energy=v.character.body.energy, rev=v.character.revision
    v=h.action(v,{kind:'metal-pipe-charged-strike'}).snapshot
    expect(v.character.body.energy).toBe(energy)
    expect(v.battle!.enemyNext).toBe(h.value.battle!.enemyNext+(id==='orderly'?200:140))
    expect(v.character.body.quotasRemaining.pipe_signature).toBe(h.value.character.body.quotasRemaining.pipe_signature-1)
    expect(()=>h.action(v,{kind:'metal-pipe-charged-strike'})).toThrow()
    let basics=0
    while(v.battle && basics<4) { v=h.action(v,{kind:'metal-pipe-basic-attack'}).snapshot; basics++ }
    expect(v.battle).toBeNull(); expect(v.battles.at(-1)?.outcome).toBe('victory')
    expect(v.site!.enemies.find(e=>e.id===id)?.state).toMatchObject({currentHealth:0,defeated:true})
    expect(v.site!.nodeId).toBe(h.value.site!.nodeId)
    expect(v.character.revision).toBe(rev+1+basics)
    expect(v.battles.at(-1)?.elapsed).toBe(id==='orderly'?280:380)
    expect(v.battles.at(-1)?.requestedEnergy).toBe(id==='orderly'?12:16)
    expect(readCombatValue(v,h.deps)).toEqual(v)
  })
  it('normal attack and same-point opportunity use original queue ordering',()=>{
    const h=entered('orderly',noRisk)
    const p=h.action(h.value,{kind:'metal-pipe-basic-attack'})
    expect(p.snapshot.battle!.decision!.enemyResponses).toBe(1)
    expect(p.snapshot.battle!.currentCtb).toBe(100)
    expect(p.snapshot.site!.enemies.find(e=>e.id==='orderly')!.state.currentHealth).toBe(10)
    expect(p.snapshot.character.body.condition.currentHealth).toBe(10)
  })
})
