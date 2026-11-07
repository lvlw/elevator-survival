import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { missionCopy } from '../../../content/infected-world-v0.1/mission-guidance-copy'
import { entryBrief } from '../../../content/infected-world-v0.1/narrative-entry/content'
import { missionGuide } from '../guidance/model'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { publicItemName } from '../labels'
import type { MapTarget } from '../map/projection'

export function MissionGuide({ view, detail = false, onLocate, describeAction }: {
  view: PlayerReadyView; detail?: boolean; onLocate(target: MapTarget): void; describeAction?: BrowserControls['describeAction']
}) {
  const install = view.tasks.choices.find(action => action.label === '安装转运装置')
  const materials = install && describeAction ? describeAction(install.selector).materials : []
  const shortage = materials.filter(material => material.choices.reduce((sum, item) => sum + item.quantity, 0) < material.quantity)
  const model = missionGuide(view, shortage.map(material => publicItemName(material.name)))
  const brief = view.narrative?.brief ?? entryBrief
  return <section className={detail ? 'iw-mission-detail' : 'iw-mission-tracker'} aria-label="委托进度">
    <p className="iw-eyebrow">医院委托</p>
    <h2>{missionCopy.title}</h2>
    {model.ended ? <div className="iw-mission-ended">
      <strong>{model.resultTitle}</strong>
      <p>{missionCopy.chapterEnd}。</p>
    </div> : <>
      <ol className="iw-mission-cards">{model.goals.map((goal, index) =>
        <li key={goal.id} data-goal={goal.id} data-complete={goal.complete}>
          <header>
            <h3><span aria-hidden="true">{index + 1}.</span> {goal.title}</h3><span className="iw-goal-state">{goal.status}</span>
            {detail && goal.next.target && !goal.complete && <button type="button" aria-label={`在地图查看：${goal.title}`}
              onClick={() => onLocate(goal.next.target!)}>地图定位</button>}
          </header>
          <p>{goal.purpose}</p>
          <p className="iw-goal-next">{goal.next.text}</p>
          {!detail && goal.next.target && !goal.complete && <button type="button" aria-label={`在地图查看：${goal.title}`}
            onClick={() => onLocate(goal.next.target!)}>地图定位</button>}
        </li>
      )}</ol>
      {detail && <details className="iw-mission-rules"><summary>期限与结算</summary>
        <p>驻留期限 {brief.days} 个任务日。完整履约奖励 {brief.reward} 积分。失败收入为 0，最多扣除现有积分中的 {brief.penalty} 积分，不负债。正式结束后不可重接。</p>
      </details>}
    </>}
  </section>
}
