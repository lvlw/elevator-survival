import { deepFreeze } from '../config'
import { SceneExplorationError } from './scene-exploration-errors'
import type { MoveThroughSceneEdgeCommand } from './scene-exploration-types'

export function createMoveThroughSceneEdgeCommand(
  input: MoveThroughSceneEdgeCommand,
): MoveThroughSceneEdgeCommand {
  const prototype = input && typeof input === 'object'
    ? Object.getPrototypeOf(input)
    : null
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    (prototype !== Object.prototype && prototype !== null) ||
    Object.keys(input).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(input, 'edgeId') ||
    typeof input.edgeId !== 'string' ||
    input.edgeId.trim().length === 0
  ) {
    throw new SceneExplorationError(
      'INVALID_MOVE_COMMAND',
      '移动命令必须只包含非空edgeId',
    )
  }
  return deepFreeze({ edgeId: input.edgeId })
}
