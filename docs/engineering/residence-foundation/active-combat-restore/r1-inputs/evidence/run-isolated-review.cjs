// Exact source modules are transpiled without edits. Imported dependency adapters are explicit.
// This is NOT native P/codec execution and does NOT authenticate the fabricated small TEST input.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ts = require(process.env.TYPESCRIPT_PATH || '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const root=path.resolve(__dirname,'..');
const {isDeepStrictEqual:same}=require('util');
class DataError extends Error { constructor(code,message){super(message);this.code=code;} }
class CSaveError extends DataError {}
const classes={CombatResidenceSaveError:CSaveError};
for(const n of ['ResidenceError','MissionLifecycleError','LocationError','SupplyError','TerminalError','CombatError','InventoryError','ItemStateError','QuickSlotError','ConditionError']) classes[n]=class extends DataError{};
const ensure=(ok,reason)=>{if(!ok)throw new DataError('INVALID_STATE',reason)};
const unused=()=>{throw new Error('Unexpected dependency in isolated path')};
const carriedItems=c=>[...c.backpack.items,...Object.values(c.equipment).filter(Boolean),...c.quickSlots.slots.filter(Boolean)];
const safeAdd=(a,b)=>{const n=a+b;ensure(Number.isSafeInteger(n),'unsafe sum');return n};
const traceAdapter=(effects,hp,ctb)=>effects.filter(e=>e.kind==='player-health-lost').map(e=>({
 kind:e.source==='post-player-action-bleeding'?'post-action-bleeding':'direct-damage', actionId:e.source,
 requested:e.requestedLoss,actual:e.actualLoss,healthBefore:e.healthBefore,healthAfter:e.healthAfter,ctb,reference:null}));
const requireAdapter=id=>{
 if(id==='./combat-types')return {CombatResidenceSaveError:CSaveError};
 if(id.endsWith('/types')||id.endsWith('-errors'))return classes;
 if(id.includes('residence-terminal/validation'))return {same};
 if(id.endsWith('residence-config/validation'))return {safeAdd,parseResidence:unused};
 if(id.endsWith('residence-supply/shared-validation'))return {ensure,cycleContext:unused,requireSupplyDomainAction:unused};
 if(id.endsWith('residence-location/validation'))return {carriedItems};
 if(id==='./trace')return {combatBodyTrace:traceAdapter,verifyCombatBodyTrace:(rows,b,a)=>{ensure(rows.at(-1).healthAfter===a,'adapter trace result')}};
 if(id==='./history-context')return {captureDecisionContext:()=>({isolated:true})};
 if(id.endsWith('residence-supply/allocations'))return {consumeSupplyUnits:unused};
 if(id.endsWith('/config'))return {deepFreeze:v=>v};
 if(id.endsWith('mission-lifecycle/controlled'))return {terminateMission:(m,r)=>({...m,status:'terminated',outcome:r.outcome})};
 if(id.endsWith('/random'))return {createStreamId:(...args)=>args.join('|')};
 if(id==='./settlement-shared')return {settleTerminalBalance:(balance,outcome)=>{ensure(outcome==='death','only death adapter');return {before:balance,reward:0,penalty:0,forfeited:balance,balance:0}}};
 if(id==='zod'||id.endsWith('/character-cycle')||id.endsWith('/provenance')||id.endsWith('/plans')||id==='./plans')return new Proxy({}, {get:()=>unused});
 throw new Error('Undeclared adapter '+id);
};
const wanted={'combat-body-history.ts':'ab278b056b5ecd6623e74a4c25cc61b0338fd315','effects.ts':'c36cf73bd235bf124881612fdb2264b0d12de856','supply-settlement-shared.ts':'5944faf16f5b76afa983714660c5fe7a4a27adc6'};
const integrity=[];
function load(name,mutate){const buf=fs.readFileSync(path.join(root,'source',name));const git=crypto.createHash('sha1').update(Buffer.from(`blob ${buf.length}\0`)).update(buf).digest('hex');if(git!==wanted[name])throw Error('Source fingerprint differs '+name);
 integrity.push({file:name,git_blob:git,bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
 const code=ts.transpileModule(mutate?mutate(buf.toString()):buf.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',code)(requireAdapter,module,module.exports);return module.exports;}
const effects=load('effects.ts'),settlement=load('supply-settlement-shared.ts');
const body=load('combat-body-history.ts');
const rows=[];
function produce(deadEnemy,command='metal-pipe-basic-attack'){
 const binding={identity:{characterId:'TEST'},execution:{runId:'TEST-run'},mission:{commissionId:'TEST-commission'}};
 const entry={id:'TEST-battle',binding,enemyId:'orderly',to:'H4',from:'H1',revision:4};
 const carried={backpack:{items:[],placements:[]},equipment:{weapon:null,armor:null,utility:null},quickSlots:{slots:[]}};
 const enemy={currentHealth:deadEnemy?4:14,resolvedActionCount:1,defeated:false};
 const before={phase:'active-world',character:{revision:7,cycle:1,clock:{kind:'active',execution:binding.execution,startCycle:1,taskDay:1},body:{condition:{currentHealth:1,bleeding:true},quotasRemaining:{pipe_signature:1}}},
  site:{binding,nodeId:'H4',pending:{kind:'combat-required',enemyId:'orderly'},enemies:[{id:'orderly',state:enemy,riskDrawIndex:1}],ground:[]},
  battle:{entry,currentCtb:280},carried,itemStates:{states:[]},choices:{firstBandageUsed:false},origins:[],allocations:[],dispositions:[],archives:[],witnesses:[],receipts:[],battles:[],combatDeaths:[],balance:0,
  warehouse:{items:[],itemStates:{states:[]}},missions:[{status:'active',binding}]};
 const deps={supply:{residence:{scope:{},configuration:{config:{quota:{pipe_signature:1},limits:{hp:12}}}},terminal:{config:{}},tasks:{data:{items:[]}}}};
 const resolved={snapshot:{...carried,itemStates:{states:[]},playerCondition:{currentHealth:0,bleeding:true},enemy:{...enemy,currentHealth:deadEnemy?0:10,defeated:deadEnemy},usage:{metalPipeChargedStrikeUses:command==='metal-pipe-charged-strike'?1:0},currentCtb:280,playerNextActionCtb:280,enemyNextActionCtb:370,status:'defeat'},
  plan:{command:{kind:command},effects:[{kind:'player-health-lost',source:'post-player-action-bleeding',healthBefore:1,requestedLoss:1,actualLoss:1,healthAfter:0}]}};
 const p=effects.composeCombatResolution(before,resolved,deps);
 const receipt={id:'TEST-death',entry,decision:p.battle.decision,revision:p.character.revision};
 const final=settlement.settleSupplyDomain(before,{...p,battle:null,combatDeaths:[receipt]},'death','combat-death',[],deps.supply,receipt.id);
 ensure(final.phase==='dead'&&final.site===null,'archive formation failed');
 ensure(same(final.archives[0].site,p.site),'archive changed resolved site');
 return final;
}
function run(id, value, shouldAccept, reader=body.validateCombatDeathClosure){const saved=structuredClone(value);let observed='ACCEPT',error=null;
 try{reader(value,0,ensure)}catch(e){observed=e instanceof DataError?'REJECT':'EXCEPTION';error={name:e.name,code:e.code??null,message:e.message}}
 rows.push({id,expected:shouldAccept?'ACCEPT':'REJECT',observed,matched:observed===(shouldAccept?'ACCEPT':'REJECT'),inputUnchanged:same(value,saved),error});}
run('C01-enemy-alive-death-keeps-pending',produce(false),true);
run('F01-basic-simultaneous-zero-cleared-pending',produce(true),true);
run('F02-charged-simultaneous-zero-cleared-pending',produce(true,'metal-pipe-charged-strike'),true);
const mutants={
 'wrong-source':v=>v.receipts[0].source='supply-death',
 'wrong-outcome':v=>v.receipts[0].outcome='success',
 'legacy-body-steps':v=>v.receipts[0].steps=[{kind:'primary'}],
 'foreign-binding':v=>v.receipts[0].binding={...v.receipts[0].binding,identity:{characterId:'FOREIGN'}},
 'wrong-revision':v=>v.receipts[0].revision++,
 'nonzero-final-HP':v=>v.combatDeaths[0].decision.healthAfter=1,
 'nonzero-trace-end':v=>v.combatDeaths[0].decision.trace.at(-1).healthAfter=1,
 'empty-trace':v=>v.combatDeaths[0].decision.trace=[],
 'missing-death':v=>v.combatDeaths=[],
 'wrong-node':v=>v.archives[0].site.nodeId='H0',
 'live-enemy-pending-discarded':v=>v.archives[0].site.pending={kind:'none'},
 'foreign-pending-enemy':v=>v.archives[0].site.pending.enemyId='porter'
};
for(const [k,f] of Object.entries(mutants)){const v=produce(false);f(v);run('N-'+k,v,false)}
let translated=false,visible=false;try{body.combatDataBoundary('INVALID_STATE',()=>{throw new classes.SupplyError('BAD','domain')})}catch(e){translated=e instanceof DataError&&e.code==='INVALID_STATE'}
const bug=new TypeError('TEST implementation bug');try{body.combatDataBoundary('INVALID_STATE',()=>{throw bug})}catch(e){visible=e===bug}
rows.push({id:'C02-known-error-translated',expected:true,observed:translated,matched:translated,inputUnchanged:true,error:null},
 {id:'C03-programming-error-rethrown',expected:true,observed:visible,matched:visible,inputUnchanged:true,error:null});
const result={scope:'ISOLATED source-level composition/archive/closure validation. Resolver, full schemas, provenance, real RNG and codec NOT RUN.',sha:'55fbf0f48e6a76bea3030bd77354528816581776',sourceIntegrity:integrity,
 summary:{cases:rows.length,matched:rows.filter(x=>x.matched).length,mismatched:rows.filter(x=>!x.matched).length,unexpectedExceptions:rows.filter(x=>x.observed==='EXCEPTION').length},cases:rows};
fs.writeFileSync(path.join(__dirname,'isolated-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));process.exitCode=result.summary.mismatched?1:0;
