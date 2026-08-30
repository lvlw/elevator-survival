import type { PlayerVisibleDailySettlementEvaluation } from '../../core/daily-settlement'
import { getWorldThreatStage } from '../../core/world-threat'
import { getStableRunPhaseIdentity, type StableRunPhase } from '../../state/run-save'
import type { StableRunUiPresentationDependencies } from './stable-run-view-model'

export interface DailySettlementResultViewModel {
  readonly title: string
  readonly outcome: PlayerVisibleDailySettlementEvaluation['outcome']
  readonly currentDay: number
  readonly nextDay: number | null
  readonly healthBefore: number
  readonly healthAfter: number
  readonly continuousDangerHealthLoss: number
  readonly worldThreatStageBefore: string | null
  readonly worldThreatStageAfter: string | null
  readonly pendingExposuresBefore: number | null
  readonly pendingExposuresAfter: number | null
  readonly suppressionApplied: number | null
  readonly satietyBefore: number | null
  readonly satietyAfter: number | null
  readonly deprivationHealthLoss: number | null
  readonly recoveryActual: number | null
  readonly recoveryBlockedByBleeding: boolean | null
  readonly minorContusionsBefore: number | null
  readonly minorContusionsAfter: number | null
  readonly treatedOpenWoundsRemoved: number | null
  readonly untreatedOpenWoundsRetained: number | null
  readonly painkillerBefore: boolean | null
  readonly painkillerAfter: boolean | null
  readonly disinfectantUsesBefore: number | null
  readonly disinfectantUsesAfter: number | null
  readonly threatSuppressionUsesBefore: number | null
  readonly threatSuppressionUsesAfter: number | null
  readonly maintenanceLaborBefore: number | null
  readonly maintenanceLaborAfter: number | null
  readonly mainSceneUsedAfter: boolean | null
}

function invalid(message: string): never {
  throw new Error(`日结算结果与 canonical phase 不一致：${message}`)
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function sameRunIdentity(before: StableRunPhase, after: StableRunPhase): boolean {
  const left = getStableRunPhaseIdentity(before)
  const right = getStableRunPhaseIdentity(after)
  return left.runId === right.runId &&
    left.seed === right.seed &&
    left.rulesVersion === right.rulesVersion
}

function sameUnresolvedInjuries(
  before: StableRunPhase & { readonly kind: 'current-day-hub' },
  finalFacts: Extract<StableRunPhase, { readonly kind: 'current-day-hub' }>['payload'],
): boolean {
  const beforeCondition = before.payload.playerCondition
  const finalCondition = finalFacts.playerCondition
  return beforeCondition.bleeding === finalCondition.bleeding &&
    beforeCondition.minorContusions === finalCondition.minorContusions &&
    beforeCondition.painkillerActive === finalCondition.painkillerActive &&
    sameValue(beforeCondition.openWounds, finalCondition.openWounds)
}

/**
 * Builds a presentation-only result from the player-safe formal preview after
 * verifying it against the canonical committed phase.
 */
export function createDailySettlementResultViewModel(
  before: StableRunPhase,
  after: StableRunPhase,
  preview: PlayerVisibleDailySettlementEvaluation,
  dependencies: StableRunUiPresentationDependencies,
): DailySettlementResultViewModel {
  if (before.kind !== 'current-day-hub' ||
    before.payload.continuity.currentDay !== preview.currentDay) {
    return invalid('起始中枢或日期不匹配')
  }
  if (!sameRunIdentity(before, after)) return invalid('Run 身份不一致')
  const identity = getStableRunPhaseIdentity(before)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const beforeCondition = before.payload.playerCondition
  const beforeDaily = before.payload.dailyState
  if (preview.healthBefore !== beforeCondition.currentHealth ||
    preview.continuousDanger.healthBefore !== beforeCondition.currentHealth ||
    preview.continuousDanger.bleeding !== beforeCondition.bleeding) {
    return invalid('起始生命或持续危险状态不匹配')
  }
  if (preview.worldThreat) {
    const beforeStage = getWorldThreatStage(
      before.payload.worldThreat,
      rules.currentDayHub.worldThreatCatalog,
    )
    if (beforeStage.id !== preview.worldThreat.stageBeforeId ||
      beforeCondition.pendingInfectionExposures !== preview.worldThreat.pendingExposuresBefore) {
      return invalid('起始世界威胁或暴露状态不匹配')
    }
  }
  if (preview.satiety && before.payload.satiety.current !== preview.satiety.before) {
    return invalid('起始饱食状态不匹配')
  }
  if (preview.cleanup) {
    const treatedCount = beforeCondition.openWounds.filter(({ treatment }) => treatment === 'treated').length
    const untreatedCount = beforeCondition.openWounds.length - treatedCount
    if (beforeCondition.minorContusions !== preview.cleanup.minorContusionsBefore ||
      treatedCount !== preview.cleanup.treatedOpenWoundsRemoved ||
      untreatedCount !== preview.cleanup.untreatedOpenWoundsRetained ||
      beforeCondition.painkillerActive !== preview.cleanup.painkillerBefore ||
      beforeCondition.bleeding !== preview.cleanup.bleedingBefore) {
      return invalid('起始轻伤清理状态不匹配')
    }
  }
  if (preview.dailyReset) {
    const reset = preview.dailyReset
    if (beforeDaily.medicalUsage.disinfectantUsesToday !== reset.disinfectantUsesBefore ||
      beforeDaily.threatSuppression.usesToday !== reset.threatSuppressionUsesBefore ||
      beforeDaily.threatSuppression.suppressionAmountToday !== reset.threatSuppressionAmountBefore ||
      beforeDaily.maintenanceLaborRemaining !== reset.maintenanceLaborBefore ||
      beforeDaily.mainSceneUsedToday !== reset.mainSceneUsedBefore) {
      return invalid('起始日级资源状态不匹配')
    }
  }
  const finalFacts = after.kind === 'current-day-hub'
    ? after.payload
    : after.kind === 'run-failure' && after.payload.source.kind === 'daily-settlement-terminal'
      ? after.payload.source.terminalSnapshot
      : null
  if (finalFacts === null) return invalid('结算后阶段不是次日中枢或日结算失败')
  if (finalFacts.continuity.sceneInstanceId !== before.payload.continuity.sceneInstanceId ||
    !sameValue(finalFacts.runLoadout, before.payload.runLoadout) ||
    !sameValue(finalFacts.runIntelLog, before.payload.runIntelLog) ||
    !sameValue(finalFacts.returnLedger, before.payload.returnLedger)) {
    return invalid('日结算不应改变的 Run 状态发生变化')
  }
  if (preview.outcome === 'next-day') {
    if (after.kind !== 'current-day-hub' ||
      preview.nextDay === null ||
      after.payload.continuity.currentDay !== preview.nextDay) {
      return invalid('次日中枢或日期不匹配')
    }
  } else {
    if (after.kind !== 'run-failure' || after.payload.reason !== preview.outcome) {
      return invalid('失败原因不匹配')
    }
    if (finalFacts.continuity.currentDay !== before.payload.continuity.currentDay) {
      return invalid('提前终止时日期不应推进')
    }
  }
  if (finalFacts.playerCondition.currentHealth !== preview.healthAfter) {
    return invalid('最终生命不匹配')
  }
  if (preview.worldThreat) {
    const finalStage = getWorldThreatStage(
      finalFacts.worldThreat,
      rules.currentDayHub.worldThreatCatalog,
    )
    if (finalFacts.worldThreat.definitionId !== before.payload.worldThreat.definitionId ||
      finalStage.id !== preview.worldThreat.stageAfterId ||
      finalFacts.playerCondition.pendingInfectionExposures !== preview.worldThreat.pendingExposuresAfter) {
      return invalid('世界威胁或暴露结果不匹配')
    }
  } else if (!sameValue(finalFacts.worldThreat, before.payload.worldThreat) ||
    finalFacts.playerCondition.pendingInfectionExposures !== beforeCondition.pendingInfectionExposures) {
    return invalid('未执行的世界威胁阶段状态发生变化')
  }
  if (preview.satiety) {
    if (finalFacts.satiety.current !== preview.satiety.after) return invalid('饱食结果不匹配')
  } else if (!sameValue(finalFacts.satiety, before.payload.satiety)) {
    return invalid('未执行的饱食阶段状态发生变化')
  }
  if (preview.cleanup) {
    const cleanup = preview.cleanup
    const retainedUntreated = beforeCondition.openWounds.filter(({ treatment }) => treatment === 'untreated')
    const finalCondition = finalFacts.playerCondition
    if (finalCondition.minorContusions !== cleanup.minorContusionsAfter ||
      finalCondition.painkillerActive !== cleanup.painkillerAfter ||
      finalCondition.bleeding !== cleanup.bleedingAfter ||
      !sameValue(finalCondition.openWounds, retainedUntreated)) {
      return invalid('伤势清理结果不匹配')
    }
  } else if (!sameUnresolvedInjuries(before, finalFacts)) {
    return invalid('未执行的伤势清理阶段状态发生变化')
  }
  if (preview.dailyReset) {
    const reset = preview.dailyReset
    const daily = finalFacts.dailyState
    if (daily.medicalUsage.disinfectantUsesToday !== reset.disinfectantUsesAfter ||
      daily.threatSuppression.usesToday !== reset.threatSuppressionUsesAfter ||
      daily.threatSuppression.suppressionAmountToday !== reset.threatSuppressionAmountAfter ||
      daily.maintenanceLaborRemaining !== reset.maintenanceLaborAfter ||
      daily.mainSceneUsedToday !== reset.mainSceneUsedAfter) {
      return invalid('日级资源重置结果不匹配')
    }
  } else if (!sameValue(finalFacts.dailyState, beforeDaily)) {
    return invalid('未执行的日级资源重置阶段状态发生变化')
  }
  return Object.freeze({
    title: preview.outcome === 'next-day'
      ? `第 ${preview.currentDay} 日结算完成`
      : 'Run 结束',
    outcome: preview.outcome,
    currentDay: preview.currentDay,
    nextDay: preview.nextDay,
    healthBefore: preview.healthBefore,
    healthAfter: preview.healthAfter,
    continuousDangerHealthLoss: preview.continuousDanger.healthLoss,
    worldThreatStageBefore: preview.worldThreat
      ? dependencies.labels.worldThreatStageName(preview.worldThreat.stageBeforeId)
      : null,
    worldThreatStageAfter: preview.worldThreat
      ? dependencies.labels.worldThreatStageName(preview.worldThreat.stageAfterId)
      : null,
    pendingExposuresBefore: preview.worldThreat?.pendingExposuresBefore ?? null,
    pendingExposuresAfter: preview.worldThreat?.pendingExposuresAfter ?? null,
    suppressionApplied: preview.worldThreat?.suppressionApplied ?? null,
    satietyBefore: preview.satiety?.before ?? null,
    satietyAfter: preview.satiety?.after ?? null,
    deprivationHealthLoss: preview.deprivation?.healthLoss ?? null,
    recoveryActual: preview.recovery?.actual ?? null,
    recoveryBlockedByBleeding: preview.recovery?.blockedByBleeding ?? null,
    minorContusionsBefore: preview.cleanup?.minorContusionsBefore ?? null,
    minorContusionsAfter: preview.cleanup?.minorContusionsAfter ?? null,
    treatedOpenWoundsRemoved: preview.cleanup?.treatedOpenWoundsRemoved ?? null,
    untreatedOpenWoundsRetained: preview.cleanup?.untreatedOpenWoundsRetained ?? null,
    painkillerBefore: preview.cleanup?.painkillerBefore ?? null,
    painkillerAfter: preview.cleanup?.painkillerAfter ?? null,
    disinfectantUsesBefore: preview.dailyReset?.disinfectantUsesBefore ?? null,
    disinfectantUsesAfter: preview.dailyReset?.disinfectantUsesAfter ?? null,
    threatSuppressionUsesBefore: preview.dailyReset?.threatSuppressionUsesBefore ?? null,
    threatSuppressionUsesAfter: preview.dailyReset?.threatSuppressionUsesAfter ?? null,
    maintenanceLaborBefore: preview.dailyReset?.maintenanceLaborBefore ?? null,
    maintenanceLaborAfter: preview.dailyReset?.maintenanceLaborAfter ?? null,
    mainSceneUsedAfter: preview.dailyReset?.mainSceneUsedAfter ?? null,
  })
}
