export type SceneItemsErrorCode =
  | 'INVALID_SCENE_ITEMS_STATE'
  | 'UNKNOWN_NODE'
  | 'DUPLICATE_INSTANCE_ID'
  | 'UNKNOWN_SCENE_ITEM'
  | 'INVALID_REMOVE_QUANTITY'

export class SceneItemsError extends Error {
  readonly code: SceneItemsErrorCode

  constructor(code: SceneItemsErrorCode, message: string) {
    super(message)
    this.name = 'SceneItemsError'
    this.code = code
  }
}
