export type RunSaveErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_ENVELOPE'
  | 'UNKNOWN_SAVE_FORMAT'
  | 'UNKNOWN_RULES_VERSION'
  | 'INVALID_STABLE_PHASE'
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_CLEAR_FAILED'

export class RunSaveError extends Error {
  public readonly code: RunSaveErrorCode

  public constructor(code: RunSaveErrorCode, message: string) {
    super(message)
    this.name = 'RunSaveError'
    this.code = code
  }
}
