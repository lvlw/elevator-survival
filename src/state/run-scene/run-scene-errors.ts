export type StableRunSceneErrorCode =
  | 'INVALID_COMMAND'
  | 'COMMAND_NOT_AVAILABLE'

export class StableRunSceneError extends Error {
  public constructor(
    public readonly code: StableRunSceneErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'StableRunSceneError'
  }
}
