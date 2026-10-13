import {afterEach,describe,expect,it,vi} from 'vitest'
import {createInfectedCombatDependencies} from '../../content/infected-world-v0.1/combat-initial'
import {createResidenceCombatDependencies} from '../../core/residence-combat/dependencies'
import {readCombatValue} from '../../core/residence-combat/validation'
import {fixture as legacyFixture} from '../../core/residence-supply/test-fixtures'
import {twoDeclarationFixture,resolvedDanger,atNode,searchAt,pickAlias} from '../../core/residence-task/test-fixtures'
import {planSupplyTaskAction} from '../../core/residence-task/actions'
import {planSupplyRest} from '../../core/residence-supply/controlled'
import {planSupplyTerminal} from '../../core/residence-terminal/supply-terminal'
import {coldRecord,current,coldSaved} from './combat-test-fixtures'
import {move,task,action} from './combat-test-routes'
afterEach(()=>vi.restoreAllMocks())
describe('S11 two explicitly TEST declarations preserve prior history',()=>{
  it.each(['success','voluntary-failure'] as const)('older %s archive plus later real S healing death never rewrites history',outcome=>{
    const original=createInfectedCombatDependencies('two-declaration-test')
    const {f,next}=twoDeclarationFixture(legacyFixture(original.supply))
    // ONLY this older historical execution uses the existing isolated danger-cleared TEST fixture.
    let old=resolvedDanger(f)
    const oldTask=(id:string,extra={})=>{old=planSupplyTaskAction(old,{kind:'task',actionId:id,expectedRevision:old.character.revision,...extra},f.authorize(old)).snapshot}
    if(outcome==='success'){
      old=atNode(f,old,'P1');oldTask('power-survey');oldTask('power')
      old=atNode(f,old,'L2');oldTask('verify',{method:'full'});oldTask('fix',{method:'manual'});oldTask('component',{placement:{x:0,y:0,rotated:false}})
      old=atNode(f,old,'C1');oldTask('match',{method:'fast'})
      old=atNode(f,old,'C3');oldTask('module',{placement:{x:2,y:0,rotated:false}})
      old=searchAt(f,old,'C4-cabinet');old=pickAlias(f,old,'metal',4);old=pickAlias(f,old,'electronic',5)
      old=atNode(f,old,'H8');oldTask('install',{inputs:old.carried.backpack.items.map(i=>({instanceId:i.instanceId,quantity:1}))})
      old=planSupplyRest(old,{kind:'rest',expectedRevision:old.character.revision},f.authorize(old)).snapshot
      old=atNode(f,old,'H5');oldTask('sample',{method:'cautious',placement:{x:0,y:0,rotated:false}})
    }
    old=atNode(f,old,'H0')
    const closed=planSupplyTerminal(old,{kind:outcome==='success'?'deliver':'withdraw',expectedRevision:old.character.revision},f.authorize(old)).snapshot
    const second=next(closed),deps=createResidenceCombatDependencies(second.dependencies,original.profiles)
    // TEST-only old-history import and low HP boundary precede S loading and actual entry. No public conversion/replace exists.
    const before=readCombatValue({...second.value,protocol:'residence-combat-pure-v1',battle:null,battles:[],combatDeaths:[],
      character:{...second.value.character,body:{...second.value.character.body,condition:{...second.value.character.body.condition,currentHealth:1}}}},deps)
    const h=coldRecord(before,deps,{runId:'test-execution',seed:'test-seed',tool:'toolbox',specialty:'engineer'})
    expect(h.owner.bootstrap().status).toBe('ready')
    move(h,'H1');task(h,'fire-door',{method:'toolbox',toolInstanceId:current(h).carried.equipment.utility!.instanceId});move(h,'H4')
    h.faults.write=true
    action(h,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:current(h).carried.quickSlots.slots[0]!.instanceId})
    const v=current(h);expect(v.phase).toBe('dead');expect(v.balance).toBe(0)
    expect(v.receipts[0]).toEqual(closed.receipts[0]);expect(v.archives[0]).toEqual(closed.archives[0])
    expect(v.dispositions.slice(0,closed.dispositions.length)).toEqual(closed.dispositions)
    expect(v.receipts[1].forfeited).toBe(closed.balance);expect(v.combatDeaths[0].entry.binding.execution.runId).toBe('TEST-second-execution')
    h.faults.write=false;h.owner.retrySave();expect(current(coldSaved(h))).toEqual(v)
  })
})
