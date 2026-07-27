import {
  addItemToBackpack,
  removeItemFromBackpack,
  type BackpackPlacement,
} from '../inventory'
import { EquipmentError } from './equipment-errors'
import {
  createBackpackEquipmentSnapshot,
  createEquipmentSnapshot,
  EQUIPMENT_SLOTS,
} from './equipment-snapshot'
import type {
  BackpackEquipmentSnapshot,
  EquipmentDependencies,
  EquipmentSlotKind,
} from './equipment-types'

function assertSlot(slot: EquipmentSlotKind): void {
  if (!EQUIPMENT_SLOTS.includes(slot)) {
    throw new EquipmentError('INVALID_SLOT', `无效装备槽：${String(slot)}`)
  }
}

function assertEligible(
  definitionId: string,
  slot: EquipmentSlotKind,
  dependencies: EquipmentDependencies,
): void {
  const profile = dependencies.equipmentCatalog.get(definitionId)
  if (profile.kind === 'not-equippable') {
    throw new EquipmentError('NOT_EQUIPPABLE', '物品不可装备')
  }
  if (!profile.eligibleSlots.includes(slot)) {
    throw new EquipmentError('WRONG_SLOT', '物品不具备目标槽资格')
  }
}

export function equipItemFromBackpack(
  snapshot: BackpackEquipmentSnapshot,
  instanceId: string,
  targetSlot: EquipmentSlotKind,
  dependencies: EquipmentDependencies,
): BackpackEquipmentSnapshot {
  assertSlot(targetSlot)
  if (snapshot.equipment[targetSlot]) {
    throw new EquipmentError('TARGET_SLOT_OCCUPIED', '目标装备槽已占用')
  }
  const item = snapshot.backpack.items.find(
    (candidate) => candidate.instanceId === instanceId,
  )
  if (!item) {
    throw new EquipmentError(
      'BACKPACK_INSTANCE_NOT_FOUND',
      `背包中不存在实例：${instanceId}`,
    )
  }
  if (item.quantity !== 1) {
    throw new EquipmentError('STACK_CANNOT_EQUIP', '堆叠实例不能装备')
  }
  assertEligible(item.definitionId, targetSlot, dependencies)
  const removed = removeItemFromBackpack(
    snapshot.backpack,
    instanceId,
    dependencies.physicalCatalog,
  )
  const equipment = createEquipmentSnapshot(
    { ...snapshot.equipment, [targetSlot]: removed.removedItem },
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
  return createBackpackEquipmentSnapshot(
    removed.snapshot,
    equipment,
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
}

export function unequipItemToBackpack(
  snapshot: BackpackEquipmentSnapshot,
  sourceSlot: EquipmentSlotKind,
  placement: BackpackPlacement,
  dependencies: EquipmentDependencies,
): BackpackEquipmentSnapshot {
  assertSlot(sourceSlot)
  const item = snapshot.equipment[sourceSlot]
  if (!item) {
    throw new EquipmentError('EMPTY_EQUIPMENT_SLOT', '装备槽为空')
  }
  if (placement.instanceId !== item.instanceId) {
    throw new EquipmentError(
      'PLACEMENT_INSTANCE_MISMATCH',
      '摆放实例与卸下实例不一致',
    )
  }
  const backpack = addItemToBackpack(
    snapshot.backpack,
    item,
    placement,
    dependencies.physicalCatalog,
  )
  const equipment = createEquipmentSnapshot(
    { ...snapshot.equipment, [sourceSlot]: null },
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
  return createBackpackEquipmentSnapshot(
    backpack,
    equipment,
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
}

export function swapBackpackItemWithEquippedItem(
  snapshot: BackpackEquipmentSnapshot,
  backpackInstanceId: string,
  targetSlot: EquipmentSlotKind,
  displacedPlacement: BackpackPlacement,
  dependencies: EquipmentDependencies,
): BackpackEquipmentSnapshot {
  assertSlot(targetSlot)
  const displaced = snapshot.equipment[targetSlot]
  if (!displaced) {
    throw new EquipmentError('EMPTY_EQUIPMENT_SLOT', '交换目标槽为空')
  }
  const incoming = snapshot.backpack.items.find(
    (item) => item.instanceId === backpackInstanceId,
  )
  if (!incoming) {
    throw new EquipmentError(
      'BACKPACK_INSTANCE_NOT_FOUND',
      `背包中不存在实例：${backpackInstanceId}`,
    )
  }
  if (incoming.quantity !== 1) {
    throw new EquipmentError('STACK_CANNOT_EQUIP', '堆叠实例不能装备')
  }
  assertEligible(incoming.definitionId, targetSlot, dependencies)
  if (displacedPlacement.instanceId !== displaced.instanceId) {
    throw new EquipmentError(
      'PLACEMENT_INSTANCE_MISMATCH',
      '被卸物品摆放实例ID不一致',
    )
  }
  const withoutIncoming = removeItemFromBackpack(
    snapshot.backpack,
    incoming.instanceId,
    dependencies.physicalCatalog,
  ).snapshot
  const backpack = addItemToBackpack(
    withoutIncoming,
    displaced,
    displacedPlacement,
    dependencies.physicalCatalog,
  )
  const equipment = createEquipmentSnapshot(
    { ...snapshot.equipment, [targetSlot]: incoming },
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
  return createBackpackEquipmentSnapshot(
    backpack,
    equipment,
    dependencies.physicalCatalog,
    dependencies.equipmentCatalog,
  )
}
