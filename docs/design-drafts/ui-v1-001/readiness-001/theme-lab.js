/* Fixed local catalogue only. No arbitrary user scripts, CSS, URLs or gameplay fields. */
const ThemeLab=(()=>{
 const base=new URL('../',document.currentScript.src), accepted=['bandage','porter','frame'];
 const hex=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
 const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const need=(v,c)=>{if(!v)throw new Error(c);};
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
   const doc=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'image/svg+xml');
   need(!doc.querySelector('parsererror'),'SVG_PARSE');
   for(const e of doc.querySelectorAll('*')){
    need(['svg','title','defs','filter','feColorMatrix','image'].includes(e.localName),'SVG_TAG');
    for(const a of e.attributes){need(['xmlns','width','height','viewBox','id','color-interpolation-filters','type','values','filter','href'].includes(a.name),'SVG_ATTRIBUTE');if(a.name==='href')need(a.value.startsWith('data:image/png;base64,'),'SVG_EXTERNAL');if(a.name==='filter')need(a.value==='url(#t)','SVG_FILTER');}
   }
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
