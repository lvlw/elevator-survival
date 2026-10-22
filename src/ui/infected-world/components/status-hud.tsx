import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { phaseNames } from '../labels'

function Meter({ label, current, maximum }: { label: string; current: number; maximum: number }) {
  return <div className="iw-meter"><div><span>{label}</span><strong>{current} / {maximum}</strong></div>
    <meter aria-label={label} min={0} max={maximum} value={current} /></div>
}
export function StatusHud({ view }: { view: PlayerReadyView }) {
  return <header className="iw-hud" aria-label="当前身体与进度">
    <div className="iw-brand"><strong>电梯求生</strong><small>DEV · 封闭首玩</small></div>
    <div className="iw-day"><small>任务进度</small><strong>{view.taskDay === null ? '准备中' : `第 ${view.taskDay} 日`}</strong><span>{phaseNames[view.point]}</span></div>
    <Meter label="生命" {...view.body.hp} /><Meter label="精力" {...view.body.energy} /><Meter label="饱食" {...view.body.satiety} />
    <details className="iw-condition"><summary>{view.body.infectionWarning.label}</summary><p>{view.body.infectionWarning.mechanism}</p></details>
    <div className="iw-condition-tags" aria-label="当前伤势">
      {view.body.bleeding && <span className="iw-danger">流血</span>}
      {view.body.minorContusions > 0 && <span>挫伤 ×{view.body.minorContusions}</span>}
      {view.body.wounds.length > 0 && <span>伤口 ×{view.body.wounds.length}</span>}
      {view.body.painkillerActive && <span>镇痛生效</span>}
    </div>
  </header>
}
