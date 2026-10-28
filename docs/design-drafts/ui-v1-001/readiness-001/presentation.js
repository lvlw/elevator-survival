/* Design-only presentation adapter. It never owns or mutates the sample context. */
'use strict';
const Readiness = (() => {
  let mode = new URLSearchParams(location.search).get('view') === 'player' ? 'player' : 'review';
  let theme = null;
  const substitutions = [
    ['（请求1，实际1）','（消耗1）'], ['明确2×2格位 · 原实例一次取得','选择2×2位置 · 仅取得一次'],
    ['防御动作示范；不造成敌人受击、不更换敌人战损。','进入防御姿态。'], ['战斗进行中 · 查看不推进CTB','战斗进行中 · 查看不会推进战斗'],
    ['明确移动','移动'], ['谨慎提取指定样本','提取指定样本'], ['直接提取指定样本','提取指定样本'], ['冷藏室 · 谨慎提样','冷藏室 · 提取样本'], ['冷藏室 · 直接提样','冷藏室 · 提取样本'],
    ['已生效 · 未保存','操作已生效，尚未保存'],
    ['打开搬运参数','移动物品'], ['明确原实例','选择物品'],
    ['接收实例','合并到物品'], ['材料实例','选择材料'],
    ['物品实例','选择物品'], ['实际材料实例','选择材料'],
    ['明确处理目标','选择处理目标'], ['当前上下文','当前页面'],
    ['返回上下文','返回'], ['明确实例与目标格位','选择物品和目标格位'],
    ['只编排显式参数，不运行库存规则或修改真实实物。','请选择物品和目标位置。'],
    ['此独立图稿不代表新增实物或默认初配。','不会因此增加物品。'],
    ['数量与剩余资源属于选中的真实实例','数量与剩余资源属于所选物品'],
    ['明确格位，不自动整理其他物品；移动时不把原实例当作新物品。','选择目标格位；不会自动移动其他物品或复制物品。'],
    ['当前粗档不等于治疗资格证明','当前病程提示不能保证药品有效'],
    ['尚不能判断（unknown）','尚不能判断'],
    ['只读已知','已知'], ['已结公开结果 · 独立设计样例','操作结果'],
    ['同一主体与阶段组；透明画布、脚底和命中锚须共同核对。','只显示当前已公开生命阶段；不提供精确生命数值。'],
    ['当前已知成本见方案；完整意图一次执行。低精力不能代替其他条件。','请查看方案的完整费用。精力不足时仍须满足其他条件。'],
    ['本样张已抽到的分支，不是必得预告','当前已发现的物品'],
    ['真实6 × 4格位','6 × 4格位'], ['实际6 × 4格位','6 × 4格位'],
    ['初配：','出发装备：'], ['完整意图','完整操作'],
    ['合法H0返回，积分120','携指定样本返回电梯前室，积分120'],
    ['H0正常返回，不补夜','正常返回，不追加过夜'],
    ['合法失败返回本次收入0，仅扣min(当前积分,20)，不能回中枢后补做。','合法失败返回本次收入0，扣20积分，不足20则扣至0；不能回中枢后补做。']
  ];
  const authorSentences = [
    '这是结果版式示例，不是生产规则运行记录。',
    '这是已结结果样张，不是下一次周期预览。',
    '人物外观是呈现候选。此处没有商店、额外支线或对话树。',
    '任务说明为当前设计呈现；数值来自已批规则',
    '本页为已结结果设计样例', '演出示范 · 不计算伤害',
    '普通完整行动不套用本确认。该样张只覆盖当前适用的终局、关键物或必死保护。',
    '恢复、锁与保存由后续正式接线负责。本设计原型不读写任何玩家记录。'
  ];
  function playerText(s) {
    for (const x of authorSentences) s=s.replaceAll(x,'');
    for (const [a,b] of substitutions) s=s.replaceAll(a,b);
    return s.replaceAll('本样张','当前状态').replaceAll('姿态示范 · 不伤敌','防御姿态').replaceAll(' · 已结事件示范','').replaceAll(' · 演出示范','').replaceAll(' · 过程示范','');
  }
  function html(markup) {
    if(mode!=='player') return markup.replace(/<button data-(?:export|local-export|batch)=[^>]*>.*?<\/button>/g,'');
    const template=document.createElement('template');template.innerHTML=markup;
    template.content.querySelectorAll('.designer,.stage-list,[data-act^="screen:"],[data-act="hit-demo"],[data-act="rotate-demo"],[data-export],[data-batch],[data-local-export]').forEach(e=>e.remove());
    const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) walker.currentNode.nodeValue=playerText(walker.currentNode.nodeValue);
    template.content.querySelectorAll('[aria-label],[alt],[title]').forEach(e=>{for(const a of ['aria-label','alt','title'])if(e.hasAttribute(a))e.setAttribute(a,playerText(e.getAttribute(a)));});
    const label=template.content.querySelector('.draftlabel');if(label)label.textContent='设计模拟 · 不读写玩家记录';
    const burden=template.content.querySelector('.sidebar.right .spread h3 + small');if(burden)burden.textContent='负重 '+burden.textContent;
    // Keep exact public durability delta; technical requested/actual labels remain review-only.
    template.content.querySelectorAll('.fact').forEach(e=>{const label=e.querySelector('span');if(label&&label.textContent.includes('请求/实际'))e.remove();});
    return template.innerHTML;
  }
  function assetPass(root=document) {
    root.querySelectorAll('img,svg image').forEach(e=>{
      const attr=e.tagName.toLowerCase()==='img'?'src':'href';
      const original=e.dataset.readinessBase||e.getAttribute(attr);if(!original||original.startsWith('#'))return;
      e.dataset.readinessBase=original;
      const file=original.split('/').pop();e.setAttribute(attr,theme?.replacements[file]||original);
    });
  }
  function redraw(rerender) {
    // Preserve presentation-only selections across the same-context repaint; no rule is rerun.
    const fields=[...document.querySelectorAll('[data-field]')].map(e=>[e.dataset.field,e.value]);
    const slots=[...document.querySelectorAll('.selection-grid .slot')].map(e=>e.className);
    const label=document.querySelector('#placement-label')?.textContent;
    const scroll=[...document.querySelectorAll('.panel-body')].map(e=>e.scrollTop);
    rerender();
    for(const [field,value] of fields){const el=[...document.querySelectorAll('[data-field]')].find(e=>e.dataset.field===field);if(el)el.value=value;}
    document.querySelectorAll('.selection-grid .slot').forEach((e,i)=>{if(slots[i])e.className=slots[i];});
    const placement=document.querySelector('#placement-label');if(placement&&label)placement.textContent=mode==='player'?playerText(label):label;
    document.querySelectorAll('.panel-body').forEach((e,i)=>{e.scrollTop=scroll[i]||0;});
  }
  function mount(rerender,snapshot) {
    assetPass();
    let bar=document.getElementById('readiness-mode');
    if(!bar){bar=document.createElement('aside');bar.id='readiness-mode';document.body.append(bar);}
    bar.innerHTML='<span>设计模拟 · 无真实结算/存档</span> <button type="button">'+(mode==='review'?'查看玩家文案':'返回作者审阅')+'</button>';
    bar.querySelector('button').onclick=()=>{mode=mode==='review'?'player':'review';document.documentElement.dataset.reviewMode=mode;redraw(rerender);};
    document.documentElement.dataset.reviewMode=mode;
    if(typeof ThemeLab!=='undefined')ThemeLab.mount(bar,rerender,snapshot);
  }
  async function setTheme(candidate, validator, snapshot, rerender) {
    const before=snapshot();
    const verified=await validator(candidate); // Complete validation and decode precede publication.
    if(JSON.stringify(before)!==JSON.stringify(snapshot()))throw new Error('CONTEXT_CHANGED_DURING_VALIDATION');
    theme=verified;redraw(rerender);
    if(JSON.stringify(before)!==JSON.stringify(snapshot()))throw new Error('CONTEXT_DRIFT');
    return theme?.themeId||'baseline';
  }
  return Object.freeze({html,mount,assetPass,playerText,setTheme,text:s=>mode==='player'?playerText(s):s,getMode:()=>mode,getTheme:()=>theme});
})();
