import { deepFreeze } from '../config'
import { SceneExplorationError } from '../scene-exploration/scene-exploration-errors'
import type { PerformSceneObstacleOptionCommand } from '../scene-exploration/scene-exploration-types'

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

/** The single strict external boundary for formal Scene obstacle commands. */
export function createPerformSceneObstacleOptionCommand(input: unknown): PerformSceneObstacleOptionCommand {
  if (!hasExactKeys(input, ['obstacleId', 'optionId']) ||
    typeof input.obstacleId !== 'string' || input.obstacleId.trim().length === 0 ||
    typeof input.optionId !== 'string' || input.optionId.trim().length === 0) {
    throw new SceneExplorationError('INVALID_INPUT', '场景障碍命令结构无效')
  }
  return deepFreeze({ obstacleId: input.obstacleId, optionId: input.optionId })
}
