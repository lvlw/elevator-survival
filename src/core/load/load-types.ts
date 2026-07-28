import type { FrozenRuleConfig } from '../config'

export type LoadTier = 'normal' | 'loaded' | 'overloaded' | 'cannot-carry'
export type CarryableLoadTier = Exclude<LoadTier, 'cannot-carry'>

interface LoadClassificationBase {
  readonly totalWeight: number
  readonly tier: LoadTier
  readonly canCarry: boolean
}

export interface CarryableLoadClassification extends LoadClassificationBase {
  readonly tier: CarryableLoadTier
  readonly canCarry: true
  readonly timeIncreasePercent: number
  readonly hasBaseEscapeCtb: true
}

export interface CannotCarryLoadClassification extends LoadClassificationBase {
  readonly tier: 'cannot-carry'
  readonly canCarry: false
  readonly timeIncreasePercent: null
  readonly hasBaseEscapeCtb: false
}

export type LoadClassification =
  | CarryableLoadClassification
  | CannotCarryLoadClassification

export interface TravelTimeInput {
  readonly baseTime: number
  readonly totalWeight: number
  readonly hasMinorContusion: boolean
  readonly analgesiaActive: boolean
}

export interface IntegerRatio {
  readonly numerator: number
  readonly denominator: number
}

export interface AdjustedTravelTimeResult {
  readonly baseTime: number
  readonly totalWeight: number
  readonly loadTier: CarryableLoadTier
  readonly loadTimeIncreasePercent: number
  readonly loadModifier: IntegerRatio
  readonly minorContusionModifierApplied: boolean
  readonly minorContusionTimeIncreasePercent: number
  readonly minorContusionModifier: IntegerRatio
  readonly finalTime: number
}

export type BackpackRules = Pick<FrozenRuleConfig['backpack'], 'weightBands'>
export type CombatRules = FrozenRuleConfig['combat']
