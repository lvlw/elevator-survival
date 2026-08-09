export type RunHubMedicalErrorCode =
  | 'INVALID_INPUT'
  | 'ACTION_NOT_AVAILABLE'
  | 'EFFECT_MISMATCH'

export class RunHubMedicalError extends Error {
  public constructor(
    readonly code: RunHubMedicalErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RunHubMedicalError'
  }
}
