// TEST ONLY. Own private Chromium profile; real React DOM controls, never an Owner profile.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planProbeOutput, recheckOutputDirectory } from '../../../../../design-drafts/world-infected-001/entry-006/validation/output-path-guard.mjs';

if (!process.argv[2]) throw new Error('Provide an external evidence directory');
const outputPlan = planProbeOutput(process.cwd(), process.argv[2]);
fs.mkdirSync(outputPlan.out, { recursive: true });
recheckOutputDirectory(outputPlan);
const repo = outputPlan.realRepo, out = outputPlan.out;
const fingerprint = () => {
  const rows = [];
  const walk = (directory, runtimeOnly = false) => {
    for (const entry of fs.readdirSync(path.join(repo, directory), { withFileTypes: true })) {
      const relative = directory + '/' + entry.name;
      if (entry.isDirectory()) walk(relative, runtimeOnly);
      else if (entry.isFile() && (!runtimeOnly || /\.(?:ts|tsx|css|js|mjs|json|html)$/.test(entry.name))) {
        const bytes = fs.readFileSync(path.join(repo, relative));
        rows.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
  };
  walk('src'); walk('public');
  if (fs.existsSync(path.join(repo, 'dist'))) walk('dist');
  walk('docs/engineering/world-integration/preplay/low-asset-ui/validation', true);
  rows.sort((a, b) => a.path.localeCompare(b.path));
  return { rows, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
};
const beforeFingerprint = fingerprint();
fs.writeFileSync(path.join(out, 'runtime-source-manifest.json'), JSON.stringify(beforeFingerprint, null, 2) + '\n');
const profile = fs.mkdtempSync(path.join(out, 'profile-'));
const exe = process.env.LOW_ASSET_UI_TEST_EXE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if (!fs.existsSync(exe)) throw new Error('Installed Chromium browser not found: ' + exe);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = () => new Promise(resolve => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const selected = server.address().port; server.close(() => resolve(selected)); });
});
const port = await freePort();
const serviceLog = fs.openSync(path.join(out, 'vite.log'), 'w');
const browserLog = fs.openSync(path.join(out, 'browser.log'), 'w');
const vite = cp.spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: repo, windowsHide: true, stdio: ['ignore', serviceLog, serviceLog] });
const browser = cp.spawn(exe, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: ['ignore', browserLog, browserLog] });
const report = { kind: 'REAL_REACT_DOM_BROWSER_TEST_ONLY', browser: null, origin: 'http://127.0.0.1:' + port, cases: [], console: [], screenshots: [], uncovered: [], limitations: [
  'Own temporary profile only; no Owner storage or profile included in review material',
  'Control-call and checkpoint IO counters are not represented as native S dispatch counters',
  'Read/write exceptions are injected port faults, not OS quota or permission exhaustion',
  'Automated screenshots and checks are not Owner playability acceptance',
] };
report.testedFingerprint = { sourceFiles: beforeFingerprint.rows.length, before: beforeFingerprint.sha256, after: null, unchanged: null };
let socket, sequence = 0, preview = null, previewLog = null;
const pending = new Map();
const request = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout ' + method)); }, 180000);
  pending.set(id, { resolve, reject, timer });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async (tab, expression) => {
  const result = await request('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, tab.sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};
const api = (tab, method, ...args) => evaluate(tab, 'window.lowAssetTest.' + method + '(' + args.map(value => JSON.stringify(value)).join(',') + ')');
const url = report.origin + '/docs/engineering/world-integration/preplay/low-asset-ui/validation/browser-harness.html?seed=E03-A-seed-01';
async function ready(tab, expression = "Boolean(window.lowAssetTest?.snapshot() && !['idle','acquiring','loading'].includes(window.lowAssetTest.snapshot().status))") {
  for (let attempt = 0; attempt < 300; attempt++) {
    try { if (await evaluate(tab, expression)) return; } catch { /* Navigation can temporarily remove the execution context. */ }
    await pause(100);
  }
  throw new Error('Actual React UI load timeout');
}
async function tabAt(address = url, browserContextId) {
  const { targetId } = await request('Target.createTarget', { url: address, ...(browserContextId ? { browserContextId } : {}) });
  const { sessionId } = await request('Target.attachToTarget', { targetId, flatten: true });
  const tab = { targetId, sessionId, browserContextId };
  await request('Runtime.enable', {}, sessionId); await request('Page.enable', {}, sessionId);
  await request('Page.bringToFront', {}, sessionId);
  await ready(tab); return tab;
}
async function click(tab, text) {
  return evaluate(tab, `(() => { const buttons = [...document.querySelectorAll('button')].filter(b => !b.disabled && [b.getAttribute('aria-label'),b.textContent.trim(),[...b.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim()].includes(${JSON.stringify(text)})); if (buttons.length !== 1) throw Error('Expected one enabled UI button: ' + ${JSON.stringify(text)} + '; found ' + buttons.length); buttons[0].click(); return true; })()`);
}
async function setup(tab, tool = 'crow', specialty = 'engineer') {
  await evaluate(tab, `(() => { for (const [name,value] of ${JSON.stringify([['tool', tool], ['specialty', specialty]])}) { const radio = [...document.querySelectorAll('input[type=radio]')].find(e => e.name === name && e.value === value); if (!radio) throw Error('Missing explicit setup choice'); radio.click(); } })()`);
  await click(tab, '确认创建'); await ready(tab, "window.lowAssetTest.snapshot()?.preplay?.view?.point === 'first-hub'");
}
async function screenshot(tab, name, viewport) {
  await request('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 600 }, tab.sessionId);
  await pause(100);
  const image = await request('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, tab.sessionId);
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(image.data, 'base64'));
  const geometry = await evaluate(tab, `({ width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,focus:document.activeElement?.getAttribute('aria-label')??document.activeElement?.textContent?.slice(0,80),body:document.body.innerText.slice(0,6000) })`);
  report.screenshots.push({ filename: name + '.png', viewport, geometry });
}
async function refresh(tab) {
  await request('Page.reload', {}, tab.sessionId); await pause(150); await ready(tab);
  return api(tab, 'snapshot');
}
async function readonlyMapAndKeyboardMenu(tab) {
  const before = await api(tab, 'counts');
  await evaluate(tab, `(() => { const summary=document.querySelector('.iw-map summary'); if(!summary)throw Error('Known-map summary absent'); summary.click(); const trigger=document.querySelector('[aria-label="背包格位"] button[aria-haspopup=menu]'); if(!trigger)throw Error('Actual backpack menu item absent'); trigger.focus(); })()`);
  await request('Input.dispatchKeyEvent', { type: 'keyDown', key: 'F10', code: 'F10', modifiers: 8, windowsVirtualKeyCode: 121 }, tab.sessionId);
  await request('Input.dispatchKeyEvent', { type: 'keyUp', key: 'F10', code: 'F10', modifiers: 8, windowsVirtualKeyCode: 121 }, tab.sessionId);
  await ready(tab, "Boolean(document.querySelector('[role=menu]'))");
  const menu = await evaluate(tab, `(() => { const el=document.querySelector('[role=menu]'), box=el.getBoundingClientRect(), map=document.querySelector('.iw-map'); return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:innerWidth,height:innerHeight,focusInMenu:el.contains(document.activeElement),focusOutline:getComputedStyle(document.activeElement).outlineStyle,mapOpen:map.open,knownNodes:document.querySelectorAll('[aria-label="已知地点"] li').length}; })()`);
  assert.equal(menu.focusInMenu, true); assert.equal(menu.mapOpen, true); assert.ok(menu.knownNodes > 0);
  assert.notEqual(menu.focusOutline, 'none');
  assert.ok(menu.x >= 0 && menu.y >= 0 && menu.right <= menu.width && menu.bottom <= menu.height);
  await screenshot(tab, '04-route-a-stage-3', { width: 1600, height: 900 });
  await request('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, tab.sessionId);
  await request('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, tab.sessionId);
  await ready(tab, "!document.querySelector('[role=menu]')");
  const restored = await evaluate(tab, `document.activeElement === document.querySelector('[aria-label="背包格位"] button[aria-haspopup=menu]')`);
  assert.equal(restored, true);
  await evaluate(tab, "document.querySelector('.iw-map summary').click()");
  const after = await api(tab, 'counts');
  assert.equal(after.controlsCalls.execute ?? 0, before.controlsCalls.execute ?? 0);
  assert.equal(after.controlsCalls.confirm ?? 0, before.controlsCalls.confirm ?? 0);
  assert.equal(after.io.length, before.io.length);
  return { kind: 'actual CDP Shift+F10/Escape key input and read-only known map', menu, focusRestored: restored, ioDelta: after.io.length - before.io.length, executeDelta: (after.controlsCalls.execute ?? 0) - (before.controlsCalls.execute ?? 0) };
}
async function saveReport() { fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n'); }
async function record(name, body) {
  if (process.env.LOW_ASSET_UI_CASE_FILTER && !name.includes(process.env.LOW_ASSET_UI_CASE_FILTER)) {
    report.cases.push({ name, result: 'NOT RUN', reason: 'explicit diagnostic case filter' }); await saveReport(); return;
  }
  const started = performance.now();
  try { const detail = await body(); report.cases.push({ name, result: 'PASS', ms: performance.now() - started, detail }); console.log('UI_BROWSER_PASS ' + name); }
  catch (error) { report.cases.push({ name, result: 'FAIL', ms: performance.now() - started, error: String(error.stack ?? error) }); console.log('UI_BROWSER_FAIL ' + name + ' ' + error.message); }
  await saveReport();
}
try {
  for (let attempt = 0; attempt < 200 && !fs.existsSync(path.join(profile, 'DevToolsActivePort')); attempt++) await pause(100);
  const dev = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/);
  const version = await (await fetch('http://127.0.0.1:' + dev[0] + '/json/version')).json(); report.browser = version.Browser;
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const entry = pending.get(message.id); if (entry) { clearTimeout(entry.timer); pending.delete(message.id); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); } }
    else if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type) || /Crashed|crashed/.test(message.method)) report.console.push(message);
  });
  await request('Target.setDiscoverTargets', { discover: true });
  for (let attempt = 0; attempt < 150; attempt++) { try { if ((await fetch(report.origin)).ok) break; } catch { /* own Vite boot */ } await pause(100); }

  await record('U01 actual DEV entry, old preview priority and default hospital isolation', async () => {
    const { browserContextId } = await request('Target.createBrowserContext');
    const { targetId } = await request('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await request('Target.attachToTarget', { targetId, flatten: true });
    const tab = { targetId, sessionId, browserContextId };
    await request('Runtime.enable', {}, sessionId); await request('Page.enable', {}, sessionId);
    await request('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      const get=Storage.prototype.getItem, set=Storage.prototype.setItem;
      const rows=[]; let entropy=0;
      set.call(localStorage,'elevator-survival:active-run','LOW-ASSET-ENTRY-TEST-SENTINEL');
      Storage.prototype.getItem=function(key){ rows.push({op:'read',key}); return get.call(this,key); };
      Storage.prototype.setItem=function(key,value){ rows.push({op:'write',key}); return set.call(this,key,value); };
      const uuid=crypto.randomUUID.bind(crypto); crypto.randomUUID=()=>{entropy++;return uuid();};
      window.__entryIoTest={counts:()=>({rows:[...rows],entropy,sentinel:get.call(localStorage,'elevator-survival:active-run')})};
    })()` }, sessionId);
    await request('Page.navigate', { url: report.origin + '/?dev-infected-world=1' }, sessionId);
    await ready(tab, "document.querySelectorAll('.iw-setup input[type=radio]').length === 6");
    const setupRead = await evaluate(tab, 'window.__entryIoTest.counts()');
    assert.equal(setupRead.entropy, 0); assert.equal(setupRead.rows.filter(row => row.op === 'write').length, 0);
    assert.ok(setupRead.rows.every(row => row.key.startsWith('elevator-survival.infected-preplay.v1.')));
    await evaluate(tab, "document.querySelector('input[name=tool][value=crow]').click();document.querySelector('input[name=specialty][value=engineer]').click()");
    await pause(10); await click(tab, '确认创建');
    await ready(tab, "document.body.innerText.includes('已锁定') && document.body.innerText.includes('进入封锁区')");
    const created = await evaluate(tab, 'window.__entryIoTest.counts()');
    assert.equal(created.entropy, 4); assert.equal(created.rows.filter(row => row.op === 'write').length, 2);
    assert.equal(created.sentinel, 'LOW-ASSET-ENTRY-TEST-SENTINEL');
    await request('Page.navigate', { url: report.origin + '/?dev-ui-preview=1&dev-infected-world=1' }, sessionId);
    await ready(tab, "Boolean(document.querySelector('[aria-label=开发预览]'))");
    const preview = await evaluate(tab, 'window.__entryIoTest.counts()');
    assert.equal(preview.rows.filter(row => row.key.startsWith('elevator-survival.infected-preplay.v1.')).length, 0);
    await request('Page.navigate', { url: report.origin + '/' }, sessionId);
    await ready(tab, "Boolean(document.querySelector('#root')?.textContent?.trim()) && !document.querySelector('[aria-label=开发预览]') && !document.querySelector('.iw-app')");
    const hospital = await evaluate(tab, 'window.__entryIoTest.counts()');
    assert.equal(hospital.rows.filter(row => row.key.startsWith('elevator-survival.infected-preplay.v1.')).length, 0);
    assert.equal(hospital.sentinel, 'LOW-ASSET-ENTRY-TEST-SENTINEL');
    await request('Target.disposeBrowserContext', { browserContextId });
    return { setupRead, created, preview, hospital, productionFlagIgnored: 'separate current-dist production-browser group below' };
  });

  await record('U02 explicit setup and StrictMode read-only controls', async () => {
    const tab = await tabAt(); assert.equal((await api(tab, 'snapshot')).status, 'setup');
    const before = await api(tab, 'counts'); assert.equal(before.entropy, 0); assert.equal(before.io.filter(row => row.operation === 'write').length, 0);
    await screenshot(tab, '01-setup-1600', { width: 1600, height: 900 });
    await screenshot(tab, '02-setup-narrow', { width: 390, height: 844 });
    await request('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false }, tab.sessionId);
    await api(tab, 'sentinel', 'LOW-ASSET-TEST-OLD-HOSPITAL-UNCHANGED');
    await setup(tab); const counts = await api(tab, 'counts');
    assert.equal(counts.entropy, 1); assert.equal(counts.io.filter(row => row.operation === 'write' && row.key === 'reservation').length, 1);
    assert.equal(counts.io.filter(row => row.operation === 'write' && row.key === 'checkpoint').length, 1);
    assert.equal(counts.controlsCalls.confirmSetup, 1);
    await screenshot(tab, '03-first-hub-1366', { width: 1366, height: 768 });
    assert.equal((await refresh(tab)).preplay.view.point, 'first-hub');
    assert.equal((await api(tab, 'counts')).entropy, 0);
    assert.equal(await api(tab, 'sentinel'), 'LOW-ASSET-TEST-OLD-HOSPITAL-UNCHANGED');
    await request('Target.closeTarget', { targetId: tab.targetId }); return { before, counts };
  });

  await record('U03-U06 A full React-control success route, battle and cold continuation', async () => {
    const tab = await tabAt();
    // Prior group left a durable first-hub. No records are cleared or replaced.
    if ((await api(tab, 'snapshot')).status === 'setup') await setup(tab);
    assert.equal((await api(tab, 'snapshot')).preplay.view.point, 'first-hub');
    const stages = [], readonlyChecks = [];
    for (let stage = 0; stage < 6; stage++) {
      if (stage === 4) {
        const beforeDraft = await api(tab, 'counts');
        await evaluate(tab, `(() => { const buttons=[...document.querySelectorAll('button')].filter(b=>b.textContent.trim().startsWith('提取样本')&&b.textContent.includes('谨慎')); if(buttons.length!==1)throw Error('Expected actual cautious extraction control'); buttons[0].click(); })()`);
        await ready(tab, "Boolean(document.querySelector('[aria-label=行动参数]'))");
        await evaluate(tab, `(() => { const anchor=document.querySelector('[aria-label="行动参数"] button[aria-label^="锚点 1,3"]'); if(!anchor)throw Error('Expected explicit sample anchor'); anchor.click(); })()`);
        await screenshot(tab, '08-explicit-placement-1600', { width: 1600, height: 900 });
        await click(tab, '取消');
        const afterDraft = await api(tab, 'counts');
        assert.equal(afterDraft.controlsCalls.execute ?? 0, beforeDraft.controlsCalls.execute ?? 0);
        assert.equal(afterDraft.controlsCalls.confirm ?? 0, beforeDraft.controlsCalls.confirm ?? 0);
        assert.equal(afterDraft.io.length, beforeDraft.io.length);
      }
      stages.push(await api(tab, 'routeA', stage));
      const state = await api(tab, 'snapshot');
      if ([0, 2].includes(stage)) await screenshot(tab, `04-route-a-stage-${stage}`, { width: 1600, height: 900 });
      if (stage === 3) readonlyChecks.push(await readonlyMapAndKeyboardMenu(tab));
      const point = state.preplay?.view?.point;
      if (['stable-active', 'battle-decision', 'living-hub', 'dead'].includes(point)) {
        assert.equal((await refresh(tab)).preplay.view.point, point);
        assert.equal((await api(tab, 'counts')).entropy, 0);
      }
    }
    const state = await api(tab, 'snapshot');
    assert.equal(state.preplay.view.point, 'living-hub'); assert.equal(state.preplay.view.terminal.result.outcome, 'success');
    await screenshot(tab, '09-success-narrow', { width: 390, height: 844 });
    const counts = await api(tab, 'counts');
    await request('Target.closeTarget', { targetId: tab.targetId }); return { stages, readonlyChecks, final: state.preplay.view.terminal, counts };
  });

  await record('U07-U08 B DOM retreat, immediate repair, failed save, retry, refresh and same-origin competition', async () => {
    const { browserContextId } = await request('Target.createBrowserContext');
    const a = await tabAt(url, browserContextId); await setup(a);
    const stages = [await api(a, 'routeB', 0)];
    await api(a, 'faults', { checkpoint: true });
    const before = await api(a, 'counts'); stages.push(await api(a, 'routeB', 1));
    const failed = await api(a, 'snapshot');
    assert.equal(failed.preplay.view.persistence.feedback, 'save-failed');
    await screenshot(a, '10-save-failure-1600', { width: 1600, height: 900 });
    const after = await api(a, 'counts');
    await api(a, 'faults', { checkpoint: false });
    await click(a, '重试保存');
    const retry = await api(a, 'counts');
    assert.equal(retry.controlsCalls.execute ?? 0, after.controlsCalls.execute ?? 0);
    assert.equal(retry.controlsCalls.confirm ?? 0, after.controlsCalls.confirm ?? 0);
    assert.equal(retry.io.filter(row => row.operation === 'write').length, after.io.filter(row => row.operation === 'write').length + 1);
    const point = (await api(a, 'snapshot')).preplay.view.point;
    assert.equal((await refresh(a)).preplay.view.point, point);
    const b = await tabAt(url, browserContextId); assert.equal((await api(b, 'snapshot')).status, 'occupied');
    const blocked = await api(b, 'counts'); assert.equal(blocked.entropy, 0); assert.equal(blocked.io.length, 0);
    await api(a, 'suspend');
    assert.equal((await api(a, 'snapshot')).status, 'suspended');
    await click(b, '重新取得独占'); await ready(b, "window.lowAssetTest.snapshot()?.status === 'ready'");
    stages.push(await api(b, 'routeB', 2));
    await screenshot(b, '11-segmented-terminal-1366', { width: 1366, height: 768 });
    const final = await api(b, 'snapshot'); assert.ok(['living-hub', 'dead'].includes(final.preplay.view.point));
    await request('Target.disposeBrowserContext', { browserContextId });
    return { stages, before, after, retry, blocked, final: final.preplay.view.terminal };
  });

  await record('U07-U08 actual pagehide, same-partition close and BFCache explicit reacquire', async () => {
    const { browserContextId } = await request('Target.createBrowserContext');
    const a = await tabAt(url, browserContextId); await setup(a); await click(a, '进入封锁区');
    await ready(a, "window.lowAssetTest.snapshot()?.preplay?.view?.point === 'stable-active'");
    await click(a, '失败止损返回');
    assert.equal(await evaluate(a, "Boolean(document.querySelector('[aria-label=保护确认]'))"), true);
    await screenshot(a, '12-protection-confirmation-1600', { width: 1600, height: 900 });
    const before = await api(a, 'counts');
    await request('Page.navigate', { url: report.origin + '/docs/engineering/world-integration/preplay/browser-owner/validation/browser-navigation-target.html' }, a.sessionId);
    await pause(150);
    const b = await tabAt(url, browserContextId);
    assert.equal((await api(b, 'snapshot')).preplay.view.point, 'stable-active');
    await request('Target.closeTarget', { targetId: b.targetId }); await pause(100);
    const history = await request('Page.getNavigationHistory', {}, a.sessionId);
    await request('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id }, a.sessionId);
    await pause(150); await ready(a);
    const returned = await api(a, 'snapshot'), observations = await api(a, 'counts');
    const persisted = observations.lifecycle.some(entry => entry.event === 'pageshow' && entry.persisted);
    if (persisted) {
      assert.ok(['idle', 'suspended'].includes(returned.status));
      assert.equal(await evaluate(a, "Boolean(document.querySelector('[aria-label=保护确认]'))"), false);
      await click(a, '重新取得独占'); await ready(a, "window.lowAssetTest.snapshot()?.status === 'ready'");
    } else report.uncovered.push({ gate: 'actual BFCache hit', result: 'NOT RUN', reason: 'History return did not observe pageshow.persisted=true; cold navigation restore remains separately observed' });
    assert.equal((await api(a, 'snapshot')).preplay.view.point, 'stable-active');
    assert.equal(await evaluate(a, "Boolean(document.querySelector('[aria-label=保护确认]'))"), false);
    await request('Target.disposeBrowserContext', { browserContextId });
    return { before, returnedStatus: returned.status, observations, actualBFCacheHit: persisted, explicitReacquire: persisted };
  });

  await record('U06-U08 supplemental genuine P both-zero and enemy-alive death via React buttons, cold dead', async () => {
    const outcomes = [];
    for (const boundary of ['both-zero', 'alive-enemy']) {
      const { browserContextId } = await request('Target.createBrowserContext');
      const tab = await tabAt(url + '&boundary=' + boundary, browserContextId);
      assert.equal((await api(tab, 'snapshot')).preplay.view.point, 'battle-decision');
      assert.equal((await api(tab, 'counts')).boundaryPreparation.writes, 2);
      await click(tab, boundary === 'both-zero' ? '金属管攻击' : '防御');
      await pause(20);
      if (await evaluate(tab, "Boolean(document.querySelector('[aria-label=保护确认]'))")) await click(tab, '确认执行');
      await ready(tab, "window.lowAssetTest.snapshot()?.preplay?.view?.point === 'dead'");
      const dead = await api(tab, 'snapshot'), committedCounts = await api(tab, 'counts');
      assert.equal(dead.preplay.view.body.hp.current, 0);
      if (boundary === 'both-zero') await screenshot(tab, '13-dead-1366', { width: 1366, height: 768 });
      assert.equal((await refresh(tab)).preplay.view.point, 'dead');
      const coldCounts = await api(tab, 'counts');
      assert.equal(coldCounts.boundaryPreparation.writes, 0);
      assert.equal(coldCounts.io.filter(row => row.operation === 'write').length, 0);
      assert.equal(coldCounts.entropy, 0);
      outcomes.push({ boundary, source: 'explicit low-HP genuine P/strict-codec TEST preparation, not read-null route', committedCounts, coldCounts });
      await request('Target.disposeBrowserContext', { browserContextId });
    }
    return outcomes;
  });

  await record('U01 actual fresh production dist ignores DEV infected flag and holds no new writer', async () => {
    assert.ok(fs.existsSync(path.join(repo, 'dist/index.html')), 'Run the current build before production browser acceptance');
    const previewPort = await freePort();
    previewLog = fs.openSync(path.join(out, 'vite-preview.log'), 'w');
    preview = cp.spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], { cwd: repo, windowsHide: true, stdio: ['ignore', previewLog, previewLog] });
    const origin = 'http://127.0.0.1:' + previewPort;
    for (let attempt = 0; attempt < 150; attempt++) { try { if ((await fetch(origin)).ok) break; } catch { /* own preview boot */ } await pause(100); }
    const html = await (await fetch(origin)).text(); assert.equal(html.includes('/@vite/client'), false);
    const { browserContextId } = await request('Target.createBrowserContext');
    const { targetId } = await request('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await request('Target.attachToTarget', { targetId, flatten: true });
    const tab = { targetId, sessionId, browserContextId };
    await request('Runtime.enable', {}, sessionId); await request('Page.enable', {}, sessionId);
    await request('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      const get=Storage.prototype.getItem,set=Storage.prototype.setItem,rows=[];
      set.call(localStorage,'elevator-survival:active-run','LOW-ASSET-PRODUCTION-TEST-SENTINEL');
      Storage.prototype.getItem=function(key){rows.push({op:'read',key});return get.call(this,key)};
      Storage.prototype.setItem=function(key,value){rows.push({op:'write',key});return set.call(this,key,value)};
      window.__productionEntryTest=()=>({rows:[...rows],sentinel:get.call(localStorage,'elevator-survival:active-run')});
    })()` }, sessionId);
    await request('Page.navigate', { url: origin + '/?dev-infected-world=1' }, sessionId);
    await ready(tab, "Boolean(document.querySelector('#root')?.textContent?.trim()) && !document.querySelector('.iw-app')");
    const evidence = await evaluate(tab, `Promise.resolve(navigator.locks?.query()).then(locks=>({audit:window.__productionEntryTest(),newUi:Boolean(document.querySelector('.iw-app')),testHarness:Boolean(window.lowAssetTest),heldLocks:locks?.held?.map(lock=>lock.name)??[],body:document.body.innerText.slice(0,800)}))`);
    assert.equal(evidence.newUi, false); assert.equal(evidence.testHarness, false);
    assert.equal(evidence.audit.rows.filter(row => row.key.startsWith('elevator-survival.infected-preplay.v1.')).length, 0);
    assert.equal(evidence.heldLocks.filter(name => name.startsWith('elevator-survival.infected-preplay.v1.')).length, 0);
    assert.equal(evidence.audit.sentinel, 'LOW-ASSET-PRODUCTION-TEST-SENTINEL');
    await request('Target.disposeBrowserContext', { browserContextId });
    return { origin, source: 'current dist served by own Vite preview, real Chromium document', evidence };
  });

  report.uncovered.push('Other browsers, actual OS quota/permission exhaustion, device power-loss durability and Owner experience: NOT RUN');
  if (report.cases.some(row => row.result === 'FAIL')) process.exitCode = 1;
} catch (error) {
  report.fatal = String(error.stack ?? error); process.exitCode = 1;
} finally {
  const afterFingerprint = fingerprint();
  report.testedFingerprint.after = afterFingerprint.sha256;
  report.testedFingerprint.unchanged = beforeFingerprint.sha256 === afterFingerprint.sha256;
  if (!report.testedFingerprint.unchanged) {
    const before = new Map(beforeFingerprint.rows.map(row => [row.path, row.sha256]));
    const after = new Map(afterFingerprint.rows.map(row => [row.path, row.sha256]));
    report.testedFingerprint.changedPaths = [...new Set([...before.keys(), ...after.keys()])].filter(key => before.get(key) !== after.get(key));
    process.exitCode = 1;
  }
  await saveReport();
  if (socket?.readyState === WebSocket.OPEN) { try { await request('Browser.close'); } catch { /* own browser may close before reply */ } socket.close(); }
  for (const entry of pending.values()) clearTimeout(entry.timer);
  pending.clear();
  vite.kill(); preview?.kill();
  fs.closeSync(serviceLog); fs.closeSync(browserLog); if (previewLog !== null) fs.closeSync(previewLog);
}
console.log(JSON.stringify({ browser: report.browser, passed: report.cases.filter(row => row.result === 'PASS').length, failed: report.cases.filter(row => row.result === 'FAIL').length, output: out }));
