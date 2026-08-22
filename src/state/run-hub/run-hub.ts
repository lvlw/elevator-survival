import {
  createHubSurvivalCommand,
  CurrentDayHubError,
  resolveCurrentDayHubLoadoutCommand,
  resolveCurrentDayHubMedicalCommand,
  resolveHubSurvivalCommand,
} from '../../core/current-day-hub'
import {
  createHubMaintenanceCommand,
  HubMaintenanceError,
  resolveHubMaintenanceCommand,
} from '../../core/hub-maintenance'
import {
  createUseRunHubMedicalItemCommand,
  RunHubMedicalError,
} from '../../core/run-hub-medical'
import {
  createRunLoadoutCommand,
  RunLoadoutError,
} from '../../core/run-loadout'
import { executeStableRunCommand } from '../command-execution'
import { getStableRunPhaseIdentity } from '../run-save'
import { StableRunHubError } from './run-hub-errors'
import type {
  ExecuteStableRunHubCommandInput,
  StableRunHubCommand,
  StableRunHubExecution,
  StableRunHubResult,
} from './run-hub-types'

function exactCommand(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function invalidCommand(): never {
  throw new StableRunHubError('INVALID_COMMAND', '稳定Run中枢命令结构无效')
}

function unavailable(message: string): never {
  throw new StableRunHubError('COMMAND_NOT_AVAILABLE', message)
}

export function createStableRunHubCommand(input: unknown): StableRunHubCommand {
  if (!exactCommand(input, ['kind', 'command'])) invalidCommand()
  try {
    if (input.kind === 'hub-loadout') {
      return Object.freeze({ kind: input.kind, command: createRunLoadoutCommand(input.command) })
    }
    if (input.kind === 'hub-medical') {
      return Object.freeze({ kind: input.kind, command: createUseRunHubMedicalItemCommand(input.command) })
    }
    if (input.kind === 'hub-survival') {
      return Object.freeze({ kind: input.kind, command: createHubSurvivalCommand(input.command) })
    }
    if (input.kind === 'hub-maintenance') {
      return Object.freeze({ kind: input.kind, command: createHubMaintenanceCommand(input.command) })
    }
  } catch (error) {
    if (
      error instanceof RunLoadoutError ||
      error instanceof RunHubMedicalError ||
      error instanceof CurrentDayHubError ||
      error instanceof HubMaintenanceError
    ) invalidCommand()
    throw error
  }
  return invalidCommand()
}

/** Maps one strict Hub player command to an existing formal core resolver. */
export function executeStableRunHubCommand(
  input: ExecuteStableRunHubCommandInput,
): StableRunHubExecution {
  const command = createStableRunHubCommand(input.command)
  return executeStableRunCommand<StableRunHubResult>({
    currentPhase: input.currentPhase,
    storage: input.storage,
    rulesRegistry: input.rulesRegistry,
    handler: (currentPhase) => {
      if (currentPhase.kind === 'scene-session') {
        return unavailable('Scene Session不能执行中枢玩家命令')
      }
      const identity = getStableRunPhaseIdentity(currentPhase)
      const dependencies = input.rulesRegistry.get(identity.rulesVersion)
      const result = command.kind === 'hub-loadout'
        ? resolveCurrentDayHubLoadoutCommand(
          currentPhase.payload,
          command.command,
          dependencies.currentDayHub,
        )
        : command.kind === 'hub-medical'
          ? resolveCurrentDayHubMedicalCommand(
            currentPhase.payload,
            command.command,
            dependencies.currentDayHub,
          )
          : command.kind === 'hub-survival'
            ? resolveHubSurvivalCommand(
              currentPhase.payload,
              command.command,
              dependencies.currentDayHub,
            )
            : resolveHubMaintenanceCommand(
              currentPhase.payload,
              command.command,
              dependencies.hubMaintenance,
            )
      return {
        result,
        phase: { kind: 'current-day-hub', payload: result.snapshot },
      }
    },
  })
}
