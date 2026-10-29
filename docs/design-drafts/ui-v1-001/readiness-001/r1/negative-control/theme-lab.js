/* Fixed local catalogue only. No arbitrary user scripts, CSS, URLs or gameplay fields. */
const ThemeLab=(()=>{
 const base=new URL('../../../',document.currentScript.src), accepted=['bandage','porter','frame'];
 const hex=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
 const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const need=(v,c)=>{if(!v)throw new Error(c);};
 async function svgContent(bytes,r,b){
  const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  need(!source.includes('<!DOCTYPE')&&!source.includes('<!ENTITY'),'SVG_ENTITY');
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  need(!doc.querySelector('parsererror'),'SVG_PARSE');
  for(const e of doc.querySelectorAll('*')){
   need(['svg','title','defs','filter','feColorMatrix','image'].includes(e.localName),'SVG_TAG');
   for(const a of e.attributes){need(['xmlns','width','height','viewBox','id','color-interpolation-filters','type','values','filter','href'].includes(a.name),'SVG_ATTRIBUTE');if(a.name==='href')need(a.value.startsWith('data:image/png;base64,'),'SVG_EXTERNAL');if(a.name==='filter')need(a.value==='url(#t)','SVG_EXTERNAL');}
  }
  const root=doc.documentElement;
  need(root.localName==='svg'&&root.getAttribute('width')===String(b.pixels[0])&&root.getAttribute('height')===String(b.pixels[1])&&root.getAttribute('viewBox')===`0 0 ${b.pixels[0]} ${b.pixels[1]}`,'SVG_DIMENSIONS');
  const images=[...doc.querySelectorAll('image')];need(images.length===1,'SVG_IMAGE_COUNT');
  const image=images[0];
  need(image.getAttribute('width')===String(b.pixels[0])&&image.getAttribute('height')===String(b.pixels[1])&&image.getAttribute('filter')==='url(#t)','SVG_CONTENT_GEOMETRY');
  const href=image.getAttribute('href')||'',encoded=href.slice('data:image/png;base64,'.length);
  need(href.startsWith('data:image/png;base64,')&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded),'EMBEDDED_IMAGE');
  const raw=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),png=new Image();png.src=href;
  try{await png.decode();}catch{throw new Error('EMBEDDED_IMAGE');}
  need(await hex(raw)===b.sha256,'EMBEDDED_SOURCE');
  need(png.naturalWidth===r.pixels[0]&&png.naturalHeight===r.pixels[1],'DECODE');
  const matrices=[...doc.querySelectorAll('feColorMatrix')];need(matrices.length===1,'FILTER_COUNT');
  need(matrices[0].getAttribute('type')==='matrix','FILTER_TYPE');
  const parts=(matrices[0].getAttribute('values')||'').trim().split(/\s+/);
  const decimal=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  const values=parts.map(Number);
  need(parts.length===20&&parts.every(x=>decimal.test(x))&&values.every(x=>Number.isFinite(x)&&Math.abs(x)<=1)&&exact(values.slice(15),[0,0,0,1,0]),'FILTER_ALPHA');
 }
 async function validate(group){
  if(group==='baseline')return null;
  need(accepted.includes(group),'UNKNOWN_GROUP');
  const get=async p=>{const r=await fetch(new URL(p,base));need(r.ok,'FETCH');return r.json();};
  const cat=await get('readiness-001/theme/catalog.json'),t=await get('readiness-001/theme/'+group+'-test.json');
  need(exact(Object.keys(t).sort(),['group','metadata','resources']),'TOP_FIELDS');
  need(exact(Object.keys(t.metadata).sort(),Object.keys(cat.metadata).sort()),'METADATA_FIELDS');
  need(t.group===group&&t.metadata.compatibility==='R2_PRESENTATION_ONLY','COMPATIBILITY');
  need(t.metadata.schemaVersion===1&&t.metadata.status==='TEST'&&t.metadata.baselineSHA===cat.metadata.baselineSHA,'METADATA');
  need(exact(t.resources.map(r=>r.key).sort(),[...cat.groups[group]].sort()),'INCOMPLETE_GROUP');
  const replacements={};
  for(const r of t.resources){
   const b=cat.resources.find(x=>x.key===r.key);need(b,'UNKNOWN_KEY');
   need(exact(Object.keys(r).sort(),['key','pixels','alpha','canvas','foot','hit','motion','nineSlice','fit','path','sha256','format','status','sourceSha256','derivation'].sort()),'RESOURCE_FIELDS');
   need(r.status==='TEST'&&r.format==='SVG'&&r.sourceSha256===b.sha256,'PROVENANCE');
   for(const k of ['pixels','alpha','canvas','foot','hit','motion','nineSlice','fit'])need(exact(r[k],b[k]),'GEOMETRY_'+k);
   need(/^readiness-001\/theme\/test-assets\/[a-z0-9_-]+\.svg$/.test(r.path),'PATH');
   const u=new URL(r.path,base),res=await fetch(u);need(res.ok,'FILE');const bytes=await res.arrayBuffer();need(await hex(bytes)===r.sha256,'HASH');
   /* semantic mutant: content gate removed */
   const im=new Image();im.src=u.href;await im.decode();need(im.naturalWidth===r.pixels[0]&&im.naturalHeight===r.pixels[1],'DECODE');
   replacements[b.path.split('/').pop()]=u.href;
  }
  return {themeId:t.metadata.themeId,replacements};
 }
 function mount(bar,rerender,snapshot){
  if(Readiness.getMode()!=='review')return;
  const label=document.createElement('label');label.textContent=' TEST主题 ';const select=document.createElement('select');select.setAttribute('aria-label','TEST主题替换');
  for(const g of ['baseline',...accepted]){const o=document.createElement('option');o.value=g;o.textContent=g;select.append(o);}
  select.value=Readiness.getTheme()?.themeId.split('-')[0]||'baseline';label.append(select);bar.append(label);
  select.onchange=async()=>{select.disabled=true;try{await Readiness.setTheme(select.value,validate,snapshot,rerender);}catch(e){select.disabled=false;const msg=document.createElement('span');msg.textContent=' 替换拒绝：'+e.message;bar.append(msg);}};
 }
 return Object.freeze({mount,validate});
})();
