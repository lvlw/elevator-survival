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
): boolean => state.openWounds.some(({ treatment }) => treatment === 'untreated')
export const getUntreatedOpenWounds = (state: PlayerConditionSnapshot) =>
  deepFreeze(state.openWounds.filter(({ treatment }) => treatment === 'untreated'))
export const getTreatedOpenWounds = (state: PlayerConditionSnapshot) =>
  deepFreeze(state.openWounds.filter(({ treatment }) => treatment === 'treated'))
export const getUntreatedOpenWoundCount = (
  state: PlayerConditionSnapshot,
): number => getUntreatedOpenWounds(state).length
export const getTreatedOpenWoundCount = (
  state: PlayerConditionSnapshot,
): number => getTreatedOpenWounds(state).length
export const getTotalOpenWoundCount = (
  state: PlayerConditionSnapshot,
): number => state.openWounds.length
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
  const untreatedCount = getUntreatedOpenWoundCount(state)
  const product = BigInt(untreatedCount) * BigInt(perWound)
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
    untreatedOpenWoundCount: untreatedCount,
    ctbPerWound: perWound,
    maximumWoundCtb: cap,
    rawWoundCtb,
    painkillerReductionApplied,
    finalWoundCtb: rawWoundCtb - painkillerReductionApplied,
  })
}
