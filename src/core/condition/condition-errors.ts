export type ConditionErrorCode =
  | 'INVALID_CONDITION_SHAPE'
  | 'INVALID_MAX_HEALTH'
  | 'INVALID_CURRENT_HEALTH'
  | 'INVALID_CONDITION_COUNT'
  | 'INVALID_AMOUNT'
  | 'COUNT_OVERFLOW'
  | 'NO_UNTREATED_OPEN_WOUND'
  | 'NO_TREATED_OPEN_WOUND'
  | 'INVALID_OPEN_WOUND'
  | 'DUPLICATE_OPEN_WOUND_ID'
  | 'UNKNOWN_OPEN_WOUND'
  | 'OPEN_WOUND_ALREADY_TREATED'
  | 'NO_MINOR_CONTUSION'
  | 'INVALID_ESCAPE_WOUND_RULES'
  | 'ESCAPE_WOUND_CTB_OVERFLOW'

export class ConditionError extends Error {
  readonly code: ConditionErrorCode

  constructor(code: ConditionErrorCode, message: string) {
    super(message)
    this.name = 'ConditionError'
    this.code = code
  }
}
