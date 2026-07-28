import { deepFreeze } from '../config'
import {
  createBackpackEquipmentSnapshot,
  createEquipmentSnapshot,
  type EquipmentSnapshot,
} from '../equipment'
import {
  createBackpackSnapshot,
  createItemInstance,
  type BackpackSnapshot,
} from '../inventory'
import { QuickSlotError } from './quick-slot-errors'
import type {
  CarriedItemContainersSnapshot,
  QuickSlotDependencies,
  QuickSlotProfileCatalog,
  QuickSlotSnapshot,
} from './quick-slot-types'
import type { ItemCatalog, ItemInstance } from '../inventory'

function assertSlotCount(slotCount: number): void {
  if (!Number.isSafeInteger(slotCount) || slotCount <= 0) {
    throw new QuickSlotError('INVALID_SLOT_COUNT', '快捷栏数量必须是正安全整数')
  }
}

export function assertQuickSlotIndex(
  snapshot: QuickSlotSnapshot,
  slotIndex: number,
): void {
  if (
    !Number.isSafeInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= snapshot.slots.length
  ) {
    throw new QuickSlotError('INVALID_SLOT_INDEX', `无效快捷栏索引：${slotIndex}`)
  }
}

export function createQuickSlotSnapshot(
  slots: readonly (ItemInstance | null)[],
  slotCount: number,
  physicalCatalog: ItemCatalog,
  quickSlotCatalog: QuickSlotProfileCatalog,
): QuickSlotSnapshot {
  assertSlotCount(slotCount)
  if (slots.length !== slotCount) {
    throw new QuickSlotError('INVALID_SLOT_COUNT', '快捷栏快照长度与规则不一致')
  }
  const ids = new Set<string>()
  const normalized = slots.map((item) => {
    if (!item) return null
    const instance = createItemInstance(item, physicalCatalog)
    if (instance.quantity !== 1) {
      throw new QuickSlotError('INVALID_QUANTITY', '快捷栏实例数量必须为1')
    }
    if (quickSlotCatalog.get(instance.definitionId).kind !== 'eligible') {
      throw new QuickSlotError('NOT_ELIGIBLE', '物品不具备快捷栏资格')
    }
    if (ids.has(instance.instanceId)) {
      throw new QuickSlotError('DUPLICATE_INSTANCE', '同一实例占据多个快捷栏')
    }
    ids.add(instance.instanceId)
    return instance
  })
  return deepFreeze({ slots: normalized })
}

export function createEmptyQuickSlots(
  slotCount: number,
  physicalCatalog: ItemCatalog,
  quickSlotCatalog: QuickSlotProfileCatalog,
): QuickSlotSnapshot {
  assertSlotCount(slotCount)
  return createQuickSlotSnapshot(
    Array.from({ length: slotCount }, () => null),
    slotCount,
    physicalCatalog,
    quickSlotCatalog,
  )
}

export function getQuickSlot(
  snapshot: QuickSlotSnapshot,
  slotIndex: number,
): Readonly<ItemInstance> | null {
  assertQuickSlotIndex(snapshot, slotIndex)
  return snapshot.slots[slotIndex]
}

export function isQuickSlotEmpty(
  snapshot: QuickSlotSnapshot,
  slotIndex: number,
): boolean {
  return getQuickSlot(snapshot, slotIndex) === null
}

export function createCarriedItemContainersSnapshot(
  backpack: BackpackSnapshot,
  equipment: EquipmentSnapshot,
  quickSlots: QuickSlotSnapshot,
  dependencies: QuickSlotDependencies,
): CarriedItemContainersSnapshot {
  const base = createBackpackEquipmentSnapshot(
    createBackpackSnapshot(backpack, dependencies.physicalCatalog),
    createEquipmentSnapshot(
      equipment,
      dependencies.physicalCatalog,
      dependencies.equipmentCatalog,
    ),
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
  const normalizedQuickSlots = createQuickSlotSnapshot(
    quickSlots.slots,
    quickSlots.slots.length,
    dependencies.physicalCatalog,
    dependencies.quickSlotCatalog,
  )
  const ids = new Set(base.backpack.items.map((item) => item.instanceId))
  for (const equipped of Object.values(base.equipment)) {
    if (equipped) ids.add(equipped.instanceId)
  }
  for (const item of normalizedQuickSlots.slots) {
    if (item && ids.has(item.instanceId)) {
      throw new QuickSlotError('DUPLICATE_INSTANCE', '物品实例跨容器重复')
    }
    if (item) ids.add(item.instanceId)
  }
  return deepFreeze({ ...base, quickSlots: normalizedQuickSlots })
}
