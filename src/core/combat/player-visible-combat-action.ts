import { deepFreeze } from '../config'
import { validateCombatDependencies } from './combat-dependencies'
import {
  enemyActsBeforePlayerCompletion,
  evaluateCombatPostPlayerActionBleeding,
} from './combat-action-checkpoints'
import { createCombatEnemyActionPrimaryPlan } from './combat-enemy-action-primary-plan'
import { createCombatPlayerActionPrimaryPlan } from './combat-player-action-primary-plan'
import {
  getAvailableCombatPlayerCommandsFromValidatedSnapshot,
  getCombatResourceState,
} from './combat-selectors'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import { CombatError } from './combat-errors'
import { riskTierToPercent } from './combat-risk'
import { createCombatPlayerActionCommand } from './combat-validation'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  PlayerVisibleCombatActionOption,
  PlayerVisibleCombatActionPreview,
} from './combat-types'

function commandsEqual(
  left: CombatPlayerActionCommand,
  right: CombatPlayerActionCommand,
): boolean {
  return left.kind === right.kind && (
    left.kind !== 'use-quick-slot-item' ||
    right.kind !== 'use-quick-slot-item' ||
    (
      left.quickSlotIndex === right.quickSlotIndex &&
      left.targetOpenWoundId === right.targetOpenWoundId
    )
  )
}

function evaluateEscapeConsequences(
  snapshot: CombatEncounterSnapshot,
  completesAtCtb: number,
  dependencies: CombatDependencies,
) {
  const definition = dependencies.enemyCatalog.get(snapshot.enemy.definitionId)
  let enemyNext = snapshot.enemyNextActionCtb
  let intentId = snapshot.enemy.currentIntentActionId
  let nextCycleIndex = snapshot.enemy.nextCycleIndex
  const armorResource = getCombatResourceState(snapshot, 'armor')?.resource
  let armorResourceCurrent = armorResource?.kind === 'integrity' ? armorResource.current : null
  let defense = snapshot.temporaryDefense
  let health = snapshot.playerCondition.currentHealth
  let bleedingGuaranteed = snapshot.playerCondition.bleeding
  let bleedingPossible = bleedingGuaranteed
  let enemyActionsBeforeCompletion = 0
  let deathPossible = false

  let deathBeforeCompletion = false
  while (enemyActsBeforePlayerCompletion(enemyNext, completesAtCtb) && health > 0) {
    const action = definition.actions.find(({ id }) => id === intentId)!
    const primary = createCombatEnemyActionPrimaryPlan(
      snapshot, action, armorResourceCurrent, defense, dependencies,
    )
    health = Math.max(0, health - primary.requestedDirectDamage)
    enemyActionsBeforeCompletion += 1
    if (health === 0) {
      deathPossible = true
      deathBeforeCompletion = true
      break
    }
    const injuryPercent = riskTierToPercent(primary.injuryFinalTier, dependencies.config)
    if (injuryPercent > 0) bleedingPossible = true
    if (injuryPercent === 100) bleedingGuaranteed = true
    armorResourceCurrent = primary.armorAfter
    defense = null
    intentId = definition.actionCycle[nextCycleIndex]
    nextCycleIndex = (nextCycleIndex + 1) % definition.actionCycle.length
    enemyNext += primary.actionCtb
  }

  const configuredBleedingDamage = dependencies.config.combat.postPlayerActionBleedingDamage
  const withoutBleeding = evaluateCombatPostPlayerActionBleeding(
    health, false, configuredBleedingDamage,
  )
  const withBleeding = evaluateCombatPostPlayerActionBleeding(
    health, true, configuredBleedingDamage,
  )
  const bleedingDamageMin = bleedingGuaranteed ? withBleeding.actualLoss : 0
  const bleedingDamageMax = bleedingPossible ? withBleeding.actualLoss : 0
  const nonBleedingCompletionHealth = !deathBeforeCompletion && !bleedingGuaranteed
    ? withoutBleeding.healthAfter
    : null
  const bleedingCompletionHealth = !deathBeforeCompletion && bleedingPossible
    ? withBleeding.healthAfter
    : null
  const completionHealths = [
    nonBleedingCompletionHealth,
    bleedingCompletionHealth,
  ].filter((value): value is number => value !== null)
  const healthMin = completionHealths.length === 0 ? 0 : Math.min(...completionHealths)
  const healthMax = completionHealths.length === 0 ? 0 : Math.max(...completionHealths)
  return deepFreeze({
    enemyActionsBeforeCompletion,
    postPlayerActionBleedingDamageMin: bleedingDamageMin,
    postPlayerActionBleedingDamageMax: bleedingDamageMax,
    playerHealthAfterCompletionMin: healthMin,
    playerHealthAfterCompletionMax: healthMax,
    bleedingAtCompletionPossible: bleedingPossible,
    bleedingAtCompletionGuaranteed: bleedingGuaranteed,
    playerHealthBeforeCompletionBleeding: health,
    nonBleedingCompletionHealth,
    bleedingCompletionHealth,
    deathBeforeCompletion,
    survivalAtCompletionPossible: completionHealths.some((value) => value > 0),
    deathPossibleBeforeForcedReturn: deathPossible || healthMin === 0,
  })
}

export function previewPlayerVisibleCombatAction(
  snapshotInput: CombatEncounterSnapshot,
  commandInput: unknown,
  dependencies: CombatDependencies,
): PlayerVisibleCombatActionPreview {
  validateCombatDependencies(dependencies)
  const snapshot = createCombatEncounterSnapshot(snapshotInput, dependencies)
  const command = createCombatPlayerActionCommand(commandInput)
  if (!getAvailableCombatPlayerCommandsFromValidatedSnapshot(
    snapshot,
    dependencies,
  ).some((available) => commandsEqual(available, command))) {
    throw new CombatError('ACTION_NOT_AVAILABLE', '玩家战斗行动不可用')
  }
  const primary = createCombatPlayerActionPrimaryPlan(
    snapshot,
    command,
    dependencies,
  )
  const intent = dependencies.enemyCatalog
    .get(snapshot.enemy.definitionId)
    .actions.find(({ id }) => id === snapshot.enemy.currentIntentActionId)!
  const adjustedEnemyCtb = snapshot.enemyNextActionCtb + (
    primary.kind === 'attack' ? primary.enemyActionDelay : 0
  )
  const playerDecisionCtb = primary.kind === 'escape'
    ? primary.completesAtCtb
    : snapshot.currentCtb + primary.actionCtb
  const healthAfterOwnAction = primary.kind === 'quick-slot-item'
    ? primary.healthAfterRecovery
    : snapshot.playerCondition.currentHealth
  const stopsBleeding = primary.kind === 'quick-slot-item' && primary.stopsBleeding
  const bleedingCheckpoint = evaluateCombatPostPlayerActionBleeding(
    healthAfterOwnAction,
    snapshot.playerCondition.bleeding && !stopsBleeding,
    dependencies.config.combat.postPlayerActionBleedingDamage,
  )
  return deepFreeze({
    primary,
    currentIntent: {
      metadata: intent.playerVisible,
      actsBeforeNextPlayerDecision: enemyActsBeforePlayerCompletion(
        adjustedEnemyCtb,
        playerDecisionCtb,
      ),
    },
    postPlayerActionBleedingDamage: bleedingCheckpoint.actualLoss,
    playerHealthAfterOwnAction: bleedingCheckpoint.healthAfter,
    escapeConsequences: primary.kind === 'escape'
      ? evaluateEscapeConsequences(snapshot, primary.completesAtCtb, dependencies)
      : null,
  })
}

export function getPlayerVisibleCombatActionOptions(
  snapshotInput: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly PlayerVisibleCombatActionOption[] {
  validateCombatDependencies(dependencies)
  const snapshot = createCombatEncounterSnapshot(snapshotInput, dependencies)
  return deepFreeze(getAvailableCombatPlayerCommandsFromValidatedSnapshot(
    snapshot,
    dependencies,
  ).map((command) => deepFreeze({
    command,
    preview: previewPlayerVisibleCombatAction(snapshot, command, dependencies),
  })))
}
