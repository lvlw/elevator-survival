const exportAssetCache=new Map();
async function exportData(url){if(!exportAssetCache.has(url)){exportAssetCache.set(url,(async()=>{const response=await fetch(url);if(!response.ok)throw new Error('asset '+response.status);const blob=await response.blob();return new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(blob);});})());}return exportAssetCache.get(url);}
/* Authoring-only export. It serializes this editable DOM; never game state/storage. */
async function exportDesign(format='png',local=false){
 const root=document.querySelector('.shell'), box=root.getBoundingClientRect();
 const clone=root.cloneNode(true);const originals=[root,...root.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 for(let i=0;i<originals.length;i++){
  const st=getComputedStyle(originals[i]);let css='';for(const prop of st)css+=`${prop}:${st.getPropertyValue(prop)};`;
  if(st.borderImageSource.startsWith('url(')){
   const u=st.borderImageSource.slice(5,-2);const data=await exportData(u);
   css=css.replace(st.borderImageSource,`url("${data}")`);
  }
  copies[i].setAttribute('style',css);
  if(originals[i] instanceof HTMLImageElement&&originals[i].complete&&originals[i].naturalWidth){
   const url=await exportData(originals[i].src);copies[i].setAttribute('src',url);
  }
 }
 clone.style.position='relative';clone.style.inset='auto';clone.style.margin='0';clone.style.width=box.width+'px';clone.style.height=box.height+'px';
 const markup=new XMLSerializer().serializeToString(clone);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}"><title>${active.id} — editable HTML component export</title><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="background:#070c10;width:${box.width}px;height:${box.height}px">${markup}</div></foreignObject></svg>`;
 const outName=active.id+'-'+innerWidth+'x'+innerHeight;
 if(format==='svg'){await deliver(new Blob([svg],{type:'image/svg+xml'}),outName+'.svg',local);return;}
 const canvas=document.createElement('canvas');canvas.width=box.width;canvas.height=box.height;
 const picture=new Image();const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 await new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=()=>reject(new Error('SVG export cannot render'));picture.src=src;});
 canvas.getContext('2d').drawImage(picture,0,0);const blob=await new Promise((resolve,reject)=>{try{canvas.toBlob(b=>b?resolve(b):reject(new Error('No PNG')), 'image/png');}catch(e){reject(e);}});
 await deliver(blob,outName+'.png',local);
 if(local){
  for(let i=0;i<originals.length;i++){if(originals[i] instanceof HTMLImageElement)copies[i].setAttribute('src','../assets/'+originals[i].src.split('/').pop());if(getComputedStyle(originals[i]).borderImageSource.startsWith('url('))copies[i].style.borderImageSource='url(../assets/panel-nine-slice-v1.png)';}
  const linked=svg.replace(markup,new XMLSerializer().serializeToString(clone));
  await deliver(new Blob([linked],{type:'image/svg+xml'}),outName+'.svg',true);
  const geometry={screen:active.id,viewport:[innerWidth,innerHeight],pixelRatio:devicePixelRatio,kind:'ACTUAL_DOM_EXPORT_NOT_PRODUCTION',rects:['.shell','.center','.sidebar.left','.sidebar.right','.inventory','.panel','.arena','.footer'].map(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {selector:sel,x:r.x,y:r.y,w:r.width,h:r.height,scrollH:e.scrollHeight,clientH:e.clientHeight};}),assets:Array.from(root.querySelectorAll('img')).map(i=>({path:i.getAttribute('src'),native:[i.naturalWidth,i.naturalHeight],display:[i.getBoundingClientRect().width,i.getBoundingClientRect().height]})),font:getComputedStyle(root).fontFamily,missing:Array.from(root.querySelectorAll('img')).filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src'))};
  await deliver(new Blob([JSON.stringify(geometry,null,2)+'\n'],{type:'application/json'}),outName+'.json',true);
 }
}
async function deliver(blob,name,local){if(local){const r=await fetch('/__design_export/'+name,{method:'POST',body:blob});if(!r.ok)throw new Error('Local design export '+r.status);}else download(blob,name);}
function download(blob,name){const a=document.createElement('a');a.download=name;a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
document.addEventListener('click',e=>{if(e.target.dataset.export)exportDesign(e.target.dataset.export).catch(err=>toast('导出失败：'+err.message));});
document.addEventListener('click',async e=>{if(!e.target.dataset.batch)return;e.target.disabled=true;const family=e.target.dataset.batch;const screens=family==='all'?SCREENS:SCREENS.filter(s=>s.family===family);let completed=0;for(const s of screens){navigate(s.id);await Promise.all(Array.from(document.querySelectorAll('.shell img')).map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));try{await exportDesign('png',true);completed++;}catch(err){toast('导出中止：'+s.id+' '+err.message);return;}}toast('本地设计导出完成：'+completed+'幅');});

document.addEventListener('click',e=>{if(e.target.dataset.localExport)exportDesign('png',true).then(()=>toast('本地当前图稿已导出')).catch(err=>toast('导出失败：'+err.message));});
