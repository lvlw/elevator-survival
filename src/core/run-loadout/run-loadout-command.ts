import { deepFreeze } from '../config'
import {
  equipItemFromBackpack,
  swapBackpackItemWithEquippedItem,
  unequipItemToBackpack,
  type EquipmentSlotKind,
} from '../equipment'
import {
  addItemToBackpack,
  calculateBackpackWeightSubtotal,
  moveBackpackItem,
  removeItemFromBackpack,
  type BackpackPlacement,
  type ItemInstance,
} from '../inventory'
import {
  createItemState,
  getItemState,
  type ItemStateCollectionSnapshot,
} from '../item-state'
import { classifyLoad } from '../load'
import {
  createCarriedItemContainersSnapshot,
  moveOneBackpackItemToQuickSlot,
  moveQuickSlotItem,
  moveQuickSlotItemToBackpack,
  swapQuickSlotItems,
} from '../quick-slot'
import { RunLoadoutError } from './run-loadout-errors'
import { createRunLoadoutSnapshot } from './run-loadout-snapshot'
import { createStableRunLoadoutSplitInstanceId } from './stable-split-instance-id'
import type {
  RunLoadoutCommand,
  RunLoadoutDependencies,
  RunLoadoutEffect,
  RunLoadoutEvaluation,
  RunLoadoutOperation,
  RunLoadoutResolution,
  RunLoadoutSnapshot,
  RunLoadoutTransitionPlan,
} from './run-loadout-types'

const EQUIPMENT_SLOTS: readonly EquipmentSlotKind[] = [
  'weapon',
  'armor',
  'utility',
]

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

function invalid(message: string): never {
  throw new RunLoadoutError('INVALID_INPUT', message)
}

function unavailable(message: string): never {
  throw new RunLoadoutError('ACTION_NOT_AVAILABLE', message)
}

function assertNonEmptyId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(`${label}必须是非空字符串`)
  }
  return value
}

function normalizePlacement(value: unknown): BackpackPlacement {
  if (
    !exact(value, ['instanceId', 'rotated', 'x', 'y']) ||
    typeof value.instanceId !== 'string' ||
    value.instanceId.trim().length === 0 ||
    !Number.isSafeInteger(value.x) ||
    !Number.isSafeInteger(value.y) ||
    typeof value.rotated !== 'boolean'
  ) {
    invalid('背包摆放结构无效')
  }
  return deepFreeze({
    instanceId: value.instanceId,
    x: value.x as number,
    y: value.y as number,
    rotated: value.rotated,
  })
}

function normalizeSlot(value: unknown, label: string): EquipmentSlotKind {
  if (typeof value !== 'string' || !EQUIPMENT_SLOTS.includes(value as EquipmentSlotKind)) {
    invalid(`${label}无效`)
  }
  return value as EquipmentSlotKind
}

function normalizeQuickSlotIndex(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    invalid(`${label}必须是非负安全整数`)
  }
  return value as number
}

export function createRunLoadoutCommand(input: unknown): RunLoadoutCommand {
  if (!isPlainObject(input) || typeof input.kind !== 'string') {
    invalid('Run整备命令结构无效')
  }
  switch (input.kind) {
    case 'warehouse-to-backpack':
      if (!exact(input, ['instanceId', 'kind', 'placement'])) invalid('仓库转入背包命令字段无效')
      return deepFreeze({
        kind: input.kind,
        instanceId: assertNonEmptyId(input.instanceId, '仓库物品实例ID'),
        placement: normalizePlacement(input.placement),
      })
    case 'backpack-to-warehouse':
      if (!exact(input, ['instanceId', 'kind'])) invalid('背包转入仓库命令字段无效')
      return deepFreeze({
        kind: input.kind,
        instanceId: assertNonEmptyId(input.instanceId, '背包物品实例ID'),
      })
    case 'move-backpack-item':
      if (!exact(input, ['instanceId', 'kind', 'placement'])) invalid('背包整理命令字段无效')
      return deepFreeze({
        kind: input.kind,
        instanceId: assertNonEmptyId(input.instanceId, '背包物品实例ID'),
        placement: normalizePlacement(input.placement),
      })
    case 'equip-from-backpack':
      if (!exact(input, ['instanceId', 'kind', 'targetSlot'])) invalid('装备命令字段无效')
      return deepFreeze({
        kind: input.kind,
        instanceId: assertNonEmptyId(input.instanceId, '背包物品实例ID'),
        targetSlot: normalizeSlot(input.targetSlot, '目标装备槽'),
      })
    case 'unequip-to-backpack':
      if (!exact(input, ['kind', 'placement', 'sourceSlot'])) invalid('卸下装备命令字段无效')
      return deepFreeze({
        kind: input.kind,
        sourceSlot: normalizeSlot(input.sourceSlot, '来源装备槽'),
        placement: normalizePlacement(input.placement),
      })
    case 'swap-backpack-equipped':
      if (!exact(input, ['backpackInstanceId', 'displacedPlacement', 'kind', 'targetSlot'])) {
        invalid('交换装备命令字段无效')
      }
      return deepFreeze({
        kind: input.kind,
        backpackInstanceId: assertNonEmptyId(input.backpackInstanceId, '背包物品实例ID'),
        targetSlot: normalizeSlot(input.targetSlot, '目标装备槽'),
        displacedPlacement: normalizePlacement(input.displacedPlacement),
      })
    case 'backpack-to-quick-slot':
      if (!exact(input, ['instanceId', 'kind', 'targetSlotIndex'])) invalid('背包转快捷栏命令字段无效')
      return deepFreeze({
        kind: input.kind,
        instanceId: assertNonEmptyId(input.instanceId, '背包物品实例ID'),
        targetSlotIndex: normalizeQuickSlotIndex(input.targetSlotIndex, '目标快捷栏索引'),
      })
    case 'quick-slot-to-backpack':
      if (!exact(input, ['kind', 'placement', 'sourceSlotIndex'])) invalid('快捷栏转背包命令字段无效')
      return deepFreeze({
        kind: input.kind,
        sourceSlotIndex: normalizeQuickSlotIndex(input.sourceSlotIndex, '来源快捷栏索引'),
        placement: normalizePlacement(input.placement),
      })
    case 'move-quick-slot-item':
      if (!exact(input, ['kind', 'sourceSlotIndex', 'targetSlotIndex'])) invalid('移动快捷栏命令字段无效')
      return deepFreeze({
        kind: input.kind,
        sourceSlotIndex: normalizeQuickSlotIndex(input.sourceSlotIndex, '来源快捷栏索引'),
        targetSlotIndex: normalizeQuickSlotIndex(input.targetSlotIndex, '目标快捷栏索引'),
      })
    case 'swap-quick-slot-items':
      if (!exact(input, ['firstSlotIndex', 'kind', 'secondSlotIndex'])) invalid('交换快捷栏命令字段无效')
      return deepFreeze({
        kind: input.kind,
        firstSlotIndex: normalizeQuickSlotIndex(input.firstSlotIndex, '第一个快捷栏索引'),
        secondSlotIndex: normalizeQuickSlotIndex(input.secondSlotIndex, '第二个快捷栏索引'),
      })
    default:
      invalid('未知Run整备命令')
  }
}

function carriedDependencies(dependencies: RunLoadoutDependencies) {
  return {
    physicalCatalog: dependencies.physicalCatalog,
    equipmentCatalog: dependencies.equipmentCatalog,
    quickSlotCatalog: dependencies.quickSlotCatalog,
  }
}

function equipmentDependencies(dependencies: RunLoadoutDependencies) {
  return {
    physicalCatalog: dependencies.physicalCatalog,
    equipmentCatalog: dependencies.equipmentCatalog,
  }
}

function carried(snapshot: RunLoadoutSnapshot, dependencies: RunLoadoutDependencies) {
  return createCarriedItemContainersSnapshot(
    snapshot.backpack,
    snapshot.equipment,
    snapshot.quickSlots,
    carriedDependencies(dependencies),
  )
}

function findItem(
  items: readonly Readonly<ItemInstance>[],
  instanceId: string,
  label: string,
): Readonly<ItemInstance> {
  const item = items.find((candidate) => candidate.instanceId === instanceId)
  if (!item) unavailable(`${label}不存在：${instanceId}`)
  return item
}

function assertCanCarry(
  snapshot: RunLoadoutSnapshot['backpack'],
  dependencies: RunLoadoutDependencies,
): void {
  const weight = calculateBackpackWeightSubtotal(snapshot, dependencies.physicalCatalog)
  if (!classifyLoad(weight, dependencies.backpackRules).canCarry) {
    throw new RunLoadoutError('CANNOT_CARRY', '该操作会使背包进入无法携带状态')
  }
}

function allInstanceIds(snapshot: RunLoadoutSnapshot): Set<string> {
  return new Set([
    ...snapshot.warehouse.items,
    ...snapshot.taskStorage.items,
    ...snapshot.backpack.items,
    ...Object.values(snapshot.equipment).filter((item) => item !== null),
    ...snapshot.quickSlots.slots.filter((item) => item !== null),
  ].map(({ instanceId }) => instanceId))
}

function nextSnapshot(
  snapshot: RunLoadoutSnapshot,
  dependencies: RunLoadoutDependencies,
  input: Readonly<{
    warehouse?: RunLoadoutSnapshot['warehouse']
    taskStorage?: RunLoadoutSnapshot['taskStorage']
    backpack?: RunLoadoutSnapshot['backpack']
    equipment?: RunLoadoutSnapshot['equipment']
    quickSlots?: RunLoadoutSnapshot['quickSlots']
    itemStates?: ItemStateCollectionSnapshot
  }>,
): RunLoadoutSnapshot {
  return createRunLoadoutSnapshot({
    warehouse: input.warehouse ?? snapshot.warehouse,
    taskStorage: input.taskStorage ?? snapshot.taskStorage,
    backpack: input.backpack ?? snapshot.backpack,
    equipment: input.equipment ?? snapshot.equipment,
    quickSlots: input.quickSlots ?? snapshot.quickSlots,
    itemStates: input.itemStates ?? snapshot.itemStates,
  }, dependencies)
}

function makeOperation(input: RunLoadoutOperation): RunLoadoutOperation {
  return deepFreeze(input)
}

function unavailableFrom(error: unknown): never {
  if (error instanceof RunLoadoutError) throw error
  throw new RunLoadoutError(
    'ACTION_NOT_AVAILABLE',
    error instanceof Error ? error.message : 'Run整备操作不可用',
  )
}

function evaluate(
  snapshotInput: RunLoadoutSnapshot,
  commandInput: unknown,
  dependencies: RunLoadoutDependencies,
): RunLoadoutEvaluation {
  const snapshot = createRunLoadoutSnapshot(snapshotInput, dependencies)
  const command = createRunLoadoutCommand(commandInput)
  try {
    switch (command.kind) {
      case 'warehouse-to-backpack': {
        const item = findItem(snapshot.warehouse.items, command.instanceId, '仓库物品')
        if (dependencies.lifecycleCatalog.get(item.definitionId).kind === 'quest') {
          unavailable('任务物品不能位于普通仓库')
        }
        const backpack = addItemToBackpack(
          snapshot.backpack,
          item,
          command.placement,
          dependencies.physicalCatalog,
        )
        assertCanCarry(backpack, dependencies)
        const next = nextSnapshot(snapshot, dependencies, {
          warehouse: { items: snapshot.warehouse.items.filter(({ instanceId }) => instanceId !== item.instanceId) },
          backpack,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'warehouse',
            destination: 'backpack',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: command.placement,
            equipmentSlot: null,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: null,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'backpack-to-warehouse': {
        const item = findItem(snapshot.backpack.items, command.instanceId, '背包物品')
        if (dependencies.lifecycleCatalog.get(item.definitionId).kind === 'quest') {
          unavailable('任务物品不能转入普通仓库')
        }
        const removed = removeItemFromBackpack(
          snapshot.backpack,
          item.instanceId,
          dependencies.physicalCatalog,
        )
        const next = nextSnapshot(snapshot, dependencies, {
          warehouse: { items: [...snapshot.warehouse.items, removed.removedItem] },
          backpack: removed.snapshot,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'backpack',
            destination: 'warehouse',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: null,
            equipmentSlot: null,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: null,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'move-backpack-item': {
        const item = findItem(snapshot.backpack.items, command.instanceId, '背包物品')
        const backpack = moveBackpackItem(
          snapshot.backpack,
          item.instanceId,
          command.placement,
          dependencies.physicalCatalog,
        )
        const next = nextSnapshot(snapshot, dependencies, { backpack })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'backpack',
            destination: 'backpack',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: command.placement,
            equipmentSlot: null,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: null,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'equip-from-backpack': {
        const item = findItem(snapshot.backpack.items, command.instanceId, '背包物品')
        const result = equipItemFromBackpack(
          carried(snapshot, dependencies),
          item.instanceId,
          command.targetSlot,
          equipmentDependencies(dependencies),
        )
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'backpack',
            destination: 'equipment',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: null,
            equipmentSlot: command.targetSlot,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: null,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'unequip-to-backpack': {
        const item = snapshot.equipment[command.sourceSlot]
        if (!item) unavailable('来源装备槽为空')
        const result = unequipItemToBackpack(
          carried(snapshot, dependencies),
          command.sourceSlot,
          command.placement,
          equipmentDependencies(dependencies),
        )
        assertCanCarry(result.backpack, dependencies)
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'equipment',
            destination: 'backpack',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: command.placement,
            equipmentSlot: command.sourceSlot,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: null,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'swap-backpack-equipped': {
        const incoming = findItem(snapshot.backpack.items, command.backpackInstanceId, '背包物品')
        const displaced = snapshot.equipment[command.targetSlot]
        if (!displaced) unavailable('目标装备槽为空')
        const result = swapBackpackItemWithEquippedItem(
          carried(snapshot, dependencies),
          incoming.instanceId,
          command.targetSlot,
          command.displacedPlacement,
          equipmentDependencies(dependencies),
        )
        assertCanCarry(result.backpack, dependencies)
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'backpack',
            destination: 'equipment',
            instanceId: incoming.instanceId,
            definitionId: incoming.definitionId,
            quantity: incoming.quantity,
            placement: command.displacedPlacement,
            equipmentSlot: command.targetSlot,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: null,
            displacedInstanceId: displaced.instanceId,
            splitInstanceId: null,
          }),
        })
      }
      case 'backpack-to-quick-slot': {
        const item = findItem(snapshot.backpack.items, command.instanceId, '背包物品')
        let splitInstanceId: string | null = null
        let itemStates = snapshot.itemStates
        if (item.quantity > 1) {
          const state = getItemState(snapshot.itemStates, item.instanceId)
          if (state.resource.kind !== 'none') {
            unavailable('带有限资源的堆叠物品不能拆分至快捷栏')
          }
          splitInstanceId = createStableRunLoadoutSplitInstanceId(
            item.instanceId,
            item.quantity,
          )
          if (allInstanceIds(snapshot).has(splitInstanceId)) {
            unavailable('确定性拆分实例ID已存在')
          }
          itemStates = {
            states: [
              ...snapshot.itemStates.states,
              createItemState({
                instanceId: splitInstanceId,
                definitionId: item.definitionId,
                resource: { kind: 'none' },
              }, dependencies.itemResourceCatalog),
            ],
          }
        }
        const result = moveOneBackpackItemToQuickSlot(
          carried(snapshot, dependencies),
          {
            backpackInstanceId: item.instanceId,
            targetSlotIndex: command.targetSlotIndex,
            ...(splitInstanceId === null ? {} : { extractedInstanceId: splitInstanceId }),
          },
          carriedDependencies(dependencies),
        )
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
          quickSlots: result.quickSlots,
          itemStates,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'backpack',
            destination: 'quick-slots',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: 1,
            placement: null,
            equipmentSlot: null,
            sourceQuickSlotIndex: null,
            targetQuickSlotIndex: command.targetSlotIndex,
            displacedInstanceId: null,
            splitInstanceId,
          }),
        })
      }
      case 'quick-slot-to-backpack': {
        const item = snapshot.quickSlots.slots[command.sourceSlotIndex]
        if (!item) unavailable('来源快捷栏为空')
        const result = moveQuickSlotItemToBackpack(
          carried(snapshot, dependencies),
          {
            sourceSlotIndex: command.sourceSlotIndex,
            placement: command.placement,
          },
          carriedDependencies(dependencies),
        )
        assertCanCarry(result.backpack, dependencies)
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
          quickSlots: result.quickSlots,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'quick-slots',
            destination: 'backpack',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: command.placement,
            equipmentSlot: null,
            sourceQuickSlotIndex: command.sourceSlotIndex,
            targetQuickSlotIndex: null,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'move-quick-slot-item': {
        const item = snapshot.quickSlots.slots[command.sourceSlotIndex]
        if (!item) unavailable('来源快捷栏为空')
        const result = moveQuickSlotItem(
          carried(snapshot, dependencies),
          command.sourceSlotIndex,
          command.targetSlotIndex,
          carriedDependencies(dependencies),
        )
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
          quickSlots: result.quickSlots,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'quick-slots',
            destination: 'quick-slots',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: null,
            equipmentSlot: null,
            sourceQuickSlotIndex: command.sourceSlotIndex,
            targetQuickSlotIndex: command.targetSlotIndex,
            displacedInstanceId: null,
            splitInstanceId: null,
          }),
        })
      }
      case 'swap-quick-slot-items': {
        const item = snapshot.quickSlots.slots[command.firstSlotIndex]
        const displaced = snapshot.quickSlots.slots[command.secondSlotIndex]
        if (!item || !displaced) unavailable('交换快捷栏必须均有物品')
        const result = swapQuickSlotItems(
          carried(snapshot, dependencies),
          command.firstSlotIndex,
          command.secondSlotIndex,
          carriedDependencies(dependencies),
        )
        const next = nextSnapshot(snapshot, dependencies, {
          backpack: result.backpack,
          equipment: result.equipment,
          quickSlots: result.quickSlots,
        })
        return deepFreeze({
          snapshot: next,
          operation: makeOperation({
            commandKind: command.kind,
            source: 'quick-slots',
            destination: 'quick-slots',
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            quantity: item.quantity,
            placement: null,
            equipmentSlot: null,
            sourceQuickSlotIndex: command.firstSlotIndex,
            targetQuickSlotIndex: command.secondSlotIndex,
            displacedInstanceId: displaced.instanceId,
            splitInstanceId: null,
          }),
        })
      }
    }
  } catch (error) {
    unavailableFrom(error)
  }
}

export function buildRunLoadoutTransitionPlan(
  snapshot: RunLoadoutSnapshot,
  command: unknown,
  dependencies: RunLoadoutDependencies,
): RunLoadoutTransitionPlan {
  const evaluation = evaluate(snapshot, command, dependencies)
  const effects: readonly RunLoadoutEffect[] = [
    {
      kind: 'run-loadout-operation-applied',
      operation: evaluation.operation,
    },
    {
      kind: 'run-loadout-state-committed',
      itemStates: evaluation.snapshot.itemStates,
      snapshot: evaluation.snapshot,
    },
  ]
  return deepFreeze({ effects, snapshot: evaluation.snapshot })
}

export function applyRunLoadoutEffects(
  snapshot: RunLoadoutSnapshot,
  command: unknown,
  effects: readonly RunLoadoutEffect[],
  dependencies: RunLoadoutDependencies,
): RunLoadoutResolution {
  const expected = buildRunLoadoutTransitionPlan(snapshot, command, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) {
    throw new RunLoadoutError('EFFECT_MISMATCH', 'Run整备Effect与冻结正式计划不一致')
  }
  return deepFreeze({ snapshot: expected.snapshot, effects: expected.effects })
}

export function resolveRunLoadoutCommand(
  snapshot: RunLoadoutSnapshot,
  command: unknown,
  dependencies: RunLoadoutDependencies,
): RunLoadoutResolution {
  const plan = buildRunLoadoutTransitionPlan(snapshot, command, dependencies)
  return applyRunLoadoutEffects(snapshot, command, plan.effects, dependencies)
}
