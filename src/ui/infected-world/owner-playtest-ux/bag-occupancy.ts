import type { PlayerItem } from '../../../state/residence-session/player-types'

/** The displayed footprint is a count, not a capacity or pickup verdict. */
export function bagOccupancy(items: readonly PlayerItem[]) {
  const cells = items.filter(item => item.container === 'backpack').flatMap(item => item.footprint)
  return new Set(cells.map(cell => `${cell.x},${cell.y}`)).size
}
