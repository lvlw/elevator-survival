// TEST ONLY: original Vite config/main.tsx/InfectedWorldApp, no product source edits.
// No media/timer/CSS/React overrides. Strict producer checkpoints; forwarding write counter.
import { createServer } from 'vite'
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, relative, isAbsolute, sep } from 'node:path'
const root = fileURLToPath(new URL('../../../..', import.meta.url))
const port = Number(process.argv[2]), records = JSON.parse(readFileSync(process.argv[3], 'utf8'))
const evidence = resolve(process.argv[4])
const evidenceRelative = relative(root, evidence)
const outside = isAbsolute(evidenceRelative) || evidenceRelative.startsWith('..'+sep)
if (!Number.isSafeInteger(port) || port < 5201 || port > 5299 || !records.cases.defend || !outside) throw Error('Invalid external TEST endpoint')
mkdirSync(evidence, { recursive: true })
const injected = `(() => {
  const record = ${JSON.stringify(records.cases.defend).replace(/</g, '\\u003c')};
  const reservationKey = ${JSON.stringify(records.reservationKey)}, checkpointKey = ${JSON.stringify(records.checkpointKey)};
  if (localStorage.getItem(reservationKey) === null && localStorage.getItem(checkpointKey) === null) {
    localStorage.setItem(reservationKey, record.reservation); localStorage.setItem(checkpointKey, record.checkpoint);
  }
  const nativeMedia = matchMedia('(prefers-reduced-motion: reduce)');
  const original = Storage.prototype.setItem;
  let attempts = 0, successes = 0, failures = 0, cues = 0, serial = 0;
  let output;
  const rect = element => element ? element.getBoundingClientRect().toJSON() : null;
  const sample = reason => {
    if (!output) return;
    const cue = document.querySelector('.iw-committed-cue'), span = cue?.querySelector('span');
    const css = span ? getComputedStyle(span) : null;
    const vv = visualViewport;
    const data = { TEST_ONLY: true, serial: serial++, reason, time: new Date().toISOString(), ms: performance.now(),
      url: location.href, userAgent: navigator.userAgent, viewport: { innerWidth, innerHeight, outerWidth, outerHeight, dpr: devicePixelRatio,
        visualViewport: vv ? { width: vv.width, height: vv.height, scale: vv.scale, offsetLeft: vv.offsetLeft, offsetTop: vv.offsetTop, pageLeft: vv.pageLeft, pageTop: vv.pageTop } : null,
        scrollX, scrollY, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      nativeReducedMotion: nativeMedia.matches, localReduced: document.querySelector('.iw-committed-options input')?.checked ?? null,
      checkpointAttempts: attempts, checkpointSuccesses: successes, checkpointFailures: failures, cueNodesAdded: cues,
      cue: cue ? { text: cue.textContent, className: cue.className, spanCount: cue.querySelectorAll('span').length,
        computed: css ? { animationName: css.animationName, animationDuration: css.animationDuration, transform: css.transform, opacity: css.opacity } : null,
        animations: span ? span.getAnimations().map(a => ({ playState: a.playState, currentTime: a.currentTime, name: a.animationName ?? null })) : [] } : null,
      backpackCells: document.querySelector('[aria-label="背包格位"]')?.children.length ?? 0,
      focused: document.activeElement ? { tag: document.activeElement.tagName, role: document.activeElement.getAttribute('role'),
        text: document.activeElement.textContent?.slice(0, 90), ariaLabel: document.activeElement.getAttribute('aria-label') } : null,
      geometry: Object.fromEntries(['.iw-game', '.iw-battle', '.iw-battle-actors', '.iw-battle-figures', '.iw-battle-actions', '.iw-committed-feedback', '.iw-committed-options', '.iw-feed', '[aria-label="背包格位"]'].map(s => [s, rect(document.querySelector(s))])) };
    output.textContent = JSON.stringify(data);
    fetch('/__c16-observation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true }).catch(() => {});
  };
  Storage.prototype.setItem = function(key, value) {
    if (this !== localStorage || key !== checkpointKey) return original.call(this, key, value);
    attempts++;
    try { const result = original.call(this, key, value); successes++; sample('checkpoint-write'); return result; }
    catch (error) { failures++; sample('checkpoint-failure'); throw error; }
  };
  addEventListener('DOMContentLoaded', () => {
    output = document.createElement('script'); output.type = 'application/json'; output.id = 'c16-observation'; document.body.append(output);
    new MutationObserver(changes => {
      for (const change of changes) if (change.type === 'childList' && change.target instanceof Element && change.target.matches('.iw-committed-cue')) {
        for (const node of change.addedNodes) if (node.textContent) cues++;
      }
      sample('product-DOM-mutation'); requestAnimationFrame(() => sample('native-animation-frame'));
    }).observe(document.querySelector('#root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    for (const event of ['resize','scroll']) addEventListener(event, () => sample(event));
    for (const event of ['click','keydown','change']) addEventListener(event, () => queueMicrotask(() => sample('native-input-'+event)));
    nativeMedia.addEventListener('change', () => sample('native-media-change'));
    sample('initial'); requestAnimationFrame(() => sample('initial-frame'));
  }, { once: true });
})();`
const server = await createServer({ root, server: { host: '127.0.0.1', port, strictPort: true }, plugins: [{
  name: 'C16-VERIFY-explicit-TEST-only',
  configureServer(server) {
    server.middlewares.use('/__c16-observation', (req, res) => {
      if (req.method !== 'POST' || req.headers.origin !== 'http://127.0.0.1:'+port) { res.statusCode = 403; res.end(); return }
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 96000) req.destroy() });
      req.on('end', () => {
        try { const row = JSON.parse(body); if (row.TEST_ONLY !== true || !row.url.startsWith('http://127.0.0.1:'+port+'/')) throw Error('Invalid observation');
          appendFileSync(resolve(evidence, 'native-observations.log'), JSON.stringify(row)+'\n'); res.statusCode = 204; res.end(); }
        catch { res.statusCode = 400; res.end() }
      });
    });
  },
  transformIndexHtml(html) { return { html: html.replace('<title>电梯求生</title>', '<title>C16 VERIFY TEST · 电梯求生</title>'),
    tags: [{ tag: 'script', children: injected, injectTo: 'head-prepend' }] } },
}] })
await server.listen(); console.log('C16 VERIFY TEST original React http://127.0.0.1:'+port+'/?dev-infected-world=1')
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0) })
