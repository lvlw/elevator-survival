import { combatRules } from './combat-legacy-profile'
import { isProfiledCombat, type CombatEngineDependencies } from './combat-profile'
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
export function createCombatEnginePlayerPrimaryPlan(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatEngineDependencies,
): CombatPlayerActionPrimaryPlan {
  const shared = combatRules(dependencies)
  if (command.kind === 'escape') {
    const backpackWeight = calculateBackpackWeightSubtotal(
      snapshot.backpack,
      dependencies.physicalCatalog,
    )
    const load = classifyLoad(backpackWeight, shared.backpack)
    if (!load.canCarry) {
      throw new CombatError(
        'CANNOT_ESCAPE_WHILE_UNCARRYABLE',
        '无法携带状态不能开始逃跑',
      )
    }
    const wound = calculateEscapeWoundCtbModifier(snapshot.playerCondition, {
      escape: shared.escape,
      painkiller: shared.painkiller,
    })
    const baseCtb = shared.escape.baseCtb[load.tier]
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
          shared.bandage.healthRecovery,
          shared.player,
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
        ? shared.bandage.combatCtb
        : shared.painkiller.combatCtb,
      quickSlotIndex: command.quickSlotIndex,
      itemKind: isBandage ? 'bandage' : 'painkiller',
      healthBeforeRecovery: snapshot.playerCondition.currentHealth,
      requestedHealthRecovery: recovery?.requestedRecovery ?? 0,
      actualHealthRecovery: recovery?.actualRecovery ?? 0,
      healthAfterRecovery: recovery?.healthAfter ?? snapshot.playerCondition.currentHealth,
      unusedHealthRecovery: recovery?.unusedRecovery ?? 0,
      stopsBleeding: isBandage && shared.bandage.stopsBleeding,
      treatsOpenWound: isBandage && command.targetOpenWoundId !== undefined,
      targetWound,
      activatesPainkiller: !isBandage,
    })
  }

  if (command.kind === 'defend') {
    const actionCtb = shared.defend.ctb
    return deepFreeze({
      kind: 'defend',
      actionCtb,
      availableDirectAttackUses: 1,
      expiresAtPlayerActionCtb: snapshot.currentCtb + actionCtb,
      doesNotPreventInfectionExposure: true,
    })
  }

  const rules = command.kind === 'metal-pipe-basic-attack'
    ? shared.metalPipe.basicAttack
    : command.kind === 'metal-pipe-charged-strike'
      ? shared.metalPipe.chargedStrike
      : shared.temporaryAttack
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
      ? shared.metalPipe.chargedStrike.enemyActionDelay + (isProfiledCombat(dependencies) &&
        dependencies.enemyCatalog.get(snapshot.enemy.definitionId).weaknessTags.includes('blunt')
        ? dependencies.profile.bluntActionDelayBonus : 0)
      : 0,
  })
}

export function createCombatPlayerActionPrimaryPlan(snapshot: CombatEncounterSnapshot, command: CombatPlayerActionCommand,
  dependencies: CombatDependencies): CombatPlayerActionPrimaryPlan {
  return createCombatEnginePlayerPrimaryPlan(snapshot, command, dependencies)
}
