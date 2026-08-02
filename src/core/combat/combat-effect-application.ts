import { deepFreeze } from '../config'
import {
  addOpenWound,
  addPendingInfectionExposure,
  applyHealthLoss,
  startBleeding,
} from '../condition'
import {
  consumeCommittedResource,
  getItemState,
  replaceItemState,
} from '../item-state'
import { CombatError } from './combat-errors'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import { buildCombatTransitionPlan } from './combat-transition-plan'
import { createCombatPlayerActionCommand } from './combat-validation'
import { validateCombatDependencies } from './combat-dependencies'
import type {
  CombatDependencies,
  CombatEffect,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  TemporaryDefenseSnapshot,
} from './combat-types'

export function applyCombatEffects(
  initial: CombatEncounterSnapshot,
  commandInput: CombatPlayerActionCommand,
  effects: readonly CombatEffect[],
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  validateCombatDependencies(dependencies)
  const command = createCombatPlayerActionCommand(commandInput)
  const start = createCombatEncounterSnapshot(initial, dependencies)
  const expected = buildCombatTransitionPlan(start, command, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) {
    throw new CombatError(
      'INVALID_COMBAT_EFFECTS',
      'Combat Effects与唯一正式计划不一致',
    )
  }

  let state = start
  for (const effect of effects) {
    const value = effect as Record<string, unknown>
    switch (effect.kind) {
      case 'item-resource-consumed': {
        const item = state.equipment[value.slot as 'weapon' | 'armor']!
        const current = getItemState(state.itemStates, item.instanceId)
        const result = consumeCommittedResource(
          current,
          value.requestedCost as number,
        )
        state = deepFreeze({
          ...state,
          itemStates: replaceItemState(state.itemStates, result.state),
        })
        break
      }
      case 'enemy-health-lost':
        state = deepFreeze({
          ...state,
          enemy: {
            ...state.enemy,
            currentHealth: value.healthAfter as number,
            defeated: (value.healthAfter as number) === 0,
          },
        })
        break
      case 'enemy-action-delayed':
        state = deepFreeze({
          ...state,
          enemyNextActionCtb: value.enemyNextActionCtbAfter as number,
        })
        break
      case 'combat-usage-changed':
        state = deepFreeze({
          ...state,
          usage: { metalPipeChargedStrikeUses: value.after as number },
        })
        break
      case 'temporary-defense-activated':
        state = deepFreeze({
          ...state,
          temporaryDefense: value.after as TemporaryDefenseSnapshot,
        })
        break
      case 'temporary-defense-consumed':
      case 'temporary-defense-expired':
        state = deepFreeze({ ...state, temporaryDefense: null })
        break
      case 'player-health-lost':
        state = deepFreeze({
          ...state,
          playerCondition: applyHealthLoss(
            state.playerCondition,
            value.requestedLoss as number,
            dependencies.config.combat.player,
          ).state,
        })
        break
      case 'combat-risk-resolved':
        break
      case 'open-wound-added':
        state = deepFreeze({
          ...state,
          playerCondition: addOpenWound(
            state.playerCondition,
            value.wound as never,
          ),
        })
        break
      case 'bleeding-changed':
        state = deepFreeze({
          ...state,
          playerCondition: startBleeding(state.playerCondition),
        })
        break
      case 'infection-exposure-added':
        state = deepFreeze({
          ...state,
          playerCondition: addPendingInfectionExposure(state.playerCondition),
        })
        break
      case 'enemy-intent-changed':
        state = deepFreeze({
          ...state,
          enemy: {
            ...state.enemy,
            currentIntentActionId: value.intentAfter as string,
            nextCycleIndex: value.nextCycleIndexAfter as number,
            resolvedActionCount: value.resolvedActionCountAfter as number,
          },
        })
        break
      case 'combat-ctb-position-changed':
        state = deepFreeze({
          ...state,
          currentCtb: value.currentCtbAfter as number,
          playerNextActionCtb: value.playerNextActionCtbAfter as number,
          enemyNextActionCtb: value.enemyNextActionCtbAfter as number,
        })
        break
      case 'combat-status-changed':
        state = deepFreeze({
          ...state,
          status: value.to as CombatEncounterSnapshot['status'],
        })
        break
    }
  }
  return createCombatEncounterSnapshot(state, dependencies)
}
