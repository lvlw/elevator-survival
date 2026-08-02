import { deepFreeze } from '../config'
import { consumeCommittedResource, getItemState } from '../item-state'
import { CombatError } from './combat-errors'
import { validateCombatDependencies } from './combat-dependencies'
import {
  getAvailableCombatPlayerActionsFromValidatedSnapshot,
  getCombatResourceState,
} from './combat-selectors'
import {
  addCombatRiskEffect,
  createStableCombatWoundId,
  reduceRiskTier,
} from './combat-risk'
import {
  createCombatPlayerActionCommand,
  createTemporaryDefenseSnapshot,
} from './combat-validation'
import type {
  CombatDependencies,
  CombatEffect,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  CombatTransitionPlan,
  TemporaryDefenseSnapshot,
} from './combat-types'

export function buildCombatTransitionPlan(
  snapshot: CombatEncounterSnapshot,
  commandInput: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatTransitionPlan {
  validateCombatDependencies(dependencies)
  const command = createCombatPlayerActionCommand(commandInput)
  if (snapshot.status !== 'awaiting-player') {
    throw new CombatError('COMBAT_NOT_ACTIVE', '战斗不在玩家决策点')
  }
  if (!getAvailableCombatPlayerActionsFromValidatedSnapshot(
    snapshot,
    dependencies,
  ).includes(command.kind)) {
    throw new CombatError('ACTION_NOT_AVAILABLE', '玩家战斗行动不可用')
  }

  const effects: CombatEffect[] = []
  let currentCtb = snapshot.currentCtb
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
  if (
    command.kind === 'metal-pipe-basic-attack' ||
    command.kind === 'metal-pipe-charged-strike'
  ) {
    const rules = command.kind === 'metal-pipe-basic-attack'
      ? dependencies.config.combat.metalPipe.basicAttack
      : dependencies.config.combat.metalPipe.chargedStrike
    consume('weapon', rules.durabilityCost, command.kind)
    const actual = Math.min(enemyHealth, rules.damage)
    effects.push({
      kind: 'enemy-health-lost',
      source: command.kind,
      healthBefore: enemyHealth,
      requestedLoss: rules.damage,
      actualLoss: actual,
      healthAfter: enemyHealth - actual,
    })
    enemyHealth -= actual
    actionCtb = rules.ctb
    if (command.kind === 'metal-pipe-charged-strike') {
      const chargedRules = dependencies.config.combat.metalPipe.chargedStrike
      effects.push({
        kind: 'enemy-action-delayed',
        enemyNextActionCtbBefore: enemyNext,
        delay: chargedRules.enemyActionDelay,
        enemyNextActionCtbAfter: enemyNext + chargedRules.enemyActionDelay,
      })
      enemyNext += chargedRules.enemyActionDelay
      effects.push({
        kind: 'combat-usage-changed',
        usage: 'metal-pipe-charged-strike',
        before: usage,
        after: usage + 1,
      })
      usage += 1
    }
  } else if (command.kind === 'temporary-attack') {
    const rules = dependencies.config.combat.temporaryAttack
    const actual = Math.min(enemyHealth, rules.damage)
    effects.push({
      kind: 'enemy-health-lost',
      source: command.kind,
      healthBefore: enemyHealth,
      requestedLoss: rules.damage,
      actualLoss: actual,
      healthAfter: enemyHealth - actual,
    })
    enemyHealth -= actual
    actionCtb = rules.ctb
  } else {
    actionCtb = dependencies.config.combat.defend.ctb
    defense = createTemporaryDefenseSnapshot({
      activatedAtCtb: currentCtb,
      expiresAtPlayerActionCtb: currentCtb + actionCtb,
      availableDirectAttackUses: 1,
    })
    effects.push({
      kind: 'temporary-defense-activated',
      before: snapshot.temporaryDefense,
      after: defense,
    })
  }

  if (snapshot.playerCondition.bleeding) {
    const requested = dependencies.config.combat.postPlayerActionBleedingDamage
    const actual = Math.min(playerHealth, requested)
    effects.push({
      kind: 'player-health-lost',
      source: 'post-player-action-bleeding',
      healthBefore: playerHealth,
      requestedLoss: requested,
      actualLoss: actual,
      healthAfter: playerHealth - actual,
    })
    playerHealth -= actual
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
    reason: 'player-action-scheduled',
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
  while (enemyNext < playerNext && playerHealth > 0 && enemyHealth > 0) {
    const action = definition.actions.find(({ id }) => id === intentId)!
    const actionRules = action.kind === 'scratch'
      ? dependencies.config.combat.infectedOrderly.actions.scratch
      : dependencies.config.combat.infectedOrderly.actions.lungeBite
    const armor = snapshot.equipment.armor
    const armorState = armor
      ? getItemState(snapshot.itemStates, armor.instanceId)
      : null
    const usedHeavyCoat =
      armor?.definitionId === dependencies.bindings.heavyCoatDefinitionId &&
      armorState?.resource.kind === 'integrity' &&
      (armorResourceCurrent ?? 0) >= 1
    const activeDefense = defense
    const usedDefense = activeDefense !== null
    if (usedHeavyCoat) {
      consume(
        'armor',
        dependencies.config.combat.heavyCoat.integrityCostPerAttack,
        'enemy-direct-attack-protection',
      )
    }
    let damage = Math.max(
      0,
      actionRules.damage - (usedHeavyCoat
        ? dependencies.config.combat.heavyCoat.directDamageReduction
        : 0),
    )
    if (usedDefense) {
      damage = Math.ceil(
        damage * dependencies.config.combat.defend.remainingDamagePercent / 100,
      )
      effects.push({
        kind: 'temporary-defense-consumed',
        before: activeDefense,
        after: null,
        enemyActionId: action.id,
      })
      defense = null
    }
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

    const injuryTier = reduceRiskTier(
      actionRules.injuryRiskTier,
      (usedHeavyCoat
        ? dependencies.config.combat.heavyCoat.injuryRiskTierReduction
        : 0) +
      (usedDefense
        ? dependencies.config.combat.defend.injuryRiskTierReduction
        : 0),
    )
    const injury = addCombatRiskEffect(
      effects,
      snapshot,
      action.id,
      resolvedActionCount,
      'injury',
      actionRules.injuryRiskTier,
      injuryTier,
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
    if (actionRules.exposureRiskTier !== 'none') {
      const exposureTier = reduceRiskTier(
        actionRules.exposureRiskTier,
        usedHeavyCoat
          ? dependencies.config.combat.heavyCoat.exposureRiskTierReduction
          : 0,
      )
      const exposure = addCombatRiskEffect(
        effects,
        snapshot,
        action.id,
        resolvedActionCount,
        'infection-exposure',
        actionRules.exposureRiskTier,
        exposureTier,
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
    const nextEnemy = enemyNext + actionRules.ctb
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

  if (playerHealth > 0 && enemyHealth > 0) {
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
