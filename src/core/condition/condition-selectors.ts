import { deepFreeze } from '../config'
import { ConditionError } from './condition-errors'
import type {
  EscapeWoundCtbModifier,
  EscapeWoundCtbRules,
  PlayerConditionSnapshot,
} from './condition-types'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

export const isDead = (state: PlayerConditionSnapshot): boolean =>
  state.currentHealth === 0
export const hasUntreatedOpenWounds = (
  state: PlayerConditionSnapshot,
): boolean => state.untreatedOpenWounds > 0
export const getUntreatedOpenWoundCount = (
  state: PlayerConditionSnapshot,
): number => state.untreatedOpenWounds
export const getTreatedOpenWoundCount = (
  state: PlayerConditionSnapshot,
): number => state.treatedOpenWounds
export const getTotalOpenWoundCount = (
  state: PlayerConditionSnapshot,
): number => state.untreatedOpenWounds + state.treatedOpenWounds
export const hasMinorContusions = (
  state: PlayerConditionSnapshot,
): boolean => state.minorContusions > 0
export const isPainkillerSuppressingMinorContusion = (
  state: PlayerConditionSnapshot,
): boolean => state.minorContusions > 0 && state.painkillerActive
export const hasActiveMinorContusionTravelPenalty = (
  state: PlayerConditionSnapshot,
): boolean => state.minorContusions > 0 && !state.painkillerActive

export function calculateEscapeWoundCtbModifier(
  state: PlayerConditionSnapshot,
  rules: EscapeWoundCtbRules,
): Readonly<EscapeWoundCtbModifier> {
  const perWound = rules.escape.ctbPerUntreatedOpenWound
  const cap = rules.escape.woundCtbBonusCap
  const reduction = rules.painkiller.escapeWoundCtbReduction
  if (
    !Number.isSafeInteger(perWound) ||
    perWound < 0 ||
    !Number.isSafeInteger(cap) ||
    cap < 0 ||
    !Number.isSafeInteger(reduction) ||
    reduction < 0
  ) {
    throw new ConditionError(
      'INVALID_ESCAPE_WOUND_RULES',
      '逃跑伤口修正规则必须是非负安全整数',
    )
  }
  const product =
    BigInt(state.untreatedOpenWounds) * BigInt(perWound)
  if (product > MAX_SAFE) {
    throw new ConditionError(
      'ESCAPE_WOUND_CTB_OVERFLOW',
      '逃跑伤口加时乘法超出安全整数范围',
    )
  }
  const rawWoundCtb = Math.min(Number(product), cap)
  const painkillerReductionApplied = state.painkillerActive
    ? Math.min(rawWoundCtb, reduction)
    : 0
  return deepFreeze({
    untreatedOpenWounds: state.untreatedOpenWounds,
    ctbPerWound: perWound,
    maximumWoundCtb: cap,
    rawWoundCtb,
    painkillerReductionApplied,
    finalWoundCtb: rawWoundCtb - painkillerReductionApplied,
  })
}
