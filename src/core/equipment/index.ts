export {
  equipItemFromBackpack,
  swapBackpackItemWithEquippedItem,
  unequipItemToBackpack,
} from './equipment-operations'
export { createEquipmentProfileCatalog } from './equipment-profile-catalog'
export {
  createBackpackEquipmentSnapshot,
  createEmptyEquipment,
  createEquipmentSnapshot,
} from './equipment-snapshot'
export { EquipmentError, type EquipmentErrorCode } from './equipment-errors'
export type {
  BackpackEquipmentSnapshot,
  EquipmentDependencies,
  EquipmentProfileCatalog,
  EquipmentSlotKind,
  EquipmentSnapshot,
  ItemEquipmentProfile,
} from './equipment-types'
