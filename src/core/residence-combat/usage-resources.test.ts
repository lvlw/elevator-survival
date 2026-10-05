import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatRest } from './controlled'
import { drawIntInclusive } from '../random'
const { entered,fixture } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const miss=(c:Parameters<typeof drawIntInclusive>[0],min:number,max:number)=>({...drawIntInclusive(c,min,max),value:max})
describe('P07 one G1 quota and P06 shared first-bandage flag',()=>{
  it.each(['orderly','porter','technician'] as const)('%s signature quota is not restored by exit/reentry/read; real rest refreshes it',id=>{
    const h=entered(id,{draw:miss})
    let v=h.action(h.value,{kind:'metal-pipe-charged-strike'}).snapshot
    v=h.action(v,{kind:'escape'}).snapshot
    expect(v.character.body.quotasRemaining.pipe_signature).toBe(0)
    const re=h.move(v,h.value.battle!.entry.to).snapshot
    expect(re.character.body.quotasRemaining.pipe_signature).toBe(0)
    expect(()=>h.action(re,{kind:'metal-pipe-charged-strike'})).toThrow()
    const escape=h.action(re,{kind:'escape'}).snapshot
    v=planCombatRest(escape,{kind:'rest',expectedRevision:escape.character.revision},h.authorize(escape)).snapshot
    expect(v.character.body.quotasRemaining.pipe_signature).toBe(1)
  })
  it('first survival bandage total2 remains used across combat/retreat/stable medicine/rest',()=>{
    const h=entered('orderly',{hp:8,specialty:'survival',draw:miss})
    let v=h.action(h.value,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:h.value.carried.quickSlots.slots[0]!.instanceId}).snapshot
    expect(v.battle!.decision!.trace[0].requested).toBe(2)
    v=h.action(v,{kind:'escape'}).snapshot
    v=h.move(v,'H2').snapshot;v=h.source(v,'H2-search',{method:'dark'}).snapshot
    const bandage=v.site!.ground.find(g=>g.nodeId==='H2')!.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='bandage')!.id)!
    v=h.inventory(v,'pickup',{instanceId:bandage.instanceId,placement:{x:0,y:0,rotated:false}}).snapshot
    const hp=v.character.body.condition.currentHealth
    v=h.medical(v,bandage.instanceId).snapshot
    expect(v.character.body.condition.currentHealth-hp).toBe(1)
    v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    expect(v.choices.firstBandageUsed).toBe(true)
    expect(v.carried.quickSlots.slots[0]).toBeNull()
    expect(v.dispositions.filter(d=>d.reason==='medical')).toHaveLength(2)
  })
  it('real surviving exit at E0 clips fee without another body action or blood checkpoint',()=>{
    const h=entered('orderly',{energy:9,draw:miss})
    const v=h.action(h.value,{kind:'escape'}).snapshot
    expect(v.character.body.energy).toBe(0)
    expect(v.battles[0]).toMatchObject({energyBefore:0,energyAfter:0,requestedEnergy:6})
    expect(v.character.body.condition.currentHealth).toBe(10)
    expect(v.character.revision).toBe(h.value.character.revision+1)
    expect(fixture().initial.balance).toBe(0)
  })
})
