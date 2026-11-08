// TEST-only. Uses actual Edge, actual DEV page, and separate temporary contexts.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict')
const {chromium}=require('C:/Users/zjl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root='http://127.0.0.1:55681'
const out=path.join(__dirname,'native')
fs.mkdirSync(out,{recursive:true})
const log={game:{},medicine:{},assets:{},errors:[]}
const checkpoint='elevator-survival.infected-preplay.v1.primary.checkpoint'
const disk=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),checkpoint)
const shot=(page,name)=>page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88})
const named=(page,name)=>page.getByRole('button',{name,exact:typeof name==='string'}).first()
const click=(page,name)=>named(page,name).click()
async function settle(page){
  const dialog=page.getByRole('dialog',{name:/保护确认/})
  if(await dialog.isVisible()) await dialog.getByRole('button',{name:/确认/}).last().click()
}
async function game(browser) {
  const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1})
  try{
    const page=await ctx.newPage(); page.on('pageerror',error=>log.errors.push(String(error)));page.setDefaultTimeout(8500)
    await page.goto(root+'/?dev-infected-world=1')
    await click(page,'略过叙事，查看任务');await click(page,'准备出发')
    await page.locator('input[value=crow]').check();await page.locator('input[value=engineer]').check()
    await click(page,'确定准备');await named(page,'进入封锁区').waitFor()
    const initial=await disk(page);assert.equal(initial.expected.phase,'first-hub')
    const quickBoxes=await page.locator('.iw-quick-slot').evaluateAll(items=>items.map(x=>({state:x.dataset.state,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})))
    assert.equal(quickBoxes.length,2);assert.equal(quickBoxes[0].height,quickBoxes[1].height)
    log.game.quickBoxes=quickBoxes
    await click(page,'进入封锁区');await page.getByRole('navigation',{name:'相邻方向'}).getByRole('button',{name:/大厅/}).click();await page.getByRole('heading',{name:'大厅',exact:true}).waitFor()
    const door=page.locator('.iw-task-object').filter({hasText:'隔离防火门'})
    const available=await door.getByRole('button').allTextContents()
    log.game.door=available
    await door.getByRole('button',{name:/撬/}).first().click()
    await settle(page)
    await page.getByRole('navigation',{name:'相邻方向'}).getByRole('button',{name:/隔离走廊/}).click()
    await settle(page);await page.getByRole('region',{name:'战斗舞台'}).waitFor()
    log.game.battle=true;log.game.battleButtons=await page.getByRole('navigation',{name:'战斗行动'}).getByRole('button').allTextContents();log.game.bleedTurns=[]
    log.game.metrics=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,secure:isSecureContext,locks:!!navigator.locks,
      actionHeight:document.querySelector('.iw-battle-actions button')?.getBoundingClientRect().height,
      sceneWidth:document.querySelector('.iw-battle-plate')?.getBoundingClientRect().width}))
    await page.mouse.move(3,3); await shot(page,'01-battle')
    await page.setViewportSize({width:1366,height:740})
    log.game.short=await page.locator('.iw-battle-actions').evaluate(el=>({width:innerWidth,height:innerHeight,bottom:el.getBoundingClientRect().bottom,body:document.body.scrollWidth}))
    await page.setViewportSize({width:1440,height:900})
    let medic=false,turns=0
    for(;turns<24;turns++){
      if(await page.getByRole('heading',{name:'玩家死亡',exact:true}).isVisible())break
      const bleeding=named(page,'流血中，查看身体')
      const med=page.getByRole('navigation',{name:'战斗行动'}).getByRole('button',{name:/快捷|绷带/}).first()
      if(await bleeding.isVisible())log.game.bleedTurns.push(turns);if(!medic && await bleeding.isVisible() && await med.isVisible()){
        const before=await disk(page);await shot(page,'02-bleeding')
        await med.click();await settle(page)
        const after=await disk(page)
        log.game.medical={before:before.expected.revision,after:after.expected.revision,bleedingAfter:await bleeding.isVisible()}
        assert.ok(after.expected.revision>before.expected.revision);medic=true
      }else{
        await click(page,/^防御/);await settle(page)
      }
    }
    assert.ok(turns<24,'bounded natural death')
    const dead=await disk(page);assert.equal(dead.expected.phase,'dead')
    log.game.death={turns,phase:dead.expected.phase}; await page.mouse.move(3,3);await shot(page,'03-death')
    await click(page,'开始新尝试');await click(page,'取消并保留旧档');assert.deepEqual(await disk(page),dead)
    await click(page,'开始新尝试');await page.locator('input[value=lamp]').check();await page.locator('input[value=scout]').check()
    await click(page,'确认替换试玩档');await named(page,'进入封锁区').waitFor()
    const fresh=await disk(page)
    assert.equal(fresh.checkpoint.expected.phase,'first-hub');assert.notEqual(fresh.reservation.generation,dead.generation)
    assert.equal(fresh.reservation.choices.tool,'lamp');assert.equal(fresh.reservation.choices.specialty,'scout')
    await shot(page,'04-new-hub')
    await page.reload();await named(page,'进入封锁区').waitFor();assert.deepEqual(await disk(page),fresh)
    log.game.restart={cancelZeroWrites:true,newGeneration:true,exactCold:true,phase:fresh.checkpoint.expected.phase}
  }finally{await ctx.close()}
}
async function medicine(browser){
  const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1})
  try{
    const page=await ctx.newPage();page.on('pageerror',error=>log.errors.push(String(error)));page.setDefaultTimeout(8500)
    await page.goto(root+'/docs/engineering/world-integration/owner-polish-20261108/native-bleeding-fixture.html?isolated=1')
    await page.locator('body[data-ready=true]').waitFor()
    await page.goto(root+'/?dev-infected-world=1')
    await named(page,'流血中，查看身体').waitFor()
    const before=await disk(page)
    await page.mouse.move(3,3);await shot(page,'02-bleeding')
    await click(page,'流血中，查看身体');await click(page,'查看药食与维护');await click(page,'使用药食')
    const form=page.getByRole('dialog',{name:'行动参数'})
    const selector=form.getByLabel('物品',{exact:true})
    const option=await selector.locator('option').filter({hasText:'绷带'}).first().getAttribute('value')
    assert.ok(option);await selector.selectOption(option)
    const facts=await form.innerText()
    assert.match(facts,/精力消耗：0/)
    await click(page,'执行行动');await settle(page);await named(page,'流血中，查看身体').waitFor({state:'detached'})
    const after=await disk(page), condition=x=>JSON.parse(x.v4Text).state.character.body.condition
    assert.equal(condition(before).bleeding,true);assert.equal(condition(after).bleeding,false)
    assert.equal(condition(after).currentHealth,condition(before).currentHealth+1)
    assert.equal(after.expected.revision,before.expected.revision+1)
    await page.reload();await page.locator('.iw-game').waitFor()
    assert.equal(await named(page,'流血中，查看身体').count(),0);assert.deepEqual(await disk(page),after)
    log.medicine={fixture:'TEST-only fixed bleeding, real React use and durable restore',hp:[condition(before).currentHealth,condition(after).currentHealth],
      bleed:[true,false],revisions:[before.expected.revision,after.expected.revision],previewCost:0}
  }finally{await ctx.close()}
}
async function assets(browser){
  const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1})
  try{
    const page=await ctx.newPage();page.on('pageerror',error=>log.errors.push(String(error)));page.setDefaultTimeout(8500)
    await page.goto(root+'/experiments/owner-polish-20261108/ui-preview/ASSET-AB.html')
    const mode=page.getByLabel('映射'), button=named(page,/药房搜索/)
    const picture=page.locator('.iw-task-art img'),icon=page.locator('.iw-action-glyph')
    const loaded=async ()=>{await picture.evaluate(img=>img.decode());await icon.evaluate(img=>img.decode())}
    const metrics=async()=>({icon:await icon.boundingBox(),slot:await page.locator('.iw-task-art').boundingBox(),
      iconSrc:await icon.getAttribute('src'),npcSrc:await picture.getAttribute('src'),buttonName:await button.innerText()})
    await loaded(); const a=await metrics(), oldIcon=await icon.elementHandle(),oldNpc=await picture.elementHandle();await shot(page,'05-assets-a');await button.click()
    await mode.selectOption('candidate');await loaded();const b=await metrics();await shot(page,'06-assets-b');await button.click()
    assert.deepEqual(a.icon,b.icon);assert.deepEqual(a.slot,b.slot);assert.equal(a.buttonName,b.buttonName)
    assert.notEqual(a.iconSrc,b.iconSrc);assert.notEqual(a.npcSrc,b.npcSrc);await oldIcon.evaluate(img=>img.dispatchEvent(new Event('error')));await oldNpc.evaluate(img=>img.dispatchEvent(new Event('error')));assert.deepEqual(await metrics(),b)
    assert.equal(await page.getByLabel('测试点击次数').textContent(),'2')
    await mode.selectOption('motion');await loaded();assert.match(await picture.getAttribute('src'),/\.gif/)
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.iw-task-art img[src$="npc-lin-candidate.png"]').waitFor();await picture.evaluate(img=>img.decode())
    assert.match(await picture.getAttribute('src'),/candidate\.png/);await button.click()
    await mode.selectOption('broken');await picture.waitFor({state:'detached'});await icon.waitFor({state:'detached'});await button.click()
    await mode.selectOption('unknown');await picture.waitFor({state:'detached'});const placeholder=page.locator('main img').nth(1);await placeholder.waitFor({state:'attached'});await placeholder.evaluate(img=>img.decode());assert.match(await placeholder.getAttribute('src'),/data:image\/svg|item-placeholder/)
    await mode.selectOption('candidate');await loaded();assert.deepEqual(await metrics(),b)
    assert.equal(await page.getByLabel('测试点击次数').textContent(),'4')
    log.assets={a,b,nativeReduced:true,brokenNeutral:true,unknownNeutral:true,afterFailureNewMapping:true,lateDetachedEventsIgnored:true,clicks:4}
  }finally{await ctx.close()}
}
;(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
  log.browser=browser.version()
  try{
    for(const [name,test] of [['game',game],['medicine',medicine],['assets',assets]]){ if(process.env.POLISH_NATIVE_CASE && name!==process.env.POLISH_NATIVE_CASE)continue;
      try{await test(browser);log[name].result='PASS'}catch(e){log[name].result='FAIL';log[name].error=String(e.stack);console.error(e);process.exitCode=1}
    }
    assert.deepEqual(log.errors,[])
  }finally{await browser.close();fs.writeFileSync(path.join(out,process.env.POLISH_NATIVE_CASE ? 'final-'+process.env.POLISH_NATIVE_CASE+'.json' : 'evidence.json'),JSON.stringify(log,null,2));console.log(JSON.stringify(log,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1})
