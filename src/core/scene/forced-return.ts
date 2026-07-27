import { deepFreeze } from '../config'
import { SceneResolutionError } from './scene-errors'
import { addSafeTime, assertNonNegativeSafeInteger } from './scene-time'
import type { ForcedReturnDamage, ForcedReturnRules } from './scene-types'

export function assertValidForcedReturnRules(
  rules: ForcedReturnRules,
): void {
  if (
    !Number.isSafeInteger(rules.effectiveTimePerBaseDamage) ||
    rules.effectiveTimePerBaseDamage <= 0 ||
    !Number.isSafeInteger(rules.baseDamageCap) ||
    rules.baseDamageCap <= 0 ||
    !Number.isSafeInteger(rules.bleedingExtraDamage) ||
    rules.bleedingExtraDamage <= 0 ||
    rules.bleedingExtraDamageCountsTowardBaseCap !== false
  ) {
    throw new SceneResolutionError(
      'INVALID_FORCED_RETURN_CONFIG',
      '强制返程配置必须使用合法整数，且流血追加不得计入基础上限',
    )
  }
}

export function calculateForcedReturnDamage(
  overtimeDebt: number,
  estimatedReturnTimeAfterAction: number,
  bleeding: boolean,
  rules: ForcedReturnRules,
): ForcedReturnDamage {
  assertNonNegativeSafeInteger(
    overtimeDebt,
    'INVALID_RETURN_TIME',
    '超时债务',
  )
  assertNonNegativeSafeInteger(
    estimatedReturnTimeAfterAction,
    'INVALID_RETURN_TIME',
    '预计返程时间',
  )
  assertValidForcedReturnRules(rules)

  const effectiveEmergencyReturnTime = addSafeTime(
    overtimeDebt,
    estimatedReturnTimeAfterAction,
  )
  const baseDamage =
    effectiveEmergencyReturnTime === 0
      ? 0
      : Math.min(
          rules.baseDamageCap,
          Math.ceil(
            effectiveEmergencyReturnTime /
              rules.effectiveTimePerBaseDamage,
          ),
        )
  const bleedingExtraDamage =
    bleeding && effectiveEmergencyReturnTime > 0
      ? rules.bleedingExtraDamage
      : 0

  return deepFreeze({
    effectiveEmergencyReturnTime,
    baseDamage,
    bleedingExtraDamage,
    totalDamage: addSafeTime(baseDamage, bleedingExtraDamage),
  })
}
