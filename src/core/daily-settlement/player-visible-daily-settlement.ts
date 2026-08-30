import { deepFreeze } from '../config'
import type { CurrentDayHubSnapshot } from '../current-day-hub'
import { getWorldThreatStage } from '../world-threat'
import {
  buildDailySettlementTransitionPlan,
  DailySettlementError,
} from './daily-settlement'
import type {
  DailySettlementDependencies,
  DailySettlementSummary,
} from './daily-settlement-types'

export type PlayerVisibleDailySettlementRejection =
  | 'main-scene-required'
  | 'final-day-resolution-required'
  | 'invalid-state'

export type PlayerVisibleDailySettlementFailureStage =
  | 'continuous-danger'
  | 'world-threat'
  | 'deprivation'

export interface PlayerVisibleDailySettlementEvaluation {
  readonly currentDay: number
  readonly nextDay: number | null
  readonly outcome: 'next-day' | 'health-depleted' | 'world-threat-terminal'
  readonly failureStage: PlayerVisibleDailySettlementFailureStage | null
  readonly healthBefore: number
  readonly healthAfter: number
  readonly continuousDanger: Readonly<{
    bleeding: boolean
    healthLoss: number
    healthBefore: number
    healthAfter: number
    recoveryBlocked: boolean
  }>
  readonly worldThreat: Readonly<{
    stageBeforeId: string
    stageAfterId: string
    pendingExposuresBefore: number
    pendingExposuresAfter: number
    suppressionApplied: number
  }> | null
  readonly satiety: Readonly<{
    before: number
    consumed: number
    after: number
  }> | null
  readonly deprivation: Readonly<{
    active: boolean
    healthLoss: number
    healthBefore: number
    healthAfter: number
  }> | null
  readonly recovery: Readonly<{
    blockedByBleeding: boolean
    requested: number
    actual: number
    healthBefore: number
    healthAfter: number
  }> | null
  readonly cleanup: Readonly<{
    minorContusionsBefore: number
    minorContusionsAfter: number
    treatedOpenWoundsRemoved: number
    untreatedOpenWoundsRetained: number
    painkillerBefore: boolean
    painkillerAfter: boolean
    bleedingBefore: boolean
    bleedingAfter: boolean
  }> | null
  readonly dailyReset: Readonly<{
    disinfectantUsesBefore: number
    disinfectantUsesAfter: number
    threatSuppressionUsesBefore: number
    threatSuppressionUsesAfter: number
    threatSuppressionAmountBefore: number
    threatSuppressionAmountAfter: number
    maintenanceLaborBefore: number
    maintenanceLaborAfter: number
    mainSceneUsedBefore: boolean
    mainSceneUsedAfter: boolean
  }> | null
}

export type PlayerVisibleDailySettlementPreview =
  | Readonly<{
      canExecute: true
      result: PlayerVisibleDailySettlementEvaluation
    }>
  | Readonly<{
      canExecute: false
      rejection: PlayerVisibleDailySettlementRejection
    }>

function failureStage(summary: DailySettlementSummary): PlayerVisibleDailySettlementFailureStage | null {
  if (summary.terminalReason === null) return null
  if (summary.terminalReason === 'world-threat-terminal') return 'world-threat'
  return summary.deprivation?.healthAfter === 0
    ? 'deprivation'
    : 'continuous-danger'
}

/**
 * Player-safe allow-list over the formal frozen Daily Settlement plan. It never
 * exposes exact threat progress, internal wound identities, Effects, or the
 * resulting snapshot.
 */
export function previewPlayerVisibleDailySettlement(
  snapshot: CurrentDayHubSnapshot,
  dependencies: DailySettlementDependencies,
): PlayerVisibleDailySettlementPreview {
  try {
    const plan = buildDailySettlementTransitionPlan(
      snapshot,
      { kind: 'end-day' },
      dependencies,
    )
    const summary = plan.summary
    const finalSnapshot = plan.outcome.snapshot
    const worldThreat = summary.worldThreat === null
      ? null
      : {
          stageBeforeId: summary.worldThreat.preStageId,
          stageAfterId: summary.worldThreat.postStageId,
          pendingExposuresBefore: summary.worldThreat.pendingExposureCount,
          pendingExposuresAfter: summary.exposureSettlement?.after ??
            finalSnapshot.playerCondition.pendingInfectionExposures,
          suppressionApplied: summary.worldThreat.suppressionAmount,
        }
    const result: PlayerVisibleDailySettlementEvaluation = {
      currentDay: summary.currentDay,
      nextDay: summary.nextDay,
      outcome: summary.terminalReason === null
        ? 'next-day'
        : summary.terminalReason,
      failureStage: failureStage(summary),
      healthBefore: snapshot.playerCondition.currentHealth,
      healthAfter: finalSnapshot.playerCondition.currentHealth,
      continuousDanger: {
        bleeding: summary.continuousDanger.bleeding,
        healthLoss: summary.continuousDanger.actualHealthLoss,
        healthBefore: summary.continuousDanger.healthBefore,
        healthAfter: summary.continuousDanger.healthAfter,
        recoveryBlocked: summary.continuousDanger.recoveryBlocked,
      },
      worldThreat,
      satiety: summary.satiety === null
        ? null
        : {
            before: summary.satiety.before,
            consumed: summary.satiety.consumed,
            after: summary.satiety.after,
          },
      deprivation: summary.deprivation === null
        ? null
        : {
            active: summary.deprivation.deprived,
            healthLoss: summary.deprivation.actualHealthLoss,
            healthBefore: summary.deprivation.healthBefore,
            healthAfter: summary.deprivation.healthAfter,
          },
      recovery: summary.recovery === null
        ? null
        : {
            blockedByBleeding: summary.recovery.blockedByBleeding,
            requested: summary.recovery.requestedRecovery,
            actual: summary.recovery.actualRecovery,
            healthBefore: summary.recovery.healthBefore,
            healthAfter: summary.recovery.healthAfter,
          },
      cleanup: summary.cleanup === null
        ? null
        : {
            minorContusionsBefore: summary.cleanup.minorContusionsBefore,
            minorContusionsAfter: summary.cleanup.minorContusionsAfter,
            treatedOpenWoundsRemoved: summary.cleanup.removedTreatedOpenWoundIds.length,
            untreatedOpenWoundsRetained: summary.cleanup.retainedUntreatedOpenWoundIds.length,
            painkillerBefore: summary.cleanup.painkillerActiveBefore,
            painkillerAfter: summary.cleanup.painkillerActiveAfter,
            bleedingBefore: summary.cleanup.bleedingBefore,
            bleedingAfter: summary.cleanup.bleedingAfter,
          },
      dailyReset: summary.dailyReset === null
        ? null
        : {
            disinfectantUsesBefore: summary.dailyReset.before.medicalUsage.disinfectantUsesToday,
            disinfectantUsesAfter: summary.dailyReset.after.medicalUsage.disinfectantUsesToday,
            threatSuppressionUsesBefore: summary.dailyReset.before.threatSuppression.usesToday,
            threatSuppressionUsesAfter: summary.dailyReset.after.threatSuppression.usesToday,
            threatSuppressionAmountBefore: summary.dailyReset.before.threatSuppression.suppressionAmountToday,
            threatSuppressionAmountAfter: summary.dailyReset.after.threatSuppression.suppressionAmountToday,
            maintenanceLaborBefore: summary.dailyReset.before.maintenanceLaborRemaining,
            maintenanceLaborAfter: summary.dailyReset.after.maintenanceLaborRemaining,
            mainSceneUsedBefore: summary.dailyReset.before.mainSceneUsedToday,
            mainSceneUsedAfter: summary.dailyReset.after.mainSceneUsedToday,
          },
    }
    return deepFreeze({ canExecute: true, result })
  } catch (error) {
    if (!(error instanceof DailySettlementError)) throw error
    if (error.code !== 'MAIN_SCENE_REQUIRED' &&
      error.code !== 'FINAL_DAY_RESOLUTION_REQUIRED' &&
      error.code !== 'INVALID_INPUT') {
      throw error
    }
    return deepFreeze({
      canExecute: false,
      rejection: error.code === 'MAIN_SCENE_REQUIRED'
        ? 'main-scene-required'
        : error.code === 'FINAL_DAY_RESOLUTION_REQUIRED'
          ? 'final-day-resolution-required'
          : 'invalid-state',
    })
  }
}
