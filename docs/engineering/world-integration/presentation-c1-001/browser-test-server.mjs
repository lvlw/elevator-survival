// TEST ONLY loopback fixture/fault instrumentation. Exact original main.tsx/DEV React entry.
// No UI imports this tool; it never replaces BrowserOwner, controls, a resolver or the app.
import { createServer } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../../..', import.meta.url))
const port = Number(process.argv[2]), scenario = process.argv[3], data = JSON.parse(readFileSync(process.argv[4], 'utf8'))
if (!Number.isSafeInteger(port) || port < 5187 || port > 5299 || !Object.hasOwn(data.cases, scenario)) throw Error('Invalid TEST endpoint')
const injected = `(() => {
  const record = ${JSON.stringify(data.cases[scenario]).replace(/</g, '\\u003c')};
  const reservationKey = ${JSON.stringify(data.reservationKey)}, checkpointKey = ${JSON.stringify(data.checkpointKey)};
  // Seed only a genuinely empty dedicated TEST origin. Reload preserves its latest checkpoint.
  if (localStorage.getItem(reservationKey) === null && localStorage.getItem(checkpointKey) === null) {
    localStorage.setItem(reservationKey, record.reservation); localStorage.setItem(checkpointKey, record.checkpoint);
  }
  let fault = false, attempts = 0, successes = 0, failures = 0, count = 0;
  const trace = [], original = Storage.prototype.setItem;
  const update = () => {
    const out = document.querySelector('#c1-test-evidence output'); if (!out) return;
    out.textContent = JSON.stringify({ TEST_ONLY: true, scenario: ${JSON.stringify(scenario)}, url: location.href,
      width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
      prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      fault, checkpointAttempts: attempts, checkpointSuccesses: successes, checkpointFailures: failures, cueChanges: count, trace });
  };
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === checkpointKey) {
      attempts++; if (fault) { failures++; update(); throw new DOMException('C1 TEST-only checkpoint failure', 'QuotaExceededError'); }
      original.call(this, key, value); successes++; update(); return;
    }
    return original.call(this, key, value);
  };
  addEventListener('DOMContentLoaded', () => {
    const panel = document.createElement('details'); panel.id = 'c1-test-evidence';
    panel.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:2000;max-width:320px;background:#17272d;color:#fff;border:1px solid #ac8;padding:4px;font:11px/1.3 monospace;';
    const title = document.createElement('summary'); title.textContent = 'C1 TEST端口 · 非OS真实配额故障'; panel.append(title);
    const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.setAttribute('aria-label','TEST模拟checkpoint写失败');
    input.addEventListener('change', () => { fault = input.checked; update(); }); label.append(input, ' 模拟checkpoint写失败'); panel.append(label);
    const out = document.createElement('output'); out.setAttribute('aria-label','C1 TEST环境与计数'); out.style.cssText='display:block;max-height:140px;overflow:auto;overflow-wrap:anywhere;'; panel.append(out); document.body.append(panel);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList' && record.target instanceof Element && record.target.matches('.iw-committed-cue')) {
          for (const node of record.addedNodes) { const text = node.textContent; if (text) { count++; trace.push({ kind: 'cue', text, ms: Number(performance.now().toFixed(1)) }); } }
        }
        if (record.type === 'attributes' && record.target instanceof Element && record.target.matches('.iw-committed-cue')) {
          trace.push({ kind: record.target.classList.contains('iw-committed-cue--active') ? 'active' : 'settled', ms: Number(performance.now().toFixed(1)) });
        }
      }
      if (trace.length > 32) trace.splice(0, trace.length - 32); update();
    }).observe(document.querySelector('#root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', update); matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', update); update();
  }, { once: true });
})();`
const server = await createServer({ root, server: { host: '127.0.0.1', port, strictPort: true }, plugins: [{
  name: 'C1-explicit-test-only-fixture-fault-evidence',
  transformIndexHtml(html) { return { html: html.replace('<title>电梯求生</title>', '<title>C1 TEST ONLY · 电梯求生</title>'),
    tags: [{ tag: 'script', children: injected, injectTo: 'head-prepend' }] } },
}] })
await server.listen(); console.log('C1 TEST ONLY original DEV React http://127.0.0.1:' + port + '/?dev-infected-world=1; scenario=' + scenario)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0) })
