import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { knownGraph, uniqueTarget, type MapTarget } from '../map/projection'
export type Clue = Readonly<{ id:string; title:string; text:string; target?:MapTarget }>
/** Derived exclusively from the current safe DTO. Never a gameplay or knowledge owner. */
export function missionGuide(v: PlayerReadyView) {
 const power=v.tasks.publicObjectives.find(o=>o.label==='恢复供电')?.state==='completed'
 const transfer=v.tasks.publicObjectives.find(o=>o.label==='急救转运')?.state==='completed'
 const sample=({'not-acquired':'尚未取得',carried:'已携带，待交付','left-in-world':'留置现场，返回前需取回',delivered:'已交付',unavailable:'当前不可取得'})[v.tasks.sample]
 const ended=v.phase==='dead'||v.phase==='living-hub'
 const clues:Clue[]=[]
 const add=(id:string,place:string,name:string|undefined,text:string)=>{
  const target={place,...(name?{name}:{})};if(uniqueTarget(v.map,target))clues.push({id,title:name?`${place} / ${name}`:place,text,target})
 }
 const current=knownGraph(v.map)
 if(!ended&&v.phase==='active-world') {
  if(v.combat)clues.push({id:'encounter',title:'当前遭遇',text:'先处理当前遭遇。地图只供查看，已知路线不代表此刻能移动。'})
  else if(v.terminal.eligibility.deliver) add('deliver','医院','电梯前室','当前已具备原交付资格，可使用“交付返回”；仍需原保护确认。')
  else {
   const visible=v.tasks.choices.filter(a=>!(v.tasks.sample==='carried'&&a.label==='提取样本')).map(a=>a.label)
   if(visible.length&&v.location) add('here',v.location.place,v.location.name,`当前现场可调查或处理：${[...new Set(visible)].join('、')}。具体要求以原行动说明为准。`)
   if(!power) {
    const text=v.narrative?.powerSurvey?'供电已核查，仍待恢复。到设备现场核对“恢复供电”的实际要求。':'调查已知供电设备，查明转运支路的情况；尚未调查不代表供电已恢复。'
    if(current.byName.get('供电所 / 转运支路柜'))add('power','供电所','转运支路柜',text)
    else add('power','供电所',undefined,'查找相关供电设备，调查转运恢复所需的供电条件。')
   }
   if(!v.narrative?.workorder)add('record','医院','后勤控制间','查看现场记录，查明转运停摆的原因；到现场可“调查停用工单”。')
   if(!transfer)add('install','医院','转运平台',power?'供电已恢复，转运设备仍待装接。到设备现场核对“安装转运装置”的要求。':'转运设备尚未装接。先恢复相关供电；可在已知设备现场核对装接需求。')
   if(v.tasks.sample==='carried')clues.push({id:'sample-held',title:'指定样本',...(power&&transfer&&uniqueTarget(v.map,{place:'医院',name:'电梯前室'})?{target:{place:'医院',name:'电梯前室'}}:{}),text:power&&transfer?'成果已齐备，携原样本回医院电梯前室，核对原交付资格。':`样本已取得，但委托未完成；还需${[!power?'恢复供电':null,!transfer?'完成转运装接':null].filter(Boolean).join('、')}，再携回交付。`})
   else if(v.tasks.sample==='left-in-world')clues.push({id:'sample-left',title:'指定样本留置',text:'样本留在现场，返回前需取回；没有公开位置时不猜测它所在的房间。'})
   else if(v.tasks.sample==='not-acquired')add('sample','医院','冷藏室','调查已知冷藏区域的现场任务信息，核对指定样本的提取要求；位置已知不等于样本已取得。')
   if(!clues.some(c=>c.target)) {
    const n=v.map.nodes.find(n=>n.current)??v.map.nodes.find(n=>n.visited)
    if(n)add('explore',n.place,n.name,'查看当前已知出口与现场信息，继续调查供电、转运和指定样本线索；不要求固定先后路线。')
   }
  }
 }
 return {power,transfer,sample,clues,ended,
  status:ended?(v.phase==='dead'?'本次委托已终止，不能继续旧委托。':'本次委托已正式结束，以原结算结果为准。'):v.phase==='first-hub'?'准备确认后，仍由你决定何时进入医院。':v.terminal.eligibility.deliver?'当前可以交付返回。':v.tasks.sample==='carried'?'样本在身上；携带不等于委托完成。':'按已知线索调查，路线和顺序由你选择。',
  workorder:v.narrative?.workorder?'已查工单：转运曾被主动停用并隔离污染侧。':null,
 }
}
