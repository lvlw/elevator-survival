import { afterEach,describe,it,expect,vi } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatRest,planCombatTerminal } from './controlled'
import type { CombatValue } from './types'
import * as allocations from '../residence-supply/allocations'
import * as energy from '../residence-energy'
import * as cycles from '../character-cycle'
import * as mission from '../mission-lifecycle/controlled'
import * as movement from '../residence-location/movement'
import { drawIntInclusive } from '../random'
const { fixture,entered,win } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
afterEach(()=>vi.restoreAllMocks())
const miss=(c:Parameters<typeof drawIntInclusive>[0],min:number,max:number)=>({...drawIntInclusive(c,min,max),value:max})
describe('P12 native composition counts and complete producer chain',()=>{
  it('true first materialization/departure/move have independent observable counts',()=>{
    const origin=vi.spyOn(allocations,'issueSupplyOrigin'),activate=vi.spyOn(mission,'activateMission'),
      cycle=vi.spyOn(cycles,'planCharacterCycle'),action=vi.spyOn(energy,'planResidenceAction'),move=vi.spyOn(movement,'planResidenceBoundMove')
    const h=fixture()
    expect([origin.mock.calls.length,activate.mock.calls.length,cycle.mock.calls.length,action.mock.calls.length,move.mock.calls.length])
      .toEqual([4,1,1,0,0])
    h.move(h.value,'H1')
    expect([origin.mock.calls.length,activate.mock.calls.length,cycle.mock.calls.length,action.mock.calls.length,move.mock.calls.length])
      .toEqual([4,1,1,1,1])
  })
  it.each(['orderly','porter','technician'] as const)('real %s retreat -> stable bandage/rest -> reentry -> victory retains history',(id)=>{
    const h=entered(id,{draw:miss,hp:10})
    let v=h.action(h.value,{kind:'metal-pipe-basic-attack'}).snapshot
    v=h.action(v,{kind:'escape'}).snapshot
    const first=v.battles[0], item=v.carried.quickSlots.slots[0]!
    v=h.medical(v,item.instanceId).snapshot
    expect(v.choices.firstBandageUsed).toBe(true)
    v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    v=h.move(v,h.value.battle!.entry.to).snapshot
    v=win(h,v)
    expect(v.battles).toHaveLength(2);expect(v.battles[0]).toEqual(first)
    expect(v.battles[1].outcome).toBe('victory')
    expect(v.dispositions.filter(d=>d.item.instanceId===item.instanceId)).toHaveLength(1)
  })
  it('real three CTB victories plus original task/transport/install/sample producers reach genuine success',()=>{
    const h=fixture({tool:'toolbox',draw:miss})
    let v:CombatValue=h.value
    const move=(to:string)=>{v=h.move(v,to).snapshot}
    const task=(id:string,extra={})=>{v=h.task(v,id,extra).snapshot}
    const rest=()=>{v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot}
    const pick=(alias:string,x:number,y=0)=>{
      const id=h.deps.supply.tasks.data.items.find(i=>i.alias===alias)!.id
      const item=v.site!.ground.find(g=>g.nodeId===v.site!.nodeId)!.items.find(i=>i.definitionId===id)!
      v=h.inventory(v,'pickup',{instanceId:item.instanceId,placement:{x,y,rotated:false}}).snapshot
    }
    move('H1');v=h.source(v,'H1-search',{method:'dark'}).snapshot;pick('metal',4)
    task('fire-door',{method:'toolbox',toolInstanceId:v.carried.equipment.utility!.instanceId});pick('electronic',5)
    move('H4');v=win(h,v)
    for(const n of ['H1','H7','L0','L1'])move(n)
    task('l1-open',{method:'manual'});v=h.source(v,'L1-cabinet').snapshot;pick('food',4,1);pick('bandage',5,1)
    rest();v=h.medical(v,v.carried.backpack.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='food')!.id)!.instanceId).snapshot
    move('L2');v=win(h,v)
    v=h.medical(v,v.carried.quickSlots.slots[0]!.instanceId).snapshot
    const bandage=v.carried.backpack.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='bandage')!.id)!
    v=h.medical(v,bandage.instanceId).snapshot
    task('verify',{method:'full'});task('fix',{method:'manual'});task('component',{placement:{x:0,y:0,rotated:false}})
    for(const n of ['L1','L0','C0','C1'])move(n)
    task('match',{method:'fast'});task('c-gate',{method:'manual'});rest()
    const food=v.carried.backpack.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='food')!.id)!
    v=h.medical(v,food.instanceId).snapshot
    move('C2');v=win(h,v);move('C3');task('module',{placement:{x:2,y:0,rotated:false}})
    for(const n of ['C2','C1','C0','H0','H1','H4','H5'])move(n)
    task('sample',{method:'cautious',placement:{x:0,y:2,rotated:false}})
    const sample=v.carried.backpack.items.find(i=>i.definitionId==='quest_sealed_pathogen_case')!
    for(const n of ['H4','H1','H7','L0','P0','P1'])move(n)
    rest();task('power-survey');task('power')
    for(const n of ['P0','L0','H7','H8'])move(n)
    task('install',{inputs:['component','module','metal','electronic'].map(alias=>({instanceId:v.carried.backpack.items.find(i=>
      i.definitionId===h.deps.supply.tasks.data.items.find(d=>d.alias===alias)!.id)!.instanceId,quantity:1}))})
    for(const n of ['H7','H1','H0'])move(n)
    const end=planCombatTerminal(v,{kind:'deliver',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    expect(end.phase).toBe('living-hub');expect(end.balance).toBe(120)
    expect(end.battles.map(b=>b.entry.enemyId).sort()).toEqual(['orderly','porter','technician'])
    expect(end.battles.every(b=>b.outcome==='victory')).toBe(true)
    expect(end.dispositions.filter(d=>d.kind==='installed')).toHaveLength(4)
    expect(end.dispositions.find(d=>d.kind==='delivered')!.item).toEqual(sample)
    expect(end.origins.filter(o=>o.kind==='initial')).toHaveLength(4)
  })
})
