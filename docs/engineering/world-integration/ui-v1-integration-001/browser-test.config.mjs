// TEST ONLY. The original main.tsx, React application, BrowserOwner and codec run unchanged.
// Explicit cases operate exclusively on this task-created origin, never Owner's 5233 data.
import original from '../../../../vite.config.ts'
import { defineConfig } from 'vite'
import { readFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
const task = 'UI-V1-INTEGRATION-001', port = 5241
const records = JSON.parse(readFileSync(process.env.UI_V1_RECORDS_PATH, 'utf8'))
const evidence = process.env.UI_V1_NATIVE_EVIDENCE
if (records.task !== task || !evidence) throw Error('Explicit UI V1 TEST inputs required')
const script = `(() => {
  if(location.origin!=='http://127.0.0.1:${port}')throw Error('Wrong TEST origin');
  const records=${JSON.stringify(records).replace(/</g, '\\u003c')};
  const params=new URL(location.href).searchParams, marker='UI-V1-001-owned-origin', r=records.reservationKey, c=records.checkpointKey;
  const owned=localStorage.getItem(marker)==='yes', empty=localStorage.getItem(r)===null&&localStorage.getItem(c)===null;
  // This one explicit adoption is for the run created and observed from empty Setup in M1/M2.
  if(!owned&&!empty&&params.get('ui-test-adopt')!=='M1-M2-created-origin')throw Error('Refuse unmarked existing origin');
  localStorage.setItem(marker,'yes');
  const requested=params.get('ui-test-case');
  if(requested==='fresh'){localStorage.removeItem(r);localStorage.removeItem(c);}
  else if(requested){const row=records.cases[requested];if(!row)throw Error('Unknown TEST case');localStorage.setItem(r,row.reservation);localStorage.setItem(c,row.checkpoint);}
  const initial={case:requested??'continuation',reservationNull:localStorage.getItem(r)===null,checkpointNull:localStorage.getItem(c)===null};
  const nativeSet=Storage.prototype.setItem;let attempts=0,successes=0,failures=0,serial=0,nonemptyCueSpanInsertions=0,failNext=params.has('ui-test-savefail');
  Storage.prototype.setItem=function(k,v){if(this!==localStorage||k!==c)return nativeSet.call(this,k,v);attempts++;try{if(failNext){failNext=false;throw new DOMException('Explicit UI V1 TEST quota failure','QuotaExceededError');}const result=nativeSet.call(this,k,v);successes++;return result;}catch(error){failures++;throw error;}};
  let output,queued=false;const box=e=>e?e.getBoundingClientRect().toJSON():null;
  const sample=reason=>{if(!output)return;const cue=document.querySelector('.iw-committed-cue');const row={TEST_ONLY:true,serial:serial++,reason,time:new Date().toISOString(),ms:performance.now(),url:location.href,initial,attempts,successes,failures,nonemptyCueSpanInsertions,
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,documentHeight:document.documentElement.scrollHeight},
    heading:document.querySelector('h1')?.textContent??null,cue:cue?{text:cue.textContent,class:cue.className}:null,
    geometry:Object.fromEntries(['.iw-game','.iw-stage','.iw-battle','.iw-battle-figures','.iw-enemy-art-frame','.iw-battle-actions','.iw-content-layer','.iw-dialog'].map(s=>[s,box(document.querySelector(s))])),
    images:[...document.images].map(e=>({src:e.getAttribute('src'),complete:e.complete,natural:[e.naturalWidth,e.naturalHeight],rect:box(e)})),
    map:{nodes:document.querySelectorAll('.iw-sidebar .iw-map-node').length,routes:document.querySelectorAll('.iw-sidebar [data-map-route]').length},
    focused:document.activeElement?{tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label'),text:document.activeElement.textContent?.slice(0,60)}:null};
    output.textContent=JSON.stringify(row);fetch('/__ui-v1-observation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row),keepalive:true}).catch(()=>{});};
  const later=reason=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sample(reason)});};
  addEventListener('DOMContentLoaded',()=>{output=document.createElement('script');output.type='application/json';output.id='ui-v1-observation';document.body.append(output);
    new MutationObserver(changes=>{for(const change of changes)if(change.type==='childList'&&change.target instanceof Element&&change.target.matches('.iw-committed-cue'))for(const node of change.addedNodes)if(node.textContent)nonemptyCueSpanInsertions++;later('product-DOM-frame');}).observe(document.querySelector('#root'),{childList:true,subtree:true,attributes:true,attributeFilter:['class','src','style','disabled']});
    for(const name of ['resize','scroll','click','keydown','change','load','error'])addEventListener(name,()=>later('native-'+name),true);sample('initial');later('initial-frame');},{once:true});
})();`
export default defineConfig({ ...original, server: { host: '127.0.0.1', port, strictPort: true }, plugins: [...original.plugins, {
  name: 'explicit-ui-v1-TEST-only',
  configureServer(server) {
    server.middlewares.use((req,res,next)=>{
      const u=new URL(req.url,'http://127.0.0.1:'+port)
      if(u.pathname==='/__ui-v1-observation'){
        if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:'+port){res.statusCode=403;res.end();return}
        let body='';req.on('data',chunk=>{body+=chunk;if(body.length>128000)req.destroy()});req.on('end',()=>{try{const row=JSON.parse(body);if(row.TEST_ONLY!==true)throw Error('Invalid');appendFileSync(resolve(evidence,'native-observations.log'),JSON.stringify(row)+'\n');res.statusCode=204;res.end()}catch{res.statusCode=400;res.end()}});return
      }
      if(!u.searchParams.has('import')&&u.pathname.includes('/src/assets/presentation/')){
        const mode=JSON.parse(readFileSync(resolve(evidence,'native-control.json'),'utf8'));const row={time:new Date().toISOString(),path:u.pathname,mode:mode.mode};appendFileSync(resolve(evidence,'native-http.log'),JSON.stringify(row)+'\n');
        if(mode.mode==='enemy-fail'&&u.pathname.includes('/world-battle-v1/')){res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end('Explicit TEST image failure');return}
      }
      next()
    })
  },
  transformIndexHtml() { return [{tag:'script',children:script,injectTo:'head-prepend'}] },
}] })
