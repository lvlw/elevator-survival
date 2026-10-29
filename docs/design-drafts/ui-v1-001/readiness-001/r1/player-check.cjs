/* Actual design sources + jsdom, deterministic timers. NOT a native browser test. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const {JSDOM}=require('jsdom');
const N=path.resolve(__dirname,'..'),D=path.dirname(N);
function make(screen,mode='player',mutation='none'){
 const dom=new JSDOM('<!doctype html><main id="app"></main>',{url:'http://localhost/prototype/index.html?screen='+screen+'&view='+mode,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,scope=dom.getInternalVMContext(),timers=new Map();let next=0;
 w.setTimeout=fn=>{timers.set(++next,fn);return next;};w.clearTimeout=id=>timers.delete(id);
 for(const file of ['prototype/screens.js','prototype/registered-art.js','prototype/flow-context.js','prototype/nine-slice.js','readiness-001/presentation.js','prototype/ui.js']){
  let text=fs.readFileSync(path.join(D,file),'utf8');
  if(mutation==='dynamic-copy'&&file.endsWith('/presentation.js'))text=text.replace('if(playerMessages.has(s)) return playerMessages.get(s);','');
  vm.runInContext(text,scope,{filename:file});
 }
 return {w,dom,run:code=>vm.runInContext(code,scope),text:()=>w.document.getElementById('app').textContent,feedback:()=>w.document.querySelector('.feedback').textContent,
  flush(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},close:()=>w.close()};
}
function run(mutation='none'){
 const results=[];
 function test(id,screen,fn,mode='player'){
  let x;
  try{x=make(screen,mode,mutation);fn(x);results.push({id,pass:true});}
  catch(e){results.push({id,pass:false,name:e.name,reason:e.message});}
  finally{x?.close();}
 }
 const flows=[
  ['search','P05-unsearched',"chosen.light='0';act('search-submit')",'已展示搜索结果。'],
  ['sample','P06-sample-cautious',"chosen.method='0';chosen.placement='0';act('node-submit')",'本次操作的方案与位置已就绪。'],
  ['maintenance','P13-mechanical',"chosen.materials='0';chosen.pipe='10';chosen.crow='5';act('maintenance-submit')",'本次维护分配已就绪。'],
  ['attack','P15-porter',"act('attack-demo')",'攻击命中。'],
  ['defend','P15-porter',"act('defend-demo')",'进入防御姿态。'],
  ['retry-save','P23-failed',"act('retry-save')",'保存尚未成功，可再次重试；当前操作仍已生效。'],
  ['medical-unknown','P12-disinfectant',"chosen.medicine='0';act('medical-submit')",'尚不能判断是否有合格目标；当前病程提示不能保证用药有效。']
 ];
 for(const [id,screen,action,expected] of flows)test('dynamic-and-rerender-'+id,screen,x=>{
  x.run(action);assert.equal(x.feedback(),expected);
  const context=x.run('JSON.stringify({context,active,chosen,selectedObject,stage})');
  x.run('render()');assert.equal(x.feedback(),expected);assert.equal(x.run('JSON.stringify({context,active,chosen,selectedObject,stage})'),context);
 });
 test('attack-decision-entry','P15-porter',x=>{x.run("act('attack-demo')");assert.equal(x.w.document.querySelector('.decision').textContent,'攻击命中');x.flush();assert.equal(x.w.document.querySelector('.decision').textContent,'等待你的选择');assert.equal(x.run('stage'),1);});
 test('defend-keeps-enemy','P15-porter',x=>{x.run("act('defend-demo')");assert.equal(x.w.document.querySelector('.decision').textContent,'防御姿态');x.flush();assert.equal(x.run('stage'),0);});
 test('inventory-copy','P10-inventory',x=>{const text=x.text();assert(text.includes('移入快捷位后，原容器不再保留该物品'));assert(text.includes('任务物也占背包空间；样本需要2×2格。'));assert(!text.includes('独立迁移'));assert(text.includes('负重 11 / 28'));});
 test('organize-object-copy','P11-move',x=>{x.run("startOrganize('move',null,context.items[0]);chosen.cell=8;act('organize-submit')");assert.equal(x.feedback(),'已选绷带，整理参数已就绪。');assert.equal(x.run('selectedObject.ref'),x.run('context.items[0].ref'));});
 test('required-parameters-retained','P06-sample-cautious',x=>{assert(x.w.document.querySelector('[data-act="node-submit"]').disabled);x.run("act('node-submit')");assert.equal(x.feedback(),'请明确所需方案。');});
 test('payment-public-unknown','P06-sample-cautious',x=>{const text=x.text();assert(text.includes('12/12 → 11/12（消耗1）'));assert(text.includes('10'));assert(text.includes('暴露结果未知'));assert(!text.includes('%'));});
 test('save-failed-retained','P23-failed',x=>{x.run("act('retry-save')");assert(x.text().includes('操作已生效，尚未保存'));assert.equal(x.run('context.save'),'failed');});
 test('unknown-not-guaranteed','P12-disinfectant',x=>{assert(x.text().includes('尚不能判断'));assert(x.text().includes('当前病程提示不能保证药品有效'));});
 test('review-explanation-retained','P15-porter',x=>{x.run("act('attack-demo')");assert(x.feedback().includes('独立攻击故事板'));assert(x.w.document.querySelector('[data-act="hit-demo"]'));},'review');
 test('unknown-text-not-deleted','P15-porter',x=>{assert.equal(x.run("Readiness.text('未登记的故事板与FX关键词不能随意删掉')"),'未登记的故事板与FX关键词不能随意删掉');assert(!x.w.document.querySelector('[data-act="hit-demo"]'));assert(x.w.document.body.textContent.includes('设计模拟'));});
 return {kind:'JSDOM_DESIGN_SOURCE_NOT_NATIVE_BROWSER',mutation,total:results.length,failed:results.filter(x=>!x.pass).length,results};
}
module.exports={run};
if(require.main===module){const positive=run(),negativeControl=run('dynamic-copy');const pass=positive.failed===0&&negativeControl.failed>0&&negativeControl.results.every(x=>x.pass||x.name==='AssertionError');console.log(JSON.stringify({positive,negativeControl,pass},null,2));process.exitCode=pass?0:1;}
