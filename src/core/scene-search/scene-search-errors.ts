export type SceneSearchErrorCode =
  | 'INVALID_NODE_ID'
  | 'DUPLICATE_NODE_DEFINITION'
  | 'UNKNOWN_NODE'
  | 'INVALID_GRANT'
  | 'INVALID_WEIGHT'
  | 'WEIGHT_OVERFLOW'
  | 'DUPLICATE_WEIGHTED_DEFINITION'
  | 'INVALID_WEIGHTED_POOL'
  | 'INVALID_INTEL_ID'
  | 'DUPLICATE_INTEL_ID'
  | 'UNKNOWN_SEARCH_DEFINITION'
  | 'INVALID_SCENE_INSTANCE_ID'
  | 'DUPLICATE_INSTANCE_ID'
  | 'NODE_NOT_SEARCHABLE'
  | 'ALREADY_SEARCHED'
  | 'INVALID_SEARCH_STATE'

export class SceneSearchError extends Error {
  readonly code: SceneSearchErrorCode

  constructor(code: SceneSearchErrorCode, message: string) {
    super(message)
    this.name = 'SceneSearchError'
    this.code = code
  }
}
