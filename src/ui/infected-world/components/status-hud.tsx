import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { phaseNames } from '../labels'

function Meter({ label, current, maximum, kind, low }: {
  label: string; current: number; maximum: number; kind: 'hp' | 'energy' | 'satiety'; low?: boolean
}) {
  return <div className="iw-meter" data-resource={kind} data-low={low || undefined}>
    <div><span>{label}</span><strong>{current} / {maximum}</strong></div>
    <meter className="iw-sr-only" aria-label={label} min={0} max={maximum} value={current} />
    <span className="iw-meter-track" aria-hidden="true"><span style={{ width: (100 * current / maximum) + '%' }} /></span>
  </div>
}
export function StatusHud({ view, onBody, onHelp }: { view: PlayerReadyView; onBody?: () => void; onHelp?: () => void }) {
  const { hp, energy, satiety, bleeding, minorContusions, wounds, painkillerActive, infectionWarning } = view.body
  const low = hp.current > 0 && hp.current * 3 <= hp.maximum
  return <header className="iw-hud iw-framed" aria-label="当前身体与进度">
    <div className="iw-brand"><strong>电梯求生</strong><small>DEV · 封闭首玩</small></div>
    <div className="iw-day"><small>任务进度</small><strong>{view.taskDay === null ? '准备中' : `第 ${view.taskDay} 日`}</strong><span>{phaseNames[view.point]}</span></div>
    <Meter kind="hp" label="生命" {...hp} low={low} />
    <Meter kind="energy" label="精力" {...energy} />
    <Meter kind="satiety" label="饱食" {...satiety} />
    <details className="iw-condition"><summary>{infectionWarning.label}</summary><p>{infectionWarning.mechanism}</p></details>
    <div className="iw-condition-tags" aria-label="当前伤势">
      {bleeding && <span className="iw-danger">流血</span>}
      {low && <span className="iw-danger">生命偏低</span>}
      {minorContusions > 0 && <span>挫伤 ×{minorContusions}</span>}
      {wounds.length > 0 && <span>伤口 ×{wounds.length}</span>}
      {painkillerActive && <span>镇痛生效</span>}
    </div>
    <nav className="iw-hud-tools" aria-label="信息"><button type="button" onClick={onBody}>身体</button><button type="button" onClick={onHelp}>帮助</button></nav>
  </header>
}
