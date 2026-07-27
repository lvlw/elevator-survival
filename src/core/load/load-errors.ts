export type LoadErrorCode =
  | 'INVALID_TOTAL_WEIGHT'
  | 'INVALID_BASE_TIME'
  | 'INVALID_WEIGHT_BANDS'
  | 'INVALID_TIME_MODIFIER'
  | 'CANNOT_CARRY'
  | 'INVALID_ESCAPE_CTB'
  | 'TRAVEL_TIME_OVERFLOW'

export class LoadRuleError extends Error {
  readonly code: LoadErrorCode

  constructor(code: LoadErrorCode, message: string) {
    super(message)
    this.name = 'LoadRuleError'
    this.code = code
  }
}
