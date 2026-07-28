import { deepFreeze } from '../config'
import {
  addItemToBackpack,
  createBackpackSnapshot,
  createItemInstance,
  removeItemFromBackpack,
} from '../inventory'
import { QuickSlotError } from './quick-slot-errors'
import {
  assertQuickSlotIndex,
  createCarriedItemContainersSnapshot,
  createQuickSlotSnapshot,
} from './quick-slot-snapshot'
import type {
  BackpackToQuickSlotInput,
  CarriedItemContainersSnapshot,
  QuickSlotDependencies,
  QuickSlotToBackpackInput,
  RemoveQuickSlotItemResult,
} from './quick-slot-types'

function allInstanceIds(snapshot: CarriedItemContainersSnapshot): Set<string> {
  return new Set([
    ...snapshot.backpack.items.map((item) => item.instanceId),
    ...Object.values(snapshot.equipment)
      .filter((item) => item !== null)
      .map((item) => item.instanceId),
    ...snapshot.quickSlots.slots
      .filter((item) => item !== null)
      .map((item) => item.instanceId),
  ])
}

export function moveOneBackpackItemToQuickSlot(
  snapshot: CarriedItemContainersSnapshot,
  input: BackpackToQuickSlotInput,
  dependencies: QuickSlotDependencies,
): CarriedItemContainersSnapshot {
  assertQuickSlotIndex(snapshot.quickSlots, input.targetSlotIndex)
  if (snapshot.quickSlots.slots[input.targetSlotIndex]) {
    throw new QuickSlotError('TARGET_SLOT_OCCUPIED', '目标快捷栏已占用')
  }
  const source = snapshot.backpack.items.find(
    (item) => item.instanceId === input.backpackInstanceId,
  )
  if (!source) {
    throw new QuickSlotError('BACKPACK_INSTANCE_NOT_FOUND', '背包实例不存在')
  }
  if (dependencies.quickSlotCatalog.get(source.definitionId).kind !== 'eligible') {
    throw new QuickSlotError('NOT_ELIGIBLE', '物品不具备快捷栏资格')
  }

  let backpack
  let extracted
  if (source.quantity === 1) {
    if (input.extractedInstanceId !== undefined) {
      throw new QuickSlotError(
        'UNEXPECTED_EXTRACTED_INSTANCE_ID',
        '单件移动不得提供新实例ID',
      )
    }
    const removed = removeItemFromBackpack(
      snapshot.backpack,
      source.instanceId,
      dependencies.physicalCatalog,
    )
    backpack = removed.snapshot
    extracted = removed.removedItem
  } else {
    const newId = input.extractedInstanceId
    if (newId === undefined) {
      throw new QuickSlotError(
        'EXTRACTED_INSTANCE_ID_REQUIRED',
        '堆叠抽取必须提供新实例ID',
      )
    }
    if (newId.trim().length === 0) {
      throw new QuickSlotError('INVALID_EXTRACTED_INSTANCE_ID', '新实例ID不能为空')
    }
    if (allInstanceIds(snapshot).has(newId)) {
      throw new QuickSlotError('DUPLICATE_INSTANCE', '新实例ID已存在')
    }
    extracted = createItemInstance(
      { instanceId: newId, definitionId: source.definitionId, quantity: 1 },
      dependencies.physicalCatalog,
    )
    backpack = createBackpackSnapshot(
      {
        ...snapshot.backpack,
        items: snapshot.backpack.items.map((item) =>
          item.instanceId === source.instanceId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      },
      dependencies.physicalCatalog,
    )
  }

  const slots = [...snapshot.quickSlots.slots]
  slots[input.targetSlotIndex] = extracted
  return createCarriedItemContainersSnapshot(
    backpack,
    snapshot.equipment,
    createQuickSlotSnapshot(
      slots,
      slots.length,
      dependencies.physicalCatalog,
      dependencies.quickSlotCatalog,
    ),
    dependencies,
  )
}

export function moveQuickSlotItemToBackpack(
  snapshot: CarriedItemContainersSnapshot,
  input: QuickSlotToBackpackInput,
  dependencies: QuickSlotDependencies,
): CarriedItemContainersSnapshot {
  assertQuickSlotIndex(snapshot.quickSlots, input.sourceSlotIndex)
  const item = snapshot.quickSlots.slots[input.sourceSlotIndex]
  if (!item) throw new QuickSlotError('EMPTY_SLOT', '源快捷栏为空')
  if (input.placement.instanceId !== item.instanceId) {
    throw new QuickSlotError(
      'PLACEMENT_INSTANCE_MISMATCH',
      '摆放实例与快捷栏实例不一致',
    )
  }
  const backpack = addItemToBackpack(
    snapshot.backpack,
    item,
    input.placement,
    dependencies.physicalCatalog,
  )
  const slots = [...snapshot.quickSlots.slots]
  slots[input.sourceSlotIndex] = null
  return createCarriedItemContainersSnapshot(
    backpack,
    snapshot.equipment,
    createQuickSlotSnapshot(
      slots,
      slots.length,
      dependencies.physicalCatalog,
      dependencies.quickSlotCatalog,
    ),
    dependencies,
  )
}

export function moveQuickSlotItem(
  snapshot: CarriedItemContainersSnapshot,
  sourceSlotIndex: number,
  targetSlotIndex: number,
  dependencies: QuickSlotDependencies,
): CarriedItemContainersSnapshot {
  assertQuickSlotIndex(snapshot.quickSlots, sourceSlotIndex)
  assertQuickSlotIndex(snapshot.quickSlots, targetSlotIndex)
  if (sourceSlotIndex === targetSlotIndex) {
    throw new QuickSlotError('SAME_SLOT', '不能移动至同一快捷栏')
  }
  const source = snapshot.quickSlots.slots[sourceSlotIndex]
  if (!source) throw new QuickSlotError('EMPTY_SLOT', '源快捷栏为空')
  if (snapshot.quickSlots.slots[targetSlotIndex]) {
    throw new QuickSlotError('TARGET_SLOT_OCCUPIED', '目标快捷栏已占用')
  }
  const slots = [...snapshot.quickSlots.slots]
  slots[sourceSlotIndex] = null
  slots[targetSlotIndex] = source
  return createCarriedItemContainersSnapshot(
    snapshot.backpack,
    snapshot.equipment,
    createQuickSlotSnapshot(slots, slots.length, dependencies.physicalCatalog, dependencies.quickSlotCatalog),
    dependencies,
  )
}

export function swapQuickSlotItems(
  snapshot: CarriedItemContainersSnapshot,
  firstSlotIndex: number,
  secondSlotIndex: number,
  dependencies: QuickSlotDependencies,
): CarriedItemContainersSnapshot {
  assertQuickSlotIndex(snapshot.quickSlots, firstSlotIndex)
  assertQuickSlotIndex(snapshot.quickSlots, secondSlotIndex)
  if (firstSlotIndex === secondSlotIndex) {
    throw new QuickSlotError('SAME_SLOT', '不能与同一快捷栏交换')
  }
  const first = snapshot.quickSlots.slots[firstSlotIndex]
  const second = snapshot.quickSlots.slots[secondSlotIndex]
  if (!first || !second) throw new QuickSlotError('EMPTY_SLOT', '交换槽位必须均有物品')
  const slots = [...snapshot.quickSlots.slots]
  slots[firstSlotIndex] = second
  slots[secondSlotIndex] = first
  return createCarriedItemContainersSnapshot(
    snapshot.backpack,
    snapshot.equipment,
    createQuickSlotSnapshot(slots, slots.length, dependencies.physicalCatalog, dependencies.quickSlotCatalog),
    dependencies,
  )
}

export function removeQuickSlotItem(
  snapshot: CarriedItemContainersSnapshot,
  slotIndex: number,
  dependencies: QuickSlotDependencies,
): RemoveQuickSlotItemResult {
  assertQuickSlotIndex(snapshot.quickSlots, slotIndex)
  const item = snapshot.quickSlots.slots[slotIndex]
  if (!item) throw new QuickSlotError('EMPTY_SLOT', '快捷栏为空')
  const slots = [...snapshot.quickSlots.slots]
  slots[slotIndex] = null
  return deepFreeze({
    snapshot: createCarriedItemContainersSnapshot(
      snapshot.backpack,
      snapshot.equipment,
      createQuickSlotSnapshot(slots, slots.length, dependencies.physicalCatalog, dependencies.quickSlotCatalog),
      dependencies,
    ),
    removedItem: item,
  })
}
