import { deepFreeze } from '../config'
import type { RunLoadoutSnapshot } from '../run-loadout'
import type { HubItemSource } from './hub-inventory'

export type PlayerVisibleHubItemSource =
  | Readonly<{ container: 'warehouse'; ordinal: number }>
  | Readonly<{ container: 'backpack'; column: number; row: number }>
  | Readonly<{ container: 'quick-slot'; slotNumber: number }>

/** Projects a formal Hub source without exposing its physical instance ID. */
export function getPlayerVisibleHubItemSource(
  snapshot: RunLoadoutSnapshot,
  source: HubItemSource,
): PlayerVisibleHubItemSource {
  if (source.container === 'warehouse') {
    const ordinal = snapshot.warehouse.items.findIndex(
      ({ instanceId }) => instanceId === source.itemInstanceId,
    ) + 1
    if (ordinal < 1) throw new Error('正式中枢来源不在仓库中')
    return deepFreeze({ container: source.container, ordinal })
  }
  if (source.container === 'backpack') {
    const placement = snapshot.backpack.placements.find(
      ({ instanceId }) => instanceId === source.itemInstanceId,
    )
    if (!placement) throw new Error('正式中枢来源不在背包中')
    return deepFreeze({
      container: source.container,
      column: placement.x + 1,
      row: placement.y + 1,
    })
  }
  return deepFreeze({
    container: source.container,
    slotNumber: source.quickSlotIndex + 1,
  })
}
