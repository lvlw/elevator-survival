export type EquipmentErrorCode =
  | 'INVALID_DEFINITION_ID'
  | 'DUPLICATE_PROFILE'
  | 'UNKNOWN_PHYSICAL_DEFINITION'
  | 'MISSING_EQUIPMENT_PROFILE'
  | 'UNKNOWN_EQUIPMENT_PROFILE'
  | 'INVALID_PROFILE'
  | 'INVALID_SLOT'
  | 'DUPLICATE_SLOT'
  | 'NOT_EQUIPPABLE'
  | 'WRONG_SLOT'
  | 'DUPLICATE_INSTANCE'
  | 'STACK_CANNOT_EQUIP'
  | 'TARGET_SLOT_OCCUPIED'
  | 'EMPTY_EQUIPMENT_SLOT'
  | 'BACKPACK_INSTANCE_NOT_FOUND'
  | 'PLACEMENT_INSTANCE_MISMATCH'

export class EquipmentError extends Error {
  readonly code: EquipmentErrorCode

  constructor(code: EquipmentErrorCode, message: string) {
    super(message)
    this.name = 'EquipmentError'
    this.code = code
  }
}
