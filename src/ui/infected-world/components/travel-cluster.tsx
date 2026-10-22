import type { PlayerAction } from '../../../state/residence-session/player-types'
export function TravelCluster({ actions, onAction }: { actions: readonly PlayerAction[]; onAction: (action: PlayerAction) => void }) {
  return <nav className="iw-travel" aria-label="相邻方向"><strong>前往</strong><div>{actions.length ? actions.map((action, index) =>
    <button type="button" key={index} onClick={() => onAction(action)}><span aria-hidden="true">↗</span> {action.label}<small>精力 {action.cost ?? '未知'}</small></button>) : <span className="iw-muted">暂无可执行的相邻移动</span>}</div></nav>
}
