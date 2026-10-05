import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { readCombatValue } from './validation'
import { drawIntInclusive } from '../random'
import { planCombatMedical } from './controlled'
const { entered,fixture } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P06 real quick medicine and origin consumption',()=>{
  it('real H2 painkiller migrates to explicit quick slot and consumes once without healing/treatment',()=>{
    const h=fixture({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:c.streamId.includes('H2-random')?50:max})})
    let v=h.move(h.value,'H1').snapshot;v=h.move(v,'H2').snapshot
    v=h.source(v,'H2-search',{method:'dark'}).snapshot
    const item=v.site!.ground.find(g=>g.nodeId==='H2')!.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='painkiller')!.id)!
    expect(item).toBeDefined()
    v=h.inventory(v,'pickup',{instanceId:item.instanceId,placement:{x:0,y:0,rotated:false}}).snapshot
    v=h.inventory(v,'to-quick',{instanceId:item.instanceId,slot:1}).snapshot
    v=h.move(v,'H1').snapshot
    v=h.task(v,'fire-door',{method:'crow',toolInstanceId:v.carried.equipment.utility!.instanceId}).snapshot
    v=h.move(v,'H4').snapshot
    // TEST contusion boundary before first decision, no forged medicine origin.
    v=readCombatValue({...v,character:{...v.character,body:{...v.character.body,
      condition:{...v.character.body.condition,minorContusions:1}}}},h.deps)
    v=h.action(v,{kind:'use-quick-slot-item',quickSlotIndex:1},{instanceId:item.instanceId}).snapshot
    expect(v.character.body.condition.painkillerActive).toBe(true)
    expect(v.character.body.condition.minorContusions).toBe(1)
    expect(v.battle!.decision!.trace.some(t=>t.kind==='heal')).toBe(false)
    expect(v.carried.quickSlots.slots[1]).toBeNull()
    expect(v.dispositions.filter(d=>d.item.instanceId===item.instanceId)).toHaveLength(1)
    expect(()=>h.action(v,{kind:'use-quick-slot-item',quickSlotIndex:1},{instanceId:item.instanceId})).toThrow()
  })
  it('survival first bandage heals total 2, actual slot and source consumed once',()=>{
    const h=entered('orderly',{hp:8,specialty:'survival',draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    const item=h.value.carried.quickSlots.slots[0]!
    const p=h.action(h.value,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:item.instanceId,quantity:1})
    expect(p.snapshot.battle!.decision!.trace[0]).toMatchObject({kind:'heal',requested:2,actual:2,healthBefore:8,healthAfter:10})
    expect(p.snapshot.character.body.condition.currentHealth).toBe(8)
    expect(p.snapshot.choices.firstBandageUsed).toBe(true)
    expect(p.snapshot.carried.quickSlots.slots[0]).toBeNull()
    expect(p.snapshot.allocations.some(a=>a.instanceId===item.instanceId)).toBe(false)
    expect(p.snapshot.dispositions.filter(d=>d.item.instanceId===item.instanceId)).toHaveLength(1)
    expect(p.snapshot.battle!.decision!.uses[0]).toMatchObject({instanceId:item.instanceId,quantity:1})
  })
  it('bandage recovery is capped before real enemy response',()=>{
    const h=entered('orderly',{hp:11,specialty:'survival',draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    const p=h.action(h.value,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:h.value.carried.quickSlots.slots[0]!.instanceId})
    expect(p.snapshot.battle!.decision!.trace[0]).toMatchObject({requested:2,actual:1,healthAfter:12})
    expect(p.snapshot.character.body.condition.currentHealth).toBe(10)
  })
  it('rejects no target, remote identity, wrong quantity, extra wound and stable medicine during battle',()=>{
    const h=entered()
    const command={kind:'use-quick-slot-item' as const,quickSlotIndex:0}
    const item=h.value.carried.quickSlots.slots[0]!
    expect(()=>h.action(h.value,command,{instanceId:item.instanceId})).toThrow()
    expect(()=>h.action(h.value,command,{instanceId:'remote-item'})).toThrow()
    expect(()=>h.action(h.value,command,{instanceId:item.instanceId,quantity:true})).toThrow()
    expect(()=>h.action(h.value,{...command,targetOpenWoundId:'fake-wound'},{instanceId:item.instanceId})).toThrow()
    expect(()=>planCombatMedical(h.value,{kind:'medical',expectedRevision:h.value.character.revision,instanceId:item.instanceId},h.authorize(h.value))).toThrow()
  })
})
