import { deepFreeze } from '../config'
import { createRunIdentity } from '../domain'
import { RunSuccessError } from './run-success-errors'
import type {
  RunSuccessDependencies,
  RunSuccessSnapshot,
  RunSuccessTerminalSource,
} from './run-success-types'

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function invalid(message: string): never {
  throw new RunSuccessError('INVALID_INPUT', message)
}

function restoreSource(input: unknown): RunSuccessTerminalSource {
  if (
    !exact(input, ['auditId', 'kind', 'resolverId']) ||
    input.kind !== 'future-success-resolver' ||
    typeof input.resolverId !== 'string' || !input.resolverId.trim() ||
    typeof input.auditId !== 'string' || !input.auditId.trim()
  ) {
    invalid('Run成功终局来源审计信息无效')
  }
  return deepFreeze({
    kind: input.kind,
    resolverId: input.resolverId,
    auditId: input.auditId,
  })
}

/**
 * Strictly restores an already confirmed success terminal.  It intentionally
 * contains no success predicate or resolver: future rules supply the audited
 * source and optional reason before this boundary is invoked.
 */
export function createRunSuccessSnapshot(
  input: unknown,
  dependencies: RunSuccessDependencies,
): RunSuccessSnapshot {
  if (!exact(input, ['kind', 'reason', 'runIdentity', 'source', 'terminalDay']) ||
    input.kind !== 'run-success') {
    invalid('Run成功终局快照结构无效')
  }
  if (input.reason !== null && (typeof input.reason !== 'string' || !input.reason.trim())) {
    invalid('Run成功终局原因无效')
  }
  if (
    typeof input.terminalDay !== 'number' ||
    !Number.isSafeInteger(input.terminalDay) ||
    input.terminalDay < 1 ||
    input.terminalDay > dependencies.config.dailySettlement.finalPlayableDay
  ) {
    invalid('Run成功终局日期无效')
  }
  let runIdentity
  try {
    runIdentity = createRunIdentity(
      input.runIdentity as never,
      (rulesVersion) => rulesVersion === dependencies.config.metadata.rulesVersion,
    )
  } catch (error) {
    invalid(error instanceof Error ? error.message : 'Run成功终局身份无效')
  }
  const source = restoreSource(input.source)
  return deepFreeze({
    kind: 'run-success',
    source,
    reason: input.reason,
    runIdentity,
    terminalDay: input.terminalDay,
  })
}
