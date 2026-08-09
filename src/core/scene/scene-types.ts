import type { FrozenRuleConfig } from '../config'

export interface SceneClockSnapshot {
  readonly remainingTime: number
}

export interface SceneVitalSnapshot {
  readonly currentHealth: number
  readonly maxHealth: number
  readonly bleeding: boolean
}

export interface TimedSceneActionInput {
  readonly timeCost: number
  readonly healthAfterPrimaryEffect: number
  readonly bleedingAfterPrimaryEffect: boolean
  readonly estimatedReturnTimeAfterAction: number
  readonly endsExplorationAtSafety: boolean
  readonly isAtSafetyAfterAction: boolean
}

export type ForcedReturnRules = FrozenRuleConfig['forcedReturn']

export interface TimedSceneActionRules {
  readonly postActionBleedingDamage: number
  readonly forcedReturn: ForcedReturnRules
}

export interface ForcedReturnDamage {
  readonly effectiveEmergencyReturnTime: number
  readonly baseDamage: number
  readonly bleedingExtraDamage: number
  readonly totalDamage: number
}

export type TimedSceneActionOutcomeKind =
  | 'continue'
  | 'safe-return'
  | 'forced-return'
  | 'death'

export interface TimedSceneActionOutcome {
  readonly kind: TimedSceneActionOutcomeKind
  readonly clock: SceneClockSnapshot
  readonly vitals: SceneVitalSnapshot
  readonly overtimeDebt: number
  readonly postActionBleedingDamage: number
  readonly effectiveEmergencyReturnTime: number
  readonly forcedReturnBaseDamage: number
  readonly forcedReturnBleedingDamage: number
  readonly forcedReturnTotalDamage: number
  readonly isDead: boolean
  readonly isSafelyReturned: boolean
}

export type TimedSceneActionRejectionCode =
  | 'PLAYER_DEAD'
  | 'SCENE_TIME_EXHAUSTED'

export type TimedSceneActionPreview =
  | {
      readonly canStart: true
      readonly outcome: TimedSceneActionOutcome
    }
  | {
      readonly canStart: false
      readonly rejectionCode: TimedSceneActionRejectionCode
    }
