import { getScenePhysicalItemInstanceIds, type SceneExplorationSnapshot } from '../scene-exploration'
import { RunReturnError } from './run-return-errors'
import type { RunStoredInventorySnapshot } from './run-return-types'

/**
 * Enforces the global physical-instance boundary shared by Return and
 * termination. Both arguments must already have crossed their strict snapshot
 * boundaries before this check is called.
 */
export function assertNoRunStorageScenePhysicalItemConflicts(
  storedInventory: RunStoredInventorySnapshot,
  scene: SceneExplorationSnapshot,
): void {
  const storedIds = new Set([
    ...storedInventory.warehouse.items,
    ...storedInventory.taskStorage.items,
  ].map(({ instanceId }) => instanceId))
  for (const instanceId of getScenePhysicalItemInstanceIds(scene)) {
    if (storedIds.has(instanceId)) {
      throw new RunReturnError(
        'INVALID_INPUT',
        `场景物理实例与Run储存实例重复：${instanceId}`,
      )
    }
  }
}
