import { deepFreeze } from '../../core/config'
import { createCurrentDayHubSnapshot } from '../../core/current-day-hub'
import { createRunIdentity, type RunIdentity } from '../../core/domain'
import { restoreRunFailureSnapshot } from '../../core/run-termination'
import { createRunSceneSessionSnapshot } from '../../core/scene-launch'
import { RunSaveError } from './run-save-errors'
import type {
  RunSaveRuleDependencies,
  RunSaveRulesRegistry,
} from './run-save-rules-registry'
import {
  RUN_SAVE_FORMAT_VERSION,
  type RunSaveEnvelope,
  type RunSaveStorage,
  type StableRunPhase,
} from './run-save-types'

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

function sameIdentity(left: RunIdentity, right: RunIdentity): boolean {
  return left.runId === right.runId && left.seed === right.seed &&
    left.rulesVersion === right.rulesVersion
}

function candidateIdentity(kind: StableRunPhase['kind'], payload: unknown): unknown {
  if (!plain(payload)) return null
  if (kind === 'current-day-hub') {
    return plain(payload.continuity) ? payload.continuity.runIdentity : null
  }
  if (kind === 'scene-session') {
    const context = plain(payload.context) ? payload.context : null
    const carryForward = context && plain(context.runReturnCarryForward)
      ? context.runReturnCarryForward
      : null
    const continuity = carryForward && plain(carryForward.continuity)
      ? carryForward.continuity
      : null
    return continuity?.runIdentity ?? null
  }
  const source = plain(payload.source) ? payload.source : null
  if (source?.kind === 'scene-defeat') {
    const context = plain(source.context) ? source.context : null
    const carryForward = context && plain(context.runReturnCarryForward)
      ? context.runReturnCarryForward
      : null
    const continuity = carryForward && plain(carryForward.continuity)
      ? carryForward.continuity
      : null
    return continuity?.runIdentity ?? null
  }
  const terminalSnapshot = source && plain(source.terminalSnapshot)
    ? source.terminalSnapshot
    : null
  const continuity = terminalSnapshot && plain(terminalSnapshot.continuity)
    ? terminalSnapshot.continuity
    : null
  return continuity?.runIdentity ?? null
}

function validateAuditIdentity(input: unknown, registry: RunSaveRulesRegistry): RunIdentity {
  if (
    !exact(input, ['rulesVersion', 'runId', 'seed']) ||
    typeof input.runId !== 'string' || !input.runId.trim() ||
    typeof input.seed !== 'string' || !input.seed.trim() ||
    typeof input.rulesVersion !== 'string' || !input.rulesVersion.trim()
  ) {
    throw new RunSaveError('INVALID_ENVELOPE', 'Run存档身份审计字段无效')
  }
  try {
    return createRunIdentity(input as unknown as RunIdentity, (version) => registry.has(version))
  } catch (error) {
    if (typeof input.rulesVersion === 'string' && !registry.has(input.rulesVersion)) {
      throw new RunSaveError('UNKNOWN_RULES_VERSION', `未知的存档规则版本：${input.rulesVersion}`)
    }
    throw new RunSaveError(
      'INVALID_ENVELOPE',
      error instanceof Error ? error.message : 'Run存档身份无效',
    )
  }
}

function restorePhase(
  kind: StableRunPhase['kind'],
  payload: unknown,
  dependencies: RunSaveRuleDependencies,
): StableRunPhase {
  try {
    if (kind === 'current-day-hub') {
      return deepFreeze({
        kind,
        payload: createCurrentDayHubSnapshot(payload, dependencies.currentDayHub),
      })
    }
    if (kind === 'scene-session') {
      return deepFreeze({
        kind,
        payload: createRunSceneSessionSnapshot(payload as never, dependencies.sceneLaunch),
      })
    }
    return deepFreeze({
      kind,
      payload: restoreRunFailureSnapshot(payload, dependencies.runTermination),
    })
  } catch (error) {
    throw new RunSaveError(
      'INVALID_STABLE_PHASE',
      error instanceof Error ? error.message : '稳定Run阶段恢复失败',
    )
  }
}

function identityOf(phase: StableRunPhase): RunIdentity {
  const candidate = candidateIdentity(phase.kind, phase.payload)
  if (!candidate || !plain(candidate)) {
    throw new RunSaveError('INVALID_STABLE_PHASE', '稳定Run阶段缺少Run身份')
  }
  return candidate as unknown as RunIdentity
}

function restorePhaseFromUnknown(
  input: unknown,
  registry: RunSaveRulesRegistry,
): StableRunPhase {
  if (!exact(input, ['kind', 'payload'])) {
    throw new RunSaveError('INVALID_STABLE_PHASE', '稳定Run阶段必须是严格互斥tagged union')
  }
  if (
    input.kind !== 'current-day-hub' && input.kind !== 'scene-session' &&
    input.kind !== 'run-failure'
  ) {
    throw new RunSaveError('INVALID_STABLE_PHASE', '稳定Run阶段类型无效')
  }
  const rawIdentity = candidateIdentity(input.kind, input.payload)
  if (!plain(rawIdentity) || typeof rawIdentity.rulesVersion !== 'string') {
    throw new RunSaveError('INVALID_STABLE_PHASE', '稳定Run阶段缺少规则版本身份')
  }
  const dependencies = registry.get(rawIdentity.rulesVersion)
  return restorePhase(input.kind, input.payload, dependencies)
}

export function createRunSaveEnvelope(
  phaseInput: unknown,
  registry: RunSaveRulesRegistry,
): RunSaveEnvelope {
  const phase = restorePhaseFromUnknown(phaseInput, registry)
  const runIdentity = identityOf(phase)
  return deepFreeze({
    saveFormatVersion: RUN_SAVE_FORMAT_VERSION,
    kind: phase.kind,
    rulesVersion: runIdentity.rulesVersion,
    runIdentity,
    payload: phase.payload,
  } as RunSaveEnvelope)
}

export function serializeRunSave(
  phaseInput: unknown,
  registry: RunSaveRulesRegistry,
): string {
  return JSON.stringify(createRunSaveEnvelope(phaseInput, registry))
}

export function deserializeRunSave(
  serialized: string,
  registry: RunSaveRulesRegistry,
): StableRunPhase {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new RunSaveError('INVALID_JSON', 'Run存档不是有效JSON')
  }
  if (!exact(parsed, [
    'kind', 'payload', 'rulesVersion', 'runIdentity', 'saveFormatVersion',
  ])) {
    throw new RunSaveError('INVALID_ENVELOPE', 'Run存档envelope结构无效')
  }
  if (parsed.saveFormatVersion !== RUN_SAVE_FORMAT_VERSION) {
    throw new RunSaveError('UNKNOWN_SAVE_FORMAT', 'Run存档格式版本不受支持')
  }
  if (
    parsed.kind !== 'current-day-hub' && parsed.kind !== 'scene-session' &&
    parsed.kind !== 'run-failure'
  ) {
    throw new RunSaveError('INVALID_ENVELOPE', 'Run存档阶段类型无效')
  }
  if (typeof parsed.rulesVersion !== 'string' || !registry.has(parsed.rulesVersion)) {
    throw new RunSaveError('UNKNOWN_RULES_VERSION', 'Run存档规则版本不受支持')
  }
  const auditIdentity = validateAuditIdentity(parsed.runIdentity, registry)
  if (auditIdentity.rulesVersion !== parsed.rulesVersion) {
    throw new RunSaveError('INVALID_ENVELOPE', 'Run存档envelope规则版本与身份不一致')
  }
  const phase = restorePhase(
    parsed.kind,
    parsed.payload,
    registry.get(parsed.rulesVersion),
  )
  const restoredIdentity = identityOf(phase)
  if (
    restoredIdentity.rulesVersion !== parsed.rulesVersion ||
    !sameIdentity(restoredIdentity, auditIdentity)
  ) {
    throw new RunSaveError('INVALID_ENVELOPE', 'Run存档envelope身份与payload不一致')
  }
  return phase
}

export function saveRunPhase(
  storage: RunSaveStorage,
  phaseInput: unknown,
  registry: RunSaveRulesRegistry,
): RunSaveEnvelope {
  const envelope = createRunSaveEnvelope(phaseInput, registry)
  const serialized = JSON.stringify(envelope)
  try {
    storage.write(serialized)
  } catch (error) {
    throw new RunSaveError(
      'STORAGE_WRITE_FAILED',
      error instanceof Error ? error.message : 'Run存档写入失败',
    )
  }
  return envelope
}

export function loadRunPhase(
  storage: RunSaveStorage,
  registry: RunSaveRulesRegistry,
): StableRunPhase | null {
  let serialized: string | null
  try {
    serialized = storage.read()
  } catch (error) {
    throw new RunSaveError(
      'STORAGE_READ_FAILED',
      error instanceof Error ? error.message : 'Run存档读取失败',
    )
  }
  return serialized === null ? null : deserializeRunSave(serialized, registry)
}

export function clearRunSave(storage: RunSaveStorage): void {
  try {
    storage.clear()
  } catch (error) {
    throw new RunSaveError(
      'STORAGE_CLEAR_FAILED',
      error instanceof Error ? error.message : 'Run存档清除失败',
    )
  }
}
