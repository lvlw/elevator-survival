import { deepFreeze } from '../config'
import { SceneExplorationError } from './scene-exploration-errors'
import type { UseSceneBatteryCommand } from './scene-exploration-types'

export function createUseSceneBatteryCommand(input: UseSceneBatteryCommand): UseSceneBatteryCommand {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join(',') !== 'batteryInstanceId,targetInstanceId' ||
    typeof input.batteryInstanceId !== 'string' || input.batteryInstanceId.trim().length === 0 ||
    typeof input.targetInstanceId !== 'string' || input.targetInstanceId.trim().length === 0) {
    throw new SceneExplorationError('INVALID_SCENE_BATTERY_COMMAND', '场景电池充能命令无效')
  }
  return deepFreeze({ batteryInstanceId: input.batteryInstanceId, targetInstanceId: input.targetInstanceId })
}
