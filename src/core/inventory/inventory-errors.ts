export type InventoryErrorCode =
  | 'INVALID_DEFINITION_ID'
  | 'DUPLICATE_DEFINITION_ID'
  | 'INVALID_DEFINITION_NAME'
  | 'INVALID_ITEM_SIZE'
  | 'INVALID_UNIT_WEIGHT'
  | 'INVALID_STACKING'
  | 'UNKNOWN_DEFINITION'
  | 'INVALID_INSTANCE_ID'
  | 'DUPLICATE_INSTANCE_ID'
  | 'INVALID_QUANTITY'
  | 'INVALID_BACKPACK_SIZE'
  | 'INVALID_PLACEMENT'
  | 'DUPLICATE_PLACEMENT'
  | 'UNKNOWN_PLACEMENT_INSTANCE'
  | 'MISSING_PLACEMENT'
  | 'ILLEGAL_ROTATION'
  | 'OUT_OF_BOUNDS'
  | 'OVERLAP'
  | 'UNKNOWN_INSTANCE'
  | 'WEIGHT_OVERFLOW'

export class InventoryError extends Error {
  readonly code: InventoryErrorCode

  constructor(code: InventoryErrorCode, message: string) {
    super(message)
    this.name = 'InventoryError'
    this.code = code
  }
}
