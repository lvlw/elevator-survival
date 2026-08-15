import type { CurrentDayHubDependencies, CurrentDayHubSnapshot } from '../current-day-hub'
import type { DailyRunStateSnapshot } from '../daily-state'
import type { RunPhaseContinuitySnapshot } from '../domain'
import type { PlayerConditionSnapshot } from '../condition'
import type { RunIntelLogSnapshot } from '../run-intel'
import type { RunLoadoutSnapshot } from '../run-loadout'
import type { RunReturnLedgerSnapshot } from '../run-return'
import type { SatietySnapshot } from '../satiety'
import type { DailyHealthRecoveryModifier, WorldThreatSnapshot } from '../world-threat'

export type DailySettlementDependencies = CurrentDayHubDependencies

export type EndDayCommand = Readonly<{ kind: 'end-day' }>

export type DailySettlementTerminalReason =
  | 'health-depleted'
  | 'world-threat-terminal'

export interface DailySettlementTerminalSnapshot {
  readonly kind: 'daily-settlement-terminal'
  readonly terminationReason: DailySettlementTerminalReason
  readonly continuity: RunPhaseContinuitySnapshot
  readonly runLoadout: RunLoadoutSnapshot
  readonly playerCondition: PlayerConditionSnapshot
  readonly runIntelLog: RunIntelLogSnapshot
  readonly dailyState: DailyRunStateSnapshot
  readonly worldThreat: WorldThreatSnapshot
  readonly satiety: SatietySnapshot
  readonly returnLedger: RunReturnLedgerSnapshot
}

export type DailySettlementOutcome =
  | Readonly<{
      kind: 'next-day-current-day-hub'
      snapshot: CurrentDayHubSnapshot
    }>
  | Readonly<{
      kind: 'terminal'
      reason: DailySettlementTerminalReason
      snapshot: DailySettlementTerminalSnapshot
    }>

export interface DailyHealthRecoveryCalculation {
  readonly baseRecovery: number
  readonly satietyRecoveryCap: number
  readonly recoveryAfterSatietyCap: number
  readonly minorContusionPenalty: number
  readonly untreatedOpenWoundCount: number
  readonly untreatedOpenWoundPenalty: number
  readonly rawMinorInjuryPenalty: number
  readonly cappedMinorInjuryPenalty: number
  readonly painkillerPenaltyReduction: number
  readonly effectiveMinorInjuryPenalty: number
  readonly recoveryAfterMinorInjuries: number
  readonly threatModifier: DailyHealthRecoveryModifier
  readonly recoveryAfterThreatModifier: number
  readonly blockedByBleeding: boolean
  readonly missingHealth: number
  readonly requestedRecovery: number
  readonly actualRecovery: number
  readonly healthBefore: number
  readonly healthAfter: number
}

export type DailySettlementEffect =
  | Readonly<{
      kind: 'daily-continuous-danger-resolved'
      bleeding: boolean
      requestedHealthLoss: number
      actualHealthLoss: number
      healthBefore: number
      healthAfter: number
      recoveryBlocked: boolean
    }>
  | Readonly<{
      kind: 'daily-world-threat-progressed'
      definitionId: string
      preStageId: string
      dailyBaseIncrease: number
      pendingExposureCount: number
      progressPerPendingExposure: number
      exposureContribution: number
      suppressionAmount: number
      rawIncrease: number
      appliedIncrease: number
      progressBefore: number
      progressAfter: number
      postStageId: string
      terminal: boolean
    }>
  | Readonly<{
      kind: 'daily-pending-exposures-settled'
      before: number
      after: 0
    }>
  | Readonly<{
      kind: 'daily-satiety-consumed'
      before: number
      requested: number
      consumed: number
      after: number
    }>
  | Readonly<{
      kind: 'daily-deprivation-consequence-resolved'
      deprived: boolean
      requestedHealthLoss: number
      actualHealthLoss: number
      healthBefore: number
      healthAfter: number
      recoveryCap: number
    }>
  | Readonly<{
      kind: 'daily-health-recovery-resolved'
      calculation: DailyHealthRecoveryCalculation
    }>
  | Readonly<{
      kind: 'daily-minor-injury-lifecycle-resolved'
      minorContusionsBefore: number
      minorContusionsAfter: 0
      removedTreatedOpenWoundIds: readonly string[]
      retainedUntreatedOpenWoundIds: readonly string[]
      painkillerActiveBefore: boolean
      painkillerActiveAfter: false
      bleedingBefore: boolean
      bleedingAfter: boolean
    }>
  | Readonly<{
      kind: 'daily-run-state-reset'
      before: DailyRunStateSnapshot
      after: DailyRunStateSnapshot
    }>
  | Readonly<{
      kind: 'daily-run-day-advanced'
      before: RunPhaseContinuitySnapshot
      after: RunPhaseContinuitySnapshot
    }>
  | Readonly<{
      kind: 'daily-settlement-next-day-committed'
      snapshot: CurrentDayHubSnapshot
    }>
  | Readonly<{
      kind: 'daily-settlement-terminal-committed'
      reason: DailySettlementTerminalReason
      snapshot: DailySettlementTerminalSnapshot
    }>

export interface DailySettlementSummary {
  readonly currentDay: number
  readonly nextDay: number | null
  readonly terminalReason: DailySettlementTerminalReason | null
  readonly continuousDanger: Extract<DailySettlementEffect, { kind: 'daily-continuous-danger-resolved' }>
  readonly worldThreat: Extract<DailySettlementEffect, { kind: 'daily-world-threat-progressed' }> | null
  readonly exposureSettlement: Extract<DailySettlementEffect, { kind: 'daily-pending-exposures-settled' }> | null
  readonly satiety: Extract<DailySettlementEffect, { kind: 'daily-satiety-consumed' }> | null
  readonly deprivation: Extract<DailySettlementEffect, { kind: 'daily-deprivation-consequence-resolved' }> | null
  readonly recovery: DailyHealthRecoveryCalculation | null
  readonly cleanup: Extract<DailySettlementEffect, { kind: 'daily-minor-injury-lifecycle-resolved' }> | null
  readonly dailyReset: Extract<DailySettlementEffect, { kind: 'daily-run-state-reset' }> | null
}

export interface DailySettlementTransitionPlan {
  readonly command: EndDayCommand
  readonly effects: readonly DailySettlementEffect[]
  readonly summary: DailySettlementSummary
  readonly outcome: DailySettlementOutcome
}

export interface DailySettlementResult {
  readonly effects: readonly DailySettlementEffect[]
  readonly summary: DailySettlementSummary
  readonly outcome: DailySettlementOutcome
}

