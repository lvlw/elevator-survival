export type RunSuccessErrorCode = 'INVALID_INPUT'

export class RunSuccessError extends Error {
  public constructor(
    public readonly code: RunSuccessErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RunSuccessError'
  }
}
