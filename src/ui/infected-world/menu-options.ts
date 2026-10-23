import type { PlayerActionInputs } from '../../state/residence-session/player-preplay-types'
import type { PlayerAction, PlayerHandle, PlayerItem, PlayerReadyView } from '../../state/residence-session/player-types'

/** Context applicability only: existing safe candidates, exact current opaque reference. No clinical inference. */
export function itemMenuActions(view: PlayerReadyView, item: PlayerItem, describe: (action: PlayerHandle) => PlayerActionInputs): readonly PlayerAction[] {
  if (!view.carried.some(i => i.selector === item.selector) || !['backpack', 'quick'].includes(item.container)) return []
  return view.actions.filter(action => ['inventory', 'task-transfer', 'medical'].includes(action.family) &&
    describe(action.selector).items.some(candidate => candidate.selector === item.selector))
}
