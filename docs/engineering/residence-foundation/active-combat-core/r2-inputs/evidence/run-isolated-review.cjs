/* Exact-SHA source execution with explicit adapters. NOT native P or npm tests.
 * Seven original TS modules are transpiled unchanged. Zod/parse, G1/G2/supply
 * aggregate, profile issuance/projection, config reader and identity primitives
 * are replaced below. Inputs are cropped, handcrafted boundary witnesses.
 * Original20 checks cover F01/F02. New12 cover private maintenance/read staging and preservation of raw-resource rejection. Neither set is native aggregate execution.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'..'), source=path.join(root,'source');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'source-integrity.json'),'utf8'));
for(const r of manifest){const b=fs.readFileSync(path.join(source,r.path));const h=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');if(h!==r.expected_git_blob)throw Error('SOURCE HASH MISMATCH: '+r.path)}
class DomainError extends Error{constructor(message){super(message);this.code='INVALID_INPUT'}}
const ensure=(v,m)=>{if(!v)throw new DomainError(m)}, same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const stream=(...parts)=>parts.map(encodeURIComponent).join(':');
const traceTag={name:'trace'}, valueTag={name:'value'};
function traceParse(value){ensure(Array.isArray(value),'trace array'); const fields=['kind','actionId','ctb','requested','actual','healthBefore','healthAfter','reference'];for(const r of value){ensure(r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).length===fields.length&&fields.every(k=>Object.hasOwn(r,k)),'trace shape');ensure(['heal','direct-damage','post-action-bleeding','injury','exposure','treatment'].includes(r.kind),'trace tag');for(const k of ['ctb','requested','actual','healthBefore','healthAfter'])ensure(Number.isSafeInteger(r[k])&&r[k]>=0,'raw trace number');ensure(typeof r.actionId==='string'&&!!r.actionId.trim(),'action ID');ensure(r.reference===null||(typeof r.reference==='string'&&!!r.reference.trim()),'reference')}return structuredClone(value)}
const loaded={};const adapterCalls={aggregate:0,projection:0,restore:0,recipe:0,g1Action:0,issue:0};
const safeAdd=(a,b)=>{ensure(Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&Number.isSafeInteger(a+b),'safeAdd');return a+b};
const safeMultiply=(a,b)=>{ensure(Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&Number.isSafeInteger(a*b),'safeMultiply');return a*b};
const allCarried=v=>[...(v.backpack?.items||[]),...Object.values(v.equipment||{}).filter(Boolean),...(v.quickSlots?.slots||[]).filter(Boolean)];
const requireAction=(v,paid=false)=>ensure(v.phase==='active-world'&&v.site?.pending.kind==='none'&&v.character.body.condition.currentHealth>0&&(!paid||v.character.body.energy>0),'stable required');
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v};
const tag=()=>({min(){return this},optional(){return this},nullable(){return this}});
const stubOnly=(name)=>()=>{throw Error('UNUSED ADAPTER CALLED: '+name)};

function load(name){if(loaded[name])return loaded[name];const code=ts.transpileModule(fs.readFileSync(path.join(source,name+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const module={exports:{}};const req=id=>{
  if(['./trace','./history','./validation','./history-context','./history-queue'].includes(id))return load(id.slice(2));
  if(id==='../residence-supply/shared-maintenance')return load('shared-maintenance');
  if(id==='./authority')return {readAuthorizedCombat:(input,a)=>({value:readCombatValue(input,a.dependencies),dependencies:a.dependencies})};
  if(id==='./plans')return {issueCombatPlan:(before,proposed,d)=>{adapterCalls.issue++;const v=readCombatValue(proposed,d);ensure(v.character.revision===before.character.revision+1,'issue revision');return freeze({snapshot:v})}};
  if(id==='../residence-terminal/plans')return {verifySteps:stubOnly('verifySteps')};
  if(id==='../residence-terminal/supply-settlement-shared')return {settleSupplyDomain:stubOnly('settleSupplyDomain'),planSharedTerminal:stubOnly('planSharedTerminal')};
  if(id==='../residence-supply/shared-inventory')return {planSharedInventory:stubOnly('planSharedInventory')};
  if(id==='../residence-supply/shared-actions')return {planSharedRest:stubOnly('planSharedRest')};
  if(id==='../residence-task/shared-actions')return {planSharedTaskAction:stubOnly('planSharedTaskAction')};
  if(id==='../residence-task/shared-sources')return {planSharedSourceReveal:stubOnly('planSharedSourceReveal')};
  if(id==='../residence-task/shared-transfer')return {planSharedTaskTransfer:stubOnly('planSharedTaskTransfer')};

  if(id==='zod')return {z:{array:x=>Object.assign(tag(),{array:x}),strictObject:tag,literal:tag,enum:tag,discriminatedUnion:tag}};
  if(id==='./schema')return {traceSchema:traceTag,combatValueSchema:valueTag};
  if(id==='../residence-config/validation')return {countSchema:tag(),positiveSchema:tag(),idSchema:tag(),safeAdd,safeMultiply,parseResidence:(schema,v)=>schema.array===traceTag?traceParse(v):structuredClone(v)};
  if(id==='../residence-supply/shared-validation'||id==='./shared-validation')return {ensure,requireSupplyDomainAction:requireAction,validateSupplyFacts:v=>{adapterCalls.aggregate++;return v}};
  if(id==='../load')return {classifyLoad:(w)=>({canCarry:w<=28,tier:w<=24?'normal':'overloaded'})};
  if(id==='../residence-supply/shared-medical')return {supplyBandageRecovery:v=>v.choices.specialty==='survival'&&!v.choices.firstBandageUsed?2:1,planSharedMedical:stubOnly('planSharedMedical')};
  if(id==='../residence-location/validation')return {carriedItems:allCarried};
  if(id==='../inventory')return {calculateBackpackWeightSubtotal:stubOnly('calculateBackpackWeightSubtotal')};
  if(id==='../item-state')return {getItemState:stubOnly('getItemState'),restoreItemResource:(state,requested)=>{
    adapterCalls.restore++;const maximum=state.resource.kind==='durability'?30:12;const restored=Math.min(maximum-state.resource.current,requested);
    return {state:{...state,resource:{...state.resource,current:state.resource.current+restored}},restored,unused:requested-restored};
  }};
  if(id==='../combat/combat-risk')return {reduceRiskTier:(tier,amount)=>['none','low','medium','high','very-high'][Math.max(0,['none','low','medium','high','very-high'].indexOf(tier)-amount)]};
  if(id==='../config')return {deepFreeze:freeze};
  if(id==='../residence-task/validation')return {materialInputsSchema:tag()};
  if(id==='../residence-task/plans')return {consumeSupplyRecipe:(v,inputs)=>{
    adapterCalls.recipe++;ensure(inputs.length===1&&inputs[0].quantity===1,'fixture recipe');const id=inputs[0].instanceId;
    ensure(v.carried.backpack.items.some(i=>i.instanceId===id),'fixture material');
    return {...v,carried:{...v.carried,backpack:{...v.carried.backpack,items:v.carried.backpack.items.filter(i=>i.instanceId!==id)}},
      itemStates:{states:v.itemStates.states.filter(i=>i.instanceId!==id)},dispositions:[...v.dispositions,{id:'TEST-repair-material',item:v.carried.backpack.items.find(i=>i.instanceId===id),reason:'recipe',binding,revision:v.character.revision}]};
  }};
  if(id==='./cycle-adapter')return {supplyPaidCost:(_v,amount)=>({kind:'paid',amount}),supplyEnergyQuery:v=>({canStart:v.character.body.energy>0}),supplyBodyAction:(v,_deps,_kind,cost)=>{
    adapterCalls.g1Action++;return {snapshot:{...v.character,revision:v.character.revision+1,body:{...v.character.body,energy:Math.max(0,v.character.body.energy-cost.amount)}},steps:[],cost};
  }};
  if(id==='../residence-terminal/validation')return {same};
  if(id==='../residence-supply/config'||id==='./config')return {numberValue:(c,k)=>{ensure(typeof c.values[k]==='number','fixture config '+k);return c.values[k]},tableFieldValue:()=>({metal:1})};
  if(id==='../random')return {createStreamId:stream};
  if(id==='./dependencies')return {requireCombatDependencies:d=>d};
  if(id==='./projection')return {projectCombat:v=>{adapterCalls.projection++;const b=v.battle;ensure(b.currentCtb===b.playerNext&&b.playerNext<=b.enemyNext,'projected queue');return {}}};
  throw Error('UNDECLARED IMPORT '+id)
};vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{console})(req,module,module.exports);loaded[name]=module.exports;return module.exports}
const {readCombatValue}=load('validation');const {planCombatMaintenance}=load('stable');
const identity={characterId:'TEST-character',rulesVersion:'TEST-rules',configurationId:'TEST-G1'};
const mission={commissionId:'TEST-commission'};const execution={runId:'TEST-run',seed:'TEST-seed',rulesVersion:'TEST-rules'};
const binding={identity,mission,execution,catalogId:'TEST-catalog',catalogVersion:'TEST-content'};
const definition={id:'infected-world-orderly',maxHealth:14,initialIntentActionId:'orderly-basic',actionCycle:['orderly-basic','orderly-special'],weaknessTags:['blunt']};
const cat={data:{id:'TEST-catalog',version:'TEST-content',edges:[{id:'H1-H4:forward',from:'H1',to:'H4'}],enemies:[{id:'orderly',nodeId:'H4',definition}]},enemies:{get:id=>{ensure(id===definition.id,'known profile');return definition}}};
const deps={supply:{catalog:cat,catalogs:[cat],configuration:{values:{'combat.minimum':6,'combat.ctb_step':100,'combat.energy_step':4,'restore.metal_pool':15,'restore.coat':6,'maintenance.mechanical':5,'maintenance.coat':5}},residence:{configuration:{config:{limits:{hp:12},quota:{pipe_signature:1},health:{bleed_action:1}}}},tasks:{data:{items:[{alias:'bandage',id:'consumable_bandage'},{alias:'painkiller',id:'consumable_painkiller'}]}}},profiles:[{definitionId:definition.id,maxHealth:14,firstEnemyCtb:70,reentryEnemyCtb:50,reentryPlayerCtb:0,actions:[{actionId:'orderly-basic',ctb:100,damage:3,exposureRiskTier:'none'},{actionId:'orderly-special',ctb:140,damage:7,exposureRiskTier:'high'}],rules:{metalPipe:{basicAttack:{ctb:100,damage:4,durabilityCost:1}},bandage:{combatCtb:80,healthRecovery:1},postPlayerActionBleedingDamage:1}}]};
Object.assign(deps.profiles[0],{bluntActionDelayBonus:60,rules:{
 player:{maxHealth:12},metalPipe:{maxDurability:30,basicAttack:{ctb:100,damage:4,durabilityCost:1},chargedStrike:{ctb:180,damage:6,durabilityCost:3,enemyActionDelay:140}},
 armorMaximum:12,heavyCoat:{integrityCostPerAttack:1,directDamageReduction:1,injuryRiskTierReduction:1,exposureRiskTierReduction:1},
 defend:{ctb:80,remainingDamagePercent:50,injuryRiskTierReduction:1},temporaryAttack:{ctb:180,damage:2},
 escape:{baseCtb:{normal:80,loaded:80,overloaded:120},ctbPerUntreatedOpenWound:20,woundCtbBonusCap:60},
 bandage:{combatCtb:80,healthRecovery:1,stopsBleeding:true},painkiller:{combatCtb:80,escapeWoundCtbReduction:40},postPlayerActionBleedingDamage:1,backpack:{}
}});
deps.profiles[0].actions[0].injuryKind='laceration';deps.profiles[0].actions[0].injuryRiskTier='high';
deps.profiles[0].actions[1].injuryKind='bite';deps.profiles[0].actions[1].injuryRiskTier='very-high';
function entry(hp=12){return {id:stream('residence-battle-v1',execution.runId,'4','orderly'),binding,revision:4,baseRevision:3,edgeId:'H1-H4:forward',from:'H1',to:'H4',enemyId:'orderly',enemyInstanceId:'orderly',definitionId:definition.id,previouslyEncountered:false,enemyHealth:14,intent:'orderly-basic',nextCycleIndex:1,actionCount:0,riskIndex:0,healthBefore:hp,healthAfter:hp,steps:[{kind:'primary',healthBefore:hp,healthAfter:hp,facts:{healthLoss:0,exposures:0}}]}}
const item=(id,definitionId)=>({instanceId:id,definitionId,quantity:1});
const pipe=item('TEST-pipe','weapon_metal_pipe'),coat=item('TEST-coat','armor_heavy_coat'),bandage=item('TEST-bandage','consumable_bandage');
function queue(kind,playerEnd,enemyEnd=170,terminal=false){return [{reason:kind==='escape'?'escape-preparation-scheduled':'player-action-scheduled',currentBefore:0,currentAfter:0,playerBefore:0,playerAfter:playerEnd,enemyBefore:70,enemyAfter:70},{reason:terminal?'enemy-action-terminal':'enemy-action-resolved',currentBefore:0,currentAfter:70,playerBefore:playerEnd,playerAfter:playerEnd,enemyBefore:70,enemyAfter:terminal?70:enemyEnd},...(terminal?[]:[{reason:kind==='escape'?'escape-completed':'player-decision-point',currentBefore:70,currentAfter:playerEnd,playerBefore:playerEnd,playerAfter:playerEnd,enemyBefore:enemyEnd,enemyAfter:enemyEnd}])]}
function row(kind,ctb,requested,actual,before,after,actionId=kind==='heal'?'combat-bandage':kind==='post-action-bleeding'?'post-player-action-bleeding':'orderly-basic'){return {kind,ctb,requested,actual,healthBefore:before,healthAfter:after,actionId,reference:null}}
function decision(e){return {battleId:e.id,revision:5,baseRevision:4,command:{kind:'metal-pipe-basic-attack'},ctbBefore:0,ctbAfter:100,playerNext:100,enemyNext:170,healthBefore:12,healthAfter:10,enemyHealthBefore:14,enemyHealthAfter:10,actionCountBefore:0,actionCountAfter:1,enemyResponses:1,riskBefore:0,riskAfter:1,trace:[row('direct-damage',70,2,2,12,10)],uses:[],resources:[{instanceId:pipe.instanceId,before:30,requested:1,consumed:1,after:29},{instanceId:coat.instanceId,before:12,requested:1,consumed:1,after:11}],quotaBefore:1,quotaAfter:1,queue:queue('attack',100)}}
function base(e,d){return {protocol:'residence-combat-pure-v1',phase:'active-world',character:{identity,revision:5,cycle:1,body:{condition:{currentHealth:d.healthAfter},energy:50,quotasRemaining:{pipe_signature:d.quotaAfter}}},missions:[{status:'active',binding:{mission},execution}],carried:{equipment:{weapon:pipe,armor:coat}},lineage:[{instanceId:pipe.instanceId},{instanceId:coat.instanceId},{instanceId:bandage.instanceId}],dispositions:[],receipts:[],battles:[],combatDeaths:[],archives:[],site:{nodeId:'H4',binding,pending:{kind:'combat-required',enemyId:'orderly'},enemies:[{id:'orderly',riskDrawIndex:d.riskAfter,state:{enemyInstanceId:'orderly',definitionId:definition.id,hasBeenEncountered:true,defeated:d.enemyHealthAfter===0,currentHealth:d.enemyHealthAfter,currentIntentActionId:d.actionCountAfter%2?'orderly-special':'orderly-basic',nextCycleIndex:d.actionCountAfter%2?0:1,resolvedActionCount:d.actionCountAfter}}]},battle:{entry:e,currentCtb:d.ctbAfter,playerNext:d.playerNext,enemyNext:d.enemyNext,temporaryDefense:null,decision:d}}}
function active(){const e=entry();return base(e,decision(e))}
function death(bleed=false){const e=entry(1),d=decision(e);d.healthBefore=1;d.healthAfter=0;d.ctbAfter=bleed?0:70;d.playerNext=bleed?0:80;d.enemyNext=70;d.actionCountAfter=0;d.riskAfter=0;d.enemyResponses=bleed?0:1;d.enemyHealthAfter=bleed?10:14;d.resources=bleed?[d.resources[0]]:[d.resources[1]];d.command=bleed?{kind:'metal-pipe-basic-attack'}:{kind:'use-quick-slot-item',quickSlotIndex:0};d.trace=bleed?[row('post-action-bleeding',0,1,1,1,0)]:[row('heal',0,1,1,1,2),row('direct-damage',70,2,2,2,0)];d.queue=bleed?[]:queue('medicine',80,70,true);if(!bleed)d.uses=[{instanceId:bandage.instanceId,definitionId:bandage.definitionId,slot:0,dispositionIds:['TEST-use'],kind:'bandage',quantity:1}];const v=base(e,d),id=stream('residence-combat-death-v1',e.id,'5');v.phase='dead';v.missions[0].status='closed';v.archives=[{site:v.site}];v.site=null;v.battle=null;v.combatDeaths=[{id,entry:e,decision:d,revision:5}];v.receipts=[{source:'combat-death',combatDeathReceiptId:id,revision:5,binding}];v.dispositions=[...(bleed?[]:[{id:'TEST-use',reason:'medical',item:bandage,revision:4,binding}]),{id:'TEST-dead-pipe',item:pipe,reason:'terminal',revision:5,binding},{id:'TEST-dead-coat',item:coat,reason:'terminal',revision:5,binding}];v.carried.equipment={weapon:null,armor:null};return v}
function escaped(){const e=entry(),d=decision(e);d.command={kind:'escape'};d.enemyHealthAfter=14;d.ctbAfter=d.playerNext=80;d.queue=queue('escape',80);d.resources=d.resources.slice(1);const v=base(e,d);v.battle=null;v.site.nodeId='H1';v.site.pending={kind:'none'};v.battles=[{entry:e,decision:d,outcome:'escaped',exitRevision:5,elapsed:80,requestedEnergy:6,energyBefore:50,energyAfter:44,nodeId:'H1'}];v.character.body.energy=44;return v}
// Add only the newly required start evidence to these cropped TEST witnesses.
const _active=active,_death=death,_escaped=escaped;
function extend(v){
 const d=v.battle?.decision??v.combatDeaths[0]?.decision??v.battles[0]?.decision;
 d.context={enemyNext:70,bleeding:d.trace.some(t=>t.kind==='post-action-bleeding'),painkiller:false,minorContusions:0,untreatedWoundIds:[],firstBandageUsed:false,
   weapon:{instanceId:pipe.instanceId,current:30},armor:{instanceId:coat.instanceId,current:12},escapeWeight:d.command.kind==='escape'?0:null};
 v.carried.backpack={items:[],placements:[]};v.carried.quickSlots={slots:[null,null]};v.warehouse={items:[]};v.choices={specialty:'engineer',firstBandageUsed:d.uses.length>0};
 v.lineage=v.lineage.map(l=>({...l,revision:0}));
 const pipeCurrent=d.resources.filter(r=>r.instanceId===pipe.instanceId).at(-1)?.after??30;
 const coatCurrent=d.resources.filter(r=>r.instanceId===coat.instanceId).at(-1)?.after??12;
 const states=[{instanceId:pipe.instanceId,definitionId:pipe.definitionId,resource:{kind:'durability',current:pipeCurrent}},
  {instanceId:coat.instanceId,definitionId:coat.definitionId,resource:{kind:'integrity',current:coatCurrent}}];
 v.itemStates={states:v.phase==='dead'?[]:states};
 v.dispositions=v.dispositions.map(x=>({...x,state:states.find(s=>s.instanceId===x.item.instanceId)}));
 for(const site of [...v.archives.map(a=>a.site),...(v.site?[v.site]:[])])site.ground=[];
 return v;
}
const cases=[];
function add(id,make,mutate,expected,explanation){const input=extend(make());if(mutate)mutate(input);cases.push({id,input,expected,explanation})}
add('C01-active-basic100',active,null,'ACCEPT','Local legal shape for actual basic100 / enemy70+100');
add('C02-heal-then-death',()=>death(false),null,'ACCEPT','HP1 heal1 then coat-reduced2 at70');
add('C03-HP1-action-bleeding-clips0',()=>death(true),null,'ACCEPT','Legitimate final HP0 after one own-action bleed');
add('C04-escape80',escaped,null,'ACCEPT','Response70 before escape80');
add('C05-wrong-battle-id',active,v=>v.battle.entry.id='wrong','REJECT','Wrong canonical identity');
add('C06-broken-queue-adjacency',active,v=>v.battle.decision.queue[1].currentBefore=9,'REJECT','Ordinary adjacency check already effective');
add('C07-broken-HP-adjacency',()=>death(false),v=>v.combatDeaths[0].decision.trace[1].healthBefore=3,'REJECT','Arithmetic adjacency check already effective');
add('C08-bool-trace',()=>death(false),v=>v.combatDeaths[0].decision.trace[1].requested=true,'REJECT','Explicit adapter duplicates numeric schema only');
add('C09-site-latest-HP',active,v=>v.site.enemies[0].state.currentHealth=11,'REJECT','Unique-state projection mismatch');
add('C10-repeat-exit',escaped,v=>v.battles.push(structuredClone(v.battles[0])),'REJECT','Duplicate battle already rejected');
add('C11-wrong-fee',escaped,v=>v.battles[0].requestedEnergy=12,'REJECT','Exit arithmetic already checked');
add('C12-wrong-medical-reference',()=>death(false),v=>v.combatDeaths[0].decision.uses[0].dispositionIds=['missing'],'REJECT','Actual disposition reference checked');
add('F01-player-basic-recovery80',active,v=>{const b=v.battle,d=b.decision;b.currentCtb=b.playerNext=d.ctbAfter=d.playerNext=80;for(const q of d.queue)for(const k of ['currentBefore','currentAfter','playerBefore','playerAfter'])if(q[k]===100)q[k]=80},'REJECT','Basic profile CTB100 cannot become80 solely by consistent queue rewrite');
add('F01-enemy-interval430',active,v=>{const b=v.battle,d=b.decision;b.enemyNext=d.enemyNext=500;for(const q of d.queue)for(const k of ['enemyBefore','enemyAfter'])if(q[k]===170)q[k]=500},'REJECT','Orderly basic response at70 must schedule170, not500');
add('F01-escape-complete75',escaped,v=>{const r=v.battles[0],d=r.decision;r.elapsed=d.ctbAfter=d.playerNext=75;for(const q of d.queue)for(const k of ['currentBefore','currentAfter','playerBefore','playerAfter'])if(q[k]===80)q[k]=75},'REJECT','No wound, no load change; approved escape80 cannot75');
add('F02-death-trace-after-exit',()=>death(false),v=>v.combatDeaths[0].decision.trace[1].ctb=999,'REJECT','Death body event cannot occur after its recorded70CTB endpoint');
add('F02-death-wrong-action-source',()=>death(false),v=>v.combatDeaths[0].decision.trace[1].actionId='porter-basic','REJECT','Orderly cannot cause a porter-basic death record');
add('F02-death-damage-inflated99',()=>death(false),v=>v.combatDeaths[0].decision.trace[1].requested=99,'REJECT','Orderly basic3 with actual coat protection is2, not99 even when HP clips');
add('F02-bleed-request2-clips1',()=>death(true),v=>v.combatDeaths[0].decision.trace[0].requested=2,'REJECT','Actual G1 combat bleed requested1 cannot become2 merely because HP1 clips');
add('F02-bleed-wrong-source',()=>death(true),v=>v.combatDeaths[0].decision.trace[0].actionId='orderly-special','REJECT','post-action-bleeding requires its actual player checkpoint source');

function maintenanceBase(mode){
 const v=extend(escaped()),r=v.battles[0],d=r.decision;
 if(mode==='victory'){
  d.command={kind:'metal-pipe-basic-attack'};d.baseRevision=6;d.revision=7;d.ctbBefore=d.ctbAfter=d.playerNext=280;d.context.enemyNext=d.enemyNext=410;d.context.escapeWeight=null;
  d.enemyHealthBefore=2;d.enemyHealthAfter=0;d.actionCountBefore=d.actionCountAfter=1;d.riskBefore=d.riskAfter=1;d.enemyResponses=0;
  d.healthBefore=d.healthAfter=10;d.trace=[];d.queue=[];d.context.weapon.current=29;d.context.armor.current=11;
  d.resources=[{instanceId:pipe.instanceId,before:29,requested:1,consumed:1,after:28}];
  r.outcome='victory';r.exitRevision=7;r.elapsed=280;r.requestedEnergy=12;r.energyBefore=50;r.energyAfter=38;r.nodeId='H4';
  v.character.revision=7;v.character.body.energy=38;v.site.nodeId='H4';v.site.enemies[0].state.currentHealth=0;v.site.enemies[0].state.defeated=true;
  v.itemStates.states.find(s=>s.instanceId===pipe.instanceId).resource.current=28;
 }else{
  // Independent start-resource evidence only: cropped TEST pre-battle weapon already worn once.
  d.context.weapon.current=29;v.itemStates.states.find(s=>s.instanceId===pipe.instanceId).resource.current=29;
 }
 const metal=item('TEST-metal','TEST-metal-definition');v.carried.backpack.items.push(metal);v.carried.backpack.placements.push({instanceId:metal.instanceId,x:0,y:0,rotated:false});
 v.itemStates.states.push({instanceId:metal.instanceId,definitionId:metal.definitionId,resource:{kind:'none'}});v.lineage.push({instanceId:metal.instanceId,revision:0});
 return v;
}
for(const mode of ['escape','victory']){
 cases.push({id:'M-'+mode+'-original-closed-reads',input:maintenanceBase(mode),expected:'ACCEPT',operation:'read',explanation:'Original cropped closed value must pass before private maintenance candidate'});
 for(const kind of ['mechanical','coat'])for(const changedRevision of [false,true]){
  const input=maintenanceBase(mode);if(changedRevision)input.character.revision++;
  cases.push({id:'M-'+mode+'-'+kind+(changedRevision?'-after-separate-revision':'-immediate'),input,expected:'ACCEPT',operation:'maintenance',maintenanceKind:kind,
   explanation:changedRevision?'TEST-only revision shift simulates an intervening valid command; not a proposed workaround':'Same-revision private repair candidate after closed battle should be valid'});
 }
}
cases.push({id:'G-raw-active-resource-tamper',input:(()=>{const v=extend(active());v.itemStates.states[0].resource.current++;return v})(),expected:'REJECT',operation:'read'});
cases.push({id:'G-raw-closed-resource-tamper',input:(()=>{const v=maintenanceBase('escape');v.itemStates.states[0].resource.current++;return v})(),expected:'REJECT',operation:'read'});
const rows=[];for(const c of cases){const pre=JSON.stringify(c.input),depsBefore=JSON.stringify(deps);let actual,exception=null,detail=null;const countsBefore={...adapterCalls};let originalRead=false;
try{if(c.operation==='maintenance'){
 readCombatValue(c.input,deps);originalRead=true;
 const req={kind:c.maintenanceKind,expectedRevision:c.input.character.revision,inputs:[{instanceId:'TEST-metal',quantity:1}],
 ...(c.maintenanceKind==='mechanical'?{allocations:[{instanceId:pipe.instanceId,amount:15}]}:{instanceId:coat.instanceId})};
 planCombatMaintenance(c.input,req,{dependencies:deps});
}else readCombatValue(c.input,deps);actual='ACCEPT'}catch(e){actual=e instanceof DomainError?'REJECT':'EXCEPTION';detail=e.message;if(actual==='EXCEPTION')exception=e.stack}const unchanged=pre===JSON.stringify(c.input)&&depsBefore===JSON.stringify(deps);const callDelta=Object.fromEntries(Object.keys(adapterCalls).map(k=>[k,adapterCalls[k]-countsBefore[k]]));rows.push({...c,originalRead,callDelta,actual,detail,exception,inputUnchanged:unchanged,matched:actual===c.expected&&!exception&&unchanged})}
const result={kind:'ISOLATED_EXACT_SOURCE_NOT_NATIVE_AGGREGATE',sha:'8512c991adb353775ffa4785599a011e419a81fa',adapters:['TypeScript transpile only','Zod/parse: strict trace adapter; outer aggregate clone (NOT full schema)','supply/G1/G2 validation and profile issuance: substituted; cropped TEST data','projection: boundary-only adapter','identity/config/equality/ensure primitives: local adapters','Maintenance authority/issuance, recipe consumption, resource restore, G1 effect and Zod: explicitly substituted; ORIGINAL stable + shared-maintenance control flow invoked','Mechanical/coat cost 5 is TEST adapter data, not approved production configuration; no claim of native reachability or IO' ],sourceIntegrity:manifest,summary:{total:rows.length,matched:rows.filter(r=>r.matched).length,mismatched:rows.filter(r=>!r.matched).length,exceptions:rows.filter(r=>r.exception).length,adapterCalls},rows};
fs.writeFileSync(path.join(__dirname,'isolated-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));for(const r of rows)console.log(r.id,r.expected,'=>',r.actual,r.detail||'',JSON.stringify(r.callDelta));process.exitCode=result.summary.mismatched?1:0;
