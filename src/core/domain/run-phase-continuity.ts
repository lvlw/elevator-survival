import { deepFreeze } from '../config'
import {
  createRunIdentity,
  type RunIdentity,
} from './run-identity'

export interface RunPhaseContinuitySnapshot {
  readonly runIdentity: RunIdentity
  readonly currentDay: number
  readonly sceneInstanceId: string
}

export class RunPhaseContinuityError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'RunPhaseContinuityError'
  }
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export function createRunPhaseContinuitySnapshot(
  input: unknown,
  expectedRulesVersion: string,
): RunPhaseContinuitySnapshot {
  if (typeof expectedRulesVersion !== 'string' || expectedRulesVersion.trim().length === 0 ||
    !exact(input, ['currentDay', 'runIdentity', 'sceneInstanceId']) ||
    !exact(input.runIdentity, ['rulesVersion', 'runId', 'seed']) ||
    !Number.isSafeInteger(input.currentDay) || (input.currentDay as number) < 1 ||
    typeof input.sceneInstanceId !== 'string' || input.sceneInstanceId.trim().length === 0) {
    throw new RunPhaseContinuityError('Run阶段连续性结构无效')
  }
  let runIdentity: RunIdentity
  try {
    runIdentity = createRunIdentity(
      input.runIdentity as unknown as RunIdentity,
      (rulesVersion) => rulesVersion === expectedRulesVersion,
    )
  } catch (error) {
    throw new RunPhaseContinuityError(
      error instanceof Error ? error.message : 'Run身份无效',
    )
  }
  return deepFreeze({
    runIdentity,
    currentDay: input.currentDay as number,
    sceneInstanceId: input.sceneInstanceId,
  })
}

export function hasSameRunPhaseContinuity(
  left: RunPhaseContinuitySnapshot,
  right: RunPhaseContinuitySnapshot,
): boolean {
  return left.runIdentity.runId === right.runIdentity.runId &&
    left.runIdentity.seed === right.runIdentity.seed &&
    left.runIdentity.rulesVersion === right.runIdentity.rulesVersion &&
    left.currentDay === right.currentDay &&
    left.sceneInstanceId === right.sceneInstanceId
}

export function bindRunPhaseContinuityToScene(
  previousInput: RunPhaseContinuitySnapshot,
  sceneInstanceId: unknown,
  expectedRulesVersion: string,
): RunPhaseContinuitySnapshot {
  const previous = createRunPhaseContinuitySnapshot(previousInput, expectedRulesVersion)
  if (typeof sceneInstanceId !== 'string' || sceneInstanceId.trim().length === 0) {
    throw new RunPhaseContinuityError('绑定的场景实例ID无效')
  }
  return createRunPhaseContinuitySnapshot({
    runIdentity: previous.runIdentity,
    currentDay: previous.currentDay,
    sceneInstanceId,
  }, expectedRulesVersion)
}
