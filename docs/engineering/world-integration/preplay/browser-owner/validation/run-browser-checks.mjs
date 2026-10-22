// TEST ONLY. Node built-ins + installed Chromium; own temporary profile, no package installation.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import cp from 'node:child_process';import net from 'node:net';import assert from 'node:assert/strict';
const repo=fs.realpathSync(process.cwd()),out=process.argv[2];
if(!out||path.resolve(out)===repo||path.resolve(out).startsWith(repo+path.sep))throw Error('Output must be outside repo');
fs.mkdirSync(out,{recursive:true});const profile=fs.mkdtempSync(path.join(out,'profile-'));
const exe=process.env.BROWSER_OWNER_TEST_EXE??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(exe))throw Error('Installed browser not found: '+exe);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const serviceLog=fs.openSync(path.join(out,'vite.log'),'w'),browserLog=fs.openSync(path.join(out,'browser.log'),'w');
const vite=cp.spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:repo,windowsHide:true,stdio:['ignore',serviceLog,serviceLog]});
const browser=cp.spawn(exe,['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{windowsHide:true,stdio:['ignore',browserLog,browserLog]});
const report={kind:'REAL_BROWSER_TEST_ONLY',browser:null,origin:'http://127.0.0.1:'+port,profile,cases:[],console:[],uncovered:[]};let socket;let seq=0;const pending=new Map();
const request=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},45000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))});
async function evaluate(tab,expression){const r=await request('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},tab.sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value}
const url=report.origin+'/docs/engineering/world-integration/preplay/browser-owner/validation/browser-harness.html?seed=E03-A-seed-01';
async function tabAt(address=url){const {targetId}=await request('Target.createTarget',{url:address});const {sessionId}=await request('Target.attachToTarget',{targetId,flatten:true});const tab={targetId,sessionId};await request('Runtime.enable',{},sessionId);await request('Page.enable',{},sessionId);await ready(tab);return tab}
async function ready(tab){for(let i=0;i<160;i++){try{if(await evaluate(tab,'Boolean(window.browserTest)'))return}catch{}await pause(100)}throw Error('TEST harness load timeout')}
const api=(tab,method,...args)=>evaluate(tab,'window.browserTest.'+method+'('+args.map(x=>JSON.stringify(x)).join(',')+')');
async function screenshot(tab,name){const r=await request('Page.captureScreenshot',{format:'png'},tab.sessionId);fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'))}
async function refresh(tab){await request('Page.reload',{},tab.sessionId);await pause(150);await ready(tab);return api(tab,'acquire')}
async function record(name,fn){if(process.env.BROWSER_OWNER_CASE_FILTER&&!name.includes(process.env.BROWSER_OWNER_CASE_FILTER)){report.cases.push({name,result:'NOT RUN',reason:'explicit diagnostic case filter'});return}const started=performance.now();try{const detail=await fn();report.cases.push({name,result:'PASS',ms:performance.now()-started,detail});console.log('BROWSER_PASS '+name)}catch(e){report.cases.push({name,result:'FAIL',ms:performance.now()-started,error:String(e.stack??e)});console.log('BROWSER_FAIL '+name+' '+e.message)}fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2))}
try{
  for(let i=0;i<200&&!fs.existsSync(path.join(profile,'DevToolsActivePort'));i++)await pause(100);
  const dev=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/);const version=await(await fetch('http://127.0.0.1:'+dev[0]+'/json/version')).json();report.browser=version.Browser;
  socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timeout);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'||/Crashed|crashed/.test(m.method))report.console.push(m)});
  await request('Target.setDiscoverTargets',{discover:true});
  for(let i=0;i<100;i++){try{if((await fetch(report.origin)).ok)break}catch{}await pause(100)}
  await record('B01 default crypto, setup zero entropy, reservation + checkpoint, real first refresh',async()=>{
    const t=await tabAt(url.split('?')[0]);assert.equal((await api(t,'acquire')).status,'setup');assert.equal((await api(t,'counts')).entropy,0);
    await api(t,'sentinel','TEST-OLD-HOSPITAL-UNCHANGED');await api(t,'setup');assert.equal((await api(t,'snapshot')).preplay.view.point,'first-hub');
    const counts=await api(t,'counts');assert.equal(counts.entropy,1);assert.equal(counts.io.filter(x=>x.op==='write').length,2);
    assert.equal((await api(t,'readonly')).ioDelta,0);assert.equal((await refresh(t)).preplay.view.point,'first-hub');assert.equal((await api(t,'counts')).entropy,0);
    assert.equal(await api(t,'sentinel'),'TEST-OLD-HOSPITAL-UNCHANGED');await screenshot(t,'first-hub');await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId});return counts;
  });
  await record('B07 real same-profile same-origin simultaneous tabs + iframe, loser zero initialization',async()=>{
    const a=await tabAt(),b=await tabAt();const outcomes=await Promise.all([api(a,'acquire'),api(b,'acquire')]);assert.deepEqual(outcomes.map(x=>x.status).sort(),['occupied','setup']);
    const winner=outcomes[0].status==='setup'?a:b,loser=winner===a?b:a;assert.equal((await api(loser,'counts')).entropy,0);assert.equal((await api(loser,'counts')).io.length,0);
    await api(winner,'setup');await api(winner,'depart');await api(winner,'capture');
    const frame=await evaluate(winner,`new Promise(resolve=>{const f=document.createElement('iframe');f.src=${JSON.stringify(url)};f.onload=async()=>resolve((await f.contentWindow.browserTest.acquire()).status);document.body.append(f)})`);assert.equal(frame,'occupied');
    await api(winner,'suspend');assert.deepEqual(await api(winner,'stale'),['LOST_LEASE','LOST_LEASE','LOST_LEASE']);
    await pause(30);assert.equal((await api(loser,'acquire')).status,'ready');assert.equal((await api(loser,'snapshot')).preplay.view.point,'stable-active');
    await api(loser,'clearTEST');await request('Target.closeTarget',{targetId:a.targetId});await request('Target.closeTarget',{targetId:b.targetId});return{outcomes:outcomes.map(x=>x.status),frame,partition:'same default browserContext/profile'};
  });
  await record('B03/A default seeded three-enemy / sample / install / success with real refreshes',async()=>{
    const t=await tabAt();await api(t,'acquire');await api(t,'setup');const stages=[];
    try{for(let n=0;n<6;n++){
        const before=(n===4||n===5)?await api(t,'records'):null;if(before)await api(t,'faults',{checkpoint:true});
        stages.push(await api(t,'routeA',n,true));
        if(before){assert.equal((await api(t,'snapshot')).preplay.view.persistence.feedback,'save-failed');assert.deepEqual(await api(t,'records'),before);await api(t,'faults',{checkpoint:false});await api(t,'retrySave');}
        assert.equal((await refresh(t)).status,'ready');if(n===0||n===4||n===5)await screenshot(t,'route-A-stage-'+n)}
      const final=await api(t,'snapshot');assert.equal(final.preplay.view.terminal.result.outcome,'success');return{stages,final,counts:await api(t,'counts')};
    }finally{await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId})}
  });
  await record('B05/B retreat immediate repair, medical, rest, failed checkpoint/retry and reentry cold',async()=>{
    const t=await tabAt();await api(t,'acquire');await api(t,'setup');await api(t,'routeB',0);assert.equal((await refresh(t)).preplay.view.point,'battle-decision');
    await api(t,'faults',{checkpoint:true});await api(t,'routeB',1);const memory=await api(t,'snapshot');assert.equal(memory.preplay.view.persistence.feedback,'save-failed');
    await api(t,'faults',{checkpoint:false});await api(t,'retrySave');assert.equal((await refresh(t)).status,'ready');const end=await api(t,'routeB',2);assert.ok(['living-hub','dead'].includes(end.point));
    assert.equal((await refresh(t)).preplay.view.point,end.point);const detail={end,counts:await api(t,'counts')};await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId});return detail;
  });
  await record('B04 real IO rejects mismatched expected/text, corrupt versions and orphan pairs without edits',async()=>{
    const t=await tabAt();await api(t,'acquire');await api(t,'setup');const initial=await api(t,'records');await api(t,'depart');const active=await api(t,'records');const outcomes=[];
    for(const kind of ['json','orphan-reservation','orphan-checkpoint','generation','version','initial-choice','cross-progress','missing-metadata','wrong-v4','battle','closure']){
      const cp=JSON.parse(active.checkpoint),records={...active};
      if(kind==='json')records.checkpoint='{';if(kind==='orphan-reservation')records.checkpoint=null;if(kind==='orphan-checkpoint')records.reservation=null;
      if(kind==='generation')cp.generation+='x';if(kind==='version')cp.formatVersion=99;if(kind==='initial-choice')cp.expected.initial.choices.tool='lamp';
      if(kind==='cross-progress')cp.expected=JSON.parse(initial.checkpoint).expected;if(kind==='missing-metadata')delete cp.expected;
      if(kind==='wrong-v4'){const payload=JSON.parse(cp.v4Text);payload.formatVersion=3;cp.v4Text=JSON.stringify(payload)}
      if(kind==='battle')cp.expected.battle={};if(kind==='closure')cp.expected.closure={};
      if(!['json','orphan-reservation'].includes(kind))records.checkpoint=JSON.stringify(cp);
      await api(t,'putTEST',records);const s=await refresh(t);assert.equal(s.status,'blocked',kind);assert.deepEqual(await api(t,'records'),records,kind);assert.equal((await api(t,'counts')).entropy,0);outcomes.push({kind,status:s.status});
    }
    await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId});return outcomes;
  });
  await record('B05 reservation and first checkpoint injected failures, orphan real refresh and read-error retry',async()=>{
    const t=await tabAt();await api(t,'acquire');await api(t,'faults',{reservation:true});assert.equal((await api(t,'setup')).status,'reservation-failed');
    assert.deepEqual(await api(t,'records'),{reservation:null,checkpoint:null});const reservationCounts=await api(t,'counts');assert.equal(reservationCounts.io.filter(x=>x.op==='write').length,1);
    await api(t,'clearTEST');await request('Page.reload',{},t.sessionId);await pause(150);await ready(t);await api(t,'acquire');await api(t,'faults',{checkpoint:true});await api(t,'setup');
    assert.equal((await api(t,'snapshot')).preplay.view.persistence.feedback,'save-failed');const firstCounts=await api(t,'counts');
    await api(t,'faults',{checkpoint:false});await api(t,'retrySave');assert.equal((await refresh(t)).preplay.view.point,'first-hub');
    await api(t,'clearTEST');await refresh(t);await api(t,'faults',{checkpoint:true});await api(t,'setup');assert.equal((await refresh(t)).status,'blocked');
    await api(t,'clearTEST');await request('Page.reload',{},t.sessionId);await pause(150);await ready(t);await api(t,'faults',{read:true});assert.equal((await api(t,'acquire')).status,'read-error');
    await api(t,'faults',{read:false});assert.equal((await api(t,'retryRead')).status,'setup');const readCounts=await api(t,'counts');assert.equal(readCounts.entropy,0);
    await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId});return{reservationCounts,firstCounts,readCounts,faultType:'real localStorage + TEST port exceptions, not actual quota exhaustion'};
  });
  await record('B03 three real P profile checkpoints continue equally across refresh',async()=>{
    const t=await tabAt(),rows=[];
    for(const enemy of ['orderly','porter','technician']){
      const boundary=await api(t,'boundaryRecords',enemy);await api(t,'putTEST',boundary);await refresh(t);assert.equal((await api(t,'snapshot')).preplay.view.point,'battle-decision');await api(t,'combat','金属管攻击');const direct=await api(t,'records');
      await api(t,'putTEST',boundary);await refresh(t);await refresh(t);await api(t,'combat','金属管攻击');assert.deepEqual(await api(t,'records'),direct);rows.push({enemy,source:'actual P TEST checkpoint, not read-null route',equal:true});
    }
    await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId});return rows;
  });
  await record('B03 both-zero / enemy-alive actual deaths refresh dead, retain exact archive and do not close again',async()=>{
    const t=await tabAt(),rows=[];
    for(const kind of ['both-zero','alive-enemy']){
      await api(t,'putTEST',await api(t,'boundaryRecords',kind));await refresh(t);await api(t,'combat',kind==='both-zero'?'金属管攻击':'防御');
      assert.equal((await api(t,'snapshot')).preplay.view.point,'dead');const records=await api(t,'records'),raw=JSON.parse(JSON.parse(records.checkpoint).v4Text).state;
      assert.deepEqual(raw.archives[0].site.pending,kind==='both-zero'?{kind:'none'}:{kind:'combat-required',enemyId:'orderly'});
      assert.equal((await refresh(t)).preplay.view.point,'dead');assert.deepEqual(await api(t,'records'),records);assert.equal((await api(t,'counts')).io.filter(x=>x.op==='write').length,0);
      rows.push({kind,pending:raw.archives[0].site.pending.kind,source:'explicit low-HP/bleeding TEST boundary; real P death'});
    }
    await api(t,'clearTEST');await request('Target.closeTarget',{targetId:t.targetId});return rows;
  });
  await record('B08 actual close/navigation/crash releases lease; BFCache observation separate',async()=>{
    const a=await tabAt();await api(a,'acquire');await api(a,'setup');await api(a,'depart');await api(a,'capture');
    const nav=report.origin+'/docs/engineering/world-integration/preplay/browser-owner/validation/browser-navigation-target.html';await request('Page.navigate',{url:nav},a.sessionId);await pause(150);
    const b=await tabAt();assert.equal((await api(b,'acquire')).status,'ready');await request('Target.closeTarget',{targetId:b.targetId});await pause(100);
    const history=await request('Page.getNavigationHistory',{},a.sessionId);await request('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex-1].id},a.sessionId);await pause(150);await ready(a);
    const lifecycle=await api(a,'counts'),persisted=lifecycle.lifecycle.some(e=>e.kind==='pageshow'&&e.persisted===true);
    if(!persisted)report.uncovered.push({gate:'B08 actual BFCache hit',status:'NOT RUN',reason:'history navigation completed but pageshow.persisted=true not observed; simulated invalidation has separate native tests'});
    assert.ok(['idle','suspended'].includes((await api(a,'snapshot')).status));assert.equal((await api(a,'acquire')).status,'ready');
    await request('Target.closeTarget',{targetId:a.targetId});await pause(100);
    const crashTab=await tabAt();assert.equal((await api(crashTab,'acquire')).status,'ready');await request('Inspector.enable',{},crashTab.sessionId);
    let crashResponse='pending';void request('Page.crash',{},crashTab.sessionId).then(()=>{crashResponse='returned'},e=>{crashResponse=String(e)});await pause(300);
    const c=await tabAt(),attempts=[];let taken;
    for(let n=0;n<20;n++){taken=await api(c,'acquire');attempts.push(taken.status);if(taken.status!=='occupied')break;await pause(250)}
    const crashEvents=report.console.filter(m=>/Crashed|crashed/.test(m.method));
    report.crashDiagnostic={crashResponse,crashEvents,attempts};assert.equal(taken.status,'ready');assert.equal((await api(c,'snapshot')).preplay.view.point,'stable-active');
    await api(c,'clearTEST');await request('Target.closeTarget',{targetId:c.targetId});await request('Target.closeTarget',{targetId:crashTab.targetId}).catch(()=>{});
    return{navigation:'PASS',close:'PASS',ownTestRendererCrash:'PASS',actualBFCacheHit:persisted,lifecycle,crashResponse,crashEvents,attempts};
  });
}finally{
  report.finished_utc=new Date().toISOString();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));
  if(socket?.readyState===1){try{await request('Browser.close')}catch{}socket.close()}
  for(const p of pending.values())clearTimeout(p.timeout);pending.clear();
  // Only processes created above, never taskkill or an inventory PID.
  vite.kill();fs.closeSync(serviceLog);fs.closeSync(browserLog);
}
console.log(JSON.stringify({browser:report.browser,passed:report.cases.filter(c=>c.result==='PASS').length,failed:report.cases.filter(c=>c.result==='FAIL').length,output:out}));
process.exitCode=report.cases.some(c=>c.result==='FAIL')?1:0;
