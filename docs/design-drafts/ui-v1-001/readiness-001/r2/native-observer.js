/* Test-only read observation. No action, timer, theme, or state mutation. */
 document.getElementById('f04-capture').onclick=()=>{
  const actor=document.querySelector('.actor.enemy .actor-raster');
  const row={themeId:Readiness.getTheme()?.themeId||'baseline',stage:document.querySelector('#enemy-stage')?.textContent,src:actor?.getAttribute('src'),currentSrc:actor?.currentSrc,baseline:actor?.dataset.readinessBase,complete:actor?.complete,pixels:actor?[actor.naturalWidth,actor.naturalHeight]:null,decision:document.querySelector('.decision')?.textContent,feedback:document.querySelector('.feedback')?.textContent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};
  document.getElementById('f04-observation').textContent=JSON.stringify(row,null,2);
 };
