export type StableRunLifecycleErrorCode =
  | 'INVALID_COMMAND'
  | 'COMMAND_NOT_AVAILABLE'

export class StableRunLifecycleError extends Error {
  public constructor(
    public readonly code: StableRunLifecycleErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'StableRunLifecycleError'
  }
}
