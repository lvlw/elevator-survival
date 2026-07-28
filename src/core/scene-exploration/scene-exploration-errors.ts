export type SceneExplorationErrorCode =
  | 'INVALID_STATUS'
  | 'INVALID_CURRENT_NODE'
  | 'INVALID_REMAINING_TIME'
  | 'STATUS_HEALTH_CONFLICT'
  | 'SCENE_NOT_ACTIVE'
  | 'PLAYER_DEAD'
  | 'SCENE_TIME_EXHAUSTED'
  | 'INVALID_EDGE_ID'
  | 'UNKNOWN_EDGE'
  | 'EDGE_NOT_ENABLED'
  | 'EDGE_NOT_CONNECTED'
  | 'CANNOT_CARRY'
  | 'NO_RETURN_ROUTE'
  | 'INVALID_INPUT'

export class SceneExplorationError extends Error {
  readonly code: SceneExplorationErrorCode

  constructor(code: SceneExplorationErrorCode, message: string) {
    super(message)
    this.name = 'SceneExplorationError'
    this.code = code
  }
}
