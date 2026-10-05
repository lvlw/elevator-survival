import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { readCombatValue } from './validation'
import { drawIntInclusive } from '../random'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const roll=(value:'hit'|'miss')=>(c:Parameters<typeof drawIntInclusive>[0],min:number,max:number)=>({...drawIntInclusive(c,min,max),value:value==='hit'?min:max})
function resource(h:ReturnType<typeof entered>,slot:'weapon'|'armor',current:number){
  const id=h.value.carried.equipment[slot]!.instanceId
  return readCombatValue({...h.value,itemStates:{states:h.value.itemStates.states.map(s=>s.instanceId===id?
    {...s,resource:{...s.resource,current}}:s)}},h.deps)
}
describe('P05 P07 protection, escape lock and real resources',()=>{
  it('last integrity fully protects this hit, next hit no longer protects',()=>{
    const h=entered('orderly',{draw:roll('miss')})
    let v=h.action(resource(h,'armor',1),{kind:'metal-pipe-basic-attack'}).snapshot
    expect(v.battle!.decision!.trace[0]).toMatchObject({requested:2,actual:2})
    const armor=v.itemStates.states.find(s=>s.instanceId===v.carried.equipment.armor!.instanceId)!
    expect(armor.resource).toEqual({kind:'integrity',current:0})
    v=h.action(v,{kind:'metal-pipe-basic-attack'}).snapshot
    expect(v.battle!.decision!.trace.find(t=>t.kind==='direct-damage')).toMatchObject({requested:7,actual:7})
    expect(v.battle!.decision!.resources.some(r=>r.instanceId===armor.instanceId)).toBe(false)
  })
  it('defense uses armor first then ceiling half, only once and expires at decision',()=>{
    const h=entered('orderly',{draw:roll('miss')})
    let v=h.action(h.value,{kind:'defend'}).snapshot
    expect(v.battle!.currentCtb).toBe(80)
    expect(v.battle!.decision!.trace.find(t=>t.kind==='direct-damage')).toMatchObject({requested:1})
    expect(v.battle!.temporaryDefense).toBeNull()
    v=h.action(v,{kind:'metal-pipe-basic-attack'}).snapshot
    expect(v.battle!.decision!.trace.find(t=>t.kind==='direct-damage')).toMatchObject({requested:6})
  })
  it('escape locks 80 before new wound, completion bleeding occurs at 80 without extending',()=>{
    const h=entered('orderly',{draw:roll('hit')})
    const p=h.action(h.value,{kind:'escape'}), r=p.snapshot.battles[0]
    expect(r.elapsed).toBe(80);expect(r.decision.ctbAfter).toBe(80)
    expect(r.decision.trace.map(t=>t.kind)).toEqual(['direct-damage','injury','post-action-bleeding'])
    expect(r.decision.trace.at(-1)).toMatchObject({actual:1,ctb:80})
    expect(p.snapshot.character.body.condition.openWounds).toHaveLength(1)
    expect(p.snapshot.site!.nodeId).toBe(r.entry.from)
  })
  it('escape completion bleed death remains at enemy node and has no surviving fee',()=>{
    const h=entered('orderly',{hp:3,draw:roll('hit')})
    const p=h.action(h.value,{kind:'escape'})
    expect(p.snapshot.phase).toBe('dead');expect(p.snapshot.battles).toHaveLength(0)
    expect(p.snapshot.combatDeaths[0].decision.ctbAfter).toBe(80)
    expect(p.snapshot.archives[0].site.nodeId).toBe('H4')
    expect(p.snapshot.character.body.energy).toBe(h.value.character.body.energy)
  })
  it('positive final durability pays clipped cost for full signature, then only temporary attack remains',()=>{
    const h=entered('orderly',{draw:roll('miss')})
    const v=h.action(resource(h,'weapon',1),{kind:'metal-pipe-charged-strike'}).snapshot
    expect(v.battle!.decision!.enemyHealthAfter).toBe(8)
    expect(v.battle!.decision!.resources[0]).toMatchObject({before:1,requested:3,consumed:1,after:0})
    expect(v.character.body.quotasRemaining.pipe_signature).toBe(0)
    expect(()=>h.action(v,{kind:'metal-pipe-basic-attack'})).toThrow()
    expect(()=>h.action(v,{kind:'metal-pipe-charged-strike'})).toThrow()
    expect(h.action(v,{kind:'temporary-attack'}).snapshot.battle!.decision!.enemyHealthAfter).toBe(6)
  })
})
