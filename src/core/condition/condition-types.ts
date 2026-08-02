import type { FrozenRuleConfig } from '../config'

export interface PlayerConditionSnapshot {
  readonly currentHealth: number
  readonly bleeding: boolean
  readonly openWounds: readonly OpenWoundSnapshot[]
  readonly minorContusions: number
  readonly painkillerActive: boolean
  readonly pendingInfectionExposures: number
}

export type OpenWoundKind = 'laceration' | 'puncture' | 'bite'
export type OpenWoundTreatment = 'untreated' | 'treated'

export interface OpenWoundSnapshot {
  readonly id: string
  readonly kind: OpenWoundKind
  readonly treatment: OpenWoundTreatment
}

export interface InfectionExposureReductionResult {
  readonly state: PlayerConditionSnapshot
  readonly requestedReduction: number
  readonly actualReduction: number
  readonly unusedReduction: number
  readonly exposuresBefore: number
  readonly exposuresAfter: number
}

export type PlayerHealthRules = FrozenRuleConfig['combat']['player']

export interface EscapeWoundCtbRules {
  readonly escape: Pick<
    FrozenRuleConfig['combat']['escape'],
    'ctbPerUntreatedOpenWound' | 'woundCtbBonusCap'
  >
  readonly painkiller: Pick<
    FrozenRuleConfig['medical']['painkiller'],
    'escapeWoundCtbReduction'
  >
}

export interface HealthLossResult {
  readonly state: PlayerConditionSnapshot
  readonly requestedLoss: number
  readonly actualLoss: number
  readonly healthBefore: number
  readonly healthAfter: number
  readonly depleted: boolean
}

export interface HealthRestoreResult {
  readonly state: PlayerConditionSnapshot
  readonly requestedRecovery: number
  readonly actualRecovery: number
  readonly unusedRecovery: number
  readonly healthBefore: number
  readonly healthAfter: number
  readonly atMaximum: boolean
}

export interface EscapeWoundCtbModifier {
  readonly untreatedOpenWoundCount: number
  readonly ctbPerWound: number
  readonly maximumWoundCtb: number
  readonly rawWoundCtb: number
  readonly painkillerReductionApplied: number
  readonly finalWoundCtb: number
}
