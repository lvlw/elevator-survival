import type { PlayerReadyView, PlayerAction } from '../../../state/residence-session/player-types'
import { toolName, specialtyName } from '../labels'
export function HubPanel({ view, onAction }: { view: PlayerReadyView; onAction: (action: PlayerAction) => void }) {
  return <div className="iw-hub-copy"><p className="iw-eyebrow">异常电梯中枢</p><h1>准备进入封锁区</h1>
    <p>工具：{view.first.toolChoices.map(toolName).join('、')} · 专长：{view.first.specialtyChoices.map(specialtyName).join('、')} <small>已锁定</small></p>
    <p>携带装备已就绪。出发后只按当前相邻方向探索；任务物需要真实携带并完成指定交付。</p>
    {view.actions.filter(action => action.family === 'depart').map((action, index) => <button type="button" className="iw-primary" key={index} onClick={() => onAction(action)}>{action.label}</button>)}
  </div>
}
