import { deepFreeze } from '../config'
import { activatePainkiller, addMinorContusion, addOpenWound, addPendingInfectionExposure, applyHealthLoss,
  restoreHealth, setBleeding, treatOpenWound } from '../condition'
import { consumeCommittedResource, getItemState, removeItemState, replaceItemState } from '../item-state'
import { removeQuickSlotItem } from '../quick-slot'
import { createCombatEngineSnapshot } from './combat-snapshot'
import { combatRules } from './combat-legacy-profile'
import type { CombatEngineDependencies } from './combat-profile'
import type { CombatEffect, CombatEncounterSnapshot } from './combat-types'

/** Internal reducer. Callers must establish the formal plan; not an uploaded-effect API. */
export function reduceCombatEffects(start: CombatEncounterSnapshot, effects: readonly CombatEffect[],
  dependencies: CombatEngineDependencies): CombatEncounterSnapshot {
  let state = start
  for (const effect of effects) {
    switch (effect.kind) {
      case 'combat-quick-slot-item-consumed': {
        const removed = removeQuickSlotItem(
          state,
          effect.quickSlotIndex,
          dependencies,
        )
        state = deepFreeze({
          ...state,
          backpack: removed.snapshot.backpack,
          equipment: removed.snapshot.equipment,
          quickSlots: removed.snapshot.quickSlots,
          itemStates: removeItemState(state.itemStates, effect.instanceId),
        })
        break
      }
      case 'player-health-restored':
        state = deepFreeze({
          ...state,
          playerCondition: restoreHealth(
            state.playerCondition,
            effect.requestedRecovery,
            combatRules(dependencies).player,
          ).state,
        })
        break
      case 'open-wound-treated':
        state = deepFreeze({
          ...state,
          playerCondition: treatOpenWound(
            state.playerCondition,
            effect.woundId,
          ),
        })
        break
      case 'painkiller-changed':
        state = deepFreeze({
          ...state,
          playerCondition: activatePainkiller(state.playerCondition),
        })
        break
      case 'combat-escape-preparation-locked':
      case 'combat-escape-completed':
        break
      case 'item-resource-consumed': {
        const item = state.equipment[effect.slot]!
        const current = getItemState(state.itemStates, item.instanceId)
        const result = consumeCommittedResource(
          current,
          effect.requestedCost,
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
            currentHealth: effect.healthAfter,
            defeated: (effect.healthAfter) === 0,
          },
        })
        break
      case 'enemy-action-delayed':
        state = deepFreeze({
          ...state,
          enemyNextActionCtb: effect.enemyNextActionCtbAfter,
        })
        break
      case 'combat-usage-changed':
        state = deepFreeze({
          ...state,
          usage: { metalPipeChargedStrikeUses: effect.after },
        })
        break
      case 'temporary-defense-activated':
        state = deepFreeze({
          ...state,
          temporaryDefense: effect.after,
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
            effect.requestedLoss,
            combatRules(dependencies).player,
          ).state,
        })
        break
      case 'combat-risk-resolved':
        break
      case 'minor-contusion-added':
        state = deepFreeze({ ...state, playerCondition: addMinorContusion(state.playerCondition) })
        break
      case 'open-wound-added':
        state = deepFreeze({
          ...state,
          playerCondition: addOpenWound(
            state.playerCondition,
            effect.wound,
          ),
        })
        break
      case 'bleeding-changed':
        state = deepFreeze({
          ...state,
          playerCondition: setBleeding(state.playerCondition, effect.after),
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
            currentIntentActionId: effect.intentAfter,
            nextCycleIndex: effect.nextCycleIndexAfter,
            resolvedActionCount: effect.resolvedActionCountAfter,
          },
        })
        break
      case 'combat-ctb-position-changed':
        state = deepFreeze({
          ...state,
          currentCtb: effect.currentCtbAfter,
          playerNextActionCtb: effect.playerNextActionCtbAfter,
          enemyNextActionCtb: effect.enemyNextActionCtbAfter,
        })
        break
      case 'combat-status-changed':
        state = deepFreeze({
          ...state,
          status: effect.to,
        })
        break
    }
  }
  return createCombatEngineSnapshot(state, dependencies)
}
