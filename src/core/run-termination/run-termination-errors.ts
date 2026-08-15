export type RunTerminationErrorCode = 'INVALID_INPUT' | 'EFFECT_MISMATCH'

export class RunTerminationError extends Error {
  public constructor(
    public readonly code: RunTerminationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RunTerminationError'
  }
}
