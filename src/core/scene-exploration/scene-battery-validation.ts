import { deepFreeze } from '../config'
import { SceneExplorationError } from './scene-exploration-errors'
import type { UseSceneBatteryCommand } from './scene-exploration-types'

export function createUseSceneBatteryCommand(input: unknown): UseSceneBatteryCommand {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new SceneExplorationError('INVALID_SCENE_BATTERY_COMMAND', '场景电池充能命令无效')
  }
  const fields = input as Record<string, unknown>
  if (Object.keys(fields).sort().join(',') !== 'batteryInstanceId,targetInstanceId' ||
    typeof fields.batteryInstanceId !== 'string' || fields.batteryInstanceId.trim().length === 0 ||
    typeof fields.targetInstanceId !== 'string' || fields.targetInstanceId.trim().length === 0) {
    throw new SceneExplorationError('INVALID_SCENE_BATTERY_COMMAND', '场景电池充能命令无效')
  }
  return deepFreeze({ batteryInstanceId: fields.batteryInstanceId, targetInstanceId: fields.targetInstanceId })
}
