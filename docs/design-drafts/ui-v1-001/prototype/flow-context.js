/* Presentation-only continuity. Each index entry loads an independent authored
 * sample; viewing it never loads another sample's body, inventory or lifecycle.
 * No production producer, rules, random, storage, save or session is invoked. */
let context=null, viewStack=[], selectedObject=null, motionTimer=null, flowSerial=0;
const STACKABLE=new Set(['bandage','ration','disinfectant','suppressant','painkiller','metal','electronic','cloth','battery']);
const MEDICINES=new Set(['bandage','firstaid','ration','painkiller','disinfectant','suppressant']);
const TASK_ITEMS=new Set(['sample','component','module','card']);
const ENCOUNTERS={orderly:{at:'H4',from:'H1'},porter:{at:'L2',from:'L1'},technician:{at:'C2',from:'C1'}};
function makeContext(s){
 const dead=s.family==='P21'||s.id==='P14-death',error=s.kind==='error';
 const initial=['setup','hub'].includes(s.kind), fresh=initial||s.initial===true;
 const closed=s.kind==='terminal'||s.id==='P08-delivered';
 const resources={pipe:s.kind==='maintenance'?20:30,coat:s.kind==='maintenance'?6:12,crow:12,lamp:8,toolbox:6};
 if(s.coatCase==='last')resources.coat=1;if(s.coatCase==='broken')resources.coat=0;
 return {sampleId:s.id,root:{...s},domain:error?'error':dead?'dead':closed?'living-hub':s.kind==='setup'?'setup':s.kind==='hub'?'first-hub':s.kind==='battle'||s.battle?'battle':'stable',
  node:s.node,dead,error,closed,initial,day:error?'—':s.family==='P20'?7:initial?'—':fresh?1:3,hp:error?'—':dead?0:fresh?12:8,energy:error?'—':fresh?100:s.id==='P14-consequences'?85:38,satiety:error?'—':fresh?6:4,
  items:(fresh||error||dead?[]:sampleItems(s)).map((a,i)=>({key:a[0],x:a[1],y:a[2],w:a[3],h:a[4],quantity:a[5],container:'backpack',ref:s.id+'-bag-'+i})),
  groundItems:['P11-task-pickup','P11-no-space'].includes(s.id)?[{key:'sample',ref:s.id+'-ground-sample',container:'ground',quantity:1,w:2,h:2}]:[],
  resources,coatEquipped:s.coatCase!=='unequipped',tool:s.tool||(s.kind==='setup'?null:'toolbox'),specialty:s.specialty||(s.kind==='setup'?null:'engineer'),
  enemy:s.enemy||'orderly',entryNode:ENCOUNTERS[s.enemy||'orderly'].from,
  sampleState:s.id==='P08-ground'?'H5地面 · 未携带':s.id==='P08-delivered'||s.family==='P18'?'已交付 · 不可领回':fresh?'尚未取得':sampleItems(s).some(a=>a[0]==='sample')?'实际背包内':'尚未携带',
  powerDone:s.family==='P18'||s.id==='P08-delivered'||['P06-power-result','P06-install-result'].includes(s.id),transferDone:s.family==='P18'||s.id==='P08-delivered'||s.id==='P06-install-result',
  mode:'独立样例',save:s.kind==='save'?s.id.substring(4):error?'unavailable':'saved'};
}
function selectSample(id){
 const next=SCREENS.find(s=>s.id===id);if(!next)return;
 clearTimeout(motionTimer);flowSerial++;active={...next};context=makeContext(next);viewStack=[];selectedObject=null;
 tool=context.tool;specialty=context.specialty;expanded=!!next.max;stage=next.stage||0;reduced=!!next.reduced;
 carryTab=next.id==='P10-equipment'||['setup','hub'].includes(next.kind)?'equipment':'backpack';contextNode=context.node;sceneOnly=false;chosen={};drawer=null;
 feedback='已载入独立设计样例；此操作会重置演示上下文。';render();
}
function viewSnapshot(){return {active:{...active},expanded,sceneOnly,chosen:{...chosen},selectedObject:selectedObject?{...selectedObject}:null,action:lastFocusAction,label:lastFocusLabel};}
function openView(origin,next,object=null){
 if(!next)return;lastFocus=origin||document.activeElement;lastFocusAction=lastFocus?.dataset.act;lastFocusLabel=lastFocus?.textContent;
 viewStack.push(viewSnapshot());active={...next,node:context.node};expanded=!!next.max;sceneOnly=false;chosen={};selectedObject=object||null;render();
}
function closeView(){
 if(viewStack.length){const back=viewStack.pop();active=back.active;expanded=back.expanded;sceneOnly=back.sceneOnly;chosen=back.chosen;selectedObject=back.selectedObject;render();
  (Array.from(document.querySelectorAll('[data-act]')).find(e=>e.dataset.act===back.action&&e.textContent===back.label)||document.querySelector('.center button'))?.focus();return;}
 if(['setup','first-hub','living-hub','dead','error','battle'].includes(context.domain)){toast('保持当前上下文；此层不能关闭当前任务或遭遇。');return;}
 active={...active,kind:'explore',node:context.node};sceneOnly=true;chosen={};render();
}
function currentObject(origin){
 const ref=origin?.dataset.objectRef;if(ref){const found=context.items.find(i=>i.ref===ref);if(found)return {...found};}
 const key=origin?.dataset.objectKey||origin?.dataset.act?.split(':')[1];if(!ITEMS[key])return null;
 if(origin?.dataset.container==='quick')return {key,ref:context.sampleId+'-quick-1',container:'quick',quantity:1,w:ITEMS[key][2],h:ITEMS[key][3]};
 if(origin?.dataset.container==='equipment')return {key,ref:context.sampleId+'-equipment-'+key,container:'equipment',quantity:1,w:ITEMS[key][2],h:ITEMS[key][3]};
 const found=context.items.find(i=>i.key===key);return found?{...found}:null;
}
function startOrganize(operation,origin,object){
 if(context.dead||context.error||context.closed||context.domain==='battle'){toast('当前上下文不开放整理。');return;}
 if(operation==='split'&&object&&(!STACKABLE.has(object.key)||object.quantity<2)){toast('该对象不可拆分。');return;}
 openView(origin,SCREENS.find(s=>s.id==='P11-'+operation),object);
 if(object){chosen.instance=object.ref;parameters();}
}
function showSelectedMedicine(origin,object){
 if(!object||!MEDICINES.has(object.key)){toast('请选择实际药食对象。');return;}
 if(context.dead||context.error||context.closed||context.domain==='setup'||context.domain==='first-hub'){toast('当前上下文不开放此用药示范。');return;}
 if(context.domain==='battle'&&(object.container!=='quick'||!['bandage','painkiller'].includes(object.key))){toast('战斗中只可使用真实快捷位的绷带或镇痛。');return;}
 const fixture=SCREENS.find(s=>s.id==='P12-'+object.key);
 openView(origin,{...fixture,battle:context.domain==='battle',item:object.key},object);
}
function scriptedRetreat(){
 if(context.domain!=='battle')return;const epoch=flowSerial,entry=context.entryNode,enemy=context.enemy;
 toast('退却演出示范：结果落到本场记录的入场前节点。');
 motionTimer=setTimeout(()=>{if(epoch!==flowSerial)return;context.node=entry;context.domain='stable';context.mode='连续操作';contextNode=entry;
  active={id:'P17-retreat-'+enemy,family:'P17',title:'退却完成 · '+NODES[entry][0]+' / '+NODES[entry][1],kind:'result',node:entry,enemy};viewStack=[];sceneOnly=false;chosen={};render();},reduced?0:700);
}
function samplePayment(){
 if(!active.id.startsWith('P06-sample-')||active.outcome)return '';
 const direct=chosen.method==='1'||(chosen.method===undefined&&active.method==='direct'),cost=direct?6:10;
 const participates=context.coatEquipped&&context.resources.coat>0,before=context.resources.coat;
 return `<section class="sample-payment" aria-label="当前采样已知支付"><h3>已知支付 · ${direct?'直接':'谨慎'}方案</h3>${facts([['基础精力',String(cost)],['护具',context.coatEquipped?'厚实外套':'未装备护具'],['完整度',participates?`${before}/12 → ${before-1}/12（请求1，实际1）`:context.coatEquipped?'0/12 → 0/12（不参与、不扣耗）':'未参与（不扣耗）'],['样本放置','明确2×2格位 · 原实例一次取得']])}<p class="muted">护具不参与不自动禁止合法提样。暴露结果未知；不展示概率或隐藏答案。</p></section>`;
}
