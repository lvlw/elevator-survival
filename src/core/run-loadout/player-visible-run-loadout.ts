import { deepFreeze } from '../config'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { getItemState } from '../item-state'
import { classifyLoad, type LoadTier } from '../load'
import { createRunLoadoutCommand, previewRunLoadoutCommand } from './run-loadout-command'
import type {
  RunLoadoutCommand,
  RunLoadoutDependencies,
  RunLoadoutSnapshot,
} from './run-loadout-types'

export type PlayerVisibleRunLoadoutLocation =
  | Readonly<{ container: 'warehouse'; ordinal: number }>
  | Readonly<{ container: 'backpack'; column: number; row: number }>
  | Readonly<{ container: 'equipment'; slot: 'weapon' | 'armor' | 'utility' }>
  | Readonly<{ container: 'quick-slot'; slotNumber: number }>

export interface PlayerVisibleRunLoadoutEvaluation {
  readonly operationKind: RunLoadoutCommand['kind']
  readonly definitionId: string
  readonly source: PlayerVisibleRunLoadoutLocation
  readonly target: PlayerVisibleRunLoadoutLocation
  readonly quantityMoved: number
  readonly sourceQuantityBefore: number
  readonly sourceQuantityAfter: number
  readonly targetQuantityBefore: number | null
  readonly targetQuantityAfter: number | null
  readonly rotated: boolean | null
  readonly displacedDefinitionId: string | null
  readonly displacedSource: PlayerVisibleRunLoadoutLocation | null
  readonly displacedTarget: PlayerVisibleRunLoadoutLocation | null
  readonly resource: Readonly<{
    kind: 'durability' | 'integrity' | 'charge'
    current: number
  }> | null
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly loadTierBefore: LoadTier
  readonly loadTierAfter: LoadTier
}

export type PlayerVisibleRunLoadoutPreview =
  | Readonly<{ canExecute: true; result: PlayerVisibleRunLoadoutEvaluation }>
  | Readonly<{
      canExecute: false
      rejectionCode: 'INVALID_INPUT' | 'ACTION_NOT_AVAILABLE' | 'CANNOT_CARRY' | 'EFFECT_MISMATCH'
    }>

type Item = RunLoadoutSnapshot['backpack']['items'][number]

function itemIn(container: readonly Item[], instanceId: string): Item | null {
  return container.find((item) => item.instanceId === instanceId) ?? null
}

function equipmentItem(snapshot: RunLoadoutSnapshot, instanceId: string) {
  return Object.entries(snapshot.equipment).find(([, item]) => item?.instanceId === instanceId) ?? null
}

function quickItem(snapshot: RunLoadoutSnapshot, instanceId: string) {
  const index = snapshot.quickSlots.slots.findIndex((item) => item?.instanceId === instanceId)
  return index < 0 ? null : { index, item: snapshot.quickSlots.slots[index]! }
}

function location(
  snapshot: RunLoadoutSnapshot,
  container: 'warehouse' | 'backpack' | 'equipment' | 'quick-slots',
  instanceId: string,
): PlayerVisibleRunLoadoutLocation {
  if (container === 'warehouse') {
    const ordinal = snapshot.warehouse.items.findIndex((item) => item.instanceId === instanceId)
    if (ordinal < 0) throw new Error('玩家可见整备位置缺少仓库实例')
    return deepFreeze({ container: 'warehouse', ordinal: ordinal + 1 })
  }
  if (container === 'backpack') {
    const placement = snapshot.backpack.placements.find((item) => item.instanceId === instanceId)
    if (!placement) throw new Error('玩家可见整备位置缺少背包摆放')
    return deepFreeze({ container: 'backpack', column: placement.x + 1, row: placement.y + 1 })
  }
  if (container === 'equipment') {
    const entry = equipmentItem(snapshot, instanceId)
    if (!entry) throw new Error('玩家可见整备位置缺少装备实例')
    return deepFreeze({ container: 'equipment', slot: entry[0] as 'weapon' | 'armor' | 'utility' })
  }
  const quick = quickItem(snapshot, instanceId)
  if (!quick) throw new Error('玩家可见整备位置缺少快捷栏实例')
  return deepFreeze({ container: 'quick-slot', slotNumber: quick.index + 1 })
}

function sourceIdentity(command: RunLoadoutCommand, snapshot: RunLoadoutSnapshot): string {
  switch (command.kind) {
    case 'warehouse-to-backpack':
    case 'backpack-to-warehouse':
    case 'move-backpack-item':
    case 'equip-from-backpack':
    case 'backpack-to-quick-slot':
      return command.instanceId
    case 'split-backpack-stack':
    case 'merge-backpack-stacks':
      return command.sourceInstanceId
    case 'swap-backpack-equipped':
      return command.backpackInstanceId
    case 'unequip-to-backpack': {
      const item = snapshot.equipment[command.sourceSlot]
      if (!item) throw new Error('玩家可见整备预览缺少卸装来源')
      return item.instanceId
    }
    case 'quick-slot-to-backpack':
    case 'move-quick-slot-item': {
      const item = snapshot.quickSlots.slots[command.sourceSlotIndex]
      if (!item) throw new Error('玩家可见整备预览缺少快捷栏来源')
      return item.instanceId
    }
    case 'swap-quick-slot-items': {
      const item = snapshot.quickSlots.slots[command.firstSlotIndex]
      if (!item) throw new Error('玩家可见整备预览缺少快捷栏交换来源')
      return item.instanceId
    }
  }
}

function findOwned(snapshot: RunLoadoutSnapshot, instanceId: string): Item | null {
  return itemIn(snapshot.warehouse.items, instanceId) ??
    itemIn(snapshot.backpack.items, instanceId) ??
    equipmentItem(snapshot, instanceId)?.[1] ??
    quickItem(snapshot, instanceId)?.item ?? null
}

function quantityIn(
  snapshot: RunLoadoutSnapshot,
  container: 'warehouse' | 'backpack' | 'equipment' | 'quick-slots',
  instanceId: string,
): number {
  return container === 'warehouse'
    ? itemIn(snapshot.warehouse.items, instanceId)?.quantity ?? 0
    : container === 'backpack'
      ? itemIn(snapshot.backpack.items, instanceId)?.quantity ?? 0
      : container === 'equipment'
        ? equipmentItem(snapshot, instanceId)?.[1].quantity ?? 0
        : quickItem(snapshot, instanceId)?.item.quantity ?? 0
}

function sourceContainer(command: RunLoadoutCommand): 'warehouse' | 'backpack' | 'equipment' | 'quick-slots' {
  return command.kind === 'warehouse-to-backpack'
    ? 'warehouse'
    : command.kind === 'unequip-to-backpack'
      ? 'equipment'
      : command.kind === 'quick-slot-to-backpack' ||
          command.kind === 'move-quick-slot-item' ||
          command.kind === 'swap-quick-slot-items'
        ? 'quick-slots'
        : 'backpack'
}

function operationTargetId(
  command: RunLoadoutCommand,
  sourceId: string,
  splitInstanceId: string | null,
): string {
  return command.kind === 'merge-backpack-stacks'
    ? command.targetInstanceId
    : splitInstanceId ?? sourceId
}

function targetContainer(command: RunLoadoutCommand): 'warehouse' | 'backpack' | 'equipment' | 'quick-slots' {
  return command.kind === 'backpack-to-warehouse'
    ? 'warehouse'
    : command.kind === 'equip-from-backpack' || command.kind === 'swap-backpack-equipped'
      ? 'equipment'
      : command.kind === 'backpack-to-quick-slot' ||
          command.kind === 'move-quick-slot-item' ||
          command.kind === 'swap-quick-slot-items'
        ? 'quick-slots'
        : 'backpack'
}

export function previewPlayerVisibleRunLoadoutCommand(
  snapshot: RunLoadoutSnapshot,
  commandInput: unknown,
  dependencies: RunLoadoutDependencies,
): PlayerVisibleRunLoadoutPreview {
  const preview = previewRunLoadoutCommand(snapshot, commandInput, dependencies)
  if (!preview.canExecute) return preview
  const command = createRunLoadoutCommand(commandInput)
  const operation = preview.result.effects.find(
    (effect) => effect.kind === 'run-loadout-operation-applied',
  )?.operation
  if (!operation) throw new Error('Run整备正式计划缺少操作事实')
  const after = preview.result.snapshot
  const sourceId = sourceIdentity(command, snapshot)
  const sourceItem = findOwned(snapshot, sourceId)
  if (!sourceItem) throw new Error('Run整备安全预览缺少来源物品')
  const targetId = operationTargetId(command, sourceId, operation.splitInstanceId)
  const sourceContainerName = sourceContainer(command)
  const targetContainerName = targetContainer(command)
  const source = location(snapshot, sourceContainerName, sourceId)
  const target = location(after, targetContainerName, targetId)
  const sameInstanceWithinContainer = sourceContainerName === targetContainerName && sourceId === targetId
  const targetBefore = sameInstanceWithinContainer
    ? null
    : quantityIn(snapshot, targetContainerName, targetId)
  const targetAfter = sameInstanceWithinContainer
    ? null
    : quantityIn(after, targetContainerName, targetId)
  const state = getItemState(snapshot.itemStates, sourceId)
  let displacedDefinitionId: string | null = null
  let displacedSource: PlayerVisibleRunLoadoutLocation | null = null
  let displacedTarget: PlayerVisibleRunLoadoutLocation | null = null
  if (command.kind === 'swap-backpack-equipped') {
    const displaced = snapshot.equipment[command.targetSlot]
    if (!displaced) throw new Error('Run整备安全预览缺少被替换装备')
    displacedDefinitionId = displaced.definitionId
    displacedSource = location(snapshot, 'equipment', displaced.instanceId)
    displacedTarget = location(after, 'backpack', displaced.instanceId)
  } else if (command.kind === 'swap-quick-slot-items') {
    const displaced = snapshot.quickSlots.slots[command.secondSlotIndex]
    if (!displaced) throw new Error('Run整备安全预览缺少被交换快捷物品')
    displacedDefinitionId = displaced.definitionId
    displacedSource = location(snapshot, 'quick-slots', displaced.instanceId)
    displacedTarget = location(after, 'quick-slots', displaced.instanceId)
  }
  const beforeWeight = calculateBackpackWeightSubtotal(snapshot.backpack, dependencies.physicalCatalog)
  const afterWeight = calculateBackpackWeightSubtotal(after.backpack, dependencies.physicalCatalog)
  return deepFreeze({
    canExecute: true as const,
    result: {
      operationKind: command.kind,
      definitionId: sourceItem.definitionId,
      source,
      target,
      quantityMoved: operation.quantity,
      sourceQuantityBefore: sourceItem.quantity,
      sourceQuantityAfter: quantityIn(after, sourceContainerName, sourceId),
      targetQuantityBefore: targetBefore,
      targetQuantityAfter: targetAfter,
      rotated: operation.placement?.rotated ?? null,
      displacedDefinitionId,
      displacedSource,
      displacedTarget,
      resource: state.resource.kind === 'none'
        ? null
        : { kind: state.resource.kind, current: state.resource.current },
      backpackWeightBefore: beforeWeight,
      backpackWeightAfter: afterWeight,
      loadTierBefore: classifyLoad(beforeWeight, dependencies.backpackRules).tier,
      loadTierAfter: classifyLoad(afterWeight, dependencies.backpackRules).tier,
    },
  })
}
