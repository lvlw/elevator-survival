// TEST ONLY. Decisions use public views and explicit opaque requests. No raw current replacement.
import type { BrowserOwner } from '../../../../../../src/app/infected-browser/types'
import type { PlayerReadyView, PlayerRequest } from '../../../../../../src/state/residence-session/player-types'
import { createReservation } from '../../../../../../src/app/infected-browser/reservation'
import { checkpointFor } from '../../../../../../src/app/infected-browser/checkpoint'
import { createCombatTestFactory } from '../../../../../../src/core/residence-combat/test-fixtures'
import { expectation } from '../../../../../../src/state/residence-save/combat-test-fixtures'
import { serializeCombatResidenceSave } from '../../../../../../src/state/residence-save/combat-codec'
export function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error('TEST_ASSERTION: '+message) }
export function view(o: BrowserOwner): PlayerReadyView { const v=o.getSnapshot().preplay?.view;check(v?.status==='ready','ready player');return v }
export function actions(o: BrowserOwner) {const v=view(o);return [...v.actions,...v.move.options,...v.tasks.choices,...v.sources.flatMap(s=>s.choices),...(v.combat?.actions??[])]}
export function action(o: BrowserOwner,family:string,label:string,method?:string) {
  const a=actions(o).find(a=>a.family===family&&a.label===label&&(method===undefined||a.method===method));check(a,'action '+family+'/'+label+'/'+method);return a.selector
}
export function send(o: BrowserOwner,family:string,label:string,fields:Omit<PlayerRequest,'action'>={},method?:string) {
  const c=o.controls()!,r=c.execute({action:action(o,family,label,method),...fields}),done=r.kind==='confirmation-required'?c.confirm(r.confirmation!):r
  check(done.kind==='committed','explicit commit '+family+'/'+label);return done
}
export function item(o:BrowserOwner,name:string,container?:string) {const v=view(o),i=[...v.carried,...v.ground].find(i=>i.name===name&&(!container||i.container===container));check(i,'item '+name+'/'+container);return i}
export function medical(o:BrowserOwner,name:string) {
  const v=view(o),i=v.carried.find(i=>i.name===name&&i.container==='quick')??v.carried.find(i=>i.name===name&&i.container==='backpack')
  if(!i)return false
  const wound=v.body.wounds.find(w=>w.treatment==='untreated')
  if(name==='绷带'&&v.body.hp.current===v.body.hp.maximum&&!v.body.bleeding&&!wound)return false
  if(name==='压缩口粮'&&v.body.satiety.current===v.body.satiety.maximum)return false
  send(o,'medical','使用药食',{item:i.selector,...(name==='绷带'&&wound?{wound:wound.selector}:{})});return true
}
export function rest(o:BrowserOwner) {send(o,'rest','原位休整');medical(o,'压缩口粮')}
export function paid(o:BrowserOwner,family:string,label:string,fields:()=>Omit<PlayerRequest,'action'>=()=>({}),method?:string) {
  if(view(o).body.energy.current===0){medical(o,'绷带');rest(o)}
  send(o,family,label,fields(),method)
}
export const move=(o:BrowserOwner,name:string)=>paid(o,'move',name)
export const walk=(o:BrowserOwner,names:string[])=>names.forEach(n=>move(o,n))
export function task(o:BrowserOwner,label:string,method?:string,fields:()=>Omit<PlayerRequest,'action'>=()=>({})) {paid(o,'task',label,fields,method)}
export function source(o:BrowserOwner,label:string,method?:string) {paid(o,'source',label,()=>method==='crow'||method==='lit'?{item:view(o).carried.find(i=>i.container==='utility')!.selector}:{},method)}
export function pick(o:BrowserOwner,name:string,x:number,y=0) {const i=item(o,name,'ground');send(o,i.ordinary?'inventory':'task-transfer',i.ordinary?'拾取':'拾取任务物',{item:i.selector,placement:{x,y,rotated:false}})}
export function fight(o:BrowserOwner) {
  for(let turn=0;turn<24;turn++){
    const v=view(o);if(!v.combat)return
    const a=v.body.bleeding?v.combat.actions.find(a=>a.label.startsWith('使用快捷物品')):null
    const chosen=a??v.combat.actions.find(a=>a.label==='蓄力打击')??v.combat.actions.find(a=>a.label==='金属管攻击')??v.combat.actions.find(a=>a.label==='临时攻击')
    check(chosen,'bounded combat choice');const c=o.controls()!,r=c.execute({action:chosen.selector});check(r.kind==='committed','combat commit')
    if(view(o).phase==='dead')return
  }
  throw new Error('TEST_ASSERTION: combat strategy exhausted')
}
const crow=(o:BrowserOwner)=>({item:view(o).carried.find(i=>i.container==='utility')!.selector})
export function routeA(o:BrowserOwner,stage:number,threeEnemies=false) {
  if(threeEnemies)return routeThree(o,stage)
  if(stage===0){
    send(o,'depart','进入封锁区');move(o,'大厅');source(o,'大厅搜索','dark');pick(o,'金属零件',4)
    move(o,'保安室');source(o,'保安室搜索','dark');pick(o,'隔离区门禁卡',4,2);move(o,'大厅');task(o,'隔离防火门','crow',()=>crow(o))
    walk(o,['后勤控制间','岗亭','登记室']);task(o,'开启物流柜','crow',()=>crow(o));source(o,'物流柜物资');pick(o,'压缩口粮',4,1);pick(o,'绷带',5,1);rest(o);move(o,'装卸场')
    check(view(o).point==='battle-decision','porter entry checkpoint')
  }else if(stage===1){
    fight(o);check(view(o).phase==='active-world','porter survived');medical(o,'绷带');medical(o,'绷带');source(o,'物流装卸区搜索')
    view(o).ground.filter(i=>i.name==='压缩口粮').forEach((_,n)=>pick(o,'压缩口粮',n===0?5:3,1))
    task(o,'核对转运记录','full');task(o,'修复转运组件','manual');task(o,'取得转运组件',undefined,()=>({placement:{x:0,y:0,rotated:false}}))
    walk(o,['登记室','岗亭','入口','档案室']);task(o,'比对通信记录','fast');move(o,'检修间');source(o,'通信设备柜','crow');pick(o,'电子元件',5)
    if(threeEnemies){rest(o);move(o,'档案室');task(o,'开启通信门');move(o,'检修走廊');check(view(o).point==='battle-decision','technician entry checkpoint')}
    else{task(o,'调查旁路');task(o,'开启旁路','crow',()=>crow(o));rest(o);move(o,'机房')}
  }else if(stage===2){
    if(threeEnemies){fight(o);check(view(o).phase==='active-world','technician survived');medical(o,'绷带');move(o,'机房')}
    task(o,'取得通信模块',undefined,()=>({placement:{x:2,y:0,rotated:false}}))
    walk(o,threeEnemies?['检修走廊','档案室','入口','电梯前室','大厅','隔离走廊']:['检修间','档案室','入口','电梯前室','大厅','隔离走廊'])
    check(view(o).point==='battle-decision','orderly entry checkpoint')
  }else if(stage===3){
    fight(o);check(view(o).phase==='active-world','orderly survived');medical(o,'绷带');move(o,'冷藏室')
  }else if(stage===4){
    const request={action:action(o,'task','提取样本','cautious'),placement:{x:0,y:2,rotated:false}}
    const metadata=o.controls()!.preview(request);check(metadata.qualification.kind==='available','sample qualified')
    const resources=metadata.facts?.resources??[];check(resources.some(r=>r.name==='厚实外套'&&r.consumed===1),'sample protection payment visible')
    task(o,'提取样本','cautious',()=>({placement:{x:0,y:2,rotated:false}}));check(view(o).tasks.sample==='carried','sample carried')
  }else if(stage===5){
    walk(o,['隔离走廊','大厅','后勤控制间','岗亭','配线廊','转运支路柜']);rest(o);task(o,'调查供电');task(o,'恢复供电')
    walk(o,['配线廊','岗亭','后勤控制间','转运平台']);task(o,'安装转运装置',undefined,()=>({materials:['component','module','金属零件','电子元件'].map(name=>({item:item(o,name,'backpack').selector,quantity:1}))}))
    walk(o,['后勤控制间','大厅','电梯前室']);send(o,'terminal','交付返回');check(view(o).terminal.result?.outcome==='success','real H0 success')
  }
  return {point:view(o).point,hp:view(o).body.hp.current,phase:view(o).phase}
}
function routeThree(o:BrowserOwner,stage:number) {
  if(stage===0){
    send(o,'depart','进入封锁区');move(o,'大厅');source(o,'大厅搜索','dark');pick(o,'金属零件',4)
    task(o,'隔离防火门','crow',()=>crow(o));move(o,'隔离走廊')
  }else if(stage===1){
    fight(o);check(view(o).phase==='active-world','first orderly survived')
    walk(o,['大厅','后勤控制间','岗亭','登记室']);task(o,'开启物流柜','crow',()=>crow(o));source(o,'物流柜物资')
    pick(o,'压缩口粮',4,1);pick(o,'绷带',5,1);rest(o);move(o,'装卸场')
  }else if(stage===2){
    fight(o);check(view(o).phase==='active-world','second porter survived');medical(o,'绷带');medical(o,'绷带');source(o,'物流装卸区搜索')
    view(o).ground.filter(i=>i.name==='压缩口粮').forEach((_,n)=>pick(o,'压缩口粮',n===0?5:3,1))
    task(o,'核对转运记录','full');task(o,'修复转运组件','manual');task(o,'取得转运组件',undefined,()=>({placement:{x:0,y:0,rotated:false}}))
    walk(o,['登记室','岗亭','入口','档案室']);task(o,'比对通信记录','fast');move(o,'检修间');source(o,'通信设备柜','crow');pick(o,'电子元件',5)
    rest(o);move(o,'档案室');task(o,'开启通信门');move(o,'检修走廊')
  }else if(stage===3){
    fight(o);check(view(o).phase==='active-world','third technician survived');medical(o,'绷带');move(o,'机房')
    task(o,'取得通信模块',undefined,()=>({placement:{x:2,y:0,rotated:false}}))
    walk(o,['检修走廊','档案室','入口','电梯前室','大厅','隔离走廊','冷藏室'])
  }else routeA(o,stage,false)
  return {point:view(o).point,hp:view(o).body.hp.current,phase:view(o).phase}
}
export function routeB(o:BrowserOwner,stage:number) {
  if(stage===0){send(o,'depart','进入封锁区');move(o,'大厅');source(o,'大厅搜索','dark');pick(o,'金属零件',4);task(o,'隔离防火门','crow',()=>crow(o));move(o,'隔离走廊')}
  else if(stage===1){
    send(o,'combat','蓄力打击');send(o,'combat','退却');check(view(o).point==='stable-active','actual retreat')
    paid(o,'maintenance','机械维护',()=>({materials:[{item:item(o,'金属零件','backpack').selector,quantity:1}],allocations:[{item:view(o).carried.find(i=>i.container==='weapon')!.selector,amount:15}]}))
    medical(o,'绷带');rest(o)
  }else if(stage===2){move(o,'隔离走廊');fight(o);if(view(o).phase==='active-world'){walk(o,['大厅','电梯前室']);send(o,'terminal','失败止损返回')}}
  return {point:view(o).point,hp:view(o).body.hp.current,phase:view(o).phase}
}
/** Explicit TEST boundary. Complete real P value + separately prepared metadata, not a read-null route. */
export function boundaryRecords(kind:'both-zero'|'alive-enemy'|'orderly'|'porter'|'technician') {
  const {reservation:r,composition:c}=createReservation({characterId:'browser-boundary',runId:'combat-test-execution',seed:'combat-seed',generation:'boundary-generation'}, {tool:'crow',specialty:'engineer'})
  const factory=createCombatTestFactory(()=>c.dependencies)
  let value:ReturnType<typeof factory.fixture>['value']
  if(kind==='both-zero'){
    const h=factory.fixture();value=h.move(h.value,'H1').snapshot;value=h.task(value,'fire-door',{method:'crow',toolInstanceId:value.carried.equipment.utility!.instanceId}).snapshot
    value=factory.bodyBoundary(value,c.dependencies,{condition:{...value.character.body.condition,currentHealth:6,bleeding:true}})
    value=h.move(value,'H4').snapshot;value=h.action(value,{kind:'metal-pipe-charged-strike'}).snapshot;value=h.action(value,{kind:'metal-pipe-basic-attack'}).snapshot
  }else value=factory.entered(kind==='alive-enemy'?'orderly':kind,kind==='alive-enemy'?{hp:1}:{}).value
  const expected=expectation(value,c.dependencies,{...r.execution,...r.choices}),text=serializeCombatResidenceSave(value,expected,c.policy)
  return {reservation:JSON.stringify(r),checkpoint:JSON.stringify(checkpointFor(r,{text,expected},c))}
}
