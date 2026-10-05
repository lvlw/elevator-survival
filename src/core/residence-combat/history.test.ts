import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { readCombatValue } from './validation'
import { createCombatAuthority,createResidenceCombatDependencies,planCombatMove,planCombatTask,resolveResidenceCombatAction } from './controlled'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { fixture as legacyFixture } from '../residence-supply/test-fixtures'
import { twoDeclarationFixture,resolvedDanger,atNode,searchAt,pickAlias } from '../residence-task/test-fixtures'
import { planSupplyTaskAction } from '../residence-task/actions'
import { planSupplyRest } from '../residence-supply/controlled'
import { planSupplyTerminal } from '../residence-terminal/supply-terminal'
import { cycleContext } from '../residence-supply/shared-validation'
import { drawIntInclusive } from '../random'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P11 P12 current evidence and two TEST declarations',()=>{
  it.each(['enemy-reset','wrong-node','wrong-id','queue','fake-resource','wrong-use'] as const)('rejects current/history %s without rule replay',fault=>{
    const h=entered('orderly',{hp:8,draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    const hit=h.action(h.value,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:h.value.carried.quickSlots.slots[0]!.instanceId}).snapshot
    const v=structuredClone(h.action(hit,{kind:'escape'}).snapshot)
    const r={...v.battles[0],decision:{...v.battles[0].decision}}
    const changed={...v,battles:[r]}
    if(fault==='enemy-reset') changed.site={...v.site!,enemies:v.site!.enemies.map(e=>e.id==='orderly'?{...e,state:{...e.state,currentHealth:14,resolvedActionCount:0,currentIntentActionId:'orderly-basic',nextCycleIndex:1},riskDrawIndex:0}:e)}
    if(fault==='wrong-node')r.nodeId='H3'
    if(fault==='wrong-id')r.entry={...r.entry,id:'foreign-battle'}
    if(fault==='queue')r.decision.queue=r.decision.queue.map((q,i)=>i? q:{...q,currentBefore:999})
    if(fault==='fake-resource')r.decision.resources=[{instanceId:'forged-resource',before:1,requested:1,consumed:1,after:0}]
    if(fault==='wrong-use')r.decision.uses=[{instanceId:'fake',definitionId:'fake',quantity:1,kind:'bandage',slot:0,dispositionIds:['fake']}]
    expect(()=>readCombatValue(changed,h.deps)).toThrow()
  })
  it.each(['success','voluntary-failure'] as const)('prior actual P/A %s TEST history survives new real heal -> CTB death',outcome=>{
    const original=createInfectedCombatDependencies('two-declaration-test')
    const {f,next}=twoDeclarationFixture(legacyFixture(original.supply))
    // Only the OLDER archived execution uses the existing isolated danger-cleared TEST fixture.
    // The second execution enters and kills through real movement/CTB; no enemy is cleared there.
    let old=resolvedDanger(f)
    const task=(id:string,extra={})=>{old=planSupplyTaskAction(old,{kind:'task',expectedRevision:old.character.revision,actionId:id,...extra},f.authorize(old)).snapshot}
    if(outcome==='success'){
      old=atNode(f,old,'P1');task('power-survey');task('power')
      old=atNode(f,old,'L2');task('verify',{method:'full'});task('fix',{method:'manual'});task('component',{placement:{x:0,y:0,rotated:false}})
      old=atNode(f,old,'C1');task('match',{method:'fast'})
      old=atNode(f,old,'C3');task('module',{placement:{x:2,y:0,rotated:false}})
      old=searchAt(f,old,'C4-cabinet');old=pickAlias(f,old,'metal',4);old=pickAlias(f,old,'electronic',5)
      old=atNode(f,old,'H8');task('install',{inputs:old.carried.backpack.items.map(i=>({instanceId:i.instanceId,quantity:1}))})
      old=planSupplyRest(old,{kind:'rest',expectedRevision:old.character.revision},f.authorize(old)).snapshot
      old=atNode(f,old,'H5');task('sample',{method:'cautious',placement:{x:0,y:0,rotated:false}})
    }
    old=atNode(f,old,'H0')
    const closed=planSupplyTerminal(old,{kind:outcome==='success'?'deliver':'withdraw',expectedRevision:old.character.revision},f.authorize(old)).snapshot
    const second=next(closed),deps=createResidenceCombatDependencies(second.dependencies,original.profiles)
    // Explicit TEST older-history material import, not a production protocol conversion API.
    let v=readCombatValue({...second.value,protocol:'residence-combat-pure-v1',battle:null,battles:[],combatDeaths:[]},deps)
    const auth=(x:typeof v)=>createCombatAuthority(x,{cycle:cycleContext(x.character,deps.supply,x.site?.nodeId??null),missions:x.missions},deps)
    v=planCombatMove(v,{kind:'move',edgeId:'H0-H1:forward',expectedRevision:v.character.revision},auth(v)).snapshot
    v=planCombatTask(v,{kind:'task',actionId:'fire-door',method:'toolbox',toolInstanceId:v.carried.equipment.utility!.instanceId,expectedRevision:v.character.revision},auth(v)).snapshot
    v=readCombatValue({...v,character:{...v.character,body:{...v.character.body,condition:{...v.character.body.condition,currentHealth:1}}}},deps)
    v=planCombatMove(v,{kind:'move',edgeId:'H1-H4:forward',expectedRevision:v.character.revision},auth(v)).snapshot
    const end=resolveResidenceCombatAction(v,{kind:'combat-action',command:{kind:'use-quick-slot-item',quickSlotIndex:0},
      instanceId:v.carried.quickSlots.slots[0]!.instanceId,expectedRevision:v.character.revision},auth(v)).snapshot
    expect(end.phase).toBe('dead');expect(end.balance).toBe(0)
    expect(end.receipts[0]).toEqual(closed.receipts[0]);expect(end.archives[0]).toEqual(closed.archives[0])
    expect(end.dispositions.slice(0,closed.dispositions.length)).toEqual(closed.dispositions)
    expect(end.receipts[1].forfeited).toBe(closed.balance)
    expect(end.combatDeaths[0].entry.binding.execution.runId).toBe('TEST-second-execution')
    expect(readCombatValue(end,deps)).toEqual(end)
  })
})
