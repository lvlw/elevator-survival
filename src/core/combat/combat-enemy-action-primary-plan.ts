import { deepFreeze } from '../config'
import { getItemState, previewCommittedResourceAction } from '../item-state'
import { reduceRiskTier } from './combat-risk'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatRiskTier,
  EnemyActionDefinition,
  TemporaryDefenseSnapshot,
} from './combat-types'

export interface CombatEnemyActionPrimaryPlan {
  readonly action: EnemyActionDefinition
  readonly actionCtb: number
  readonly requestedDirectDamage: number
  readonly usedHeavyCoat: boolean
  readonly usedDefense: boolean
  readonly armorRequestedCost: number
  readonly armorConsumed: number
  readonly armorAfter: number | null
  readonly injuryOriginalTier: CombatRiskTier
  readonly injuryFinalTier: CombatRiskTier
  readonly exposureOriginalTier: CombatRiskTier
  readonly exposureFinalTier: CombatRiskTier
}

/** Formal deterministic consequences of one enemy action, before risk draws. */
export function createCombatEnemyActionPrimaryPlan(
  snapshot: CombatEncounterSnapshot,
  action: EnemyActionDefinition,
  armorResourceCurrent: number | null,
  defense: TemporaryDefenseSnapshot | null,
  dependencies: CombatDependencies,
): CombatEnemyActionPrimaryPlan {
  const rules = action.kind === 'scratch'
    ? dependencies.config.combat.infectedOrderly.actions.scratch
    : dependencies.config.combat.infectedOrderly.actions.lungeBite
  const armor = snapshot.equipment.armor
  const armorState = armor ? getItemState(snapshot.itemStates, armor.instanceId) : null
  const usedHeavyCoat =
    armor?.definitionId === dependencies.bindings.heavyCoatDefinitionId &&
    armorState?.resource.kind === 'integrity' &&
    (armorResourceCurrent ?? 0) >= 1
  const armorPayment = usedHeavyCoat && armorState?.resource.kind === 'integrity'
    ? previewCommittedResourceAction({
        ...armorState,
        resource: { kind: 'integrity', current: armorResourceCurrent! },
      }, dependencies.config.combat.heavyCoat.integrityCostPerAttack)
    : null
  const usedDefense = defense !== null
  let damage = Math.max(
    0,
    rules.damage - (usedHeavyCoat
      ? dependencies.config.combat.heavyCoat.directDamageReduction
      : 0),
  )
  if (usedDefense) {
    damage = Math.ceil(
      damage * dependencies.config.combat.defend.remainingDamagePercent / 100,
    )
  }
  return deepFreeze({
    action,
    actionCtb: rules.ctb,
    requestedDirectDamage: damage,
    usedHeavyCoat,
    usedDefense,
    armorRequestedCost: armorPayment?.requestedCost ?? 0,
    armorConsumed: armorPayment?.allowed ? armorPayment.consumed : 0,
    armorAfter: armorPayment?.allowed ? armorPayment.currentAfter : armorResourceCurrent,
    injuryOriginalTier: rules.injuryRiskTier,
    injuryFinalTier: reduceRiskTier(
      rules.injuryRiskTier,
      (usedHeavyCoat
        ? dependencies.config.combat.heavyCoat.injuryRiskTierReduction
        : 0) +
      (usedDefense
        ? dependencies.config.combat.defend.injuryRiskTierReduction
        : 0),
    ),
    exposureOriginalTier: rules.exposureRiskTier,
    exposureFinalTier: reduceRiskTier(
      rules.exposureRiskTier,
      usedHeavyCoat
        ? dependencies.config.combat.heavyCoat.exposureRiskTierReduction
        : 0,
    ),
  })
}
