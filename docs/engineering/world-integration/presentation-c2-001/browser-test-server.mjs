// TEST ONLY. Original Vite config + main.tsx + original DEV React/BrowserOwner.
// Never replaces Image/decode, A views, game commands, media, animation or storage success.
import { createServer } from 'vite'
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, relative, isAbsolute, sep } from 'node:path'
const root = fileURLToPath(new URL('../../../..', import.meta.url))
const port = Number(process.argv[2]), records = JSON.parse(readFileSync(process.argv[3], 'utf8')), evidence = resolve(process.argv[4])
const rel = relative(root, evidence)
if (port !== 5232 || records.task !== 'C2-001' || !(isAbsolute(rel) || rel.startsWith('..'+sep))) throw Error('Invalid external C2 TEST endpoint')
mkdirSync(evidence, { recursive: true })
const approval = JSON.parse(readFileSync(resolve(root, 'docs/engineering/world-integration/presentation-c2-001/inputs/APPROVED-ASSETS.json'), 'utf8'))
const bounds = JSON.parse(readFileSync(resolve(evidence, 'browser-asset-bounds.json'), 'utf8'))
const admitted = new Set(approval.assets.map(a => '/'+a.destinationPath))
const script = `(() => {
  performance.setResourceTimingBufferSize(4096); // TEST observation capacity only; no resource/decoder replacement.
  const records=${JSON.stringify(records).replace(/</g, '\\u003c')}, bounds=${JSON.stringify(bounds)};
  const params=new URL(location.href).searchParams, marker='C2-001-TEST-owned-origin', key='C2-001-TEST-marker';
  const r=records.reservationKey, c=records.checkpointKey;
  const owned=localStorage.getItem(key)===marker, empty=localStorage.getItem(r)===null&&localStorage.getItem(c)===null;
  if (!owned&&!empty) throw Error('C2 TEST refuses unmarked existing origin data');
  localStorage.setItem(key,marker);
  const requested=params.get('c2-case');
  if (requested==='natural') { localStorage.removeItem(r); localStorage.removeItem(c); }
  else if (requested) { const row=records.cases[requested]; if (!row) throw Error('Unknown explicit TEST checkpoint'); localStorage.setItem(r,row.reservation);localStorage.setItem(c,row.checkpoint); }
  const initial={reservationNull:localStorage.getItem(r)===null,checkpointNull:localStorage.getItem(c)===null,case:requested??'natural'};
  const nativeSet=Storage.prototype.setItem;
  let attempts=0, successes=0, failures=0, cues=0, n=0, failNext=params.has('c2-savefail');
  Storage.prototype.setItem=function(k,v) {
    if (this!==localStorage||k!==c) return nativeSet.call(this,k,v);
    attempts++;
    try { if (failNext) { failNext=false; throw new DOMException('C2 explicit TEST quota failure','QuotaExceededError'); }
      const result=nativeSet.call(this,k,v);successes++;return result;
    } catch(error) { failures++;throw error; }
  };
  let output, queued=false;
  const box=e=>e?e.getBoundingClientRect().toJSON():null;
  const sample=reason=>{
    if(!output)return;
    const img=document.querySelector('.iw-enemy-art-raster'), cue=document.querySelector('.iw-committed-cue');
    const image=img?{src:img.getAttribute('src'),complete:img.complete,natural:[img.naturalWidth,img.naturalHeight],rect:box(img),pointerEvents:getComputedStyle(img).pointerEvents}:null;
    if(image){const row=bounds.find(a=>image.src.split('?')[0].endsWith(a.file)); if(row&&image.natural[0]){const b=row.alpha128, q=image.rect;
      image.alpha128Rect={x:q.x+b[0]/row.native[0]*q.width,y:q.y+b[1]/row.native[1]*q.height,width:(b[2]-b[0])/row.native[0]*q.width,height:(b[3]-b[1])/row.native[1]*q.height};}}
    const row={TEST_ONLY:true,serial:n++,reason,time:new Date().toISOString(),ms:performance.now(),url:location.href,initial,
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,visualScale:visualViewport?.scale},
      name:document.querySelector('.iw-enemy-info h2')?.textContent??null,stage:document.querySelector('.iw-stage-badge')?.textContent??null,
      attempts,successes,failures,cues,cue:cue?{text:cue.textContent,class:cue.className}:null,image,
      focused:document.activeElement?{tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label'),text:document.activeElement.textContent?.slice(0,60)}:null,
      geometry:Object.fromEntries(['.iw-game','.iw-battle','.iw-battle-figures','.iw-enemy-art-frame','.iw-battle-actions','.iw-committed-feedback','.iw-feed'].map(s=>[s,box(document.querySelector(s))])),
      actions:[...document.querySelectorAll('.iw-battle-actions button')].map(b=>({text:b.textContent,disabled:b.disabled,rect:box(b)})),
      resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/src/assets/presentation/world-battle-v1/')&&!new URL(e.name).searchParams.has('import')).map(e=>({name:new URL(e.name).pathname,initiatorType:e.initiatorType,startTime:e.startTime,duration:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize}))};
    output.textContent=JSON.stringify(row);
    fetch('/__c2-observation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row),keepalive:true}).catch(()=>{});
  };
  const later=reason=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sample(reason)})};
  addEventListener('DOMContentLoaded',()=>{
    output=document.createElement('script');output.type='application/json';output.id='c2-observation';document.body.append(output);
    new MutationObserver(changes=>{for(const change of changes)if(change.type==='childList'&&change.target instanceof Element&&change.target.matches('.iw-committed-cue'))for(const node of change.addedNodes)if(node.textContent)cues++;later('product-DOM-frame')})
      .observe(document.querySelector('#root'),{childList:true,subtree:true,attributes:true,attributeFilter:['class','src','style','aria-label','disabled']});
    for(const name of ['resize','scroll','click','keydown','change','load','error'])addEventListener(name,()=>later('native-'+name),true);
    sample('initial');later('initial-frame');
  },{once:true});
})();`
const server = await createServer({ root, server: { host: '127.0.0.1', port, strictPort: true }, plugins: [{
  name: 'C2-001-explicit-TEST-only',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const u = new URL(req.url, 'http://127.0.0.1:'+port)
      if (!admitted.has(u.pathname) || u.searchParams.has('import')) return next()
      const mode = JSON.parse(readFileSync(resolve(evidence, 'browser-control.json'), 'utf8'))
      const row = { time: new Date().toISOString(), path: u.pathname, mode: mode.mode, delayMs: mode.delayMs??0 }
      appendFileSync(resolve(evidence,'native-http.log'),JSON.stringify({event:'request',...row})+'\n')
      res.once('finish',()=>appendFileSync(resolve(evidence,'native-http.log'),JSON.stringify({event:'response',...row,status:res.statusCode,contentLength:res.getHeader('content-length')??null,ended:new Date().toISOString()})+'\n'))
      if(mode.mode==='fail'){res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end('C2 explicit TEST image failure');return}
      if(mode.mode==='delay'){setTimeout(next,mode.delayMs);return}
      next()
    })
    server.middlewares.use('/__c2-observation',(req,res)=>{
      if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:'+port){res.statusCode=403;res.end();return}
      let body='';req.on('data',chunk=>{body+=chunk;if(body.length>128000)req.destroy()});req.on('end',()=>{
        try{const row=JSON.parse(body);if(row.TEST_ONLY!==true||!row.url.startsWith('http://127.0.0.1:'+port+'/'))throw Error('Invalid');
          appendFileSync(resolve(evidence,'native-observations.log'),JSON.stringify(row)+'\n');res.statusCode=204;res.end()}
        catch{res.statusCode=400;res.end()}
      })
    })
  },
  transformIndexHtml(html) { return {html:html.replace('<title>电梯求生</title>','<title>C2 TEST · 电梯求生</title>'),tags:[{tag:'script',children:script,injectTo:'head-prepend'}]} },
}] })
await server.listen();console.log('C2 TEST original React http://127.0.0.1:'+port+'/?dev-infected-world=1')
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0)})
