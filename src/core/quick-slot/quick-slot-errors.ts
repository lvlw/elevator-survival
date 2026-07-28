export type QuickSlotErrorCode =
  | 'INVALID_DEFINITION_ID'
  | 'DUPLICATE_PROFILE'
  | 'UNKNOWN_PHYSICAL_DEFINITION'
  | 'MISSING_PROFILE'
  | 'UNKNOWN_PROFILE'
  | 'INVALID_PROFILE'
  | 'INVALID_SLOT_COUNT'
  | 'INVALID_SLOT_INDEX'
  | 'NOT_ELIGIBLE'
  | 'INVALID_QUANTITY'
  | 'DUPLICATE_INSTANCE'
  | 'TARGET_SLOT_OCCUPIED'
  | 'EMPTY_SLOT'
  | 'BACKPACK_INSTANCE_NOT_FOUND'
  | 'EXTRACTED_INSTANCE_ID_REQUIRED'
  | 'UNEXPECTED_EXTRACTED_INSTANCE_ID'
  | 'INVALID_EXTRACTED_INSTANCE_ID'
  | 'PLACEMENT_INSTANCE_MISMATCH'
  | 'SAME_SLOT'

export class QuickSlotError extends Error {
  readonly code: QuickSlotErrorCode

  constructor(code: QuickSlotErrorCode, message: string) {
    super(message)
    this.name = 'QuickSlotError'
    this.code = code
  }
}
