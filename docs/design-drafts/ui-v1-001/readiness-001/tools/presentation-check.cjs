/* Isolated design adapter checks; not browser or production tests. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const N=path.resolve(__dirname,'..');const source=fs.readFileSync(path.join(N,'presentation.js'),'utf8');
function env(mutation='none'){
 let src=source;
 if(mutation==='context-drift')src=src.replace("if(JSON.stringify(before)!==JSON.stringify(snapshot()))throw new Error('CONTEXT_DRIFT');",'');
 if(mutation==='author-copy')src=src.replace("s=s.replaceAll(x,'')","s=s");
 const document={querySelectorAll:()=>[],querySelector:()=>null};
 const ctx={URLSearchParams,location:{search:'?view=player'},document,console};vm.createContext(ctx);vm.runInContext(src+'\nthis.adapter=Readiness;',ctx);return ctx.adapter;
}
async function run(mutation='none'){
 const a=env(mutation),results=[];const check=(id,fn)=>{try{fn();results.push({id,pass:true});}catch(e){results.push({id,pass:false,reason:e.message});}};
 check('player-copy',()=>assert.equal(a.playerText('这是结果版式示例，不是生产规则运行记录。'),''));
 check('save-failed-not-rollback',()=>assert.equal(a.playerText('已生效 · 未保存'),'操作已生效，尚未保存'));
 check('public-payment-preserved',()=>assert.equal(a.playerText('12/12 → 11/12（请求1，实际1）'),'12/12 → 11/12（消耗1）'));
 check('unknown-preserved',()=>assert.equal(a.playerText('尚不能判断（unknown）'),'尚不能判断'));
 check('export-script-not-installed',()=>assert(!fs.readFileSync(path.join(N,'../prototype/index.html'),'utf8').includes('export.js')));
 let state={hp:8,ref:'opaque-sample',energy:38,node:'H5',closed:false},n=0;const snap=()=>JSON.stringify(state);
 await a.setTheme('valid',async()=>({themeId:'TEST',replacements:{}}),snap,()=>{n++;});
 check('valid-theme-context',()=>assert.equal(n,1));
 const prior=a.getTheme();try{await a.setTheme('bad',async()=>{throw new Error('INCOMPLETE_GROUP');},snap,()=>{throw new Error('REPAINTED_INVALID');});results.push({id:'reject-atomic',pass:false});}catch(e){check('reject-atomic',()=>{assert.equal(e.message,'INCOMPLETE_GROUP');assert.equal(a.getTheme(),prior);});}
 let caught=false;try{await a.setTheme('bad-render',async()=>null,snap,()=>{state.hp=0;});}catch(e){caught=e.message==='CONTEXT_DRIFT';}
 check('context-drift-detected',()=>assert(caught));
 return {mutation,kind:'NODE_ISOLATED_DESIGN_ADAPTER',total:results.length,failed:results.filter(x=>!x.pass).length,results};
}
(async()=>{const positive=await run();const negativeControls=await Promise.all(['context-drift','author-copy'].map(run));const r1=require('../r1/player-check.cjs');const r1Positive=r1.run(),r1Negative=r1.run('dynamic-copy');const report={positive,negativeControls,r1Positive,r1Negative,pass:positive.failed===0&&negativeControls.every(x=>x.failed>0)&&r1Positive.failed===0&&r1Negative.failed>0&&r1Negative.results.every(x=>x.pass||x.name==='AssertionError')};console.log(JSON.stringify(report,null,2));process.exitCode=report.pass?0:1;})().catch(e=>{console.error(e);process.exitCode=2;});
