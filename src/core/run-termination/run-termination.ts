import { deepFreeze } from '../config'
import { createDailySettlementTerminalSnapshot } from '../daily-settlement'
import type { RunPhaseContinuitySnapshot } from '../domain'
import { createRunSceneSessionSnapshot } from '../scene-launch'
import type { RunSceneSessionSnapshot } from '../scene-launch'
import { RunTerminationError } from './run-termination-errors'
import type {
  DailySettlementRunFailureSource,
  RunFailureEffect,
  RunFailureReason,
  RunFailureResult,
  RunFailureSnapshot,
  RunFailureSource,
  RunFailureSummary,
  RunFailureTransitionPlan,
  RunTerminationDependencies,
  SceneDefeatRunFailureSource,
} from './run-termination-types'

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
  throw new RunTerminationError('INVALID_INPUT', message)
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function restoreSceneDefeatSource(
  input: Record<string, unknown>,
  dependencies: RunTerminationDependencies,
): SceneDefeatRunFailureSource {
  if (!exact(input, ['context', 'kind', 'terminalScene'])) {
    invalid('场景战败来源结构无效')
  }
  try {
    const session = createRunSceneSessionSnapshot({
      context: input.context,
      scene: input.terminalScene,
    },
      dependencies.sceneLaunch,
    )
    const terminalScene = session.scene
    if (
      terminalScene.status !== 'dead' ||
      terminalScene.condition.currentHealth !== 0
    ) {
      invalid('场景战败来源必须是生命归零的dead场景')
    }
    if (
      session.context.runReturnCarryForward.continuity.sceneInstanceId !==
      terminalScene.sceneInstanceId
    ) {
      invalid('场景战败来源与Run连续性绑定的场景实例不一致')
    }
    return deepFreeze({
      kind: 'scene-defeat',
      context: session.context,
      terminalScene: session.scene,
    })
  } catch (error) {
    if (error instanceof RunTerminationError) throw error
    invalid(error instanceof Error ? error.message : '场景战败来源无效')
  }
}

function restoreDailySettlementSource(
  input: Record<string, unknown>,
  dependencies: RunTerminationDependencies,
): DailySettlementRunFailureSource {
  if (!exact(input, ['kind', 'terminalSnapshot'])) {
    invalid('每日结算失败来源结构无效')
  }
  try {
    return deepFreeze({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: createDailySettlementTerminalSnapshot(
        input.terminalSnapshot,
        dependencies.currentDayHub,
      ),
    })
  } catch (error) {
    invalid(error instanceof Error ? error.message : '每日结算失败来源无效')
  }
}

function restoreRunFailureSource(
  input: unknown,
  dependencies: RunTerminationDependencies,
): RunFailureSource {
  if (!plain(input) || typeof input.kind !== 'string') {
    invalid('Run失败来源结构无效')
  }
  if (input.kind === 'scene-defeat') {
    return restoreSceneDefeatSource(input, dependencies)
  }
  if (input.kind === 'daily-settlement-terminal') {
    return restoreDailySettlementSource(input, dependencies)
  }
  invalid('Run失败来源类型无效')
}

function reasonFromSource(source: RunFailureSource): RunFailureReason {
  return source.kind === 'scene-defeat'
    ? 'health-depleted'
    : source.terminalSnapshot.terminationReason
}

function continuityFromSource(
  source: RunFailureSource,
): RunPhaseContinuitySnapshot {
  return source.kind === 'scene-defeat'
    ? source.context.runReturnCarryForward.continuity
    : source.terminalSnapshot.continuity
}

export function restoreRunFailureSnapshot(
  input: unknown,
  dependencies: RunTerminationDependencies,
): RunFailureSnapshot {
  if (!exact(input, ['kind', 'reason', 'source']) || input.kind !== 'run-failure') {
    invalid('Run失败快照结构无效')
  }
  const source = restoreRunFailureSource(input.source, dependencies)
  const reason = reasonFromSource(source)
  if (input.reason !== reason) {
    invalid('Run失败原因必须由终止来源唯一确定')
  }
  return deepFreeze({ kind: 'run-failure', reason, source })
}

export function summarizeRunFailure(
  snapshotInput: RunFailureSnapshot,
  dependencies: RunTerminationDependencies,
): RunFailureSummary {
  const snapshot = restoreRunFailureSnapshot(snapshotInput, dependencies)
  const continuity = continuityFromSource(snapshot.source)
  return deepFreeze({
    kind: 'run-failure-summary',
    status: 'failed',
    reason: snapshot.reason,
    sourceKind: snapshot.source.kind,
    runId: continuity.runIdentity.runId,
    currentDay: continuity.currentDay,
  })
}

export function buildRunFailureTransitionPlan(
  sourceInput: RunFailureSource,
  dependencies: RunTerminationDependencies,
): RunFailureTransitionPlan {
  const source = restoreRunFailureSource(sourceInput, dependencies)
  const reason = reasonFromSource(source)
  const snapshot = restoreRunFailureSnapshot({
    kind: 'run-failure',
    reason,
    source,
  }, dependencies)
  const summary = summarizeRunFailure(snapshot, dependencies)
  const continuity = continuityFromSource(source)
  const effects: readonly RunFailureEffect[] = deepFreeze([
    {
      kind: 'run-failure-source-accepted',
      sourceKind: source.kind,
      runId: continuity.runIdentity.runId,
      seed: continuity.runIdentity.seed,
      rulesVersion: continuity.runIdentity.rulesVersion,
      currentDay: continuity.currentDay,
      sceneInstanceId: continuity.sceneInstanceId,
    },
    { kind: 'run-failure-reason-determined', reason },
    { kind: 'run-failure-committed', snapshot, summary },
  ])
  return deepFreeze({ effects, snapshot, summary })
}

export function applyRunFailureEffects(
  sourceInput: RunFailureSource,
  effects: readonly RunFailureEffect[],
  dependencies: RunTerminationDependencies,
): RunFailureResult {
  const expected = buildRunFailureTransitionPlan(sourceInput, dependencies)
  if (!same(effects, expected.effects)) {
    throw new RunTerminationError(
      'EFFECT_MISMATCH',
      'Run失败Effect与冻结正式计划不一致',
    )
  }
  return expected
}

export function resolveRunFailure(
  sourceInput: RunFailureSource,
  dependencies: RunTerminationDependencies,
): RunFailureResult {
  const plan = buildRunFailureTransitionPlan(sourceInput, dependencies)
  return applyRunFailureEffects(sourceInput, plan.effects, dependencies)
}

export function createSceneDefeatRunFailureSourceFromSession(
  sessionInput: RunSceneSessionSnapshot,
  dependencies: RunTerminationDependencies,
): SceneDefeatRunFailureSource {
  const session = createRunSceneSessionSnapshot(
    sessionInput,
    dependencies.sceneLaunch,
  )
  return restoreSceneDefeatSource({
    kind: 'scene-defeat',
    context: session.context,
    terminalScene: session.scene,
  }, dependencies)
}

export function resolveRunFailureFromSceneSession(
  sessionInput: RunSceneSessionSnapshot,
  dependencies: RunTerminationDependencies,
): RunFailureResult {
  return resolveRunFailure(
    createSceneDefeatRunFailureSourceFromSession(sessionInput, dependencies),
    dependencies,
  )
}
