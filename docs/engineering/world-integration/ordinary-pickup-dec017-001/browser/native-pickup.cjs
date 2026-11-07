// TEST ONLY: dedicated Edge profiles; genuine React page, native storage/locks, DOM actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/zjl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const records=JSON.parse(fs.readFileSync(path.join(__dirname,'boundary-record.json'),'utf8').replace(/^\uFEFF/,''));
const url='http://127.0.0.1:54917/?dev-infected-world=1';
const out=path.join(__dirname,'screenshots');fs.mkdirSync(out,{recursive:true});
const evidence=[];
(async()=>{for(const [name,quantity] of [['full-merge',1],['partial',2]]){
 const context=await chromium.launchPersistentContext(path.join(__dirname,'edge-dec017-delivery-'+name),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=context.pages()[0]??await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(12000);
 try{
  await context.addInitScript(({reservation,checkpoint})=>{
   if(location.origin==='http://127.0.0.1:54917'&&!localStorage.getItem('elevator-survival.infected-preplay.v1.primary.reservation')){
    localStorage.setItem('elevator-survival.infected-preplay.v1.primary.reservation',JSON.stringify(reservation));
    localStorage.setItem('elevator-survival.infected-preplay.v1.primary.checkpoint',JSON.stringify(checkpoint));
   }
  },records);
  await page.goto(url);await page.locator('.iw-game').waitFor();
  const snapshot=()=>page.evaluate(()=>({url:location.href,css:[innerWidth,innerHeight],dpr:devicePixelRatio,secure:isSecureContext,locks:!!navigator.locks,text:document.body.innerText,
   checkpoint:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes('checkpoint'))),occupied:document.querySelectorAll('[aria-label="背包格位"] .iw-item').length}));
  const before=await snapshot();
  const buttons=page.getByRole('button',{name:/^拾取 .*口粮$/});await buttons.first().click();
  const dialog=page.getByRole('dialog',{name:'行动参数'});await dialog.getByLabel('数量',{exact:true}).fill(String(quantity));
  await page.getByLabel('拾取数量预览',{exact:true}).waitFor();
  const preview=await page.getByLabel('拾取数量预览',{exact:true}).innerText();assert.match(preview,/可拾取 1，另有 1 留在现场/);
  if(quantity===2)assert.match(preview,/容量限制格位/);else assert.doesNotMatch(preview,/容量限制/);
  await page.screenshot({path:path.join(out,name+'-preview.png')});
  await dialog.getByRole('button',{name:'执行行动',exact:true}).click();await dialog.waitFor({state:'detached'});
  const after=await snapshot();assert.notDeepEqual(after.checkpoint,before.checkpoint);assert.equal(after.occupied,before.occupied);
  await page.mouse.move(4,4); await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(out,name+'-after.png')});
  await page.reload();await page.locator('.iw-game').waitFor();const cold=await snapshot();assert.deepEqual(cold.checkpoint,after.checkpoint);
  evidence.push({name,quantity,preview,before,after,cold,errors,browser:context.browser()?.version()});assert.deepEqual(errors,[]);
 }finally{await context.close();fs.writeFileSync(path.join(__dirname,'native-evidence.json'),JSON.stringify(evidence,null,2));}
}console.log('PASS: native full-grid merge and partial ground remainder; reload preserved exact checkpoint.');})().catch(e=>{console.error(e);process.exitCode=1});
