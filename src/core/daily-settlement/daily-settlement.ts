import { deepFreeze, type FrozenRuleConfig } from '../config'
import {
  applyHealthLoss,
  clearPainkiller,
  createPlayerCondition,
  reducePendingInfectionExposure,
  removeOneMinorContusion,
  removeOpenWound,
  restoreHealth,
  type PlayerConditionSnapshot,
} from '../condition'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubSnapshot,
} from '../current-day-hub'
import { createDailyRunStateSnapshot, createInitialDailyRunStateSnapshot } from '../daily-state'
import { restoreRuleBoundRunPhaseContinuity } from '../domain'
import { createRunIntelLogSnapshot } from '../run-intel'
import {
  createRunLoadoutDependenciesFromReturn,
  createRunLoadoutSnapshot,
} from '../run-loadout'
import { createRunReturnLedgerSnapshot } from '../run-return'
import { consumeSatiety, createSatietySnapshot, getSatietyRecoveryBand } from '../satiety'
import {
  createWorldThreatSnapshot,
  getWorldThreatStage,
} from '../world-threat'
import { calculateDailyHealthRecovery } from './daily-health-recovery'
import type {
  DailySettlementDependencies,
  DailySettlementEffect,
  DailySettlementOutcome,
  DailySettlementResult,
  DailySettlementSummary,
  DailySettlementTerminalReason,
  DailySettlementTerminalSnapshot,
  DailySettlementTransitionPlan,
  EndDayCommand,
} from './daily-settlement-types'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

export type DailySettlementErrorCode =
  | 'INVALID_INPUT'
  | 'MAIN_SCENE_REQUIRED'
  | 'FINAL_DAY_RESOLUTION_REQUIRED'
  | 'EFFECT_MISMATCH'
  | 'SAFE_INTEGER_OVERFLOW'

export class DailySettlementError extends Error {
  public constructor(
    public readonly code: DailySettlementErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'DailySettlementError'
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
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function configOf(dependencies: DailySettlementDependencies): FrozenRuleConfig {
  return dependencies.returnDependencies.scene.config
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function overflow(message: string): never {
  throw new DailySettlementError('SAFE_INTEGER_OVERFLOW', message)
}

function checkedNonNegativeBigInt(value: bigint, message: string): number {
  if (value < 0n || value > MAX_SAFE) overflow(message)
  return Number(value)
}

function applyConfiguredHealthLoss(
  condition: PlayerConditionSnapshot,
  requested: number,
  config: FrozenRuleConfig,
): Readonly<{
  condition: PlayerConditionSnapshot
  requested: number
  actual: number
  before: number
  after: number
  depleted: boolean
}> {
  if (requested === 0) {
    return deepFreeze({
      condition,
      requested,
      actual: 0,
      before: condition.currentHealth,
      after: condition.currentHealth,
      depleted: condition.currentHealth === 0,
    })
  }
  const result = applyHealthLoss(condition, requested, config.combat.player)
  return deepFreeze({
    condition: result.state,
    requested,
    actual: result.actualLoss,
    before: result.healthBefore,
    after: result.healthAfter,
    depleted: result.depleted,
  })
}

export function createEndDayCommand(input: unknown): EndDayCommand {
  if (!plain(input) || Object.keys(input).length !== 1 || input.kind !== 'end-day') {
    throw new DailySettlementError('INVALID_INPUT', '结束本日命令结构无效')
  }
  return deepFreeze({ kind: 'end-day' })
}

export function createDailySettlementTerminalSnapshot(
  input: unknown,
  dependencies: DailySettlementDependencies,
): DailySettlementTerminalSnapshot {
  if (!exact(input, [
    'continuity', 'dailyState', 'kind', 'playerCondition', 'returnLedger',
    'runIntelLog', 'runLoadout', 'satiety', 'terminationReason', 'worldThreat',
  ]) || input.kind !== 'daily-settlement-terminal' ||
    (input.terminationReason !== 'health-depleted' &&
      input.terminationReason !== 'world-threat-terminal')) {
    throw new DailySettlementError('INVALID_INPUT', '每日结算终止快照结构无效')
  }
  const config = configOf(dependencies)
  try {
    const continuity = restoreRuleBoundRunPhaseContinuity(
      input.continuity,
      config,
    )
    const runLoadout = createRunLoadoutSnapshot(
      input.runLoadout as CurrentDayHubSnapshot['runLoadout'],
      createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies),
    )
    const playerCondition = createPlayerCondition(
      input.playerCondition as PlayerConditionSnapshot,
      config.combat.player,
    )
    const runIntelLog = createRunIntelLogSnapshot(
      input.runIntelLog as CurrentDayHubSnapshot['runIntelLog'],
    )
    const dailyState = createDailyRunStateSnapshot(input.dailyState, config)
    const worldThreat = createWorldThreatSnapshot(
      input.worldThreat,
      dependencies.worldThreatCatalog,
    )
    const satiety = createSatietySnapshot(input.satiety, config)
    const returnLedger = createRunReturnLedgerSnapshot(
      input.returnLedger as CurrentDayHubSnapshot['returnLedger'],
    )
    const stage = getWorldThreatStage(worldThreat, dependencies.worldThreatCatalog)
    if (worldThreat.definitionId !== config.worldThreat.definitionId ||
      !returnLedger.sceneInstanceIds.includes(continuity.sceneInstanceId) ||
      (input.terminationReason === 'health-depleted'
        ? playerCondition.currentHealth !== 0 || stage.terminal
        : playerCondition.currentHealth === 0 || !stage.terminal)) {
      throw new Error('每日结算终止原因与终止事实不一致')
    }
    return deepFreeze({
      kind: 'daily-settlement-terminal',
      terminationReason: input.terminationReason,
      continuity,
      runLoadout,
      playerCondition,
      runIntelLog,
      dailyState,
      worldThreat,
      satiety,
      returnLedger,
    })
  } catch (error) {
    if (error instanceof DailySettlementError) throw error
    throw new DailySettlementError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : '每日结算终止快照无效',
    )
  }
}

function createTerminalSnapshot(
  snapshot: CurrentDayHubSnapshot,
  reason: DailySettlementTerminalReason,
  changes: Readonly<{
    playerCondition?: PlayerConditionSnapshot
    worldThreat?: CurrentDayHubSnapshot['worldThreat']
    satiety?: CurrentDayHubSnapshot['satiety']
  }>,
  dependencies: DailySettlementDependencies,
): DailySettlementTerminalSnapshot {
  return createDailySettlementTerminalSnapshot({
    kind: 'daily-settlement-terminal' as const,
    terminationReason: reason,
    continuity: snapshot.continuity,
    runLoadout: snapshot.runLoadout,
    playerCondition: changes.playerCondition ?? snapshot.playerCondition,
    runIntelLog: snapshot.runIntelLog,
    dailyState: snapshot.dailyState,
    worldThreat: changes.worldThreat ?? snapshot.worldThreat,
    satiety: changes.satiety ?? snapshot.satiety,
    returnLedger: snapshot.returnLedger,
  }, dependencies)
}

function makeSummary(
  currentDay: number,
  effects: readonly DailySettlementEffect[],
  terminalReason: DailySettlementTerminalReason | null,
): DailySettlementSummary {
  const find = <K extends DailySettlementEffect['kind']>(kind: K) =>
    effects.find((effect): effect is Extract<DailySettlementEffect, { kind: K }> => effect.kind === kind) ?? null
  const continuousDanger = find('daily-continuous-danger-resolved')
  if (!continuousDanger) {
    throw new DailySettlementError('INVALID_INPUT', '每日结算缺少持续危险摘要')
  }
  const recoveryEffect = find('daily-health-recovery-resolved')
  return deepFreeze({
    currentDay,
    nextDay: terminalReason === null ? currentDay + 1 : null,
    terminalReason,
    continuousDanger,
    worldThreat: find('daily-world-threat-progressed'),
    exposureSettlement: find('daily-pending-exposures-settled'),
    satiety: find('daily-satiety-consumed'),
    deprivation: find('daily-deprivation-consequence-resolved'),
    recovery: recoveryEffect?.calculation ?? null,
    cleanup: find('daily-minor-injury-lifecycle-resolved'),
    dailyReset: find('daily-run-state-reset'),
  })
}

function terminalPlan(
  command: EndDayCommand,
  snapshot: CurrentDayHubSnapshot,
  effects: DailySettlementEffect[],
  reason: DailySettlementTerminalReason,
  changes: Parameters<typeof createTerminalSnapshot>[2],
  dependencies: DailySettlementDependencies,
): DailySettlementTransitionPlan {
  const terminalSnapshot = createTerminalSnapshot(snapshot, reason, changes, dependencies)
  const outcome: DailySettlementOutcome = deepFreeze({
    kind: 'terminal',
    reason,
    snapshot: terminalSnapshot,
  })
  effects.push({
    kind: 'daily-settlement-terminal-committed',
    reason,
    snapshot: terminalSnapshot,
  })
  return deepFreeze({
    command,
    effects,
    summary: makeSummary(snapshot.continuity.currentDay, effects, reason),
    outcome,
  })
}

export function buildDailySettlementTransitionPlan(
  snapshotInput: CurrentDayHubSnapshot,
  commandInput: EndDayCommand,
  dependencies: DailySettlementDependencies,
): DailySettlementTransitionPlan {
  let snapshot: CurrentDayHubSnapshot
  try {
    snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies)
  } catch (error) {
    throw new DailySettlementError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : '每日结算输入快照无效',
    )
  }
  const command = createEndDayCommand(commandInput)
  const config = configOf(dependencies)
  if (!snapshot.dailyState.mainSceneUsedToday) {
    throw new DailySettlementError(
      'MAIN_SCENE_REQUIRED',
      '当天必须先完成主要场景并返回电梯中枢，才能结束本日',
    )
  }
  if (snapshot.continuity.currentDay === config.dailySettlement.finalPlayableDay) {
    throw new DailySettlementError(
      'FINAL_DAY_RESOLUTION_REQUIRED',
      '最终可游玩日必须先执行正式终局检查，不能进入普通次日结算',
    )
  }

  const effects: DailySettlementEffect[] = []
  let condition = snapshot.playerCondition

  const continuousDanger = applyConfiguredHealthLoss(
    condition,
    condition.bleeding ? config.dailySettlement.unresolvedBleedingHealthLoss : 0,
    config,
  )
  condition = continuousDanger.condition
  effects.push({
    kind: 'daily-continuous-danger-resolved',
    bleeding: snapshot.playerCondition.bleeding,
    requestedHealthLoss: continuousDanger.requested,
    actualHealthLoss: continuousDanger.actual,
    healthBefore: continuousDanger.before,
    healthAfter: continuousDanger.after,
    recoveryBlocked: snapshot.playerCondition.bleeding,
  })
  if (continuousDanger.depleted) {
    return terminalPlan(command, snapshot, effects, 'health-depleted', {
      playerCondition: condition,
    }, dependencies)
  }

  const threatDefinition = dependencies.worldThreatCatalog[snapshot.worldThreat.definitionId]
  const preStage = getWorldThreatStage(snapshot.worldThreat, dependencies.worldThreatCatalog)
  const pendingExposureCount = condition.pendingInfectionExposures
  const exposureContribution = checkedNonNegativeBigInt(
    BigInt(pendingExposureCount) * BigInt(threatDefinition.progressPerPendingExposure),
    '每日世界威胁暴露贡献超出安全整数范围',
  )
  const rawIncreaseBig = BigInt(preStage.dailyBaseIncrease) +
    BigInt(exposureContribution) -
    BigInt(snapshot.dailyState.threatSuppression.suppressionAmountToday)
  const appliedIncrease = rawIncreaseBig <= 0n
    ? 0
    : checkedNonNegativeBigInt(rawIncreaseBig, '每日世界威胁增加超出安全整数范围')
  const progressAfter = checkedNonNegativeBigInt(
    BigInt(snapshot.worldThreat.progress) + BigInt(appliedIncrease),
    '世界威胁进展超出安全整数范围',
  )
  const worldThreat = createWorldThreatSnapshot({
    definitionId: snapshot.worldThreat.definitionId,
    progress: progressAfter,
  }, dependencies.worldThreatCatalog)
  const postStage = getWorldThreatStage(worldThreat, dependencies.worldThreatCatalog)
  effects.push({
    kind: 'daily-world-threat-progressed',
    definitionId: snapshot.worldThreat.definitionId,
    preStageId: preStage.id,
    dailyBaseIncrease: preStage.dailyBaseIncrease,
    pendingExposureCount,
    progressPerPendingExposure: threatDefinition.progressPerPendingExposure,
    exposureContribution,
    suppressionAmount: snapshot.dailyState.threatSuppression.suppressionAmountToday,
    rawIncrease: rawIncreaseBig < BigInt(Number.MIN_SAFE_INTEGER)
      ? overflow('每日世界威胁原始增加超出安全整数范围')
      : Number(rawIncreaseBig),
    appliedIncrease,
    progressBefore: snapshot.worldThreat.progress,
    progressAfter,
    postStageId: postStage.id,
    terminal: postStage.terminal,
  })
  if (pendingExposureCount > 0) {
    condition = reducePendingInfectionExposure(condition, pendingExposureCount).state
  }
  effects.push({
    kind: 'daily-pending-exposures-settled',
    before: pendingExposureCount,
    after: 0,
  })
  if (postStage.terminal) {
    return terminalPlan(command, snapshot, effects, 'world-threat-terminal', {
      playerCondition: condition,
      worldThreat,
    }, dependencies)
  }

  const satietyConsumption = consumeSatiety(
    snapshot.satiety,
    config.dailySettlement.dailySatietyCost,
    config,
  )
  const satiety = satietyConsumption.snapshot
  effects.push({ kind: 'daily-satiety-consumed', ...satietyConsumption.result })
  const deprivationBand = getSatietyRecoveryBand(satiety, config)
  const deprived = deprivationBand.deprived
  const deprivation = applyConfiguredHealthLoss(
    condition,
    deprived ? config.dailySettlement.deprivationHealthLoss : 0,
    config,
  )
  condition = deprivation.condition
  effects.push({
    kind: 'daily-deprivation-consequence-resolved',
    deprived,
    requestedHealthLoss: deprivation.requested,
    actualHealthLoss: deprivation.actual,
    healthBefore: deprivation.before,
    healthAfter: deprivation.after,
    recoveryCap: deprivationBand.maxHealthRecovery,
  })
  if (deprivation.depleted) {
    return terminalPlan(command, snapshot, effects, 'health-depleted', {
      playerCondition: condition,
      worldThreat,
      satiety,
    }, dependencies)
  }

  const recovery = calculateDailyHealthRecovery(
    condition,
    satiety,
    worldThreat,
    config,
    dependencies.worldThreatCatalog,
  )
  if (recovery.actualRecovery > 0) {
    condition = restoreHealth(
      condition,
      recovery.actualRecovery,
      config.combat.player,
    ).state
  }
  effects.push({ kind: 'daily-health-recovery-resolved', calculation: recovery })

  const minorContusionsBefore = condition.minorContusions
  const removedTreatedOpenWoundIds = condition.openWounds
    .filter(({ treatment }) => treatment === 'treated')
    .map(({ id }) => id)
    .sort()
  const retainedUntreatedOpenWoundIds = condition.openWounds
    .filter(({ treatment }) => treatment === 'untreated')
    .map(({ id }) => id)
    .sort()
  const painkillerActiveBefore = condition.painkillerActive
  const bleedingBefore = condition.bleeding
  while (condition.minorContusions > 0) condition = removeOneMinorContusion(condition)
  for (const woundId of removedTreatedOpenWoundIds) condition = removeOpenWound(condition, woundId)
  if (condition.painkillerActive) condition = clearPainkiller(condition)
  condition = createPlayerCondition(condition, config.combat.player)
  effects.push({
    kind: 'daily-minor-injury-lifecycle-resolved',
    minorContusionsBefore,
    minorContusionsAfter: 0,
    removedTreatedOpenWoundIds,
    retainedUntreatedOpenWoundIds,
    painkillerActiveBefore,
    painkillerActiveAfter: false,
    bleedingBefore,
    bleedingAfter: condition.bleeding,
  })

  const dailyState = createInitialDailyRunStateSnapshot(config)
  effects.push({
    kind: 'daily-run-state-reset',
    before: snapshot.dailyState,
    after: dailyState,
  })

  const nextDay = snapshot.continuity.currentDay + 1
  if (!Number.isSafeInteger(nextDay)) overflow('日期推进超出安全整数范围')
  const continuity = restoreRuleBoundRunPhaseContinuity({
    ...snapshot.continuity,
    currentDay: nextDay,
  }, config)
  effects.push({
    kind: 'daily-run-day-advanced',
    before: snapshot.continuity,
    after: continuity,
  })

  const nextSnapshot = createCurrentDayHubSnapshot({
    ...snapshot,
    continuity,
    playerCondition: condition,
    dailyState,
    worldThreat,
    satiety,
  }, dependencies)
  effects.push({
    kind: 'daily-settlement-next-day-committed',
    snapshot: nextSnapshot,
  })
  const outcome: DailySettlementOutcome = deepFreeze({
    kind: 'next-day-current-day-hub',
    snapshot: nextSnapshot,
  })
  return deepFreeze({
    command,
    effects,
    summary: makeSummary(snapshot.continuity.currentDay, effects, null),
    outcome,
  })
}

export function previewDailySettlement(
  snapshot: CurrentDayHubSnapshot,
  dependencies: DailySettlementDependencies,
): DailySettlementSummary {
  return buildDailySettlementTransitionPlan(snapshot, { kind: 'end-day' }, dependencies).summary
}

export function applyDailySettlementEffects(
  snapshot: CurrentDayHubSnapshot,
  command: EndDayCommand,
  effects: readonly DailySettlementEffect[],
  dependencies: DailySettlementDependencies,
): DailySettlementResult {
  const expected = buildDailySettlementTransitionPlan(snapshot, command, dependencies)
  if (!same(effects, expected.effects)) {
    throw new DailySettlementError(
      'EFFECT_MISMATCH',
      '每日结算Effect与冻结正式计划不一致',
    )
  }
  return deepFreeze({
    effects: expected.effects,
    summary: expected.summary,
    outcome: expected.outcome,
  })
}

export function resolveDailySettlement(
  snapshot: CurrentDayHubSnapshot,
  command: EndDayCommand,
  dependencies: DailySettlementDependencies,
): DailySettlementResult {
  const plan = buildDailySettlementTransitionPlan(snapshot, command, dependencies)
  return applyDailySettlementEffects(snapshot, plan.command, plan.effects, dependencies)
}
