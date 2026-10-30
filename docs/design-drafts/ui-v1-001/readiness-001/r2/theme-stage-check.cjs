/* Actual design source + controlled timers; not a native browser or a combat engine. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require('jsdom');
const N=path.resolve(__dirname,'..'),D=path.dirname(N);
const porter=JSON.parse(fs.readFileSync(path.join(N,'theme/porter-test.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(N,'theme/catalog.json'),'utf8'));
const phases=['pristine','wounded','heavy-wounded','critical','disabled'];
const baseFor=i=>'../'+catalog.resources.find(r=>r.key==='enemy-porter-'+phases[i]).path;
const origin='http://localhost/';
const seam="if(typeof Readiness!=='undefined')Readiness.assetPass($('.actor.enemy'));";
function theme(group){
 if(group==='baseline')return null;
 const m=JSON.parse(fs.readFileSync(path.join(N,'theme',group+'-test.json'),'utf8'));
 return {themeId:m.metadata.themeId,replacements:Object.fromEntries(m.resources.map(r=>[path.basename(catalog.resources.find(x=>x.key===r.key).path),new URL(r.path,origin).href]))};
}
function make(screen='P15-porter',mutation='none',legacy=false){
 const dom=new JSDOM('<main id="app"></main>',{url:origin+'prototype/index.html?screen='+screen+'&view='+(screen==='P16-porter-phases'?'review':'player'),runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,scope=dom.getInternalVMContext(),pending=new Map(),scheduled=[];let id=0,validations=0,fetches=0;
 w.setTimeout=(fn,delay)=>{const entry={fn,delay,id:++id};pending.set(id,entry);scheduled.push(entry);return id;};w.clearTimeout=n=>pending.delete(n);
 w.fetch=()=>{fetches++;throw new Error('UNEXPECTED_FETCH_DURING_PRESENTATION');};
 for(const file of ['prototype/screens.js','prototype/registered-art.js','prototype/flow-context.js','prototype/nine-slice.js',...legacy?[]:['readiness-001/presentation.js'],'prototype/ui.js']){
  let source=fs.readFileSync(path.join(D,file),'utf8');
  if(mutation==='remove-dynamic-mapping'&&file==='prototype/ui.js'){assert.equal(source.split(seam).length-1,1);source=source.replace(seam,'');}
  vm.runInContext(source,scope,{filename:file});
 }
 const run=s=>vm.runInContext(s,scope);
 return {w,run,scheduled,fetches:()=>fetches,validations:()=>validations,close:()=>w.close(),act:v=>run(`act(${JSON.stringify(v)})`),
  state:()=>run('JSON.stringify({context,active,tool,specialty,selectedObject,chosen,expanded,carryTab,viewStack})'),
  async set(group,reject=false){w.__candidate=theme(group);w.__validator=async()=>{validations++;if(reject)throw new Error('HASH');return w.__candidate;};return run("Readiness.setTheme('test-fixture',__validator,()=>JSON.stringify({context,active,tool,specialty,selectedObject,chosen,stage,expanded,carryTab,viewStack}),render)");},
  flush(){const entries=[...pending.values()];pending.clear();entries.forEach(x=>x.fn());},
  actor(i,themed=true){const el=w.document.querySelector('.actor.enemy .actor-raster'),base=baseFor(i);const expected=themed?new URL(porter.resources.find(r=>r.key==='enemy-porter-'+phases[i]).path,origin).href:base;assert.equal(el.getAttribute('src'),expected,'actual actor resource after stage update');assert.equal(el.dataset.readinessBase,base,'original baseline resource retained');return el;}
 };
}
async function suite(mutation='none'){
 const rows=[];
 async function test(id,fn,screen='P15-porter',legacy=false){let x;try{x=make(screen,mutation,legacy);await fn(x);rows.push({id,pass:true});}catch(e){rows.push({id,pass:false,errorType:e.name,message:e.message,actual:e.actual,expected:e.expected});}finally{x?.close();}}
 for(const action of ['attack-demo','signature-demo'])await test(action+'-keeps-theme',async x=>{await x.set('porter');const s=x.state(),count=x.validations();x.act(action);assert.equal(x.scheduled.at(-1).delay,700);x.flush();x.actor(1);assert.equal(x.run('stage'),1);assert.equal(x.state(),s);assert.equal(x.validations(),count);assert.equal(x.fetches(),0);assert.equal(x.w.document.querySelector('.feedback').textContent,'攻击命中。');});
 await test('defense-keeps-stage-and-node',async x=>{await x.set('porter');const el=x.actor(0);x.act('defend-demo');x.flush();assert.equal(x.run('stage'),0);assert.equal(x.actor(0),el);});
 await test('continuous-stages-and-cap-three',async x=>{await x.set('porter');for(const stage of [1,2,3,3]){x.act('attack-demo');x.flush();assert.equal(x.run('stage'),stage);x.actor(stage);}assert.equal(x.validations(),1);assert.equal(x.fetches(),0);});
 await test('five-stage-independent-sample-and-fallback',async x=>{await x.set('porter');const imgs=()=>[...x.w.document.querySelectorAll('.stage-list img')];assert.equal(imgs().length,5);for(let i=0;i<5;i++){assert.equal(imgs()[i].getAttribute('src'),new URL(porter.resources.find(r=>r.key==='enemy-porter-'+phases[i]).path,origin).href);assert.equal(imgs()[i].dataset.readinessBase,baseFor(i));}await x.set('baseline');for(let i=0;i<5;i++)assert.equal(imgs()[i].getAttribute('src'),baseFor(i));},'P16-porter-phases');
 await test('dynamic-node-baseline-fallback',async x=>{await x.set('porter');x.act('attack-demo');x.flush();x.actor(1);const s=x.state();await x.set('baseline');x.actor(1,false);assert.equal(x.state(),s);});
 await test('reduced-motion-delay-zero',async x=>{await x.set('porter');x.act('reduce');x.act('signature-demo');assert.equal(x.scheduled.at(-1).delay,0);x.flush();x.actor(1);});
 await test('enable-theme-during-animation',async x=>{x.act('attack-demo');await x.set('porter');x.flush();x.actor(1);assert.equal(x.validations(),1);});
 await test('fallback-during-animation',async x=>{await x.set('porter');x.act('attack-demo');await x.set('baseline');x.flush();x.actor(1,false);assert.equal(x.validations(),2);});
 await test('different-theme-during-animation',async x=>{await x.set('porter');x.act('signature-demo');await x.set('frame');x.flush();x.actor(1,false);assert.equal(x.run('Readiness.getTheme().themeId'),theme('frame').themeId);});
 await test('rejected-theme-keeps-last-valid-mapping',async x=>{await x.set('porter');x.act('attack-demo');await assert.rejects(x.set('frame',true),/^Error: HASH$/);x.flush();x.actor(1);});
 await test('stale-callback-cannot-touch-new-context',async x=>{await x.set('porter');x.act('attack-demo');const old=x.scheduled.at(-1).fn;x.run("navigate('P15-technician')");const state=x.state(),html=x.w.document.getElementById('app').innerHTML;old();assert.equal(x.state(),state);assert.equal(x.w.document.getElementById('app').innerHTML,html);assert.equal(x.run('stage'),0);});
 await test('legacy-without-readiness',async x=>{x.act('attack-demo');x.flush();assert.equal(x.run('stage'),1);assert.equal(x.w.document.querySelector('.actor.enemy .actor-raster').getAttribute('src'),'../editable/assets/enemy-porter-wounded-v1.png');},'P15-porter',true);
 return {kind:'JSDOM_CONTROLLED_CALLBACKS_NOT_NATIVE',mutation,total:rows.length,failed:rows.filter(x=>!x.pass).length,rows};
}
if(require.main===module)(async()=>{const baseline=process.argv.includes('--before'),positive=await suite();let negative=null,detected=null;if(!baseline){negative=await suite('remove-dynamic-mapping');const row=negative.rows.find(x=>x.id==='attack-demo-keeps-theme');detected=!row.pass&&row.errorType==='AssertionError'&&row.actual==='../editable/assets/enemy-porter-wounded-v1.png'&&row.expected===new URL(porter.resources.find(r=>r.key==='enemy-porter-wounded').path,origin).href&&negative.rows.every(x=>x.pass||x.errorType==='AssertionError');}const report={positive,negative,semanticControlDetectedByActualResource:detected,pass:positive.failed===0&&(baseline||detected)};console.log(JSON.stringify(report,null,2));process.exitCode=report.pass?0:1;})();
