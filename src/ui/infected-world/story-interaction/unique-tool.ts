import type { PlayerAction, PlayerItem, PlayerRequest } from '../../../state/residence-session/player-types'
import type { PlayerActionInputs } from '../../../state/residence-session/player-preplay-types'

/** An explicit method with exactly one public item input. Never chooses a method, material or placement. */
export function uniqueToolRequest(action: PlayerAction, inputs: PlayerActionInputs, selected?: PlayerItem): PlayerRequest | null {
  if (!['source', 'task'].includes(action.family) || !action.method || !['lit', 'crow', 'toolbox', 'card'].includes(action.method) ||
    inputs.fields.length !== 1 || inputs.fields[0] !== 'item' || inputs.items.length !== 1 ||
    selected && selected.selector !== inputs.items[0].selector) return null
  return Object.freeze({ action: action.selector, item: inputs.items[0].selector })
}
