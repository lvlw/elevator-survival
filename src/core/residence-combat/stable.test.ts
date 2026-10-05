import { describe,it,expect,vi,afterEach } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatMaintenance,planCombatRest,planCombatTerminal,planCombatTransfer } from './controlled'
import { readCombatValue } from './validation'
import * as g1 from '../residence-energy'
import * as cycles from '../character-cycle'
import * as lifecycle from '../mission-lifecycle/controlled'
import { drawIntInclusive } from '../random'
const { fixture,entered,win } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
afterEach(()=>vi.restoreAllMocks())
const miss=(c:Parameters<typeof drawIntInclusive>[0],min:number,max:number)=>({...drawIntInclusive(c,min,max),value:max})
describe('P10 real stable P producers under the complete new aggregate',()=>{
  it('victory enables actual sample production, physical drop/pickup, source, repair and old H0 empty steps',()=>{
    const h=entered('orderly',{draw:miss})
    let v=win(h,h.value)
    const receipt=v.battles[0]
    v=h.move(v,'H5').snapshot
    v=h.task(v,'sample',{method:'cautious',placement:{x:0,y:0,rotated:false}}).snapshot
    const sample=v.carried.backpack.items.find(i=>i.definitionId==='quest_sealed_pathogen_case')!
    v=planCombatTransfer(v,{kind:'task-drop',expectedRevision:v.character.revision,instanceId:sample.instanceId},h.authorize(v)).snapshot
    v=planCombatTransfer(v,{kind:'task-pickup',expectedRevision:v.character.revision,instanceId:sample.instanceId,
      placement:{x:0,y:0,rotated:false}},h.authorize(v)).snapshot
    expect(v.carried.backpack.items).toContainEqual(sample)
    for(const n of ['H4','H1']) v=h.move(v,n).snapshot
    v=h.source(v,'H1-search',{method:'dark'}).snapshot
    const metal=v.site!.ground.find(g=>g.nodeId==='H1')!.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='metal')!.id)!
    v=h.inventory(v,'pickup',{instanceId:metal.instanceId,placement:{x:4,y:0,rotated:false}}).snapshot
    const pipe=v.carried.equipment.weapon!
    v=planCombatMaintenance(v,{kind:'mechanical',expectedRevision:v.character.revision,inputs:[{instanceId:metal.instanceId,quantity:1}],
      allocations:[{instanceId:pipe.instanceId,amount:15}]},h.authorize(v)).plan.snapshot
    expect(v.itemStates.states.find(s=>s.instanceId===pipe.instanceId)!.resource).toEqual({kind:'durability',current:30})
    expect(v.battles[0]).toEqual(receipt)
    v=h.move(v,'H0').snapshot
    const action=vi.spyOn(g1,'planResidenceAction'), cycle=vi.spyOn(cycles,'planCharacterCycle'), close=vi.spyOn(lifecycle,'terminateMission')
    const end=planCombatTerminal(v,{kind:'withdraw',expectedRevision:v.character.revision},h.authorize(v))
    expect(end.steps).toEqual([])
    expect(end.snapshot.phase).toBe('living-hub')
    expect(end.snapshot.dispositions.find(d=>d.kind==='partial-delivery')!.item).toEqual(sample)
    expect(end.snapshot.battles[0]).toEqual(receipt)
    expect([action.mock.calls.length,cycle.mock.calls.length,close.mock.calls.length]).toEqual([0,1,1])
  })
  it('real L1 source supports stack split/merge and food; no provenance/quantity recreation',()=>{
    const h=fixture(), initialBandage=h.value.carried.quickSlots.slots[0]!
    let v=h.value
    for(const n of ['H1','H7','L0','L1']) v=h.move(v,n).snapshot
    v=h.task(v,'l1-open',{method:'manual'}).snapshot
    v=h.source(v,'L1-cabinet').snapshot
    const ground=v.site!.ground.find(g=>g.nodeId==='L1')!, food=ground.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='food')!.id)!
    v=h.inventory(v,'pickup',{instanceId:food.instanceId,placement:{x:0,y:0,rotated:false}}).snapshot
    expect(food.quantity).toBeGreaterThan(1)
    v=h.inventory(v,'split',{instanceId:food.instanceId,quantity:1,placement:{x:1,y:0,rotated:false}}).snapshot
    const split=v.carried.backpack.items.find(i=>i.instanceId!==food.instanceId)!
    v=h.inventory(v,'merge',{instanceId:split.instanceId,targetId:food.instanceId,quantity:1}).snapshot
    expect(v.carried.backpack.items[0]).toEqual(food)
    v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    const before=v.character.body.satiety
    v=h.medical(v,food.instanceId).snapshot
    expect(v.character.body.satiety).toBeGreaterThan(before)
    expect(v.carried.backpack.items[0].quantity).toBe(food.quantity-1)
    expect(v.carried.quickSlots.slots[0]).toEqual(initialBandage)
    expect(v.origins.filter(o=>o.kind==='initial')).toHaveLength(4)
  })
  it('real battery origin feeds shared charge; source claimed once and instance state retained',()=>{
    const h=fixture({tool:'lamp'});let v=h.value
    for(const n of ['H1','H3'])v=h.move(v,n).snapshot
    v=h.source(v,'H3-search',{method:'lit',toolInstanceId:v.carried.equipment.utility!.instanceId}).snapshot
    const battery=v.site!.ground.find(g=>g.nodeId==='H3')!.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='battery')!.id)!
    v=h.inventory(v,'pickup',{instanceId:battery.instanceId,placement:{x:0,y:0,rotated:false}}).snapshot
    const lamp=v.carried.equipment.utility!
    const r=planCombatMaintenance(v,{kind:'recharge',expectedRevision:v.character.revision,instanceId:lamp.instanceId,
      inputs:[{instanceId:battery.instanceId,quantity:1}]},h.authorize(v))
    expect(r.resourceResult[0].restored).toBe(1)
    expect(r.plan.snapshot.itemStates.states.find(s=>s.instanceId===lamp.instanceId)!.resource).toEqual({kind:'charge',current:8})
    expect(()=>h.source(r.plan.snapshot,'H3-search',{method:'dark'})).toThrow()
  })
  it.each([false,true])('real remote Day7 deadline death=%s with exact G1 ordering',dead=>{
    const h=fixture();let v=h.move(h.value,'H1').snapshot
    if(v.character.clock.kind!=='active')throw new Error('clock')
    // TEST day/body boundary; no fabricated task completion or source.
    v=readCombatValue({...v,character:{...v.character,cycle:7,clock:{...v.character.clock,taskDay:7},body:{...v.character.body,
      condition:{...v.character.body.condition,currentHealth:dead?1:12,bleeding:dead}}}},h.deps)
    const cycle=vi.spyOn(cycles,'planCharacterCycle'), action=vi.spyOn(g1,'planResidenceAction'), close=vi.spyOn(lifecycle,'terminateMission')
    const end=planCombatTerminal(v,{kind:'deadline',expectedRevision:v.character.revision},h.authorize(v))
    expect(end.snapshot.phase).toBe(dead?'dead':'living-hub')
    expect(end.steps.map(s=>s.kind)).toEqual(dead?['cycle-bleeding']:['cycle-bleeding','infection','hunger','end-cycle'])
    expect([action.mock.calls.length,cycle.mock.calls.length,close.mock.calls.length]).toEqual([0,1,1])
  })
})
