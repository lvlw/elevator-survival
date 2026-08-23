import { resolveDailySettlement } from '../../core/daily-settlement'
import {
  resolveRunFailure,
  resolveRunFailureFromSceneSession,
} from '../../core/run-termination'
import {
  resolveRunSceneSessionReturn,
  resolveSceneLaunch,
} from '../../core/scene-launch'
import { executeStableRunCommand } from '../command-execution'
import { getStableRunPhaseIdentity } from '../run-save'
import { StableRunLifecycleError } from './run-lifecycle-errors'
import type {
  ExecuteStableRunLifecycleCommandInput,
  StableRunLifecycleCommand,
  StableRunLifecycleExecution,
  StableRunLifecycleResult,
} from './run-lifecycle-types'

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function invalidCommand(): never {
  throw new StableRunLifecycleError(
    'INVALID_COMMAND',
    '稳定Run生命周期命令结构无效',
  )
}

function unavailable(message: string): never {
  throw new StableRunLifecycleError('COMMAND_NOT_AVAILABLE', message)
}

/**
 * The single application-level lifecycle route eligibility source. It is
 * deliberately narrower than gameplay validation: the core resolver still
 * owns launch, return, settlement, and failure rules.
 */
export function getStableRunLifecycleCommandAvailability(
  currentPhase: ExecuteStableRunLifecycleCommandInput['currentPhase'],
  commandInput: unknown,
): Readonly<{
  canExecute: boolean
  settlementOutcome: 'return-to-hub' | 'run-failure' | null
}> {
  const command = createStableRunLifecycleCommand(commandInput)
  if (currentPhase.kind === 'current-day-hub') {
    return Object.freeze({
      canExecute: command.kind === 'launch-main-scene' || command.kind === 'end-day',
      settlementOutcome: null,
    })
  }
  if (currentPhase.kind === 'run-failure') {
    return Object.freeze({ canExecute: false, settlementOutcome: null })
  }
  if (command.kind !== 'settle-terminal-scene') {
    return Object.freeze({ canExecute: false, settlementOutcome: null })
  }
  const status = currentPhase.payload.scene.status
  return Object.freeze({
    canExecute: status === 'safe-returned' || status === 'forced-returned' || status === 'dead',
    settlementOutcome: status === 'dead'
      ? 'run-failure'
      : status === 'safe-returned' || status === 'forced-returned'
        ? 'return-to-hub'
        : null,
  })
}

export function createStableRunLifecycleCommand(
  input: unknown,
): StableRunLifecycleCommand {
  if (!plain(input) || Object.keys(input).length !== 1) invalidCommand()
  if (
    input.kind !== 'launch-main-scene' &&
    input.kind !== 'end-day' &&
    input.kind !== 'settle-terminal-scene'
  ) {
    invalidCommand()
  }
  return Object.freeze({ kind: input.kind })
}

/**
 * Routes the current minimal lifecycle commands to their existing formal core
 * resolvers. Canonicalization, terminal guarding, Run identity continuity, and
 * the only persistence write remain owned by executeStableRunCommand.
 */
export function executeStableRunLifecycleCommand(
  input: ExecuteStableRunLifecycleCommandInput,
): StableRunLifecycleExecution {
  const command = createStableRunLifecycleCommand(input.command)
  return executeStableRunCommand<StableRunLifecycleResult>({
    currentPhase: input.currentPhase,
    storage: input.storage,
    rulesRegistry: input.rulesRegistry,
    handler: (currentPhase) => {
      const identity = getStableRunPhaseIdentity(currentPhase)
      const dependencies = input.rulesRegistry.get(identity.rulesVersion)

      if (currentPhase.kind === 'current-day-hub') {
        if (command.kind === 'launch-main-scene') {
          const result = resolveSceneLaunch(
            currentPhase.payload,
            command,
            dependencies.sceneLaunch,
          )
          return {
            result,
            phase: { kind: 'scene-session', payload: result.session },
          }
        }
        if (command.kind === 'end-day') {
          const settlement = resolveDailySettlement(
            currentPhase.payload,
            command,
            dependencies.currentDayHub,
          )
          if (settlement.outcome.kind === 'next-day-current-day-hub') {
            return {
              result: settlement,
              phase: {
                kind: 'current-day-hub',
                payload: settlement.outcome.snapshot,
              },
            }
          }
          const failure = resolveRunFailure({
            kind: 'daily-settlement-terminal',
            terminalSnapshot: settlement.outcome.snapshot,
          }, dependencies.runTermination)
          return {
            result: failure,
            phase: { kind: 'run-failure', payload: failure.snapshot },
          }
        }
        return unavailable('当前日中枢不能结算终止场景')
      }

      const availability = getStableRunLifecycleCommandAvailability(
        currentPhase,
        command,
      )
      if (!availability.canExecute) {
        if (command.kind !== 'settle-terminal-scene') {
          return unavailable('Scene Session只能执行终止场景结算生命周期命令')
        }
        return unavailable('活动或战斗中的Scene不能执行终止场景结算')
      }
      if (command.kind !== 'settle-terminal-scene') {
        return unavailable('Scene Session只能执行终止场景结算生命周期命令')
      }
      if (availability.settlementOutcome === 'return-to-hub') {
        const result = resolveRunSceneSessionReturn(
          currentPhase.payload,
          dependencies.sceneLaunch,
        )
        return {
          result,
          phase: { kind: 'current-day-hub', payload: result.currentDayHub },
        }
      }
      if (availability.settlementOutcome === 'run-failure') {
        const result = resolveRunFailureFromSceneSession(
          currentPhase.payload,
          dependencies.runTermination,
        )
        return {
          result,
          phase: { kind: 'run-failure', payload: result.snapshot },
        }
      }
      return unavailable('活动或战斗中的Scene不能执行终止场景结算')
    },
  })
}
