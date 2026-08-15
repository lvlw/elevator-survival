import { deepFreeze, type FrozenRuleConfig } from '../config'
import {
  createPlayerCondition,
  getUntreatedOpenWoundCount,
  hasMinorContusions,
  type PlayerConditionSnapshot,
} from '../condition'
import {
  createSatietySnapshot,
  getSatietyRecoveryBand,
  type SatietySnapshot,
} from '../satiety'
import {
  createWorldThreatSnapshot,
  getWorldThreatDailyRecoveryModifier,
  type WorldThreatCatalog,
  type WorldThreatSnapshot,
} from '../world-threat'
import type { DailyHealthRecoveryCalculation } from './daily-settlement-types'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

function checkedProduct(left: number, right: number): number {
  const result = BigInt(left) * BigInt(right)
  if (result > MAX_SAFE) throw new RangeError('每日恢复伤口惩罚超出安全整数范围')
  return Number(result)
}

export function calculateDailyHealthRecovery(
  conditionInput: PlayerConditionSnapshot,
  satietyInput: SatietySnapshot,
  worldThreatInput: WorldThreatSnapshot,
  config: FrozenRuleConfig,
  worldThreatCatalog: WorldThreatCatalog,
): DailyHealthRecoveryCalculation {
  const condition = createPlayerCondition(conditionInput, config.combat.player)
  const satiety = createSatietySnapshot(satietyInput, config)
  const worldThreat = createWorldThreatSnapshot(worldThreatInput, worldThreatCatalog)
  const baseRecovery = config.dailySettlement.baseHealthRecovery
  const satietyRecoveryCap = getSatietyRecoveryBand(satiety, config).maxHealthRecovery
  const recoveryAfterSatietyCap = Math.min(baseRecovery, satietyRecoveryCap)
  const minorContusionPenalty = hasMinorContusions(condition)
    ? config.dailySettlement.minorContusionRecoveryPenalty
    : 0
  const untreatedOpenWoundCount = getUntreatedOpenWoundCount(condition)
  const untreatedOpenWoundPenalty = checkedProduct(
    untreatedOpenWoundCount,
    config.dailySettlement.untreatedOpenWoundRecoveryPenalty,
  )
  const rawPenaltyBig = BigInt(minorContusionPenalty) + BigInt(untreatedOpenWoundPenalty)
  if (rawPenaltyBig > MAX_SAFE) throw new RangeError('每日恢复轻伤惩罚超出安全整数范围')
  const rawMinorInjuryPenalty = Number(rawPenaltyBig)
  const cappedMinorInjuryPenalty = Math.min(
    rawMinorInjuryPenalty,
    config.dailySettlement.minorInjuryRecoveryPenaltyCap,
  )
  const painkillerPenaltyReduction = condition.painkillerActive
    ? Math.min(
        cappedMinorInjuryPenalty,
        config.medical.painkiller.minorInjuryRecoveryPenaltyReduction,
      )
    : 0
  const effectiveMinorInjuryPenalty = cappedMinorInjuryPenalty - painkillerPenaltyReduction
  const recoveryAfterMinorInjuries = Math.max(
    0,
    recoveryAfterSatietyCap - effectiveMinorInjuryPenalty,
  )
  const threatModifier = getWorldThreatDailyRecoveryModifier(worldThreat, worldThreatCatalog)
  const recoveryAfterThreatModifier = threatModifier.kind === 'blocked'
    ? 0
    : Math.max(0, recoveryAfterMinorInjuries - threatModifier.amount)
  const blockedByBleeding = condition.bleeding
  const missingHealth = config.combat.player.maxHealth - condition.currentHealth
  const requestedRecovery = blockedByBleeding ? 0 : recoveryAfterThreatModifier
  const actualRecovery = Math.min(requestedRecovery, missingHealth)
  return deepFreeze({
    baseRecovery,
    satietyRecoveryCap,
    recoveryAfterSatietyCap,
    minorContusionPenalty,
    untreatedOpenWoundCount,
    untreatedOpenWoundPenalty,
    rawMinorInjuryPenalty,
    cappedMinorInjuryPenalty,
    painkillerPenaltyReduction,
    effectiveMinorInjuryPenalty,
    recoveryAfterMinorInjuries,
    threatModifier,
    recoveryAfterThreatModifier,
    blockedByBleeding,
    missingHealth,
    requestedRecovery,
    actualRecovery,
    healthBefore: condition.currentHealth,
    healthAfter: condition.currentHealth + actualRecovery,
  })
}
