export type SceneCombatErrorCode =
  | 'INVALID_ENCOUNTER_DEFINITION'
  | 'DUPLICATE_ENCOUNTER_DEFINITION'
  | 'DUPLICATE_ENCOUNTER_NODE'
  | 'UNKNOWN_ENCOUNTER_DEFINITION'
  | 'INVALID_SCENE_COMBAT_STATE'

export class SceneCombatError extends Error {
  readonly code: SceneCombatErrorCode

  constructor(code: SceneCombatErrorCode, message: string) {
    super(message)
    this.name = 'SceneCombatError'
    this.code = code
  }
}
