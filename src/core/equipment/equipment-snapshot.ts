import { deepFreeze } from '../config'
import {
  createBackpackSnapshot,
  createItemInstance,
  type BackpackSnapshot,
  type ItemCatalog,
  type ItemInstance,
} from '../inventory'
import { EquipmentError } from './equipment-errors'
import type {
  BackpackEquipmentSnapshot,
  EquipmentProfileCatalog,
  EquipmentSlotKind,
  EquipmentSnapshot,
} from './equipment-types'

export const EQUIPMENT_SLOTS: readonly EquipmentSlotKind[] = Object.freeze([
  'weapon',
  'armor',
  'utility',
])

function validateItem(
  item: ItemInstance,
  slot: EquipmentSlotKind,
  physicalCatalog: ItemCatalog,
  equipmentCatalog: EquipmentProfileCatalog,
): Readonly<ItemInstance> {
  const instance = createItemInstance(item, physicalCatalog)
  if (instance.quantity !== 1) {
    throw new EquipmentError(
      'STACK_CANNOT_EQUIP',
      `装备实例数量必须为1：${instance.instanceId}`,
    )
  }
  const profile = equipmentCatalog.get(instance.definitionId)
  if (profile.kind === 'not-equippable') {
    throw new EquipmentError('NOT_EQUIPPABLE', '物品不可装备')
  }
  if (!profile.eligibleSlots.includes(slot)) {
    throw new EquipmentError('WRONG_SLOT', '物品不具备目标槽资格')
  }
  return instance
}

export function createEquipmentSnapshot(
  input: EquipmentSnapshot,
  physicalCatalog: ItemCatalog,
  equipmentCatalog: EquipmentProfileCatalog,
): EquipmentSnapshot {
  const ids = new Set<string>()
  const output = {} as Record<EquipmentSlotKind, Readonly<ItemInstance> | null>
  for (const slot of EQUIPMENT_SLOTS) {
    const item = input[slot]
    if (!item) {
      output[slot] = null
      continue
    }
    const instance = validateItem(item, slot, physicalCatalog, equipmentCatalog)
    if (ids.has(instance.instanceId)) {
      throw new EquipmentError(
        'DUPLICATE_INSTANCE',
        `同一实例占据多个装备槽：${instance.instanceId}`,
      )
    }
    ids.add(instance.instanceId)
    output[slot] = instance
  }
  return deepFreeze(output as unknown as EquipmentSnapshot)
}

export function createEmptyEquipment(
  physicalCatalog: ItemCatalog,
  equipmentCatalog: EquipmentProfileCatalog,
): EquipmentSnapshot {
  return createEquipmentSnapshot(
    { weapon: null, armor: null, utility: null },
    physicalCatalog,
    equipmentCatalog,
  )
}

export function createBackpackEquipmentSnapshot(
  backpack: BackpackSnapshot,
  equipment: EquipmentSnapshot,
  physicalCatalog: ItemCatalog,
  equipmentCatalog: EquipmentProfileCatalog,
): BackpackEquipmentSnapshot {
  const normalizedBackpack = createBackpackSnapshot(backpack, physicalCatalog)
  const normalizedEquipment = createEquipmentSnapshot(
    equipment,
    physicalCatalog,
    equipmentCatalog,
  )
  const backpackIds = new Set(
    normalizedBackpack.items.map((item) => item.instanceId),
  )
  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = normalizedEquipment[slot]
    if (equipped && backpackIds.has(equipped.instanceId)) {
      throw new EquipmentError(
        'DUPLICATE_INSTANCE',
        `实例同时存在于背包和装备栏：${equipped.instanceId}`,
      )
    }
  }
  return deepFreeze({
    backpack: normalizedBackpack,
    equipment: normalizedEquipment,
  })
}
