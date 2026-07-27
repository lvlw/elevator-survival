export type SceneGraphErrorCode =
  | 'EMPTY_GRAPH'
  | 'INVALID_NODE'
  | 'DUPLICATE_NODE_ID'
  | 'INVALID_EDGE'
  | 'DUPLICATE_EDGE_ID'
  | 'DUPLICATE_EDGE'
  | 'UNKNOWN_EDGE_NODE'
  | 'SELF_LOOP'
  | 'NO_RETURN_SAFETY_NODE'
  | 'UNKNOWN_NODE'
  | 'UNKNOWN_ENABLED_EDGE'
  | 'DUPLICATE_ENABLED_EDGE'
  | 'INVALID_EDGE_COST'
  | 'PATH_TIME_OVERFLOW'
  | 'NO_RETURN_ROUTE'

export class SceneGraphError extends Error {
  readonly code: SceneGraphErrorCode

  constructor(code: SceneGraphErrorCode, message: string) {
    super(message)
    this.name = 'SceneGraphError'
    this.code = code
  }
}
