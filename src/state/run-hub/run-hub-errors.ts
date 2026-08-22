export type StableRunHubErrorCode =
  | 'INVALID_COMMAND'
  | 'COMMAND_NOT_AVAILABLE'

export class StableRunHubError extends Error {
  public constructor(
    public readonly code: StableRunHubErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'StableRunHubError'
  }
}
