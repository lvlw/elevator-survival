const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/zjl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const artifact=__dirname;
(async()=>{
 const profile=process.env.NATIVE_PROFILE_SUFFIX?'edge-native-'+process.env.NATIVE_PROFILE_SUFFIX:'edge-native-profile';
 const context=await chromium.launchPersistentContext(path.join(artifact,profile),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const page=context.pages()[0]??await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const record=async(action)=>fs.appendFileSync(path.join(artifact,'native-actions.jsonl'),JSON.stringify({at:new Date().toISOString(),profile,action,url:page.url(),text:await page.locator('body').innerText(),errors:[...errors]})+'\n');
 try{
 await page.goto('http://127.0.0.1:5311/?dev-infected-world=1');await page.locator('main').waitFor();
 const steps=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
 for(const s of steps){
  if(s.inspectStable)await page.locator('.iw-game').waitFor();
  if(s.medical){
   await page.getByRole('button',{name:'药食与维护',exact:true}).click();await page.getByRole('button',{name:'使用药食',exact:true}).click();
   const option=await page.getByLabel('物品',{exact:true}).locator('option').evaluateAll(os=>os.map(o=>({label:o.label,value:o.value})));const found=option.find(o=>o.label.startsWith(s.medical+' ×'));if(!found)throw Error('No native medicine '+s.medical);
   await page.getByLabel('物品',{exact:true}).selectOption(found.value);
   const wounds=page.getByLabel('伤口',{exact:true});if(await wounds.count()){const opts=await wounds.locator('option').evaluateAll(os=>os.map(o=>({label:o.label,value:o.value})));if(opts[1])await wounds.selectOption(opts[1].value)}
   await page.getByRole('button',{name:'执行行动',exact:true}).click();if(await page.getByRole('button',{name:'确认执行',exact:true}).count())await page.getByRole('button',{name:'确认执行',exact:true}).click();
   const close=page.getByRole('dialog',{name:'药食与维护',exact:true}).getByRole('button',{name:'关闭',exact:true});if(await close.count())await close.click();
  }
  if(s.fight){for(let turn=0;turn<24&&await page.locator('[aria-label="战斗舞台"]').count();turn++){
   const bar=page.locator('[aria-label="战斗行动"]'),quick=bar.getByRole('button').filter({hasText:'使用快捷物品'}),signature=bar.getByRole('button').filter({hasText:'蓄力打击'}),basic=bar.getByRole('button').filter({hasText:'金属管攻击'});
   const text=await page.locator('body').innerText(),health=Number(text.match(/生命\s+(\d+)\s*\//)?.[1]??12);
   if(health<=4&&await quick.count())await quick.first().click();else if(await signature.count())await signature.first().click();else await basic.first().click();
   if(await page.getByRole('button',{name:'确认执行',exact:true}).count())await page.getByRole('button',{name:'确认执行',exact:true}).click();
   await record({fightTurn:turn,text:await page.locator('.iw-stage').innerText()});
  }if(await page.locator('[aria-label="战斗舞台"]').count())throw Error('Bounded battle unfinished');}
  if(s.button){const b=page.getByRole('button',{name:s.button,exact:true});await (s.nth===undefined?b:b.nth(s.nth)).click({timeout:5000});}
  if(s.move)await page.locator('.iw-travel button').filter({hasText:s.move}).click({timeout:5000});
  if(s.radio)await page.locator(`input[name="${s.radio[0]}"][value="${s.radio[1]}"]`).check();
  if(s.fill)await page.getByLabel(s.fill[0],{exact:true}).fill(String(s.fill[1]));
  if(s.select)await page.getByLabel(s.select[0],{exact:true}).selectOption({label:s.select[1]});
  if(s.anchor)await page.getByRole('gridcell',{name:new RegExp(`^锚点 ${s.anchor[0]},${s.anchor[1]}`)}).click({timeout:5000});
  if(s.menu)await page.locator('[aria-label="背包格位"] .iw-item').filter({has:page.locator(`[aria-label^="${s.menu}"]`)}).click({button:'right'});
  if(s.screenshot)await page.screenshot({path:path.join(artifact,s.screenshot),type:'jpeg',quality:90});
  if(s.assert){const text=await page.locator('body').innerText();if(!text.includes(s.assert))throw Error('Native missing '+s.assert)}
  if(s.notAssert){const text=await page.locator('body').innerText();if(text.includes(s.notAssert))throw Error('Native unexpected '+s.notAssert)}
  await record(s);
 }
 const result={url:page.url(),browser:context.browser()?.version(),geometry:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scroll:document.documentElement.scrollHeight})),errors,text:await page.locator('body').innerText(),buttons:await page.getByRole('button').evaluateAll(bs=>bs.map(b=>({text:b.textContent,aria:b.getAttribute('aria-label'),disabled:b.disabled}))),dialogs:await page.getByRole('dialog').count()};
 fs.writeFileSync(path.join(artifact,'native-current.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }catch(e){await record({ERROR:String(e)});await page.screenshot({path:path.join(artifact,'native-error.jpg'),type:'jpeg',quality:90});throw e}
 finally{await context.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
