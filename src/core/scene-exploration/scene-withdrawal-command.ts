import { deepFreeze } from '../config'
import { SceneExplorationError } from './scene-exploration-errors'
import type { WithdrawFromSceneCommand } from './scene-exploration-types'

/** Restores the deliberately argument-free formal active-withdrawal command. */
export function createWithdrawFromSceneCommand(
  input: unknown,
): WithdrawFromSceneCommand {
  const prototype = input !== null && typeof input === 'object'
    ? Object.getPrototypeOf(input)
    : null
  if (
    input === null || typeof input !== 'object' || Array.isArray(input) ||
    (prototype !== Object.prototype && prototype !== null) ||
    Object.keys(input).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(input, 'kind') ||
    (input as { kind?: unknown }).kind !== 'withdraw-from-scene'
  ) {
    throw new SceneExplorationError(
      'INVALID_SCENE_WITHDRAWAL_COMMAND',
      '主动撤离命令必须只包含正式withdraw-from-scene类型',
    )
  }
  return deepFreeze({ kind: 'withdraw-from-scene' })
}
