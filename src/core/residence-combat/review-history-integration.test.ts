import { describe, expect, it } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatRest, planCombatTerminal, planCombatMaintenance } from './controlled'
import { readCombatValue } from './validation'
import { drawIntInclusive } from '../random'
const { entered, win }=createCombatTestFactory(()=>createInfectedCombatDependencies('combat-test-character'))
const quiet:typeof drawIntInclusive=(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})

describe('R04 R05 real history remains usable after joint validation',()=>{
  it.each(['orderly','porter','technician'] as const)('real %s retreat/medicine/rest/reentry/victory retains closed evidence',enemy=>{
    const h=entered(enemy,{hp:10,draw:quiet})
    let v=h.action(h.value,{kind:'metal-pipe-basic-attack'}).snapshot
    v=h.action(v,{kind:'escape'}).snapshot
    const old=v.battles[0]
    v=h.medical(v,v.carried.quickSlots.slots[0]!.instanceId).snapshot
    v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    v=h.move(v,h.value.battle!.entry.to).snapshot
    expect(v.battle!.enemyNext).toBe(50)
    v=win(h,v)
    expect(v.battles[0]).toEqual(old)
    expect(v.battles[1].outcome).toBe('victory')
    expect(readCombatValue(structuredClone(v),h.deps)).toEqual(v)
    const wrong={...v,battles:[{...old,decision:{...old.decision,trace:old.decision.trace.map(t=>
      t.kind==='direct-damage'?{...t,requested:99}:t)}},v.battles[1]]}
    expect(()=>readCombatValue(wrong,h.deps)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
  })
  it('real retreat/repair/rest/reentry death binds the later scene and retains prior receipt',()=>{
    const h=entered('orderly',{draw:quiet})
    let v=h.action(h.value,{kind:'metal-pipe-basic-attack'}).snapshot
    v=h.action(v,{kind:'escape'}).snapshot
    const old=v.battles[0]
    v=h.source(v,'H1-search',{method:'dark'}).snapshot
    const metal=v.site!.ground.find(g=>g.nodeId==='H1')!.items.find(i=>
      i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='metal')!.id)!
    v=h.inventory(v,'pickup',{instanceId:metal.instanceId,placement:{x:0,y:0,rotated:false}}).snapshot
    v=planCombatMaintenance(v,{kind:'mechanical',expectedRevision:v.character.revision,
      inputs:[{instanceId:metal.instanceId,quantity:1}],allocations:[{instanceId:v.carried.equipment.weapon!.instanceId,amount:15}]},h.authorize(v)).plan.snapshot
    v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    // Explicit legal low-HP boundary; actual move and death are not stubbed.
    v=readCombatValue({...v,character:{...v.character,body:{...v.character.body,
      condition:{...v.character.body.condition,currentHealth:1}}}},h.deps)
    v=h.move(v,'H4').snapshot
    v=h.action(v,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:v.carried.quickSlots.slots[0]!.instanceId}).snapshot
    expect(v.phase).toBe('dead');expect(v.battles[0]).toEqual(old)
    expect(v.combatDeaths[0].entry.id).not.toBe(old.entry.id)
    expect(readCombatValue(v,h.deps)).toEqual(v)
  })
  it('survival first combat heal2 and real later quick unit heal1 keep one shared flag',()=>{
    const h=entered('orderly',{hp:8,specialty:'survival',draw:quiet})
    let v=h.action(h.value,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:h.value.carried.quickSlots.slots[0]!.instanceId}).snapshot
    expect(v.battle!.decision!.trace[0].requested).toBe(2)
    v=h.action(v,{kind:'escape'}).snapshot
    v=h.move(v,'H2').snapshot;v=h.source(v,'H2-search',{method:'dark'}).snapshot
    const item=v.site!.ground.find(g=>g.nodeId==='H2')!.items.find(i=>
      i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='bandage')!.id)!
    v=h.inventory(v,'pickup',{instanceId:item.instanceId,placement:{x:0,y:0,rotated:false}}).snapshot
    v=h.inventory(v,'to-quick',{instanceId:item.instanceId,slot:0}).snapshot
    v=h.move(v,'H1').snapshot;v=h.move(v,'H4').snapshot
    const quick=v.carried.quickSlots.slots[0]!
    v=h.action(v,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:quick.instanceId}).snapshot
    const d=v.battle?.decision ?? v.combatDeaths[0].decision
    expect(d!.context.firstBandageUsed).toBe(true)
    expect(d!.trace[0]).toMatchObject({kind:'heal',requested:1})
    expect(v.dispositions.filter(d=>d.reason==='medical')).toHaveLength(2)
    expect(readCombatValue(v,h.deps)).toEqual(v)
  })
  it.each(['rest-day6','action-day7','deadline-day7'] as const)('%s retains earlier real battle history',mode=>{
    const h=entered('orderly',{draw:quiet})
    let v=h.action(h.value,{kind:'escape'}).snapshot
    const receipt=v.battles[0]
    if(v.character.clock.kind!=='active')throw new Error('Expected actual active clock')
    // TEST boundary: legal cycle/task day and body, not a manufactured terminal result.
    const day=mode==='rest-day6'?6:7
    v=readCombatValue({...v,character:{...v.character,cycle:day,clock:{...v.character.clock,taskDay:day},
      body:{...v.character.body,condition:{...v.character.body.condition,currentHealth:1,bleeding:true}}}},h.deps)
    const end=mode==='rest-day6'?planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v))
      :mode==='action-day7'?h.move(v,'H0')
      :planCombatTerminal(v,{kind:'deadline',expectedRevision:v.character.revision},h.authorize(v))
    expect(end.snapshot.phase).toBe('dead');expect(end.snapshot.battles[0]).toEqual(receipt)
    expect(end.snapshot.combatDeaths).toEqual([])
    expect(end.steps.map(s=>s.kind)).toContain(mode==='action-day7'?'action-bleeding':'cycle-bleeding')
    expect(readCombatValue(end.snapshot,h.deps)).toEqual(end.snapshot)
  })
  it('normal H0 return retains genuine empty G1 steps and real closed battle',()=>{
    const h=entered('orderly',{draw:quiet})
    let v=h.action(h.value,{kind:'escape'}).snapshot
    v=h.move(v,'H0').snapshot
    const end=planCombatTerminal(v,{kind:'withdraw',expectedRevision:v.character.revision},h.authorize(v))
    expect(end.steps).toEqual([]);expect(end.snapshot.phase).toBe('living-hub')
    expect(end.snapshot.battles).toEqual(v.battles)
    expect(readCombatValue(end.snapshot,h.deps)).toEqual(end.snapshot)
  })
})
