import {
  createStableRunHubCommand,
  executeStableRunHubCommand,
} from '../run-hub'
import {
  createStableRunLifecycleCommand,
  executeStableRunLifecycleCommand,
} from '../run-lifecycle'
import {
  createStableRunSceneCommand,
  executeStableRunSceneCommand,
} from '../run-scene'
import { StableRunApplicationError } from './run-application-errors'
import type {
  ExecuteStableRunApplicationCommandInput,
  StableRunApplicationCommand,
  StableRunApplicationExecution,
} from './run-application-types'

function exactApplicationCommand(
  value: unknown,
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) return false
  const keys = Object.keys(value).sort()
  return keys.length === 2 && keys[0] === 'command' && keys[1] === 'kind'
}

function invalidCommand(): never {
  throw new StableRunApplicationError(
    'INVALID_COMMAND',
    '稳定Run应用命令结构无效',
  )
}

export function createStableRunApplicationCommand(
  input: unknown,
): StableRunApplicationCommand {
  if (!exactApplicationCommand(input)) invalidCommand()
  if (input.kind === 'lifecycle') {
    return Object.freeze({
      kind: input.kind,
      command: createStableRunLifecycleCommand(input.command),
    })
  }
  if (input.kind === 'scene') {
    return Object.freeze({
      kind: input.kind,
      command: createStableRunSceneCommand(input.command),
    })
  }
  if (input.kind === 'hub') {
    return Object.freeze({
      kind: input.kind,
      command: createStableRunHubCommand(input.command),
    })
  }
  return invalidCommand()
}

/**
 * Strictly dispatches one application command to exactly one existing stable
 * Run router. Canonicalization and persistence remain owned by that router's
 * shared executeStableRunCommand boundary.
 */
export function executeStableRunApplicationCommand(
  input: ExecuteStableRunApplicationCommandInput,
): StableRunApplicationExecution {
  const command = createStableRunApplicationCommand(input.command)
  const shared = {
    currentPhase: input.currentPhase,
    storage: input.storage,
    rulesRegistry: input.rulesRegistry,
  }
  if (command.kind === 'lifecycle') {
    return executeStableRunLifecycleCommand({
      ...shared,
      command: command.command,
    })
  }
  if (command.kind === 'scene') {
    return executeStableRunSceneCommand({
      ...shared,
      command: command.command,
    })
  }
  return executeStableRunHubCommand({
    ...shared,
    command: command.command,
  })
}
