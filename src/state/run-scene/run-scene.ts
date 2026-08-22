import {
  createMoveThroughSceneEdgeCommand,
  createPerformMainSearchCommand,
  createPickUpRevealedNodeItemCommand,
  createSceneInventoryCommand,
  createWithdrawFromSceneCommand,
  resolveMainSearchCommand,
  resolveNodeItemPickupCommand,
  resolveSceneInventoryCommand,
  resolveSceneMoveCommand,
  SceneExplorationError,
} from '../../core/scene-exploration'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
  resolveRunSceneSessionWithdrawal,
} from '../../core/scene-launch'
import { executeStableRunCommand } from '../command-execution'
import { getStableRunPhaseIdentity } from '../run-save'
import { StableRunSceneError } from './run-scene-errors'
import type {
  ExecuteStableRunSceneCommandInput,
  StableRunSceneCommand,
  StableRunSceneExecution,
  StableRunSceneResult,
} from './run-scene-types'

function exactCommand(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function invalidCommand(): never {
  throw new StableRunSceneError(
    'INVALID_COMMAND',
    '稳定Run场景命令结构无效',
  )
}

function unavailable(message: string): never {
  throw new StableRunSceneError('COMMAND_NOT_AVAILABLE', message)
}

export function createStableRunSceneCommand(
  input: unknown,
): StableRunSceneCommand {
  if (!exactCommand(input, ['kind', 'command'])) invalidCommand()
  try {
    if (input.kind === 'scene-move') {
      return Object.freeze({
        kind: input.kind,
        command: createMoveThroughSceneEdgeCommand(input.command),
      })
    }
    if (input.kind === 'scene-main-search') {
      return Object.freeze({
        kind: input.kind,
        command: createPerformMainSearchCommand(input.command),
      })
    }
    if (input.kind === 'scene-node-item-pickup') {
      return Object.freeze({
        kind: input.kind,
        command: createPickUpRevealedNodeItemCommand(input.command),
      })
    }
    if (input.kind === 'scene-inventory') {
      return Object.freeze({
        kind: input.kind,
        command: createSceneInventoryCommand(input.command),
      })
    }
    if (input.kind === 'scene-withdraw') {
      return Object.freeze({
        kind: input.kind,
        command: createWithdrawFromSceneCommand(input.command),
      })
    }
  } catch (error) {
    if (error instanceof SceneExplorationError) invalidCommand()
    throw error
  }
  return invalidCommand()
}

/**
 * Maps one strict application-level Scene command to its existing formal core
 * resolver. Stable phase canonicalization, identity continuity, and the only
 * persistence write remain owned by executeStableRunCommand.
 */
export function executeStableRunSceneCommand(
  input: ExecuteStableRunSceneCommandInput,
): StableRunSceneExecution {
  const command = createStableRunSceneCommand(input.command)
  return executeStableRunCommand<StableRunSceneResult>({
    currentPhase: input.currentPhase,
    storage: input.storage,
    rulesRegistry: input.rulesRegistry,
    handler: (currentPhase) => {
      if (currentPhase.kind === 'current-day-hub') {
        return unavailable('当前日中枢不能执行场景玩家命令')
      }

      const identity = getStableRunPhaseIdentity(currentPhase)
      const dependencies = input.rulesRegistry.get(identity.rulesVersion)
      const runtime = getRunSceneRuntime(
        currentPhase.payload,
        dependencies.sceneLaunch,
      )

      if (command.kind === 'scene-withdraw') {
        const result = resolveRunSceneSessionWithdrawal(
          currentPhase.payload,
          command.command,
          dependencies.sceneLaunch,
        )
        return {
          result,
          phase: { kind: 'scene-session', payload: result.session },
        }
      }

      const resolution = command.kind === 'scene-move'
        ? resolveSceneMoveCommand(
            currentPhase.payload.scene,
            command.command,
            runtime.dependencies,
          )
        : command.kind === 'scene-main-search'
          ? resolveMainSearchCommand(
              currentPhase.payload.scene,
              command.command,
              runtime.dependencies,
            )
          : command.kind === 'scene-node-item-pickup'
            ? resolveNodeItemPickupCommand(
                currentPhase.payload.scene,
                command.command,
                runtime.dependencies,
              )
            : resolveSceneInventoryCommand(
                currentPhase.payload.scene,
                command.command,
                runtime.dependencies,
              )
      const session = createRunSceneSessionSnapshot({
        context: currentPhase.payload.context,
        scene: resolution.snapshot,
      }, dependencies.sceneLaunch)
      return {
        result: resolution,
        phase: { kind: 'scene-session', payload: session },
      }
    },
  })
}
