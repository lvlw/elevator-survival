// Mainline isolated function harness. NOT a native aggregate/codec test.
// Runs the exact hash-checked TS function, replacing ONLY imported utilities.
const fs = require('node:fs'); const path = require('node:path');
const vm = require('node:vm'); const crypto = require('node:crypto');
let ts;
try { ts = require(process.env.TYPESCRIPT_MODULE || 'typescript'); }
catch { ts = require('/usr/local/slides_js/node_modules/typescript'); }
const sourcePath = path.resolve(process.argv[2] || path.join(__dirname, '../source/supply-history.ts'));
const bytes = fs.readFileSync(sourcePath);
const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
if (blob !== '57aa42a2947870863c8254a716e7592032d875d2') throw Error('source Git blob mismatch');
const compiled = ts.transpileModule(bytes.toString('utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
class SaveError extends Error { constructor(code, msg) { super(msg); this.code=code; } }
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const utilities = {
 '../../core/residence-config/validation': {safeAdd:(a,b)=> {const c=a+b;if(!Number.isSafeInteger(c))throw Error('unsafe');return c;}},
 '../../core/residence-location/validation': {carriedItems:c=>[...c.backpack.items,...Object.values(c.equipment).filter(Boolean),...c.quickSlots.slots.filter(Boolean)]},
 '../../core/residence-terminal/validation': {same}, './supply-types':{SupplyResidenceSaveError:SaveError}
};
const mod={exports:{}};
vm.runInNewContext(compiled, {exports:mod.exports, module:mod, require:id=>{if(!(id in utilities))throw Error('unexpected import '+id);return utilities[id];}});
const check=mod.exports.validateSupplyResidenceHistory;
const execution={runId:'test-execution',seed:'test-seed',rulesVersion:'test-rules'};
const mission={worldId:'test-world',templateId:'test-template',commissionId:'test-commission',rulesVersion:'test-rules',contractVersion:'test-contract'};
const binding={identity:{characterId:'test-character',rulesVersion:'test-rules',configurationId:'test-config'},mission,execution,catalogId:'test-catalog',catalogVersion:'test-content'};
const cfg={limits:{hp:12,energy:100,days:7,satiety:6},rest:{A:100,C:85},health:{bleed_action:1,bleed_night:2},quota:{suppressant:1,disinfectant:1,pipe_signature:1}};
const deps={residence:{configuration:{config:cfg}},terminal:{config:{balance_max:2147483647,success_reward:120}},tasks:{data:{goal:{return:'H0',facts:['power','transfer']},items:[]}},catalog:{data:{items:[]}}};
function action(day=1){
 const steps=[{kind:'primary',healthBefore:1,healthAfter:1,facts:{healthLoss:0,exposuresAdded:0}},{kind:'action-bleeding',healthBefore:1,healthAfter:0,facts:{damage:1}}];
 const v={phase:'dead',character:{revision:2,cycle:day,clock:{kind:'active',mission,execution,startCycle:1,taskDay:day},body:{condition:{currentHealth:0,bleeding:true,pendingInfectionExposures:0,painkillerActive:false},suppression:0,infectionProgress:0,satiety:6,energy:90,quotasRemaining:cfg.quota}},
 missions:[{status:'closed',binding:{characterId:'test-character',mission},execution,outcome:'death'}],
 receipts:[{binding,outcome:'death',source:'supply-death',startCycle:1,endCycle:day,taskDay:day,revision:2,before:0,steps,dispositionIds:[]}],
 archives:[{site:{binding,nodeId:'H1',pending:{kind:'none'},ground:[],facts:[]}}],
 dispositions:[],carried:{backpack:{items:[]},equipment:{weapon:null,armor:null,utility:null},quickSlots:{slots:[]}},warehouse:{items:[]},site:null,allocations:[],origins:[]};
 return structuredClone(v);
}
function cycle(day=7,source='deadline') {const v=action(day);v.receipts[0].source=source;v.receipts[0].steps=[{kind:'cycle-bleeding',healthBefore:1,healthAfter:0,facts:{damage:1}}];return v;}
function normal(){const v=action(7),r=v.receipts[0];r.source='normal-return';r.outcome='voluntary-failure';r.steps=[];v.phase='living-hub';v.missions[0].outcome=r.outcome;v.archives[0].site.nodeId='H0';v.character.body.condition.currentHealth=12;v.character.clock={kind:'return-due',source:{mission,execution,startCycle:1,endCycle:7,taskDay:7,outcome:r.outcome}};return v;}
const rows=[];
function run(id,make,expected){const v=make();const before=JSON.stringify(v);let actual='accept',code=null,error=null;
try{check(v,deps);}catch(e){actual=e instanceof SaveError?'reject':'crash';code=e.code||null;error=e.message;}
rows.push({id,expected,actual,match:actual===expected,inputUnchanged:before===JSON.stringify(v),code,error});}
run('C01_action_bleed_HP1',()=>action(),'accept');
run('C02_primary_loss_then_bleed_HP1',()=>{const v=action();v.receipts[0].steps[0].healthBefore=2;v.receipts[0].steps[0].facts.healthLoss=1;return v;},'accept');
run('C03_deadline_clipped_night_bleed_HP1',()=>cycle(),'accept');
run('C04_Day6_rest_death',()=>cycle(6,'supply-death'),'accept');
run('C05_Day7_action_death',()=>action(7),'accept');
run('C06_Day7_normal_return_empty_steps',()=>normal(),'accept');
run('N01_damage_field_inconsistent',()=>{const v=action();v.receipts[0].steps[1].facts.damage=0;return v;},'reject');
run('N02_wrong_order',()=>{const v=action();v.receipts[0].steps.reverse();return v;},'reject');
run('N03_continues_after_zero',()=>{const v=action();v.receipts[0].steps.push(v.receipts[0].steps[1]);return v;},'reject');
run('N04_deadline_at_H0',()=>{const v=cycle();v.archives[0].site.nodeId='H0';return v;},'reject');
run('N05_death_as_normal_return',()=>{const v=action();v.receipts[0].source='normal-return';return v;},'reject');
run('N06_latest_HP_contradiction',()=>{const v=action();v.character.body.condition.currentHealth=1;return v;},'reject');
run('F01_A_action_bleed_HP2_to0_damage2',()=>{const v=action();const [a,b]=v.receipts[0].steps;a.healthBefore=a.healthAfter=b.healthBefore=2;b.facts.damage=2;return v;},'reject');
run('F01_B_cycle_bleed_HP3_to0_damage3',()=>{const v=cycle();v.receipts[0].steps[0].healthBefore=3;v.receipts[0].steps[0].facts.damage=3;return v;},'reject');
run('F01_C_Day7_deadline_relabel_supply_death',()=>cycle(7,'supply-death'),'reject');
run('F01_D_Day7_deadline_relabel_location_death',()=>cycle(7,'location-death'),'reject');
const output={mode:'ISOLATED_ORIGINAL_FUNCTION_WITH_UTILITY_STUBS_NOT_NATIVE_CODEC',sourcePath:'src/state/residence-save/supply-history.ts',sourceGitBlob:blob,
 sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),commit:'346902461c3fd1f01ec88132d4d2e7c3ef1d50bd',
 fixtures:'Minimal projection for history-function isolation; NOT full P-valid snapshots.',total:rows.length,matched:rows.filter(r=>r.match).length,mismatched:rows.filter(r=>!r.match).length,crashes:rows.filter(r=>r.actual==='crash').length,rows};
console.log(JSON.stringify(output,null,2));
process.exitCode=output.mismatched||output.crashes?1:0;
