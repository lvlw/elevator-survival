/* Nine real source regions, shared by browser and editable SVG/PNG export.
 * Source 1254x1254; source inset48 -> CSS24. No new raster, blur or resample. */
function mountNineSlice(){
 document.querySelector('.shell').insertAdjacentHTML('afterbegin',`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true"><defs><image id="shared-frame-raster" href="${A}panel-nine-slice-v1.png" width="1254" height="1254"/></defs></svg>`);
 document.querySelectorAll('.metal,.panel').forEach(host=>{
  const layer=document.createElement('div');layer.className='nine-frame';layer.setAttribute('aria-hidden','true');
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
   const source=[0,48,1206],size=[48,1158,48];
   layer.insertAdjacentHTML('beforeend',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source[col]} ${source[row]} ${size[col]} ${size[row]}" preserveAspectRatio="none"><use href="#shared-frame-raster"/></svg>`);
  }
  host.prepend(layer);
 });
}
