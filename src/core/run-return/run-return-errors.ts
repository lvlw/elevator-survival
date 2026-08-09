export type RunReturnErrorCode =
  | 'INVALID_INPUT'
  | 'SCENE_NOT_RETURNABLE'
  | 'RETURN_ALREADY_SETTLED'
  | 'EFFECT_MISMATCH'

export class RunReturnError extends Error {
  public constructor(
    public readonly code: RunReturnErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RunReturnError'
  }
}
