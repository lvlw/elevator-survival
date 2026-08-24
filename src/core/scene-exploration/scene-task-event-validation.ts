import { deepFreeze } from '../config'
import { SceneExplorationError } from './scene-exploration-errors'
import type { PerformSceneTaskEventCommand } from './scene-exploration-types'

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export function createPerformSceneTaskEventCommand(
  input: unknown,
): PerformSceneTaskEventCommand {
  const hasPlacement = !!input && typeof input === 'object' && !Array.isArray(input) &&
    Object.prototype.hasOwnProperty.call(input, 'placement')
  if (
    !exact(input, hasPlacement ? ['eventId', 'optionId', 'placement'] : ['eventId', 'optionId']) ||
    typeof input.eventId !== 'string' || input.eventId.trim().length === 0 ||
    typeof input.optionId !== 'string' || input.optionId.trim().length === 0
  ) {
    throw new SceneExplorationError(
      'INVALID_SCENE_TASK_EVENT_COMMAND',
      '场景任务事件命令结构无效',
    )
  }
  if (!hasPlacement) {
    return deepFreeze({ eventId: input.eventId, optionId: input.optionId })
  }
  const placement = (input as { placement?: unknown }).placement
  const fields = placement as { x?: unknown; y?: unknown; rotated?: unknown }
  if (
    !exact(placement, ['rotated', 'x', 'y']) ||
    !Number.isSafeInteger(fields.x) || (fields.x as number) < 0 ||
    !Number.isSafeInteger(fields.y) || (fields.y as number) < 0 ||
    typeof fields.rotated !== 'boolean'
  ) {
    throw new SceneExplorationError(
      'INVALID_SCENE_TASK_EVENT_COMMAND',
      '样本箱背包放置无效',
    )
  }
  return deepFreeze({
    eventId: input.eventId,
    optionId: input.optionId,
    placement: {
      x: fields.x as number,
      y: fields.y as number,
      rotated: fields.rotated as boolean,
    },
  })
}
