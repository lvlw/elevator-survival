import { deepFreeze } from '../config'
import {
  calculateEscapeWoundCtbModifier,
  getPlayerVisibleOpenWoundLabels,
  restoreHealth,
} from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { previewCommittedResourceAction } from '../item-state'
import { classifyLoad } from '../load'
import { CombatError } from './combat-errors'
import { getCombatResourceState } from './combat-selectors'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionPrimaryPlan,
  CombatPlayerActionCommand,
} from './combat-types'

/** Formal deterministic facts for one legal player action. */
export function createCombatPlayerActionPrimaryPlan(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatPlayerActionPrimaryPlan {
  if (command.kind === 'escape') {
    const backpackWeight = calculateBackpackWeightSubtotal(
      snapshot.backpack,
      dependencies.physicalCatalog,
    )
    const load = classifyLoad(backpackWeight, dependencies.config.backpack)
    if (!load.canCarry) {
      throw new CombatError(
        'CANNOT_ESCAPE_WHILE_UNCARRYABLE',
        '无法携带状态不能开始逃跑',
      )
    }
    const wound = calculateEscapeWoundCtbModifier(snapshot.playerCondition, {
      escape: dependencies.config.combat.escape,
      painkiller: dependencies.config.medical.painkiller,
    })
    const baseCtb = dependencies.config.combat.escape.baseCtb[load.tier]
    const actionCtb = baseCtb + wound.finalWoundCtb
    return deepFreeze({
      kind: 'escape',
      actionCtb,
      loadTier: load.tier,
      backpackWeight,
      baseCtb,
      untreatedOpenWoundCount: wound.untreatedOpenWoundCount,
      rawWoundCtb: wound.rawWoundCtb,
      painkillerReductionApplied: wound.painkillerReductionApplied,
      finalWoundCtb: wound.finalWoundCtb,
      completesAtCtb: snapshot.currentCtb + actionCtb,
    })
  }

  if (command.kind === 'use-quick-slot-item') {
    const item = snapshot.quickSlots.slots[command.quickSlotIndex]!
    const isBandage = item.definitionId === dependencies.bindings.bandageDefinitionId
    const recovery = isBandage
      ? restoreHealth(
          snapshot.playerCondition,
          dependencies.config.medical.bandage.healthRecovery,
          dependencies.config.combat.player,
        )
      : null
    const targetWound = command.targetOpenWoundId === undefined
      ? null
      : (() => {
          const index = snapshot.playerCondition.openWounds.findIndex(
            ({ id }) => id === command.targetOpenWoundId,
          )
          const label = getPlayerVisibleOpenWoundLabels(
            snapshot.playerCondition.openWounds,
          )[index]!
          return { kind: label.kind, ordinal: label.ordinal }
        })()
    return deepFreeze({
      kind: 'quick-slot-item',
      actionCtb: isBandage
        ? dependencies.config.medical.bandage.combatCtb
        : dependencies.config.medical.painkiller.combatCtb,
      quickSlotIndex: command.quickSlotIndex,
      itemKind: isBandage ? 'bandage' : 'painkiller',
      healthBeforeRecovery: snapshot.playerCondition.currentHealth,
      requestedHealthRecovery: recovery?.requestedRecovery ?? 0,
      actualHealthRecovery: recovery?.actualRecovery ?? 0,
      healthAfterRecovery: recovery?.healthAfter ?? snapshot.playerCondition.currentHealth,
      unusedHealthRecovery: recovery?.unusedRecovery ?? 0,
      stopsBleeding: isBandage && dependencies.config.medical.bandage.stopsBleeding,
      treatsOpenWound: isBandage && command.targetOpenWoundId !== undefined,
      targetWound,
      activatesPainkiller: !isBandage,
    })
  }

  if (command.kind === 'defend') {
    const actionCtb = dependencies.config.combat.defend.ctb
    return deepFreeze({
      kind: 'defend',
      actionCtb,
      availableDirectAttackUses: 1,
      expiresAtPlayerActionCtb: snapshot.currentCtb + actionCtb,
      doesNotPreventInfectionExposure: true,
    })
  }

  const rules = command.kind === 'metal-pipe-basic-attack'
    ? dependencies.config.combat.metalPipe.basicAttack
    : command.kind === 'metal-pipe-charged-strike'
      ? dependencies.config.combat.metalPipe.chargedStrike
      : dependencies.config.combat.temporaryAttack
  const weaponState = getCombatResourceState(snapshot, 'weapon')
  const resource = command.kind === 'temporary-attack' || !weaponState
    ? null
    : previewCommittedResourceAction(weaponState, rules.durabilityCost)
  if (resource && !resource.allowed) {
    throw new CombatError('ACTION_NOT_AVAILABLE', '武器资源不足')
  }
  return deepFreeze({
    kind: 'attack',
    actionCtb: rules.ctb,
    requestedDamage: rules.damage,
    weaponDurabilityBefore: resource?.currentBefore ?? null,
    weaponDurabilityAfter: resource?.currentAfter ?? null,
    weaponDurabilityRequestedCost: resource?.requestedCost ?? 0,
    weaponDurabilityConsumed: resource?.consumed ?? 0,
    weaponDurabilityDepleted: resource?.depleted ?? false,
    enemyActionDelay: command.kind === 'metal-pipe-charged-strike'
      ? dependencies.config.combat.metalPipe.chargedStrike.enemyActionDelay
      : 0,
  })
}
