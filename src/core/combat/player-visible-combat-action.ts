import { deepFreeze } from '../config'
import {
  calculateEscapeWoundCtbModifier,
  restoreHealth,
} from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { classifyLoad } from '../load'
import { validateCombatDependencies } from './combat-dependencies'
import {
  getAvailableCombatPlayerCommandsFromValidatedSnapshot,
  getCombatResourceState,
} from './combat-selectors'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import { CombatError } from './combat-errors'
import { createCombatPlayerActionCommand } from './combat-validation'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  PlayerVisibleCombatActionOption,
  PlayerVisibleCombatActionPreview,
  PlayerVisibleCombatActionPrimaryMetadata,
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

export function getCombatPlayerActionPrimaryMetadata(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): PlayerVisibleCombatActionPrimaryMetadata {
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
    const targetWound = command.targetOpenWoundId === undefined
      ? null
      : (() => {
          const sorted = snapshot.playerCondition.openWounds
            .filter(({ treatment }) => treatment === 'untreated')
            .slice()
            .sort((left, right) => left.id.localeCompare(right.id))
          const target = sorted.find(({ id }) => id === command.targetOpenWoundId)!
          const sameKind = sorted.filter(({ kind }) => kind === target.kind)
          return {
            kind: target.kind,
            ordinal: sameKind.findIndex(({ id }) => id === target.id) + 1,
          }
        })()
    return deepFreeze({
      kind: 'quick-slot-item',
      actionCtb: isBandage
        ? dependencies.config.medical.bandage.combatCtb
        : dependencies.config.medical.painkiller.combatCtb,
      quickSlotIndex: command.quickSlotIndex,
      itemKind: isBandage ? 'bandage' : 'painkiller',
      healthRecovery: isBandage
        ? dependencies.config.medical.bandage.healthRecovery
        : 0,
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
  const weaponResource = getCombatResourceState(snapshot, 'weapon')?.resource
  const durabilityBefore = command.kind === 'temporary-attack' ||
    weaponResource?.kind !== 'durability'
    ? null
    : weaponResource.current
  const durabilityCost = command.kind === 'temporary-attack'
    ? 0
    : rules.durabilityCost
  return deepFreeze({
    kind: 'attack',
    actionCtb: rules.ctb,
    requestedDamage: rules.damage,
    weaponDurabilityBefore: durabilityBefore,
    weaponDurabilityAfter: durabilityBefore === null
      ? null
      : Math.max(0, durabilityBefore - durabilityCost),
    weaponDurabilityCost: durabilityCost,
    enemyActionDelay: command.kind === 'metal-pipe-charged-strike'
      ? dependencies.config.combat.metalPipe.chargedStrike.enemyActionDelay
      : 0,
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
  const primary = getCombatPlayerActionPrimaryMetadata(
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
  let healthAfterOwnAction = snapshot.playerCondition.currentHealth
  if (primary.kind === 'quick-slot-item' && primary.healthRecovery > 0) {
    healthAfterOwnAction = restoreHealth(
      snapshot.playerCondition,
      primary.healthRecovery,
      dependencies.config.combat.player,
    ).healthAfter
  }
  const stopsBleeding = primary.kind === 'quick-slot-item' && primary.stopsBleeding
  const bleedingDamage = snapshot.playerCondition.bleeding && !stopsBleeding
    ? Math.min(
        healthAfterOwnAction,
        dependencies.config.combat.postPlayerActionBleedingDamage,
      )
    : 0
  return deepFreeze({
    primary,
    currentIntent: {
      metadata: intent.playerVisible,
      actsBeforeNextPlayerDecision: adjustedEnemyCtb < playerDecisionCtb,
    },
    postPlayerActionBleedingDamage: bleedingDamage,
    playerHealthAfterOwnAction: healthAfterOwnAction - bleedingDamage,
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
