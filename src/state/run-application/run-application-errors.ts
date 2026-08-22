export type StableRunApplicationErrorCode = 'INVALID_COMMAND'

export class StableRunApplicationError extends Error {
  public constructor(
    public readonly code: StableRunApplicationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'StableRunApplicationError'
  }
}
