import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../');
const loaded = new Map();
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const p = fileURLToPath(new URL(specifier, context.parentURL));
      if (!extname(p)) {
        const found = [p+'.ts', p+'/index.ts', p+'.js'].find(existsSync);
        if (found) return next(pathToFileURL(found).href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts') && url.startsWith('file:')) {
      const p = fileURLToPath(url); const bytes = readFileSync(p);
      loaded.set(p, bytes);
      return {format:'module', source:stripTypeScriptTypes(bytes.toString('utf8'), {mode:'transform'}), shortCircuit:true};
    }
    return next(url, context);
  }
});
const load = p => import(pathToFileURL(resolve(root,p)).href);
const {infectedResidenceConfig: config} = await load('src/content/infected-residence-core-v0.1/config.ts');
const {fixture, binding} = await load('src/core/residence-location/test-fixtures.ts');
const {planResidenceMove} = await load('src/core/residence-location/index.ts');
const {planCharacterCycle} = await load('src/core/character-cycle/index.ts');
const {terminateMission} = await load('src/core/mission-lifecycle/controlled.ts');
const {serializeResidenceSave, validateResidenceAggregate} = await load('src/state/residence-save/index.ts');
const {createResidenceSavePolicy, createResidenceSession, createResidenceSessionDomain} = await load('src/state/residence-session/controlled.ts');
const cases=[];
function test(id, fn) { try { fn(); cases.push({id,status:'observed-as-expected'}); } catch(e) {cases.push({id,status:'mismatch',message:e.message});} }
const f = fixture(config,{hp:1,bleeding:true});
const move={kind:'move',...binding(f.state),edgeId:'ab'};
test('P01-native-G2-death-proposal',()=> {
 const result=planResidenceMove(f.state,move,f.authorityFor(f.state),f.dependencies);
 assert.equal(result.coordination,'death-required'); assert.equal(result.snapshot.character.body.condition.currentHealth,0);
 assert.equal(result.snapshot.character.revision,1); assert.equal(f.state.character.body.condition.currentHealth,1);
});
const policy=createResidenceSavePolicy({configuration:config,rulesVersion:f.state.character.identity.rulesVersion,
 declarations:[f.lifecycle.binding.mission],catalogs:[f.dependencies.catalog]});
const active={phase:'active-world',...f.state,missions:[f.lifecycle]};
let writes=0, notices=0, stored=serializeResidenceSave(active,policy);
const session=createResidenceSession(createResidenceSessionDomain(),{policy,storage:{read:()=>stored,write:s=>{writes++;stored=s;}},
 createFirst:()=>{throw Error('unexpected factory');}});
session.subscribe(()=>notices++); session.bootstrap();
test('P02-current-G4-refuses-real-death-with-no-partial-commit',()=>{
 const before=session.getState().current;
 assert.throws(()=>session.dispatch(move),e=>e.code==='UNSUPPORTED_RESULT');
 assert.equal(session.getState().current,before); assert.equal(writes,0); assert.equal(notices,0);
});
test('P03-current-no-public-close-intent',()=>{
 assert.throws(()=>session.dispatch({kind:'close',success:true,expectedRevision:0}),e=>e.code==='INVALID_INPUT');
 assert.equal(writes,0);
});
const day7=fixture(config); const s=structuredClone(day7.state); s.character.cycle=7; s.character.clock.taskDay=7;
function cycle(kind, changed=s, normalReturn=null) {
 return planCharacterCycle(changed.character,{kind,identity:changed.character.identity,expectedRevision:changed.character.revision},
 {...day7.authorityFor(changed).cycle,normalReturn},day7.dependencies.residence);
}
test('P04-native-Day7-normal-return-no-extra-night',()=>{
 const hurt=structuredClone(s); hurt.character.body.condition.currentHealth=1; hurt.character.body.infectionProgress=130;
 const p=cycle('normal-return',hurt,'success');
 assert.equal(p.snapshot.clock.kind,'return-due'); assert.equal(p.snapshot.cycle,7);
 assert.deepEqual(p.snapshot.body,hurt.character.body); assert.deepEqual(p.steps,[]);
});
test('P05-native-Day7-live-deadline-ready-no-task-Day8',()=>{
 const p=cycle('deadline'); assert.equal(p.snapshot.cycle,8); assert.equal(p.snapshot.clock.kind,'deadline-ready');
 assert.equal(p.requiresDeadlineClosure.taskDay,7); assert.equal(p.requiresDeadlineClosure.endCycle,7);
 assert.deepEqual(p.steps.map(x=>x.kind),['cycle-bleeding','infection','hunger','end-cycle']);
});
for(const [label,hp,bleeding,progress,food,steps] of [
 ['blood',2,true,90,1,['cycle-bleeding']],
 ['infection',1,false,60,4,['cycle-bleeding','infection']],
 ['hunger',1,false,0,1,['cycle-bleeding','infection','hunger']]]) {
 test('P06-native-deadline-death-'+label,()=>{
  const v=structuredClone(s); Object.assign(v.character.body,{infectionProgress:progress,satiety:food});
  Object.assign(v.character.body.condition,{currentHealth:hp,bleeding});
  const p=cycle('deadline',v); assert.equal(p.outcome,'death'); assert.equal(p.requiresDeadlineClosure,null);
  assert.equal(p.snapshot.cycle,7); assert.equal(p.snapshot.clock.kind,'active');
  assert.deepEqual(p.steps.map(x=>x.kind),steps);
 });
}
test('P07-current-G3-rejects-closed-aggregate',()=>{
 const p=cycle('normal-return',s,'success');
 const closed=terminateMission(day7.lifecycle,{binding:day7.lifecycle.binding,execution:day7.lifecycle.execution,outcome:'success'},day7.scope);
 const pol=createResidenceSavePolicy({configuration:config,rulesVersion:s.character.identity.rulesVersion,
 declarations:[closed.binding.mission],catalogs:[day7.dependencies.catalog]});
 assert.throws(()=>validateResidenceAggregate({phase:'fresh-hub',catalogRef:{catalogId:day7.dependencies.catalog.data.id,catalogVersion:day7.dependencies.catalog.data.version},
 character:p.snapshot,missions:[closed],carried:s.carried,itemStates:s.itemStates},pol),e=>e.code==='UNSUPPORTED_STAGE');
});
test('P08-current-G4-write-failure-keeps-living-result',()=>{
 const g=fixture(config); const pol=createResidenceSavePolicy({configuration:config,rulesVersion:g.state.character.identity.rulesVersion,
 declarations:[g.lifecycle.binding.mission],catalogs:[g.dependencies.catalog]});
 let calls=0, fail=true, text=serializeResidenceSave({phase:'active-world',...g.state,missions:[g.lifecycle]},pol), notifications=0;
 const owner=createResidenceSession(createResidenceSessionDomain(),{policy:pol,storage:{read:()=>text,write:s=>{calls++;if(fail)throw Error('simulated IO');text=s;}},
 createFirst:()=>{throw Error('unexpected factory');}});
 owner.subscribe(()=>notifications++); owner.bootstrap();
 const cmd={kind:'move',...binding(g.state),edgeId:'ab'};
 const result=owner.dispatch(cmd); assert.equal(result.persistence,'save-failed'); assert.equal(result.current.character.revision,1);
 assert.throws(()=>owner.dispatch(cmd),e=>e.code==='STALE_COMMAND');
 fail=false;owner.retrySave();assert.equal(calls,2);assert.equal(notifications,1);assert.equal(owner.getState().current,result.current);
});
const fingerprints=[...loaded].map(([p,b])=>{
 const path=p.slice(root.length+1).replaceAll('\\','/');
 const ref='7ca547ab8ab4f411d1102a79baf8c0796f4b082c:'+path;
 const repositoryBytes=execFileSync('git',['show',ref],{cwd:root});
 const normalized=Buffer.from(b.toString('utf8').replaceAll('\r\n','\n'),'utf8');
 assert(normalized.equals(repositoryBytes),'Readonly source content changed: '+path);
 return {path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),
 worktreeRawBlobId:createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),
 gitBlob:execFileSync('git',['rev-parse',ref],{cwd:root,encoding:'utf8'}).trim(),
 repositoryBytes:repositoryBytes.length,repositorySha256:createHash('sha256').update(repositoryBytes).digest('hex'),
 worktreeEqualsGitAfterLFNormalization:true};
}).sort((a,b)=>a.path.localeCompare(b.path));
const result={evidence:'CURRENT_NATIVE_API_BOUNDARY_ONLY',baseSha:'7ca547ab8ab4f411d1102a79baf8c0796f4b082c',
 loader:'Node built-in TypeScript transform + extension resolution; actual imports and validators; no mocked core or validator',
 scope:'G2 isolated test catalog; no five-map content; not production test suite/browser IO/terminal candidate implementation',
 cases,mismatches:cases.filter(x=>x.status==='mismatch').length,sourceFingerprints:fingerprints};
const dest=process.argv[process.argv.indexOf('--output')+1];
assert(dest && process.argv.includes('--output'),'--output required');
writeFileSync(dest,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cases:cases.length,mismatches:result.mismatches}));
process.exitCode=result.mismatches?1:0;
