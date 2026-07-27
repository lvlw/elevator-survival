import { deepFreeze } from '../config'
import { LoadRuleError } from './load-errors'
import type {
  BackpackRules,
  CarryableLoadClassification,
  LoadClassification,
} from './load-types'

function assertNonNegativeSafeInteger(
  value: number,
  code: 'INVALID_TOTAL_WEIGHT' | 'INVALID_TIME_MODIFIER',
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LoadRuleError(code, `${label}必须是非负安全整数`)
  }
}

export function assertValidBackpackRules(rules: BackpackRules): void {
  const { normal, loaded, overloaded, cannotCarryFrom } = rules.weightBands
  const bands = [normal, loaded, overloaded]

  for (const band of bands) {
    assertNonNegativeSafeInteger(
      band.min,
      'INVALID_TIME_MODIFIER',
      '负载区间下界',
    )
    assertNonNegativeSafeInteger(
      band.max,
      'INVALID_TIME_MODIFIER',
      '负载区间上界',
    )
    assertNonNegativeSafeInteger(
      band.timeIncreasePercent,
      'INVALID_TIME_MODIFIER',
      '负载时间修正',
    )
  }

  if (
    !Number.isSafeInteger(cannotCarryFrom) ||
    cannotCarryFrom <= 0 ||
    normal.min !== 0 ||
    normal.min > normal.max ||
    normal.max + 1 !== loaded.min ||
    loaded.min > loaded.max ||
    loaded.max + 1 !== overloaded.min ||
    overloaded.min > overloaded.max ||
    overloaded.max + 1 !== cannotCarryFrom
  ) {
    throw new LoadRuleError(
      'INVALID_WEIGHT_BANDS',
      '负载区间必须从0开始、连续且按正常、负载、超载、不可携带排列',
    )
  }
}

export function classifyLoad(
  totalWeight: number,
  rules: BackpackRules,
): LoadClassification {
  assertNonNegativeSafeInteger(totalWeight, 'INVALID_TOTAL_WEIGHT', '总重量')
  assertValidBackpackRules(rules)

  const { normal, loaded, overloaded, cannotCarryFrom } = rules.weightBands

  if (totalWeight >= cannotCarryFrom) {
    return deepFreeze({
      totalWeight,
      tier: 'cannot-carry',
      canCarry: false,
      timeIncreasePercent: null,
      hasBaseEscapeCtb: false,
    })
  }

  let classification: CarryableLoadClassification

  if (totalWeight <= normal.max) {
    classification = {
      totalWeight,
      tier: 'normal',
      canCarry: true,
      timeIncreasePercent: normal.timeIncreasePercent,
      hasBaseEscapeCtb: true,
    }
  } else if (totalWeight <= loaded.max) {
    classification = {
      totalWeight,
      tier: 'loaded',
      canCarry: true,
      timeIncreasePercent: loaded.timeIncreasePercent,
      hasBaseEscapeCtb: true,
    }
  } else {
    classification = {
      totalWeight,
      tier: 'overloaded',
      canCarry: true,
      timeIncreasePercent: overloaded.timeIncreasePercent,
      hasBaseEscapeCtb: true,
    }
  }

  return deepFreeze(classification)
}
