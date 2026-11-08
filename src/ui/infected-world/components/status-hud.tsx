import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { phaseNames } from '../labels'

function Meter({ label, current, maximum, bleeding, onBody }: {
  label: string; current: number; maximum: number; bleeding?: boolean; onBody?: () => void
}) {
  return <div className="iw-meter" data-bleeding={bleeding || undefined}><div><span>{label}</span><strong>{current} / {maximum}</strong></div>
    {bleeding && <button className="iw-bleeding-flag" type="button" onClick={onBody} aria-label="流血中，查看身体"><span aria-hidden="true">◆</span> 流血中</button>}
    <meter aria-label={label} min={0} max={maximum} value={current} /></div>
}
export function StatusHud({ view, onBody, onHelp }: { view: PlayerReadyView; onBody?: () => void; onHelp?: () => void }) {
  return <header className="iw-hud iw-framed" aria-label="当前身体与进度">
    <div className="iw-brand"><strong>电梯求生</strong><small>DEV · 封闭首玩</small></div>
    <div className="iw-day"><small>任务进度</small><strong>{view.taskDay === null ? '准备中' : `第 ${view.taskDay} 日`}</strong><span>{phaseNames[view.point]}</span></div>
    <Meter label="生命" {...view.body.hp} bleeding={view.body.bleeding} onBody={onBody} /><Meter label="精力" {...view.body.energy} /><Meter label="饱食" {...view.body.satiety} />
    <details className="iw-condition"><summary>{view.body.infectionWarning.label}</summary><p>{view.body.infectionWarning.mechanism}</p></details>
    <div className="iw-condition-tags" aria-label="当前伤势">
      {view.body.minorContusions > 0 && <span>挫伤 ×{view.body.minorContusions}</span>}
      {view.body.wounds.length > 0 && <span>伤口 ×{view.body.wounds.length}</span>}
      {view.body.painkillerActive && <span>镇痛生效</span>}
    </div>
    <nav className="iw-hud-tools" aria-label="信息"><button type="button" onClick={onBody}>身体</button><button type="button" onClick={onHelp}>帮助</button></nav>
  </header>
}
