// Explicit composition/coordinator export. Not re-exported by the read-only index.
import { deepFreeze } from '../config'
import type { RulesVersionLookup } from '../domain/run-identity'
import {
  MissionLifecycleError,
  type MissionBinding,
  type MissionExecutionRequest,
  type MissionLifecycleValue,
  type MissionScope,
  type MissionTerminationResult,
} from './types'
import {
  executionRequestSchema, parse, readExecution, readScope, readValue,
  sameExecution, terminationSchema, validateBinding,
} from './validation'

export function createMissionScope(
  input: MissionScope, isRulesVersionRegistered: RulesVersionLookup,
): MissionScope {
  const scope = readScope(input)
  if (typeof isRulesVersionRegistered !== 'function') {
    throw new MissionLifecycleError('INVALID_INPUT', '缺少受控规则版本依赖')
  }
  for (const declaration of scope.declarations) {
    if (!isRulesVersionRegistered(declaration.rulesVersion)) {
      throw new MissionLifecycleError('UNKNOWN_RULES_VERSION', '声明规则版本未注册')
    }
  }
  return deepFreeze(scope)
}

/** First establishment only; the future owner must prove there is no prior fact. */
export function establishMissionFact(bindingInput: MissionBinding, scopeInput: MissionScope): MissionLifecycleValue {
  const scope = readScope(scopeInput)
  const binding = validateBinding(bindingInput, scope)
  return deepFreeze({ formatVersion: 1, binding, status: 'unaccepted' })
}

export function activateMission(
  current: unknown, requestInput: MissionExecutionRequest, scopeInput: MissionScope,
): MissionLifecycleValue {
  const request = parse(executionRequestSchema, requestInput)
  const scope = readScope(scopeInput)
  const value = readValue(current, request.binding, scope)
  const execution = readExecution(request.execution, value.binding)
  if (value.status !== 'unaccepted') {
    throw new MissionLifecycleError(value.status === 'closed' ? 'MISSION_CLOSED' : 'ALREADY_ACTIVE', '只能首次激活未接委托')
  }
  return deepFreeze({ formatVersion: 1, binding: value.binding, status: 'active', execution })
}

/** A narrow proposal for a future complete transaction, never a commit or reward. */
export function terminateMission(
  current: unknown, resultInput: MissionTerminationResult, scopeInput: MissionScope,
): MissionLifecycleValue {
  const result = parse(terminationSchema, resultInput)
  const scope = readScope(scopeInput)
  const value = readValue(current, result.binding, scope)
  const execution = readExecution(result.execution, value.binding)
  if (value.status !== 'active') {
    throw new MissionLifecycleError(value.status === 'closed' ? 'MISSION_CLOSED' : 'NOT_ACTIVE', '只能关闭当前活动委托')
  }
  if (!sameExecution(value.execution, execution)) {
    throw new MissionLifecycleError('EXECUTION_MISMATCH', '终止结果不是当前执行')
  }
  return deepFreeze({
    formatVersion: 1, binding: value.binding, status: 'closed',
    execution: value.execution, outcome: result.outcome,
  })
}
