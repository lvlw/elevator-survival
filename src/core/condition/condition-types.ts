import type { FrozenRuleConfig } from '../config'

export interface PlayerConditionSnapshot {
  readonly currentHealth: number
  readonly bleeding: boolean
  readonly untreatedOpenWounds: number
  readonly treatedOpenWounds: number
  readonly minorContusions: number
  readonly painkillerActive: boolean
}

export type PlayerHealthRules = FrozenRuleConfig['combat']['player']

export interface EscapeWoundCtbRules {
  readonly escape: FrozenRuleConfig['combat']['escape']
  readonly painkiller: FrozenRuleConfig['medical']['painkiller']
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
  readonly untreatedOpenWounds: number
  readonly ctbPerWound: number
  readonly maximumWoundCtb: number
  readonly rawWoundCtb: number
  readonly painkillerReductionApplied: number
  readonly finalWoundCtb: number
}
