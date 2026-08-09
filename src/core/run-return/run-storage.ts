import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { createDailyMedicalUsageSnapshot } from '../daily-state'
import { createEquipmentSnapshot } from '../equipment'
import {
  createBackpackSnapshot,
  createItemInstance,
  type ItemInstance,
} from '../inventory'
import { createItemStateCollectionSnapshot } from '../item-state'
import { createQuickSlotSnapshot } from '../quick-slot'
import { createRunIntelLogSnapshot } from '../run-intel'
import { RunReturnError } from './run-return-errors'
import type {
  ItemReturnLifecycleKind,
  RunReturnDependencies,
  RunReturnLedgerSnapshot,
  RunReturnSnapshot,
  RunStorageDependencies,
  RunStoredInventorySnapshot,
  RunTaskStorageSnapshot,
  RunWarehouseSnapshot,
} from './run-return-types'

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

function normalizeItems(
  input: unknown,
  allowedKinds: readonly ItemReturnLifecycleKind[],
  dependencies: RunStorageDependencies,
): readonly Readonly<ItemInstance>[] {
  if (!Array.isArray(input)) {
    throw new RunReturnError('INVALID_INPUT', 'Run储存物品必须是数组')
  }
  const ids = new Set<string>()
  const items = input.map((candidate) => {
    if (!exact(candidate, ['definitionId', 'instanceId', 'quantity'])) {
      throw new RunReturnError('INVALID_INPUT', 'Run储存物品结构无效')
    }
    const item = createItemInstance({
      instanceId: candidate.instanceId as string,
      definitionId: candidate.definitionId as string,
      quantity: candidate.quantity as number,
    }, dependencies.physicalCatalog)
    if (ids.has(item.instanceId)) {
      throw new RunReturnError('INVALID_INPUT', `Run储存物品实例重复：${item.instanceId}`)
    }
    ids.add(item.instanceId)
    if (!allowedKinds.includes(dependencies.lifecycleCatalog.get(item.definitionId).kind)) {
      throw new RunReturnError('INVALID_INPUT', `物品位于错误的Run储存容器：${item.instanceId}`)
    }
    return item
  })
  return deepFreeze([...items].sort((left, right) =>
    left.instanceId.localeCompare(right.instanceId),
  ))
}

export function createRunWarehouseSnapshot(
  input: RunWarehouseSnapshot,
  dependencies: RunStorageDependencies,
): RunWarehouseSnapshot {
  if (!exact(input, ['items'])) {
    throw new RunReturnError('INVALID_INPUT', 'Run普通仓库结构无效')
  }
  return deepFreeze({
    items: normalizeItems(input.items, ['ordinary', 'permission'], dependencies),
  })
}

export function createRunTaskStorageSnapshot(
  input: RunTaskStorageSnapshot,
  dependencies: RunStorageDependencies,
): RunTaskStorageSnapshot {
  if (!exact(input, ['items'])) {
    throw new RunReturnError('INVALID_INPUT', 'Run任务储存区结构无效')
  }
  return deepFreeze({
    items: normalizeItems(input.items, ['quest'], dependencies),
  })
}

export function createRunStoredInventorySnapshot(
  input: RunStoredInventorySnapshot,
  dependencies: RunStorageDependencies,
): RunStoredInventorySnapshot {
  if (
    !exact(input, ['itemStates', 'taskStorage', 'warehouse']) ||
    !exact(input.itemStates, ['states']) ||
    !Array.isArray(input.itemStates.states)
  ) {
    throw new RunReturnError('INVALID_INPUT', 'Run储存库存结构无效')
  }
  const warehouse = createRunWarehouseSnapshot(input.warehouse, dependencies)
  const taskStorage = createRunTaskStorageSnapshot(input.taskStorage, dependencies)
  const items = [...warehouse.items, ...taskStorage.items]
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.instanceId)) {
      throw new RunReturnError('INVALID_INPUT', `物品实例同时存在于多个Run储存容器：${item.instanceId}`)
    }
    ids.add(item.instanceId)
  }
  let itemStates
  try {
    itemStates = createItemStateCollectionSnapshot(
      input.itemStates.states,
      items,
      dependencies.itemResourceCatalog,
    )
  } catch (error) {
    throw new RunReturnError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Run储存物品状态无效',
    )
  }
  return deepFreeze({ warehouse, taskStorage, itemStates })
}

export function createRunReturnLedgerSnapshot(
  input: RunReturnLedgerSnapshot,
): RunReturnLedgerSnapshot {
  if (!exact(input, ['sceneInstanceIds']) || !Array.isArray(input.sceneInstanceIds)) {
    throw new RunReturnError('INVALID_INPUT', 'Run返回记录结构无效')
  }
  const ids = input.sceneInstanceIds
  if (
    ids.some((id) => typeof id !== 'string' || id.trim().length === 0) ||
    new Set(ids).size !== ids.length ||
    ids.some((id, index) => index > 0 && id.localeCompare(ids[index - 1]) <= 0)
  ) {
    throw new RunReturnError('INVALID_INPUT', 'Run返回记录必须唯一且稳定排序')
  }
  return deepFreeze({ sceneInstanceIds: [...ids] })
}

export function getStoredTaskItemQuantity(
  taskStorage: RunTaskStorageSnapshot,
  definitionId: string,
): number {
  if (typeof definitionId !== 'string' || definitionId.trim().length === 0) {
    throw new RunReturnError('INVALID_INPUT', '任务物品定义ID不能为空')
  }
  return taskStorage.items
    .filter((item) => item.definitionId === definitionId)
    .reduce((total, item) => total + item.quantity, 0)
}

export function hasStoredTaskItem(
  taskStorage: RunTaskStorageSnapshot,
  definitionId: string,
  requiredQuantity: number,
): boolean {
  if (!Number.isSafeInteger(requiredQuantity) || requiredQuantity <= 0) {
    throw new RunReturnError('INVALID_INPUT', '任务物品需求数量必须是正安全整数')
  }
  return getStoredTaskItemQuantity(taskStorage, definitionId) >= requiredQuantity
}

export function createRunReturnSnapshot(
  input: RunReturnSnapshot,
  dependencies: RunReturnDependencies,
): RunReturnSnapshot {
  if (!exact(input, [
    'dailyMedicalUsage',
    'itemStates',
    'player',
    'returnLedger',
    'runIntelLog',
    'taskStorage',
    'warehouse',
  ]) ||
    !exact(input.player, ['backpack', 'condition', 'equipment', 'quickSlots']) ||
    !exact(input.itemStates, ['states']) ||
    !Array.isArray(input.itemStates.states)
  ) {
    throw new RunReturnError('INVALID_INPUT', 'Run返回快照结构无效')
  }
  const storageDependencies: RunStorageDependencies = {
    physicalCatalog: dependencies.scene.physicalCatalog,
    itemResourceCatalog: dependencies.scene.itemResourceCatalog,
    lifecycleCatalog: dependencies.lifecycleCatalog,
  }
  const warehouse = createRunWarehouseSnapshot(input.warehouse, storageDependencies)
  const taskStorage = createRunTaskStorageSnapshot(input.taskStorage, storageDependencies)
  const backpack = createBackpackSnapshot(input.player.backpack, dependencies.scene.physicalCatalog)
  if (backpack.items.length !== 0 || backpack.placements.length !== 0) {
    throw new RunReturnError('INVALID_INPUT', '返回结算后的背包必须为空')
  }
  const equipment = createEquipmentSnapshot(
    input.player.equipment,
    dependencies.scene.physicalCatalog,
    dependencies.scene.equipmentCatalog,
  )
  const quickSlots = createQuickSlotSnapshot(
    input.player.quickSlots.slots,
    dependencies.scene.config.backpack.quickSlotCount,
    dependencies.scene.physicalCatalog,
    dependencies.scene.quickSlotCatalog,
  )
  const ownedItems = [
    ...warehouse.items,
    ...taskStorage.items,
    ...Object.values(equipment).filter((item): item is Readonly<ItemInstance> => item !== null),
    ...quickSlots.slots.filter((item): item is Readonly<ItemInstance> => item !== null),
  ]
  const ids = new Set<string>()
  for (const item of ownedItems) {
    if (ids.has(item.instanceId)) {
      throw new RunReturnError('INVALID_INPUT', `当前Run拥有的物品实例跨容器重复：${item.instanceId}`)
    }
    ids.add(item.instanceId)
  }
  let itemStates
  try {
    itemStates = createItemStateCollectionSnapshot(
      input.itemStates.states,
      ownedItems,
      dependencies.scene.itemResourceCatalog,
    )
  } catch (error) {
    throw new RunReturnError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : '当前Run拥有的物品状态无效',
    )
  }
  return deepFreeze({
    player: {
      backpack,
      equipment,
      quickSlots,
      condition: createPlayerCondition(
        input.player.condition,
        dependencies.scene.config.combat.player,
      ),
    },
    warehouse,
    taskStorage,
    itemStates,
    runIntelLog: createRunIntelLogSnapshot(input.runIntelLog),
    dailyMedicalUsage: createDailyMedicalUsageSnapshot(
      input.dailyMedicalUsage,
      dependencies.scene.config,
    ),
    returnLedger: createRunReturnLedgerSnapshot(input.returnLedger),
  })
}
