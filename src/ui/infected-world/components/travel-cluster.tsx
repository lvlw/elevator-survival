import type { PlayerAction } from '../../../state/residence-session/player-types'
import { ActionButton } from './action-information'
import { areaRoomName, travelDestination, type KnownMap } from '../map/projection'

export function TravelCluster({ actions, map, onAction }: {
  actions: readonly PlayerAction[]; map: KnownMap; onAction: (action: PlayerAction) => void
}) {
  const current = map.nodes.find(node => node.current)
  return <nav className="iw-travel" aria-label="相邻方向"><strong>前往</strong><div>{actions.length ? actions.map((action, index) => {
    const destination = travelDestination(map, action.label)
    const label = destination && destination.place !== current?.place ? areaRoomName(destination) : action.label
    return <ActionButton action={action} key={index} onAction={() => onAction(action)}>
      <span aria-hidden="true">↗</span> {label}<small>精力 {action.cost ?? '未知'}</small>
    </ActionButton>
  }) : <span className="iw-muted">暂无可执行的相邻移动</span>}</div></nav>
}
