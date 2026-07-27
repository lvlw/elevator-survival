import { deepFreeze, type FrozenRuleConfig } from '../config'
import { LoadRuleError } from './load-errors'
import { classifyLoad } from './load-tier'
import type {
  AdjustedTravelTimeResult,
  CarryableLoadTier,
  CombatRules,
  IntegerRatio,
  LoadTier,
  TravelTimeInput,
} from './load-types'

const PERCENT_DENOMINATOR = 100
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new LoadRuleError(
      'INVALID_BASE_TIME',
      `${label}必须是正安全整数`,
    )
  }
}

function createPercentRatio(increasePercent: number): IntegerRatio {
  if (!Number.isSafeInteger(increasePercent) || increasePercent < 0) {
    throw new LoadRuleError(
      'INVALID_TIME_MODIFIER',
      '时间修正百分比必须是非负安全整数',
    )
  }

  const numerator = PERCENT_DENOMINATOR + increasePercent
  if (!Number.isSafeInteger(numerator)) {
    throw new LoadRuleError(
      'INVALID_TIME_MODIFIER',
      '时间修正比例超出安全整数范围',
    )
  }

  return deepFreeze({
    numerator,
    denominator: PERCENT_DENOMINATOR,
  })
}

function ceilCombinedRatios(
  baseTime: number,
  ratios: readonly IntegerRatio[],
): number {
  let numerator = BigInt(baseTime)
  let denominator = 1n

  for (const ratio of ratios) {
    if (
      !Number.isSafeInteger(ratio.numerator) ||
      ratio.numerator < 0 ||
      !Number.isSafeInteger(ratio.denominator) ||
      ratio.denominator <= 0
    ) {
      throw new LoadRuleError(
        'INVALID_TIME_MODIFIER',
        '时间修正必须使用合法的非负整数分子和正整数分母',
      )
    }

    numerator *= BigInt(ratio.numerator)
    denominator *= BigInt(ratio.denominator)
  }

  const result = (numerator + denominator - 1n) / denominator
  if (result > MAX_SAFE_INTEGER_BIGINT) {
    throw new LoadRuleError(
      'TRAVEL_TIME_OVERFLOW',
      '移动时间结果超出安全整数范围',
    )
  }

  return Number(result)
}

export function calculateAdjustedTravelTime(
  input: TravelTimeInput,
  config: FrozenRuleConfig,
): AdjustedTravelTimeResult {
  assertPositiveSafeInteger(input.baseTime, '基础移动或返程时间')

  const load = classifyLoad(input.totalWeight, config.backpack)
  if (!load.canCarry) {
    throw new LoadRuleError(
      'CANNOT_CARRY',
      '不可继续携带状态不能计算合法移动或返程时间',
    )
  }

  const contusionIncreasePercent =
    config.scene.travelTimeModifiers.minorContusionTimeIncreasePercent
  const loadModifier = createPercentRatio(load.timeIncreasePercent)
  const minorContusionModifierApplied =
    input.hasMinorContusion &&
    !(
      input.analgesiaActive &&
      config.medical.painkiller.suppressesMinorContusionMovementPenalty
    )
  const minorContusionTimeIncreasePercent = minorContusionModifierApplied
    ? contusionIncreasePercent
    : 0
  const minorContusionModifier = createPercentRatio(
    minorContusionTimeIncreasePercent,
  )

  return deepFreeze({
    baseTime: input.baseTime,
    totalWeight: input.totalWeight,
    loadTier: load.tier,
    loadTimeIncreasePercent: load.timeIncreasePercent,
    loadModifier,
    minorContusionModifierApplied,
    minorContusionTimeIncreasePercent,
    minorContusionModifier,
    finalTime: ceilCombinedRatios(input.baseTime, [
      loadModifier,
      minorContusionModifier,
    ]),
  })
}

export function getBaseEscapeCtbForLoad(
  loadTier: LoadTier,
  combatRules: CombatRules,
): number {
  if (loadTier === 'cannot-carry') {
    throw new LoadRuleError(
      'CANNOT_CARRY',
      '不可继续携带状态没有合法的逃跑基础CTB',
    )
  }

  const value = combatRules.escape.baseCtb[loadTier as CarryableLoadTier]
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new LoadRuleError(
      'INVALID_ESCAPE_CTB',
      '逃跑基础CTB必须是正安全整数',
    )
  }

  return value
}
