// Mainline isolated checks: exact Git blobs, but synthetic partial domain inputs.
// This is NOT a whole-game/native P/R/S route and NOT a browser test.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const ts = require(require('node:child_process').execFileSync('npm', ['root', '-g'], {encoding: 'utf8'}).trim() + '/typescript');
const dir = process.cwd();
const repoRoot = process.argv[2];
if (!repoRoot) throw new Error('Usage: node REPRO.cjs /path/to/checkout-at-afbb');
const sourcePaths = { 'receipt.ts': 'src/state/residence-session/narrative-entry/receipt.ts', 'issuer.ts': 'src/app/infected-preplay/narrative-entry/issuer.ts' };
const blobs = { 'receipt.ts': '293020c84edfbaa5c6ca9d5399c52ea0bcf8550a', 'issuer.ts': 'cd61fe9e5c9f8c414a6dbeca430b95e6e818979f' };
function load(file) {
 const bytes = fs.readFileSync(path.join(repoRoot, sourcePaths[file]));
 const hash = crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
 if(hash!==blobs[file]) throw new Error(`Source mismatch: ${file}`);
 const js=ts.transpileModule(bytes.toString('utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports,Object,Number,JSON,Error},{filename:file});return module.exports;
}
const {explorationReceipt}=load('receipt.ts'),{explorationText}=load('issuer.ts');
const copy=x=>JSON.parse(JSON.stringify(x));
function pair(source='H2-search',method='lit') {
 const node = source==='T1-exchange'?'T1':'H2';
 const before={phase:'active-world', character:{revision:6,identity:{characterId:'test-character'}},
  site:{nodeId:node,binding:{execution:{runId:'test-run'}},ground:[{nodeId:node,items:[]}],facts:[]},
  itemStates:{states:[{instanceId:'test-tool',resource:{kind:method==='crow'?'durability':'charge',current:10}}]},
  productions:[],carried:{backpack:{items:[]}}};
 const after=copy(before);after.character.revision=7;
 after.productions=[{kind:'source',producerId:source,revision:6,binding:copy(before.site.binding)}];
 const command={kind:'source',command:{expectedRevision:6,sourceId:source}};
 if (source==='T1-exchange') { after.carried.backpack.items=[{instanceId:'food-output',definitionId:'food',quantity:2}];
  command.command.inputs=[{instanceId:'bandage-input',quantity:1},{instanceId:'disinfect-input',quantity:1}];
  command.command.placements=[{x:0,y:0,rotated:false}];
 }else{command.command.method=method;
  if(method!=='dark'){command.command.toolInstanceId='test-tool';after.itemStates.states[0].resource.current=8;}
  after.site.ground[0].items=[{instanceId:'found-item',quantity:1}];
 }
 return {before,after,command};
}
function call(p){try{return {value:explorationReceipt(p.before,p.after,p.command),threw:false}}catch(e){return {value:null,threw:true,error:String(e)}}}
const rows=[];
let p=pair(),r=call(p);rows.push({case:'positive-lit-search',contract:'PASS',actual:r.value,assertion:r.value?.kind==='search'&&r.value.story==='H03'&&r.value.method==='lit'&&r.value.resource?.spent===2});
p=pair('H2-search','dark');r=call(p);rows.push({case:'positive-dark-search',contract:'PASS',actual:r.value,assertion:r.value?.method==='dark'&&r.value.resource===null});
p=pair('L1-cabinet','crow');p.before.itemStates.states[0].resource.current=1;p.after.itemStates.states[0].resource.current=0;r=call(p);rows.push({case:'positive-actual-truncated-resource',contract:'PASS',actual:r.value,assertion:r.value?.resource?.spent===1});
p=pair('T1-exchange');r=call(p);rows.push({case:'exchange-misclassified-as-search',contract:'FAIL',actual:r.value,feed:r.value?explorationText(r.value):null,assertion:r.value?.kind==='search'&&r.value.story===null,limit:'Synthetic inputs reproduce the receipt branch; native exchange exists in supply-faults.test.ts but was not executed here.'});
p=pair();p.after.character.identity.characterId='other-character';r=call(p);rows.push({case:'supported-search-wrong-binding-silently-null',contract:'FAIL',actual:r.value,threw:r.threw,assertion:r.value===null&&!r.threw,limit:'Defensive projection-contract gap. Not evidence of a reachable normal corrupted commit or cross-character save corruption.'});
p=pair();p.after.itemStates.states=[];r=call(p);rows.push({case:'supported-search-missing-tool-state-silently-null',contract:'FAIL',actual:r.value,threw:r.threw,assertion:r.value===null&&!r.threw,limit:'Same defensive finding; facade only reports explorationDiagnostic on throw, not on null.'});
if(rows.some(x=>!x.assertion)) throw new Error('An observation did not reproduce');
const out={sha:'afbb0178fc29a533487fa5208b71ba92b94354c5',sourceBlobs:blobs,mode:'actual transpiled pure modules + explicitly synthetic partial inputs',wholeGameTests:'NOT RUN',browser:'NOT RUN',observations:rows};
fs.writeFileSync(path.join(dir,'independent-results.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
