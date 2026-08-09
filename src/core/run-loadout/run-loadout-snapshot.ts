import { deepFreeze } from '../config'
import {
  createCarriedItemContainersSnapshot,
  type QuickSlotDependencies,
} from '../quick-slot'
import {
  createItemStateCollectionSnapshot,
  type ItemStateCollectionSnapshot,
} from '../item-state'
import {
  createRunReturnSnapshot,
  createRunStoredInventorySnapshot,
  createRunTaskStorageSnapshot,
  createRunWarehouseSnapshot,
  type RunReturnDependencies,
  type RunReturnSnapshot,
  type RunStorageDependencies,
} from '../run-return'
import { RunLoadoutError } from './run-loadout-errors'
import type {
  RunLoadoutDependencies,
  RunLoadoutSnapshot,
} from './run-loadout-types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createRunLoadoutDependenciesFromReturn(
  dependencies: RunReturnDependencies,
): RunLoadoutDependencies {
  return deepFreeze({
    physicalCatalog: dependencies.scene.physicalCatalog,
    equipmentCatalog: dependencies.scene.equipmentCatalog,
    quickSlotCatalog: dependencies.scene.quickSlotCatalog,
    itemResourceCatalog: dependencies.scene.itemResourceCatalog,
    lifecycleCatalog: dependencies.lifecycleCatalog,
    backpackRules: {
      width: dependencies.scene.config.backpack.width,
      height: dependencies.scene.config.backpack.height,
      weightBands: dependencies.scene.config.backpack.weightBands,
    },
  })
}

function storageDependencies(
  dependencies: RunLoadoutDependencies,
): RunStorageDependencies {
  return {
    physicalCatalog: dependencies.physicalCatalog,
    itemResourceCatalog: dependencies.itemResourceCatalog,
    lifecycleCatalog: dependencies.lifecycleCatalog,
  }
}

function carriedDependencies(
  dependencies: RunLoadoutDependencies,
): QuickSlotDependencies {
  return {
    physicalCatalog: dependencies.physicalCatalog,
    equipmentCatalog: dependencies.equipmentCatalog,
    quickSlotCatalog: dependencies.quickSlotCatalog,
  }
}

function allOwnedItems(
  snapshot: Readonly<{
    warehouse: RunLoadoutSnapshot['warehouse']
    taskStorage: RunLoadoutSnapshot['taskStorage']
    backpack: RunLoadoutSnapshot['backpack']
    equipment: RunLoadoutSnapshot['equipment']
    quickSlots: RunLoadoutSnapshot['quickSlots']
  }>,
) {
  return [
    ...snapshot.warehouse.items,
    ...snapshot.taskStorage.items,
    ...snapshot.backpack.items,
    ...Object.values(snapshot.equipment).filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
    ...snapshot.quickSlots.slots.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
  ]
}

function normalizeItemStates(
  states: unknown,
  items: ReturnType<typeof allOwnedItems>,
  dependencies: RunLoadoutDependencies,
): ItemStateCollectionSnapshot {
  if (!exact(states, ['states']) || !Array.isArray(states.states)) {
    throw new RunLoadoutError('INVALID_INPUT', 'Run整备物品状态结构无效')
  }
  try {
    return createItemStateCollectionSnapshot(
      states.states,
      items,
      dependencies.itemResourceCatalog,
    )
  } catch (error) {
    throw new RunLoadoutError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Run整备物品状态无效',
    )
  }
}

export function createRunLoadoutSnapshot(
  input: RunLoadoutSnapshot,
  dependencies: RunLoadoutDependencies,
): RunLoadoutSnapshot {
  if (!exact(input, [
    'backpack',
    'equipment',
    'itemStates',
    'quickSlots',
    'taskStorage',
    'warehouse',
  ])) {
    throw new RunLoadoutError('INVALID_INPUT', 'Run整备快照结构无效')
  }
  let warehouse: RunLoadoutSnapshot['warehouse']
  let taskStorage: RunLoadoutSnapshot['taskStorage']
  let carried: ReturnType<typeof createCarriedItemContainersSnapshot>
  try {
    warehouse = createRunWarehouseSnapshot(input.warehouse, storageDependencies(dependencies))
    taskStorage = createRunTaskStorageSnapshot(input.taskStorage, storageDependencies(dependencies))
    carried = createCarriedItemContainersSnapshot(
      input.backpack,
      input.equipment,
      input.quickSlots,
      carriedDependencies(dependencies),
    )
  } catch (error) {
    throw new RunLoadoutError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Run整备容器无效',
    )
  }
  if (
    carried.backpack.width !== dependencies.backpackRules.width ||
    carried.backpack.height !== dependencies.backpackRules.height
  ) {
    throw new RunLoadoutError('INVALID_INPUT', 'Run整备背包尺寸与规则不一致')
  }
  const items = allOwnedItems({
    warehouse,
    taskStorage,
    backpack: carried.backpack,
    equipment: carried.equipment,
    quickSlots: carried.quickSlots,
  })
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.instanceId)) {
      throw new RunLoadoutError('INVALID_INPUT', `Run整备物品实例跨容器重复：${item.instanceId}`)
    }
    ids.add(item.instanceId)
  }
  const itemStates = normalizeItemStates(input.itemStates, items, dependencies)
  return deepFreeze({
    warehouse,
    taskStorage,
    backpack: carried.backpack,
    equipment: carried.equipment,
    quickSlots: carried.quickSlots,
    itemStates,
  })
}

export function createRunLoadoutSnapshotFromReturn(
  snapshot: RunReturnSnapshot,
  dependencies: RunReturnDependencies,
): RunLoadoutSnapshot {
  let normalized: RunReturnSnapshot
  try {
    normalized = createRunReturnSnapshot(snapshot, dependencies)
  } catch (error) {
    throw new RunLoadoutError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Run返回快照无效',
    )
  }
  return createRunLoadoutSnapshot({
    warehouse: normalized.warehouse,
    taskStorage: normalized.taskStorage,
    backpack: normalized.player.backpack,
    equipment: normalized.player.equipment,
    quickSlots: normalized.player.quickSlots,
    itemStates: normalized.itemStates,
  }, createRunLoadoutDependenciesFromReturn(dependencies))
}

/** Projects only Run storage facts; equipped, backpack and quick-slot state stays in the loadout. */
export function projectRunStoredInventoryFromRunLoadout(
  snapshotInput: RunLoadoutSnapshot,
  dependencies: RunLoadoutDependencies,
) {
  const snapshot = createRunLoadoutSnapshot(snapshotInput, dependencies)
  const storedInstanceIds = new Set([
    ...snapshot.warehouse.items,
    ...snapshot.taskStorage.items,
  ].map(({ instanceId }) => instanceId))
  return createRunStoredInventorySnapshot({
    warehouse: snapshot.warehouse,
    taskStorage: snapshot.taskStorage,
    itemStates: {
      states: snapshot.itemStates.states.filter(({ instanceId }) =>
        storedInstanceIds.has(instanceId),
      ),
    },
  }, storageDependencies(dependencies))
}
