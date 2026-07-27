export type ItemStateErrorCode =
  | 'INVALID_DEFINITION_ID'
  | 'INVALID_INSTANCE_ID'
  | 'INVALID_MAXIMUM'
  | 'DUPLICATE_PROFILE'
  | 'DUPLICATE_PHYSICAL_DEFINITION'
  | 'UNKNOWN_PHYSICAL_DEFINITION'
  | 'MISSING_RESOURCE_PROFILE'
  | 'UNKNOWN_RESOURCE_PROFILE'
  | 'RESOURCE_KIND_MISMATCH'
  | 'INVALID_CURRENT_RESOURCE'
  | 'INVALID_RESOURCE_COST'
  | 'INVALID_RESTORE_AMOUNT'
  | 'RESOURCE_ACTION_UNAVAILABLE'
  | 'INSUFFICIENT_RESOURCE'
  | 'RESOURCE_RESTORE_UNAVAILABLE'

export class ItemStateError extends Error {
  readonly code: ItemStateErrorCode

  constructor(code: ItemStateErrorCode, message: string) {
    super(message)
    this.name = 'ItemStateError'
    this.code = code
  }
}
