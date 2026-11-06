import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { missionCopy } from '../../../content/infected-world-v0.1/mission-guidance-copy'
import { missionGuide } from '../guidance/model'
import { entryBrief } from '../../../content/infected-world-v0.1/narrative-entry/content'
import type { MapTarget } from '../map/projection'
export function MissionGuide({view,detail=false,tracked,onTrack,onLocate}:{view:PlayerReadyView;detail?:boolean;tracked?:string|null;onTrack(id:string):void;onLocate(target:MapTarget):void}) {
 const model=missionGuide(view), clue=model.clues.find(c=>c.id===tracked)??model.clues[0]
 const brief=view.narrative?.brief??entryBrief
 const progress=<ul className="iw-mission-progress"><li>供电：{model.power?'已恢复':view.narrative?.powerSurvey?'已核查，待恢复':'尚未恢复（未核查）'}</li><li>转运：{model.transfer?'已完成装接':'装接未完成'}</li><li>指定样本：{model.sample}</li></ul>
 const locate=(target:MapTarget)=>()=>onLocate(target)
 if(!detail)return <section className="iw-mission-tracker"><h2>{missionCopy.title}</h2>{progress}{view.taskDay!==null&&<small>任务第 {view.taskDay} / {brief.days} 日</small>}{clue&&<p className="iw-tracked-clue">线索 · {clue.title}<small title={clue.text}>{clue.text.split(/[。；]/)[0]}</small>{clue.target&&<button onClick={locate(clue.target)}>在地图查看</button>}</p>}</section>
 return <article className="iw-mission-detail"><p className="iw-eyebrow">封锁区 · 委托说明</p><h3>{missionCopy.title}</h3><p>{missionCopy.purpose}</p><div className="iw-mission-requirements"><section><h3>恢复当地急救转运</h3><p>{missionCopy.transfer}</p></section><section><h3>携回指定样本</h3><p>{missionCopy.sample}</p></section></div><section><h3>当前真实成果</h3>{progress}<p role="status">{model.status}</p>{model.workorder&&<p>{model.workorder}</p>}</section><section><h3>可追查的已知线索</h3>{model.clues.length?<ul className="iw-clue-list">{model.clues.map(c=><li key={c.id}><strong>{c.title}</strong><p>{c.text}</p><div>{c.target&&<button onClick={locate(c.target)}>在地图查看：{c.title}</button>}<button aria-pressed={clue?.id===c.id} onClick={()=>onTrack(c.id)}>{clue?.id===c.id?'正在追踪':'追踪线索'}</button></div></li>)}</ul>:<p>{model.status}</p>}</section><section><h3>完成与返回</h3><p>{missionCopy.returning}</p><p>驻留期限 {brief.days} 个任务日；完整履约奖励 {brief.reward} 积分。失败收入 0，最多扣现有积分中的 {brief.penalty} 积分，不负债。成功或失败正式结束后均不可重接。</p></section></article>
}
