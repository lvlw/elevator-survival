import { deepFreeze } from '../config'
import {
  activatePainkiller,
  stopBleeding,
  treatOpenWound,
} from '../condition'
import { consumeCommittedResource, getItemState } from '../item-state'
import { CombatError } from './combat-errors'
import {
  enemyActsBeforePlayerCompletion,
  evaluateCombatPostPlayerActionBleeding,
} from './combat-action-checkpoints'
import { createCombatEnemyActionPrimaryPlan } from './combat-enemy-action-primary-plan'
import { createCombatPlayerActionPrimaryPlan } from './combat-player-action-primary-plan'
import { validateCombatDependencies } from './combat-dependencies'
import {
  getAvailableCombatPlayerCommandsFromValidatedSnapshot,
  getCombatResourceState,
} from './combat-selectors'
import { addCombatRiskEffect, createStableCombatWoundId } from './combat-risk'
import {
  createCombatPlayerActionCommand,
  createTemporaryDefenseSnapshot,
} from './combat-validation'
import type {
  CombatDependencies,
  CombatEffect,
  CombatEncounterSnapshot,
  CombatTransitionPlan,
  TemporaryDefenseSnapshot,
} from './combat-types'

export function buildCombatTransitionPlan(
  snapshot: CombatEncounterSnapshot,
  commandInput: unknown,
  dependencies: CombatDependencies,
): CombatTransitionPlan {
  validateCombatDependencies(dependencies)
  const command = createCombatPlayerActionCommand(commandInput)
  if (snapshot.status !== 'awaiting-player') {
    throw new CombatError('COMBAT_NOT_ACTIVE', '战斗不在玩家决策点')
  }
  const escapePrimary = command.kind === 'escape'
    ? createCombatPlayerActionPrimaryPlan(snapshot, command, dependencies)
    : null
  const isAvailable = getAvailableCombatPlayerCommandsFromValidatedSnapshot(
    snapshot,
    dependencies,
  ).some((available) => {
    if (available.kind !== command.kind) return false
    if (
      available.kind === 'use-quick-slot-item' &&
      command.kind === 'use-quick-slot-item'
    ) {
      return available.quickSlotIndex === command.quickSlotIndex &&
        available.targetOpenWoundId === command.targetOpenWoundId
    }
    return true
  })
  if (!isAvailable) {
    throw new CombatError('ACTION_NOT_AVAILABLE', '玩家战斗行动不可用')
  }
  const primary = escapePrimary ?? createCombatPlayerActionPrimaryPlan(
    snapshot, command, dependencies,
  )

  const effects: CombatEffect[] = []
  let currentCtb = snapshot.currentCtb
  let playerCondition = snapshot.playerCondition
  let playerHealth = snapshot.playerCondition.currentHealth
  let enemyHealth = snapshot.enemy.currentHealth
  let playerNext = snapshot.playerNextActionCtb
  let enemyNext = snapshot.enemyNextActionCtb
  let defense: TemporaryDefenseSnapshot | null = snapshot.temporaryDefense
  let intentId = snapshot.enemy.currentIntentActionId
  let nextCycleIndex = snapshot.enemy.nextCycleIndex
  let resolvedActionCount = snapshot.enemy.resolvedActionCount
  let usage = snapshot.usage.metalPipeChargedStrikeUses
  let bleeding = snapshot.playerCondition.bleeding
  let pendingExposures = snapshot.playerCondition.pendingInfectionExposures
  let weaponResourceCurrent =
    getCombatResourceState(snapshot, 'weapon')?.resource.kind === 'durability'
      ? (getCombatResourceState(snapshot, 'weapon')!.resource as {
          readonly current: number
        }).current
      : null
  let armorResourceCurrent =
    getCombatResourceState(snapshot, 'armor')?.resource.kind === 'integrity'
      ? (getCombatResourceState(snapshot, 'armor')!.resource as {
          readonly current: number
        }).current
      : null

  const consume = (
    slot: 'weapon' | 'armor',
    requestedCost: number,
    source: string,
  ) => {
    const item = snapshot.equipment[slot]!
    const original = getItemState(snapshot.itemStates, item.instanceId)
    const simulatedCurrent = slot === 'weapon'
      ? weaponResourceCurrent
      : armorResourceCurrent
    const state = simulatedCurrent === null || original.resource.kind === 'none'
      ? original
      : {
          ...original,
          resource: {
            kind: original.resource.kind,
            current: simulatedCurrent,
          },
        }
    const result = consumeCommittedResource(state, requestedCost)
    effects.push({
      kind: 'item-resource-consumed',
      source,
      slot,
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      resourceKind: state.resource.kind,
      currentBefore: result.currentBefore,
      requestedCost,
      consumed: result.consumed,
      currentAfter: result.currentAfter,
      depleted: result.depleted,
    })
    if (slot === 'weapon') weaponResourceCurrent = result.currentAfter
    else armorResourceCurrent = result.currentAfter
  }

  let actionCtb: number
  let isEscape = false
  let escapeStartedAtCtb = 0
  let escapeCompletesAtCtb = 0
  if (command.kind === 'escape') {
    if (primary.kind !== 'escape') {
      throw new CombatError('INVALID_COMBAT_COMMAND', '逃跑行动元数据无效')
    }
    actionCtb = primary.actionCtb
    escapeStartedAtCtb = currentCtb
    escapeCompletesAtCtb = primary.completesAtCtb
    isEscape = true
    effects.push({
      kind: 'combat-escape-preparation-locked',
      startedAtCtb: escapeStartedAtCtb,
      loadTier: primary.loadTier,
      backpackWeight: primary.backpackWeight,
      baseCtb: primary.baseCtb,
      untreatedOpenWoundCount: primary.untreatedOpenWoundCount,
      rawWoundCtb: primary.rawWoundCtb,
      painkillerReductionApplied: primary.painkillerReductionApplied,
      finalWoundCtb: primary.finalWoundCtb,
      preparationCtb: actionCtb,
      completesAtCtb: escapeCompletesAtCtb,
    })
  } else if (command.kind === 'use-quick-slot-item') {
    if (primary.kind !== 'quick-slot-item') {
      throw new CombatError('INVALID_COMBAT_COMMAND', '快捷物品行动元数据无效')
    }
    const item = snapshot.quickSlots.slots[command.quickSlotIndex]!
    const isBandage = primary.itemKind === 'bandage'
    const source = isBandage ? 'combat-bandage' : 'combat-painkiller'
    effects.push({
      kind: 'combat-quick-slot-item-consumed',
      source,
      quickSlotIndex: command.quickSlotIndex,
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      quantityBefore: 1,
      quantityConsumed: 1,
      quantityAfter: 0,
    })
    if (isBandage) {
      effects.push({
        kind: 'player-health-restored',
        source: 'combat-bandage',
        healthBefore: primary.healthBeforeRecovery,
        requestedRecovery: primary.requestedHealthRecovery,
        actualRecovery: primary.actualHealthRecovery,
        healthAfter: primary.healthAfterRecovery,
        unusedRecovery: primary.unusedHealthRecovery,
      })
      playerCondition = {
        ...playerCondition,
        currentHealth: primary.healthAfterRecovery,
      }
      playerHealth = primary.healthAfterRecovery
      if (bleeding && primary.stopsBleeding) {
        effects.push({
          kind: 'bleeding-changed',
          before: true,
          after: false,
          source: 'combat-bandage',
        })
        playerCondition = stopBleeding(playerCondition)
        bleeding = false
      }
      if (primary.treatsOpenWound && command.targetOpenWoundId) {
        const wound = playerCondition.openWounds.find(
          ({ id }) => id === command.targetOpenWoundId,
        )!
        effects.push({
          kind: 'open-wound-treated',
          source: 'combat-bandage',
          woundId: wound.id,
          woundKind: wound.kind,
          treatmentBefore: 'untreated',
          treatmentAfter: 'treated',
        })
        playerCondition = treatOpenWound(playerCondition, wound.id)
      }
      actionCtb = primary.actionCtb
    } else {
      effects.push({
        kind: 'painkiller-changed',
        source: 'combat-painkiller',
        before: false,
        after: true,
      })
      playerCondition = activatePainkiller(playerCondition)
      actionCtb = primary.actionCtb
    }
  } else if (
    command.kind === 'metal-pipe-basic-attack' ||
    command.kind === 'metal-pipe-charged-strike'
  ) {
    if (primary.kind !== 'attack') {
      throw new CombatError('INVALID_COMBAT_COMMAND', '武器行动元数据无效')
    }
    consume('weapon', primary.weaponDurabilityRequestedCost, command.kind)
    const actual = Math.min(enemyHealth, primary.requestedDamage)
    effects.push({
      kind: 'enemy-health-lost',
      source: command.kind,
      healthBefore: enemyHealth,
      requestedLoss: primary.requestedDamage,
      actualLoss: actual,
      healthAfter: enemyHealth - actual,
    })
    enemyHealth -= actual
    actionCtb = primary.actionCtb
    if (command.kind === 'metal-pipe-charged-strike') {
      effects.push({
        kind: 'enemy-action-delayed',
        enemyNextActionCtbBefore: enemyNext,
        delay: primary.enemyActionDelay,
        enemyNextActionCtbAfter: enemyNext + primary.enemyActionDelay,
      })
      enemyNext += primary.enemyActionDelay
      effects.push({
        kind: 'combat-usage-changed',
        usage: 'metal-pipe-charged-strike',
        before: usage,
        after: usage + 1,
      })
      usage += 1
    }
  } else if (command.kind === 'temporary-attack') {
    if (primary.kind !== 'attack') {
      throw new CombatError('INVALID_COMBAT_COMMAND', '临时攻击元数据无效')
    }
    const actual = Math.min(enemyHealth, primary.requestedDamage)
    effects.push({
      kind: 'enemy-health-lost',
      source: command.kind,
      healthBefore: enemyHealth,
      requestedLoss: primary.requestedDamage,
      actualLoss: actual,
      healthAfter: enemyHealth - actual,
    })
    enemyHealth -= actual
    actionCtb = primary.actionCtb
  } else {
    if (primary.kind !== 'defend') {
      throw new CombatError('INVALID_COMBAT_COMMAND', '防御行动元数据无效')
    }
    actionCtb = primary.actionCtb
    defense = createTemporaryDefenseSnapshot({
      activatedAtCtb: currentCtb,
      expiresAtPlayerActionCtb: primary.expiresAtPlayerActionCtb,
      availableDirectAttackUses: primary.availableDirectAttackUses,
    })
    effects.push({
      kind: 'temporary-defense-activated',
      before: snapshot.temporaryDefense,
      after: defense,
    })
  }

  if (!isEscape && bleeding) {
    const checkpoint = evaluateCombatPostPlayerActionBleeding(
      playerHealth,
      bleeding,
      dependencies.config.combat.postPlayerActionBleedingDamage,
    )
    effects.push({
      kind: 'player-health-lost',
      source: 'post-player-action-bleeding',
      healthBefore: checkpoint.healthBefore,
      requestedLoss: checkpoint.requestedLoss,
      actualLoss: checkpoint.actualLoss,
      healthAfter: checkpoint.healthAfter,
    })
    playerHealth = checkpoint.healthAfter
  }
  if (playerHealth === 0) {
    if (defense) {
      effects.push({
        kind: 'temporary-defense-expired',
        before: defense,
        after: null,
      })
      defense = null
    }
    effects.push({
      kind: 'combat-status-changed',
      from: 'awaiting-player',
      to: 'defeat',
      reason: 'player-death',
    })
    return deepFreeze({ command, effects })
  }
  if (enemyHealth === 0) {
    effects.push({
      kind: 'combat-status-changed',
      from: 'awaiting-player',
      to: 'victory',
      reason: 'enemy-defeated',
    })
    return deepFreeze({ command, effects })
  }

  playerNext = currentCtb + actionCtb
  effects.push({
    kind: 'combat-ctb-position-changed',
    reason: isEscape
      ? 'escape-preparation-scheduled'
      : 'player-action-scheduled',
    currentCtbBefore: currentCtb,
    currentCtbAfter: currentCtb,
    playerNextActionCtbBefore: snapshot.playerNextActionCtb,
    playerNextActionCtbAfter: playerNext,
    enemyNextActionCtbBefore: enemyNext,
    enemyNextActionCtbAfter: enemyNext,
  })

  const definition = dependencies.enemyCatalog.get(
    dependencies.bindings.enemyDefinitionId,
  )
  while (
    enemyActsBeforePlayerCompletion(enemyNext, playerNext) &&
    playerHealth > 0 &&
    enemyHealth > 0
  ) {
    const action = definition.actions.find(({ id }) => id === intentId)!
    const enemyPrimary = createCombatEnemyActionPrimaryPlan(
      snapshot, action, armorResourceCurrent, defense, dependencies,
    )
    const usedHeavyCoat = enemyPrimary.usedHeavyCoat
    const activeDefense = defense
    const usedDefense = enemyPrimary.usedDefense
    if (usedHeavyCoat) {
      consume(
        'armor',
        enemyPrimary.armorRequestedCost,
        'enemy-direct-attack-protection',
      )
    }
    if (activeDefense !== null) {
      effects.push({
        kind: 'temporary-defense-consumed',
        before: activeDefense,
        after: null,
        enemyActionId: action.id,
      })
      defense = null
    }
    const damage = enemyPrimary.requestedDirectDamage
    const actual = Math.min(playerHealth, damage)
    effects.push({
      kind: 'player-health-lost',
      source: action.id,
      healthBefore: playerHealth,
      requestedLoss: damage,
      actualLoss: actual,
      healthAfter: playerHealth - actual,
    })
    playerHealth -= actual
    if (playerHealth === 0) {
      effects.push({
        kind: 'combat-ctb-position-changed',
        reason: 'enemy-action-terminal',
        currentCtbBefore: currentCtb,
        currentCtbAfter: enemyNext,
        playerNextActionCtbBefore: playerNext,
        playerNextActionCtbAfter: playerNext,
        enemyNextActionCtbBefore: enemyNext,
        enemyNextActionCtbAfter: enemyNext,
      })
      currentCtb = enemyNext
      effects.push({
        kind: 'combat-status-changed',
        from: 'awaiting-player',
        to: 'defeat',
        reason: 'player-death',
      })
      break
    }

    const injury = addCombatRiskEffect(
      effects,
      snapshot,
      action.id,
      resolvedActionCount,
      'injury',
      enemyPrimary.injuryOriginalTier,
      enemyPrimary.injuryFinalTier,
      usedHeavyCoat,
      usedDefense,
      dependencies,
    )
    if (injury.succeeded) {
      const wound = {
        id: createStableCombatWoundId(
          snapshot.enemy.enemyInstanceId,
          resolvedActionCount,
          action.id,
        ),
        kind: action.kind === 'scratch'
          ? 'laceration' as const
          : 'bite' as const,
        treatment: 'untreated' as const,
      }
      effects.push({ kind: 'open-wound-added', wound })
      if (!bleeding) {
        effects.push({
          kind: 'bleeding-changed',
          before: false,
          after: true,
          source: action.id,
        })
        bleeding = true
      }
    }
    if (enemyPrimary.exposureOriginalTier !== 'none') {
      const exposure = addCombatRiskEffect(
        effects,
        snapshot,
        action.id,
        resolvedActionCount,
        'infection-exposure',
        enemyPrimary.exposureOriginalTier,
        enemyPrimary.exposureFinalTier,
        usedHeavyCoat,
        false,
        dependencies,
      )
      if (exposure.succeeded) {
        effects.push({
          kind: 'infection-exposure-added',
          before: pendingExposures,
          added: 1,
          after: pendingExposures + 1,
        })
        pendingExposures += 1
      }
    }

    const nextIntentId = definition.actionCycle[nextCycleIndex]
    const followingIndex = (nextCycleIndex + 1) % definition.actionCycle.length
    effects.push({
      kind: 'enemy-intent-changed',
      intentBefore: intentId,
      intentAfter: nextIntentId,
      nextCycleIndexBefore: nextCycleIndex,
      nextCycleIndexAfter: followingIndex,
      resolvedActionCountBefore: resolvedActionCount,
      resolvedActionCountAfter: resolvedActionCount + 1,
    })
    intentId = nextIntentId
    nextCycleIndex = followingIndex
    resolvedActionCount += 1
    const nextEnemy = enemyNext + enemyPrimary.actionCtb
    effects.push({
      kind: 'combat-ctb-position-changed',
      reason: 'enemy-action-resolved',
      currentCtbBefore: currentCtb,
      currentCtbAfter: enemyNext,
      playerNextActionCtbBefore: playerNext,
      playerNextActionCtbAfter: playerNext,
      enemyNextActionCtbBefore: enemyNext,
      enemyNextActionCtbAfter: nextEnemy,
    })
    currentCtb = enemyNext
    enemyNext = nextEnemy
  }

  if (playerHealth > 0 && enemyHealth > 0 && isEscape) {
    effects.push({
      kind: 'combat-escape-completed',
      startedAtCtb: escapeStartedAtCtb,
      completesAtCtb: escapeCompletesAtCtb,
      preparationCtb: actionCtb,
    })
    effects.push({
      kind: 'combat-ctb-position-changed',
      reason: 'escape-completed',
      currentCtbBefore: currentCtb,
      currentCtbAfter: escapeCompletesAtCtb,
      playerNextActionCtbBefore: playerNext,
      playerNextActionCtbAfter: escapeCompletesAtCtb,
      enemyNextActionCtbBefore: enemyNext,
      enemyNextActionCtbAfter: enemyNext,
    })
    if (bleeding) {
      const checkpoint = evaluateCombatPostPlayerActionBleeding(
        playerHealth,
        bleeding,
        dependencies.config.combat.postPlayerActionBleedingDamage,
      )
      effects.push({
        kind: 'player-health-lost',
        source: 'post-player-action-bleeding',
        healthBefore: checkpoint.healthBefore,
        requestedLoss: checkpoint.requestedLoss,
        actualLoss: checkpoint.actualLoss,
        healthAfter: checkpoint.healthAfter,
      })
      playerHealth = checkpoint.healthAfter
    }
    effects.push({
      kind: 'combat-status-changed',
      from: 'awaiting-player',
      to: playerHealth === 0 ? 'defeat' : 'escaped',
      reason: playerHealth === 0 ? 'player-death' : 'escape-completed',
    })
  } else if (playerHealth > 0 && enemyHealth > 0) {
    effects.push({
      kind: 'combat-ctb-position-changed',
      reason: 'player-decision-point',
      currentCtbBefore: currentCtb,
      currentCtbAfter: playerNext,
      playerNextActionCtbBefore: playerNext,
      playerNextActionCtbAfter: playerNext,
      enemyNextActionCtbBefore: enemyNext,
      enemyNextActionCtbAfter: enemyNext,
    })
    if (defense && defense.expiresAtPlayerActionCtb <= playerNext) {
      effects.push({
        kind: 'temporary-defense-expired',
        before: defense,
        after: null,
      })
    }
  }
  return deepFreeze({ command, effects })
}
