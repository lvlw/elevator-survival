export type SceneErrorCode =
  | 'INVALID_REMAINING_TIME'
  | 'INVALID_MAX_HEALTH'
  | 'INVALID_CURRENT_HEALTH'
  | 'PLAYER_DEAD'
  | 'SCENE_TIME_EXHAUSTED'
  | 'INVALID_ACTION_TIME'
  | 'INVALID_PRIMARY_EFFECT_HEALTH'
  | 'INVALID_RETURN_TIME'
  | 'INVALID_FORCED_RETURN_CONFIG'
  | 'TIME_CALCULATION_OVERFLOW'

export class SceneResolutionError extends Error {
  readonly code: SceneErrorCode

  constructor(code: SceneErrorCode, message: string) {
    super(message)
    this.name = 'SceneResolutionError'
    this.code = code
  }
}
