import { z } from 'zod'
import { deepFreeze } from '../config'
import { createRunIdentity, type RunIdentity } from '../domain/run-identity'
import {
  MissionLifecycleError,
  type MissionBinding,
  type MissionExpectation,
  type MissionLifecycleValue,
  type MissionScope,
} from './types'

const identity = z.string().min(1).refine(
  (value) => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value),
)
export const declarationSchema = z.strictObject({
  worldId: identity,
  templateId: identity,
  commissionId: identity,
  rulesVersion: identity,
  contractVersion: identity,
})
export const bindingSchema = z.strictObject({
  characterId: identity,
  mission: declarationSchema,
})
export const executionSchema = z.strictObject({
  runId: identity, seed: identity, rulesVersion: identity,
})
const outcomeSchema = z.enum(['success', 'voluntary-failure', 'deadline-failure', 'death'])
const base = { binding: bindingSchema }
const unaccepted = z.strictObject({ ...base, status: z.literal('unaccepted') })
const active = z.strictObject({ ...base, status: z.literal('active'), execution: executionSchema })
const closed = z.strictObject({
  ...base, status: z.literal('closed'), execution: executionSchema, outcome: outcomeSchema,
})
export const expectationSchema = z.discriminatedUnion('status', [unaccepted, active, closed])
const format = { formatVersion: z.literal(1) }
const valueSchema = z.discriminatedUnion('status', [
  unaccepted.extend(format), active.extend(format), closed.extend(format),
])
export const scopeSchema = z.strictObject({
  characterId: identity, declarations: z.array(declarationSchema),
})
export const executionRequestSchema = z.strictObject({
  binding: bindingSchema, execution: executionSchema,
})
export const terminationSchema = executionRequestSchema.extend({ outcome: outcomeSchema })

// Reject non-data properties before Zod could strip them or invoke an accessor.
// This is only the module's acyclic JSON-shaped value boundary, not a save codec.
export function assertData(input: unknown, ancestors = new Set<object>()): void {
  if (input === null || typeof input !== 'object') return
  if (ancestors.has(input)) throw new MissionLifecycleError('INVALID_INPUT', '循环引用')
  const array = Array.isArray(input)
  if (Object.getPrototypeOf(input) !== (array ? Array.prototype : Object.prototype)) {
    throw new MissionLifecycleError('INVALID_INPUT', '必须使用普通数据对象')
  }
  ancestors.add(input)
  for (const key of Reflect.ownKeys(input)) {
    if (array && key === 'length') continue
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!
    if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor) ||
        (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length))) {
      throw new MissionLifecycleError('INVALID_INPUT', '存在非数据字段')
    }
    assertData(descriptor.value, ancestors)
  }
  ancestors.delete(input)
}

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  assertData(input)
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new MissionLifecycleError('INVALID_INPUT', '生命周期数据结构无效')
  }
  return result.data
}

export function readScope(input: MissionScope): MissionScope {
  const scope = parse(scopeSchema, input)
  const ids = new Set<string>()
  for (const declaration of scope.declarations) {
    if (ids.has(declaration.commissionId)) {
      throw new MissionLifecycleError('DUPLICATE_DECLARATION', '具体委托重复或冲突')
    }
    ids.add(declaration.commissionId)
  }
  return scope
}

export function validateBinding(input: unknown, scope: MissionScope): MissionBinding {
  const binding = parse(bindingSchema, input)
  const declaration = scope.declarations.find(
    (entry) => entry.commissionId === binding.mission.commissionId,
  )
  if (!declaration) throw new MissionLifecycleError('UNDECLARED_MISSION', '委托未声明')
  if (binding.characterId !== scope.characterId || !sameDeclaration(binding.mission, declaration)) {
    throw new MissionLifecycleError('BINDING_MISMATCH', '角色或声明绑定不一致')
  }
  return binding
}

function sameDeclaration(left: MissionBinding['mission'], right: MissionBinding['mission']): boolean {
  return left.worldId === right.worldId && left.templateId === right.templateId &&
    left.commissionId === right.commissionId && left.rulesVersion === right.rulesVersion &&
    left.contractVersion === right.contractVersion
}

export function sameBinding(left: MissionBinding, right: MissionBinding): boolean {
  return left.characterId === right.characterId && sameDeclaration(left.mission, right.mission)
}

export function sameExecution(left: RunIdentity, right: RunIdentity): boolean {
  return left.runId === right.runId && left.seed === right.seed && left.rulesVersion === right.rulesVersion
}

export function readExecution(input: unknown, binding: MissionBinding): RunIdentity {
  const execution = parse(executionSchema, input)
  if (execution.rulesVersion !== binding.mission.rulesVersion) {
    throw new MissionLifecycleError('EXECUTION_MISMATCH', '执行规则版本不一致')
  }
  // Strict validation precedes the existing trim-capable factory.
  return createRunIdentity(execution, (version) => version === binding.mission.rulesVersion)
}

export function readValue(
  input: unknown, expectedBinding: MissionBinding, scope: MissionScope,
): MissionLifecycleValue {
  const binding = validateBinding(expectedBinding, scope)
  if (input === undefined || input === null) {
    throw new MissionLifecycleError('MISSING_FACT', '缺少生命周期事实，不能按首次处理')
  }
  assertData(input)
  if (typeof input === 'object' && 'formatVersion' in input && input.formatVersion !== 1) {
    throw new MissionLifecycleError('UNKNOWN_FORMAT', '未知生命周期值格式')
  }
  const value = parse(valueSchema, input)
  validateBinding(value.binding, scope)
  if (!sameBinding(value.binding, binding)) {
    throw new MissionLifecycleError('BINDING_MISMATCH', '与独立期望委托不一致')
  }
  if (value.status !== 'unaccepted') readExecution(value.execution, binding)
  return deepFreeze(value)
}

export function readExpectation(input: MissionExpectation, scope: MissionScope): MissionExpectation {
  const expected = parse(expectationSchema, input)
  validateBinding(expected.binding, scope)
  if (expected.status !== 'unaccepted') readExecution(expected.execution, expected.binding)
  return expected
}
