'use strict';
const $ = id => document.getElementById(id);
const root = '../assets/';
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const state = {view: 'explore', bleeding: false, armed: false, treated: false, newStep: 'dead', lin: 'b', icon: 'b', slot: -1};
const stage = $('stage');
const dialog = $('sheet');
let hitId = 0;
let afterDialog = null;
let dialogTrigger = null;
const media = {
  explore: 'explore.webp', battle: 'corridor.webp', npc: 'hotel.webp',
  linA: 'lin-default.webp', linB: 'npc-lin-candidate.png', blink: 'npc-lin-blink.gif',
  searchA: 'action-search-a.svg', searchB: 'action-search-b.svg',
  player: 'player-neutral.svg', enemy: 'enemy.webp', device: 'device-loop.svg', deviceStatic: 'device-static.svg',
};
const art = (src, alt = '', cls = '', fallback = '') => src ? '<img class="' + cls + '" src="' + root + src + '" alt="' + alt + '" data-fallback="' + fallback + '">' : '';
const imgButton = (command, label, icon, cost = '', cls = '', title = '') =>
  '<button data-action="' + command + '" class="' + cls + '" title="' + title + '">' + art(icon) + '<span>' + label + '</span>' + (cost ? '<span class="cost">' + cost + '</span>' : '') + '</button>';
const controls = (title, caption, body) => '<div class="stage-controls"><div class="controls-top"><strong>' + title + '</strong><small>' + caption + '</small></div><div class="actions">' + body + '</div></div>';
const heading = (path, title, tag) => '<header class="stage-copy"><div><p class="eyebrow">' + path + '</p><h2>' + title + '</h2></div><span class="tag">' + tag + '</span></header>';
const info = (title, body, complete = null) => {
  dialogTrigger = document.activeElement;
  afterDialog = complete;
  $('sheet-title').textContent = title;
  $('sheet-body').innerHTML = body;
  dialog.showModal();
};
dialog.addEventListener('close', () => {
  const old = dialogTrigger;
  if (afterDialog && dialog.returnValue === 'confirm') afterDialog();
  dialog.returnValue = '';
  afterDialog = null;
  if (old?.isConnected) old.focus();
});
const feedback = msg => { $('status').textContent = msg; };
const animated = () => $('motion').checked && !prefersReduced.matches;
function renderCarry(){
  const dead = state.view === 'dead';
  $('weight').textContent = dead ? '重量 0 · 终局' : '重量 14 · 正常';
  $('cells-count').textContent = dead ? '格位 0 / 24' : (state.treated ? '格位 4 / 24' : '格位 5 / 24');
  $('equipment').innerHTML = [['pipe.webp','武器'],['coat.webp','防具'],['lamp.webp','实用']].map(([file,label]) =>
    '<div class="equip">' + (dead ? '空' : art(file,label)) + '<span>' + label + '</span></div>').join('');
  const carried = [['bandage.webp','绷带',''],['ration.webp','压缩口粮',''],['firstaid.webp','急救包',''],['metal.webp','金属零件','2'],['lamp.webp','手电筒','']];
  $('cells').innerHTML = Array.from({length:24}, (_, i) => {
    const item = !dead && !(i===0 && state.treated) && carried[i];
    if(!item) return '<div class="cell"></div>';
    return '<button class="cell" data-action="item-' + i + '" aria-label="查看' + item[1] + '" title="' + item[1] + '">' + art(item[0]) + (item[2] ? '<b>' + item[2] + '</b>' : '') + '</button>';
  }).join('');
  $('quick').innerHTML = Array.from({length:2}, (_, i) => {
    const full = i===1 && state.armed && !dead;
    return '<button data-action="slot-' + i + '" class="slot ' + (full ? 'filled' : '') + (state.slot === i ? ' selected' : '') + '" aria-label="快捷位 ' + (i+1) + '，' + (full ? '绷带' : '空') + '"><kbd>' + (i+1) + '</kbd>' + (full ? art('bandage.webp') + '<b>1</b>' : '<small>空</small>') + '</button>';
  }).join('');
  $('body-action').disabled = dead;
  $('medical').disabled = dead;
}
function render(){
  clearTimeout(hitId);
  stage.className = 'stage' + (animated() ? '' : ' static-motion');
  const dead = state.view === 'dead';
  const hp = dead ? 0 : state.bleeding ? 1 : state.treated ? 1 : 8;
  $('health').value = hp;
  $('health-count').textContent = hp + ' / 12';
  document.querySelector('.health').classList.toggle('danger',state.bleeding && !dead);
  $('injury-state').textContent = dead ? '生命归零' : state.bleeding ? '♦ 正在流血 · 开放伤口' : '开放伤口 · 未流血';
  for(const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed',String(b.dataset.view===state.view));
  renderCarry();
  if(state.view==='explore'){
    stage.innerHTML = art(media.explore,'','plate') + heading('医院 / 当前地点','药房','探索样本') +
      '<div class="scene-pill '+(state.bleeding?'':'safe')+'"><strong>' + (state.bleeding?'♦ 正在流血':'◇ 未流血') + '</strong><span>开放伤口</span></div>' +
      '<div class="scene-tools">' + imgButton('bleed',state.bleeding?'切换为未流血':'切换为流血') + imgButton('slotfill',state.armed?'清空快捷位 2':'填充快捷位 2') + '</div>' +
      controls('房间行动','精力标记只展示公开成本样式',imgButton('search','检查药柜',state.icon==='b'?media.searchB:media.searchA,'ϟ 4','primary','检查药柜，查看公开行动说明')+imgButton('go','前往大厅','','ϟ 2','','移动说明候选')+imgButton('medical','药食与维护','', '', '', '打开公开医疗说明')+imgButton('iconab','更换检查图标'));
    return;
  }
  if(state.view==='battle'){
    stage.innerHTML = art(media.battle,'','plate') + heading('医院 / 隔离走廊','遭遇感染护工','受伤 · 公开阶段') +
      '<div class="battle-lane"><div class="actor"><label>玩家</label>' + art(media.player,'玩家背身示意') + '</div><div class="actor enemy"><label>感染护工 · 受伤</label>' + art(media.enemy,'受伤的感染护工') + '</div></div><div class="beat" aria-hidden="true"></div>' +
      controls('战斗行动','样片只展示受击，状态不会结算',imgButton('hit','攻击','','','primary','播放一次视觉样片')+imgButton('guard','防御')+imgButton('retreat','撤离')+imgButton('risk','风险与成本'));
    return;
  }
  if(state.view==='npc'){
    const useB=state.lin==='b';
    const portrait = useB ? (animated()?media.blink:media.linB) : media.linA;
    stage.innerHTML= art(media.npc,'','plate')+heading('酒店 / 安置点','林岑',useB?'候选 B · 新立绘':'现有 A · 原立绘')+
      art(portrait,'成年人物林岑','npc-portrait',useB?media.linB:media.linA)+
      '<div class="npc-card"><p><b>安置点会面</b></p><p>查看既有药品换取口粮的交互布局。</p><p><small>候选只调整站姿、眼神与夹克剪裁。</small></p></div>' +
      art(animated()?media.device:media.deviceStatic,'设备灯光样片','device-sample',media.deviceStatic)+
      controls('现场交互','人物与设备样片不发送游戏命令',imgButton('portrait','对照 A / B','','','primary')+imgButton('offer','查看交换条件')+imgButton('device','设备样片说明'));
    return;
  }
  const done = state.newStep==='ready';
  const setup = state.newStep==='setup';
  stage.innerHTML='<div class="terminal"><p class="eyebrow">ATTEMPT / 结果候选</p>'+
    (done ? '<h2>新尝试已准备</h2><p>这是离线流程样本。当前网页不会创建角色或保存进度。</p><button data-action="backdead">返回死亡结果样本</button>'
      :setup ? '<h2>新尝试设置</h2><p>旧死亡摘要保留，直到你确认替换。先选择新角色的工具与专长。</p><form class="preview-form" id="setup-form"><label>工具<select required name="tool"><option value="">请选择</option><option>撬棍</option><option>手电筒</option><option>工具箱</option></select></label><label>专长<select required name="skill"><option value="">请选择</option><option>侦察</option><option>工程</option><option>生存</option></select></label><div class="actions"><button class="primary" type="submit">下一步：确认替换</button><button type="button" data-action="backdead">取消</button></div></form>'
      : '<h2>本次尝试结束</h2><p><b>生命归零。</b> 先查看结果，或准备一名新角色。</p><details><summary>查看物品处置</summary><p>样本箱、消毒剂与工具未能安全带回。这里只展示列表组织方式。</p></details><div class="actions"><button class="primary" data-action="new">准备新角色</button><button data-action="summary">查看行动记录</button></div>')+'</div>';
  const form=$('setup-form');
  if(form)form.addEventListener('submit',e=>{
    e.preventDefault();
    info('替换唯一试玩档？','<p>正式流程只有在明确确认并成功保存后，才会切换到新角色。旧角色进度、装备与任务不会继承。</p><p>候选演示不写入任何存档。</p><form method="dialog" class="actions"><button value="cancel">继续修改</button><button class="primary" value="confirm">确认替换 · 演示</button></form>',()=>{state.newStep='ready';render();stage.querySelector('button').focus();feedback('候选演示：确认完成。无档案写入。');});
  });
}
function medical(){
  info('身体与医疗','<p>'+ (state.bleeding?'♦ 当前样本正在流血。':'◇ 当前样本没有流血。') + ' 开放伤口与流血分别显示。</p><p>绷带可处理流血。请查看物品的正式行动说明与当前合法目标。</p>'+ (state.bleeding&&!state.treated?'<button class="primary" data-action="treat">演示使用绷带</button>':'<p class="muted">当前样本无需止血。</p>'));
}
function act(cmd){
  if(cmd==='bleed'){state.bleeding=!state.bleeding;state.treated=false;render();feedback('已切换公开状态样本。');return;}
  if(cmd==='slotfill'){state.armed=!state.armed;render();feedback('候选状态切换，未自动整理物品。');return;}
  if(cmd.startsWith('slot-')){
    state.slot=Number(cmd.slice(-1));renderCarry();document.querySelector('[data-action="'+cmd+'"]').focus();
    feedback('快捷位 '+(state.slot+1)+'：'+(state.slot===1&&state.armed?'绷带 ×1':'空'));return;
  }
  if(cmd.startsWith('item-')){
    const title=['绷带','压缩口粮','急救包','金属零件','手电筒'][Number(cmd.slice(-1))];
    info(title,'<p>物品详情采用真实名称，网格内只保留图标与数量。</p><p class="muted">候选预览 · 无物品命令</p>');return;
  }
  if(cmd==='search'){info('检查药柜','<p>成本和可见风险沿用安全说明入口。候选只展示行动位置与精力标记，不搜索掉落。</p>');return;}
  if(cmd==='go'||cmd==='risk'){info('行动风险','<p>查看公开成本、条件及生命归零风险。需要确认的情况由正式 Preview 决定。</p>');return;}
  if(cmd==='medical'){medical();return;}
  if(cmd==='treat'){dialog.close();state.bleeding=false;state.treated=true;state.armed=false;render();feedback('候选切换：停止流血，生命与伤口保持。');return;}
  if(cmd==='iconab'){state.icon=state.icon==='a'?'b':'a';render();feedback('行动槽仍为“检查药柜”；当前图标 '+state.icon.toUpperCase()+'。');return;}
  if(cmd==='hit'){clearTimeout(hitId);stage.classList.remove('hit');if(animated()){void stage.offsetWidth;stage.classList.add('hit');hitId=setTimeout(()=>stage.classList.remove('hit'),480);}feedback(animated()?'播放受击样片。公开阶段不变。':'减少动态：显示静态受击说明。公开阶段不变。');return;}
  if(cmd==='guard'||cmd==='retreat'){feedback('仅审看「'+(cmd==='guard'?'防御':'撤离')+'」控件；未改变战斗样本。');return;}
  if(cmd==='portrait'){state.lin=state.lin==='a'?'b':'a';render();feedback('公开身份仍为林岑。');return;}
  if(cmd==='offer'){info('既有交换条件','<p>绷带 ×1 与消毒剂 ×1 换取口粮 ×2，另付精力。正式可用性仍由当前动作验证。</p>');return;}
  if(cmd==='device'){info('设备灯光样片','<p>灯环以 3.6 秒周期变化，关闭动效或系统减少动态时使用常亮备用图。</p>');return;}
  if(cmd==='new'||cmd==='backdead'){state.newStep=cmd==='new'?'setup':'dead';render();stage.querySelector('select,button').focus();return;}
  if(cmd==='summary'){info('行动记录候选','<p>本次终局显示公开的生命归零。没有安全死因字段时，不额外推断具体原因。</p>');}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-view], [data-action]');
  if(!b)return;
  if(b.dataset.view){if(dialog.open)dialog.close();state.view=b.dataset.view;state.slot=-1;render();feedback('已打开：'+b.textContent.trim().slice(2).trim()+'。');return;}
  const cmd=b.dataset.action;
  act(cmd);
  if(!dialog.open && !b.isConnected && cmd!=='new' && cmd!=='backdead') document.querySelector('[data-action="'+cmd+'"]')?.focus();
});
document.addEventListener('error',e=>{
  const img=e.target;
  if(!(img instanceof HTMLImageElement))return;
  const fallback=img.dataset.fallback;
  if(fallback){img.dataset.fallback='';img.src=root+fallback;return;}
  img.replaceWith(Object.assign(document.createElement('span'),{className:'missing-art',textContent:img.alt?'◇ '+img.alt:'◇'}));
},true);
$('motion').addEventListener('change',render);
prefersReduced.addEventListener('change',render);
$('medical').addEventListener('click',medical);
$('body-action').addEventListener('click',medical);
render();
