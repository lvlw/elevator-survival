import { deepFreeze } from '../config'
import {
  MissionLifecycleError,
  type MissionBinding,
  type MissionCandidate,
  type MissionExecutionRequest,
  type MissionExpectation,
  type MissionScope,
} from './types'
import {
  assertData, bindingSchema, executionRequestSchema, parse, readExecution, readExpectation,
  readScope, readValue, sameExecution, validateBinding,
} from './validation'

export function queryFirstMissionEligibility(
  current: unknown, binding: MissionBinding, scopeInput: MissionScope,
): 'first-eligible' | 'active' | 'closed' {
  const value = readValue(current, binding, readScope(scopeInput))
  return value.status === 'unaccepted' ? 'first-eligible' : value.status
}

export function queryMissionContinuation(
  current: unknown, requestInput: MissionExecutionRequest, scopeInput: MissionScope,
): Readonly<{ kind: 'continue'; execution: MissionExecutionRequest['execution'] }> {
  const request = parse(executionRequestSchema, requestInput)
  const scope = readScope(scopeInput)
  const value = readValue(current, request.binding, scope)
  const execution = readExecution(request.execution, value.binding)
  if (value.status !== 'active') {
    throw new MissionLifecycleError(value.status === 'closed' ? 'MISSION_CLOSED' : 'NOT_ACTIVE', '没有可继续的活动执行')
  }
  if (!sameExecution(value.execution, execution)) {
    throw new MissionLifecycleError('EXECUTION_MISMATCH', '继续请求不是当前执行')
  }
  return deepFreeze({ kind: 'continue', execution: value.execution })
}

/** Complete set for the injected declaration scope; absence is never an empty fact. */
export function listFirstEligibleMissions(
  facts: readonly unknown[], scopeInput: MissionScope,
): readonly MissionBinding[] {
  const scope = readScope(scopeInput)
  assertData(facts)
  if (!Array.isArray(facts)) throw new MissionLifecycleError('INVALID_INPUT', '事实列表无效')
  const seen = new Set<string>()
  const eligible: MissionBinding[] = []
  for (const fact of facts) {
    if (fact === null || fact === undefined) throw new MissionLifecycleError('MISSING_FACT', '缺少委托事实')
    // Parse the whole value before using it as anything other than a lookup key.
    const binding = parse(bindingSchema,
      typeof fact === 'object' && 'binding' in fact ? fact.binding : undefined)
    validateBinding(binding, scope)
    const value = readValue(fact, binding, scope)
    const id = value.binding.mission.commissionId
    if (seen.has(id)) throw new MissionLifecycleError('DUPLICATE_FACT', '具体委托事实重复')
    seen.add(id)
    if (value.status === 'unaccepted') eligible.push(value.binding)
  }
  if (seen.size !== scope.declarations.length) {
    throw new MissionLifecycleError('MISSING_FACT', '声明委托缺少事实')
  }
  // Declaration order is stable; caller fact ordering does not change the query.
  return deepFreeze(scope.declarations.flatMap((entry) =>
    eligible.filter((binding) => binding.mission.commissionId === entry.commissionId)))
}

export function restoreMissionCandidate(
  input: unknown, expectedInput: MissionExpectation, scopeInput: MissionScope,
): MissionCandidate {
  const scope = readScope(scopeInput)
  const expected = readExpectation(expectedInput, scope)
  const value = readValue(input, expected.binding, scope)
  if (value.status !== expected.status) {
    throw new MissionLifecycleError('RESTORE_STATE_MISMATCH', '候选状态与独立期望不一致')
  }
  if (value.status !== 'unaccepted' && expected.status !== 'unaccepted' &&
      !sameExecution(value.execution, expected.execution)) {
    throw new MissionLifecycleError('EXECUTION_MISMATCH', '候选执行与独立期望不一致')
  }
  if (value.status === 'closed' && expected.status === 'closed' && value.outcome !== expected.outcome) {
    throw new MissionLifecycleError('RESTORE_STATE_MISMATCH', '候选终止结果不一致')
  }
  return deepFreeze({ kind: 'mission-lifecycle-candidate', value })
}
