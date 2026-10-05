import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatRest,planCombatTransfer } from './controlled'
import { drawIntInclusive } from '../random'
const { entered,fixture } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P03 P12 real retreat/rest/reentry',()=>{
  it('real card route enters from H3 and retreat returns H3, not the usual H1',()=>{
    const h=fixture({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    let v=h.move(h.value,'H1').snapshot
    v=h.move(v,'H3').snapshot
    v=h.source(v,'H3-search',{method:'dark'}).snapshot
    const card=v.site!.ground.find(g=>g.nodeId==='H3')!.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='card')!.id)!
    v=planCombatTransfer(v,{kind:'task-pickup',expectedRevision:v.character.revision,instanceId:card.instanceId,
      placement:{x:0,y:0,rotated:false}},h.authorize(v)).snapshot
    v=h.move(v,'H4').snapshot
    expect(v.battle!.entry.from).toBe('H3')
    v=h.action(v,{kind:'escape'}).snapshot
    expect(v.site!.nodeId).toBe('H3')
    expect(v.carried.backpack.items).toContainEqual(card)
    expect(v.dispositions.some(d=>d.item.instanceId===card.instanceId)).toBe(false)
  })
  it.each(['orderly','porter','technician'] as const)('%s keeps persistent enemy, resets only encounter CTB',(id)=>{
    const h=entered(id,{draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    const hit=h.action(h.value,{kind:'metal-pipe-basic-attack'}).snapshot
    const escape=h.action(hit,{kind:'escape'}).snapshot
    expect(escape.battle).toBeNull()
    expect(escape.site!.nodeId).toBe(h.value.battle!.entry.from)
    const enemy=escape.site!.enemies.find(e=>e.id===id)!
    let rest=planCombatRest(escape,{kind:'rest',expectedRevision:escape.character.revision},h.authorize(escape)).snapshot
    expect(rest.site!.enemies.find(e=>e.id===id)).toEqual(enemy)
    expect(rest.character.body.quotasRemaining.pipe_signature).toBe(h.deps.supply.residence.configuration.config.quota.pipe_signature)
    rest=h.move(rest,h.value.battle!.entry.to).snapshot
    expect(rest.battle!.entry.previouslyEncountered).toBe(true)
    expect(rest.battle!.currentCtb).toBe(0); expect(rest.battle!.enemyNext).toBe(50)
    expect(rest.site!.enemies.find(e=>e.id===id)).toEqual(enemy)
    expect(rest.battle!.entry.id).not.toBe(h.value.battle!.entry.id)
  })
})
