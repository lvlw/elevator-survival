// R2 extends the unmodified 28 mainline checks with two presentation-boundary regressions.

const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const path=require('node:path');
const base=process.argv[2], output=process.argv[3], mutate=process.argv[4]||'none';
function make(){
 const nodes=new Map(), appended=[], timers=new Map();let id=0;
 function el(key=''){
  const classes=new Set();
  return {innerHTML:'',textContent:'',className:'',dataset:{},style:{},disabled:false,
   classList:{add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v)),contains:x=>classes.has(x)},
   setAttribute(){},insertAdjacentHTML(){},addEventListener(){},focus(){},remove(){},
   querySelectorAll(){return []},querySelector(sel){return get(key+' '+sel)},
   getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:240,height:160}},get outerHTML(){return this.innerHTML},set outerHTML(x){this.innerHTML=x}};
 }
 function get(k){if(!nodes.has(k))nodes.set(k,el(k));return nodes.get(k)}
 const document={title:'',activeElement:el('active'),body:{append(e){appended.push(e)}},
  querySelector(s){if(s==='.context')return null;return get(s)},querySelectorAll(){return []},
  createElement(t){return el(t)},addEventListener(){}};
 const sandbox={console,URLSearchParams,location:{search:''},document,innerWidth:1920,innerHeight:1080,
  setTimeout(f){timers.set(++id,f);return id},clearTimeout(i){timers.delete(i)}};
 const c=vm.createContext(sandbox);
 for(const file of ['screens.js','registered-art.js','flow-context.js','nine-slice.js','ui.js']){
  let s=fs.readFileSync(path.join(base,'prototype',file),'utf8');
  if(mutate==='reset-choice'&&file==='ui.js')s=s.replace("context.domain='stable';context.initial=false;context.day=1;","tool='toolbox';specialty='engineer';context.tool=tool;context.specialty=specialty;context.domain='stable';context.initial=false;context.day=1;");
  if(mutate==='allow-sample-split'&&file==='ui.js')s=s.replace("STACKABLE.has(object.key)&&object.quantity>1?btn('拆分'","true?btn('拆分'");
  vm.runInContext(s,c,{filename:file});
 }
 return {run:s=>vm.runInContext(s,c),flush(){const a=[...timers.values()];timers.clear();a.forEach(f=>f())},
   menu:()=>appended.at(-1)?.innerHTML||'',html:()=>get('#app').innerHTML,nodes};
}
const results=[];
function test(id,fn){try{fn();results.push({id,result:'PASS'})}catch(e){results.push({id,result:'FAIL',name:e.name,error:e.message})}}
test('C01 lamp/engineer stays through confirm-help-return-depart',()=>{
 const x=make();x.run("selectSample('P01-unselected');act('tool:lamp');act('specialty:engineer');act('setup-ready');act('help:controls');act('close');act('depart')");
 assert.equal(x.run('tool'),'lamp');assert.equal(x.run('specialty'),'engineer');assert.equal(x.run('context.node'),'H0');assert.equal(x.run('context.items.length'),0);
});
test('C02 crow/survival stays across two cross-region steps',()=>{
 const x=make();x.run("selectSample('P01-unselected');act('tool:crow');act('specialty:survival');act('setup-ready');act('depart');act('cross');act('map');act('close');act('cross')");
 assert.equal(x.run('context.node'),'H0');assert.equal(x.run('context.tool'),'crow');assert.equal(x.run('context.specialty'),'survival');
});
for(const [sid,region] of [['hospital','医院'],['hotel','酒店'],['power','供电所'],['logistics','物流'],['communication','通信']])
 test('C-map-'+sid,()=>{const x=make();x.run(`selectSample('P03-${sid}');act('map')`);const h=x.run('content()');assert(h.includes(region+' / 已获知识'));assert(!h.includes('>医院 / 已获知识')||region==='医院')});
for(const [sid,domain] of [['P21-enemy-alive','dead'],['P24-corrupt','error'],['P18-success','living-hub']])
 test('C-view-'+sid,()=>{const x=make();x.run(`selectSample('${sid}')`);const before=x.run('JSON.stringify(context)');x.run("act('help:health');act('close')");assert.equal(x.run('JSON.stringify(context)'),before);assert.equal(x.run('context.domain'),domain);assert.equal(x.run('active.id'),sid)});
for(const [e,node] of [['orderly','H1'],['porter','L1'],['technician','C1']])
 test('C-retreat-'+e,()=>{const x=make();x.run(`selectSample('P15-${e}');act('retreat')`);x.flush();assert.equal(x.run('context.node'),node);assert.equal(x.run('context.domain'),'stable')});
test('C-object-sample no split/consume menu',()=>{
 const x=make();x.run("selectSample('P10-inventory');menu(20,20,{dataset:{objectRef:context.items.find(i=>i.key==='sample').ref}})");
 assert(!x.menu().includes('organize:split'));assert(!x.menu().includes('use-selected'));assert(x.menu().includes('密封病原样本箱'));
});
test('C-object-sample keeps 2x2 and original ref',()=>{
 const x=make();x.run("selectSample('P10-inventory');startOrganize('move',null,context.items.find(i=>i.key==='sample'))");
 assert.equal(x.run('selectedObject.key'),'sample');assert.equal(x.run('selectedObject.w'),2);assert.equal(x.run('selectedObject.h'),2);assert(x.run('organizePanel()').includes('当前对象：密封病原样本箱'));
});
test('C-object-ration remains ration on use',()=>{
 const x=make();x.run("selectSample('P10-inventory');showSelectedMedicine(null,context.items.find(i=>i.key==='ration'))");
 assert.equal(x.run('active.item'),'ration');assert.equal(x.run('selectedObject.key'),'ration');assert(x.run('medicalPanel()').includes('压缩口粮'));
});
for(const method of ['cautious','direct']) for(const armor of ['normal','last','broken','unequipped']){
 test('C-sample-'+method+'-'+armor,()=>{
  const x=make(),sid='P06-sample-'+method+(armor==='normal'?'':'-'+armor);
  x.run(`selectSample('${sid}')`);const h=x.run('samplePayment()');
  assert(h.includes(method==='direct'?'直接':'谨慎'));
  const wanted=armor==='normal'?'12/12 → 11/12':armor==='last'?'1/12 → 0/12':armor==='broken'?'0/12 → 0/12':'未参与（不扣耗）';
  assert(h.includes(wanted));assert(!h.includes('%'));
 });
}
test('C-defense no enemy hit or phase increase',()=>{
 const x=make();x.run("selectSample('P15-orderly');act('defend-demo')");assert(!x.nodes.get('.arena').classList.contains('hit'));x.flush();assert.equal(x.run('stage'),0);
});
test('C-generic fx does not change enemy phase',()=>{const x=make();x.run("selectSample('P15-porter');act('hit-demo')");x.flush();assert.equal(x.run('stage'),0)});
test('C-attack changes authored phase once',()=>{const x=make();x.run("selectSample('P15-technician');act('attack-demo')");x.flush();assert.equal(x.run('stage'),1)});
test('C-stale animation does not mutate a new sample',()=>{const x=make();x.run("selectSample('P15-orderly');act('attack-demo');selectSample('P03-hotel')");x.flush();assert.equal(x.run('stage'),0);assert.equal(x.run('context.node'),'T0')});

test('R2-stale-object-ref never falls back to same-name item',()=>{const x=make();x.run("selectSample('P10-inventory')");assert.equal(x.run("currentObject({dataset:{objectRef:'removed-instance',objectKey:'sample'}})"),null)});
test('R2-maximize-terminal preserves context and toggles presentation',()=>{const x=make();x.run("selectSample('P18-success')");const before=x.run('JSON.stringify(context)');x.run("act('maximize')");assert(x.run('content()').includes('kind-terminal max'));assert.equal(x.run('JSON.stringify(context)'),before);x.run("act('maximize')");assert(!x.run('content()').includes('kind-terminal max'));assert.equal(x.run('JSON.stringify(context)'),before)});

const record={kind:'ISOLATED_UNMODIFIED_SOURCE_WITH_FAKE_DOM_AND_DETERMINISTIC_TIMERS_NOT_BROWSER_OR_GAMEPLAY',
 mutation:mutate,total:results.length,passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length,
 results};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));process.exitCode=record.failed?1:0;
