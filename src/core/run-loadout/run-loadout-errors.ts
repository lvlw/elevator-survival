export type RunLoadoutErrorCode =
  | 'INVALID_INPUT'
  | 'ACTION_NOT_AVAILABLE'
  | 'CANNOT_CARRY'
  | 'EFFECT_MISMATCH'

export class RunLoadoutError extends Error {
  public constructor(
    public readonly code: RunLoadoutErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RunLoadoutError'
  }
}
