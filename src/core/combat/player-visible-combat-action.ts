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
import {
  createCombatPlayerActionCommand,
  createTemporaryDefenseSnapshot,
} from './combat-validation'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  PlayerVisibleCombatActionOption,
  PlayerVisibleCombatActionPreview,
  TemporaryDefenseSnapshot,
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

function evaluateEnemyActionsBeforePlayerCompletion(
  snapshot: CombatEncounterSnapshot,
  completesAtCtb: number,
  dependencies: CombatDependencies,
  initial: Readonly<{
    health: number
    bleeding: boolean
    defense: TemporaryDefenseSnapshot | null
  }>,
) {
  const definition = dependencies.enemyCatalog.get(snapshot.enemy.definitionId)
  let enemyNext = snapshot.enemyNextActionCtb
  let intentId = snapshot.enemy.currentIntentActionId
  let nextCycleIndex = snapshot.enemy.nextCycleIndex
  const armorResource = getCombatResourceState(snapshot, 'armor')?.resource
  let armorResourceCurrent = armorResource?.kind === 'integrity' ? armorResource.current : null
  let defense = initial.defense
  let health = initial.health
  let bleedingGuaranteed = initial.bleeding
  let bleedingPossible = bleedingGuaranteed
  let enemyActionsBeforeCompletion = 0
  let preCompletionDeath = false
  let preCompletionDeathCtb: number | null = null
  while (enemyActsBeforePlayerCompletion(enemyNext, completesAtCtb) && health > 0) {
    const action = definition.actions.find(({ id }) => id === intentId)!
    const primary = createCombatEnemyActionPrimaryPlan(
      snapshot, action, armorResourceCurrent, defense, dependencies,
    )
    health = Math.max(0, health - primary.requestedDirectDamage)
    enemyActionsBeforeCompletion += 1
    if (health === 0) {
      preCompletionDeath = true
      preCompletionDeathCtb = enemyNext
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

  return deepFreeze({
    enemyActionsBeforeCompletion,
    playerHealthAfterEnemyActions: health,
    bleedingPossible,
    bleedingGuaranteed,
    preCompletionDeath,
    preCompletionDeathCtb,
  })
}

function evaluateEscapeConsequences(
  snapshot: CombatEncounterSnapshot,
  completesAtCtb: number,
  dependencies: CombatDependencies,
) {
  const enemyResponse = evaluateEnemyActionsBeforePlayerCompletion(
    snapshot,
    completesAtCtb,
    dependencies,
    {
      health: snapshot.playerCondition.currentHealth,
      bleeding: snapshot.playerCondition.bleeding,
      defense: snapshot.temporaryDefense,
    },
  )
  const configuredBleedingDamage = dependencies.config.combat.postPlayerActionBleedingDamage
  const withoutBleeding = evaluateCombatPostPlayerActionBleeding(
    enemyResponse.playerHealthAfterEnemyActions, false, configuredBleedingDamage,
  )
  const withBleeding = evaluateCombatPostPlayerActionBleeding(
    enemyResponse.playerHealthAfterEnemyActions, true, configuredBleedingDamage,
  )
  const bleedingDamageMin = enemyResponse.bleedingGuaranteed ? withBleeding.actualLoss : 0
  const bleedingDamageMax = enemyResponse.bleedingPossible ? withBleeding.actualLoss : 0
  const nonBleedingCompletionHealth = !enemyResponse.preCompletionDeath && !enemyResponse.bleedingGuaranteed
    ? withoutBleeding.healthAfter
    : null
  const bleedingCompletionHealth = !enemyResponse.preCompletionDeath && enemyResponse.bleedingPossible
    ? withBleeding.healthAfter
    : null
  const completionHealths = [
    nonBleedingCompletionHealth,
    bleedingCompletionHealth,
  ].filter((value): value is number => value !== null)
  const healthMin = completionHealths.length === 0 ? 0 : Math.min(...completionHealths)
  const healthMax = completionHealths.length === 0 ? 0 : Math.max(...completionHealths)
  const completionCheckpointDeathPossible = !enemyResponse.preCompletionDeath &&
    completionHealths.some((value) => value === 0)
  const completionCheckpointDeathGuaranteed = completionCheckpointDeathPossible &&
    completionHealths.every((value) => value === 0)
  return deepFreeze({
    enemyActionsBeforeCompletion: enemyResponse.enemyActionsBeforeCompletion,
    postPlayerActionBleedingDamageMin: bleedingDamageMin,
    postPlayerActionBleedingDamageMax: bleedingDamageMax,
    playerHealthAfterCompletionMin: healthMin,
    playerHealthAfterCompletionMax: healthMax,
    bleedingAtCompletionPossible: enemyResponse.bleedingPossible,
    bleedingAtCompletionGuaranteed: enemyResponse.bleedingGuaranteed,
    playerHealthBeforeCompletionBleeding: enemyResponse.playerHealthAfterEnemyActions,
    nonBleedingCompletionHealth,
    bleedingCompletionHealth,
    preCompletionDeath: enemyResponse.preCompletionDeath,
    preCompletionDeathCtb: enemyResponse.preCompletionDeathCtb,
    completionCheckpointDeathPossible,
    completionCheckpointDeathGuaranteed,
    survivedCompletionPossible: completionHealths.some((value) => value > 0),
  })
}

function evaluateNonAttackEnemyResponse(
  snapshot: CombatEncounterSnapshot,
  primary: Exclude<PlayerVisibleCombatActionPreview['primary'], { kind: 'attack' | 'escape' }>,
  healthAfterOwnAction: number,
  dependencies: CombatDependencies,
) {
  const defense = primary.kind === 'defend'
    ? createTemporaryDefenseSnapshot({
        activatedAtCtb: snapshot.currentCtb,
        expiresAtPlayerActionCtb: primary.expiresAtPlayerActionCtb,
        availableDirectAttackUses: primary.availableDirectAttackUses,
      })
    : snapshot.temporaryDefense
  const enemyResponse = evaluateEnemyActionsBeforePlayerCompletion(
    snapshot,
    snapshot.currentCtb + primary.actionCtb,
    dependencies,
    {
      health: healthAfterOwnAction,
      bleeding: snapshot.playerCondition.bleeding && !(
        primary.kind === 'quick-slot-item' && primary.stopsBleeding
      ),
      defense,
    },
  )
  return deepFreeze({
    enemyActionsBeforeNextPlayerDecision: enemyResponse.enemyActionsBeforeCompletion,
    playerHealthAfterEnemyResponse: enemyResponse.playerHealthAfterEnemyActions,
    playerDeathBeforeNextPlayerDecision: enemyResponse.preCompletionDeath,
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
  const enemyResponseBeforeNextPlayerDecision = primary.kind === 'attack' || primary.kind === 'escape'
    ? null
    : evaluateNonAttackEnemyResponse(
        snapshot,
        primary,
        bleedingCheckpoint.healthAfter,
        dependencies,
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
    enemyResponseBeforeNextPlayerDecision,
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
