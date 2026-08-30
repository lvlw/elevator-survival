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
  const identity = getStableRunPhaseIdentity(before)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const finalFacts = after.kind === 'current-day-hub'
    ? after.payload
    : after.kind === 'run-failure' && after.payload.source.kind === 'daily-settlement-terminal'
      ? after.payload.source.terminalSnapshot
      : null
  if (finalFacts === null) return invalid('结算后阶段不是次日中枢或日结算失败')
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
  }
  if (finalFacts.playerCondition.currentHealth !== preview.healthAfter) {
    return invalid('最终生命不匹配')
  }
  if (preview.worldThreat) {
    const finalStage = getWorldThreatStage(
      finalFacts.worldThreat,
      rules.currentDayHub.worldThreatCatalog,
    )
    if (finalStage.id !== preview.worldThreat.stageAfterId ||
      finalFacts.playerCondition.pendingInfectionExposures !== preview.worldThreat.pendingExposuresAfter) {
      return invalid('世界威胁或暴露结果不匹配')
    }
  }
  if (preview.satiety && finalFacts.satiety.current !== preview.satiety.after) {
    return invalid('饱食结果不匹配')
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

