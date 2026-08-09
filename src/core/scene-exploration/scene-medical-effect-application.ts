import { deepFreeze } from '../config'
import {
  activatePainkiller,
  applyHealthLoss,
  reducePendingInfectionExposure,
  removeOneMinorContusion,
  removeOpenWound,
  restoreHealth,
  setBleeding,
  treatOpenWound,
} from '../condition'
import {
  createBackpackSnapshot,
  removeItemFromBackpack,
} from '../inventory'
import { removeItemState } from '../item-state'
import { removeQuickSlotItem } from '../quick-slot'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { validateSceneMedicalDependencies } from './scene-medical-dependencies'
import { buildSceneMedicalTransitionPlan } from './scene-medical-transition-plan'
import { createUseSceneMedicalItemCommand } from './scene-medical-validation'
import type {
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneMedicalCommandDependencies,
} from './scene-exploration-types'

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function consumeFromBackpack(
  state: SceneExplorationSnapshot,
  instanceId: string,
  dependencies: SceneMedicalCommandDependencies,
): SceneExplorationSnapshot {
  const item = state.backpack.items.find((candidate) => candidate.instanceId === instanceId)
  if (!item) throw new SceneExplorationError('EFFECT_MEDICAL_MISMATCH', '探索医疗消费物品不存在')
  if (item.quantity === 1) {
    const removed = removeItemFromBackpack(
      state.backpack,
      instanceId,
      dependencies.physicalCatalog,
    )
    return deepFreeze({
      ...state,
      backpack: removed.snapshot,
      itemStates: removeItemState(state.itemStates, instanceId),
    })
  }
  return deepFreeze({
    ...state,
    backpack: createBackpackSnapshot({
      ...state.backpack,
      items: state.backpack.items.map((candidate) =>
        candidate.instanceId === instanceId
          ? { ...candidate, quantity: candidate.quantity - 1 }
          : candidate,
      ),
    }, dependencies.physicalCatalog),
  })
}

function consumeMedicalItem(
  state: SceneExplorationSnapshot,
  effect: Extract<SceneExplorationEffect, { readonly kind: 'scene-medical-item-consumed' }>,
  dependencies: SceneMedicalCommandDependencies,
): SceneExplorationSnapshot {
  if (effect.sourceContainer === 'backpack') {
    return consumeFromBackpack(state, effect.instanceId, dependencies)
  }
  if (effect.sourceSlotIndex === null) {
    throw new SceneExplorationError('EFFECT_MEDICAL_MISMATCH', '快捷栏医疗消费缺少槽位')
  }
  const removed = removeQuickSlotItem(state, effect.sourceSlotIndex, dependencies)
  if (removed.removedItem.instanceId !== effect.instanceId) {
    throw new SceneExplorationError('EFFECT_MEDICAL_MISMATCH', '快捷栏医疗消费实例不一致')
  }
  return deepFreeze({
    ...state,
    backpack: removed.snapshot.backpack,
    equipment: removed.snapshot.equipment,
    quickSlots: removed.snapshot.quickSlots,
    itemStates: removeItemState(state.itemStates, effect.instanceId),
  })
}

export function applySceneMedicalEffects(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  dependencies: SceneMedicalCommandDependencies,
): SceneExplorationSnapshot {
  validateSceneMedicalDependencies(dependencies)
  const initial = createSceneExplorationSnapshot(initialSnapshot, dependencies)
  const consumed = effects[0]
  if (!consumed || consumed.kind !== 'scene-medical-item-consumed') {
    throw new SceneExplorationError('EFFECT_MEDICAL_MISMATCH', '探索医疗 Effect 缺少首个物品消费')
  }
  const command = createUseSceneMedicalItemCommand(consumed.command)
  const expected = buildSceneMedicalTransitionPlan(initial, command, dependencies)
  if (!sameValue(effects, expected.effects)) {
    throw new SceneExplorationError('EFFECT_MEDICAL_MISMATCH', '探索医疗 Effect 与唯一正式计划不一致')
  }

  let state = initial
  for (const effect of effects) {
    switch (effect.kind) {
      case 'scene-medical-item-consumed':
        state = consumeMedicalItem(state, effect, dependencies)
        break
      case 'scene-health-restored':
        state = deepFreeze({
          ...state,
          condition: restoreHealth(
            state.condition,
            effect.requestedRecovery,
            dependencies.config.combat.player,
          ).state,
        })
        break
      case 'scene-open-wound-treated':
        state = deepFreeze({
          ...state,
          condition: treatOpenWound(state.condition, effect.woundId),
        })
        break
      case 'scene-open-wound-removed':
        state = deepFreeze({
          ...state,
          condition: removeOpenWound(state.condition, effect.woundId),
        })
        break
      case 'scene-minor-contusion-removed':
        state = deepFreeze({
          ...state,
          condition: removeOneMinorContusion(state.condition),
        })
        break
      case 'scene-bleeding-changed':
        state = deepFreeze({
          ...state,
          condition: setBleeding(state.condition, effect.after),
        })
        break
      case 'scene-painkiller-changed':
        state = deepFreeze({
          ...state,
          condition: activatePainkiller(state.condition),
        })
        break
      case 'scene-infection-exposure-reduced':
        state = deepFreeze({
          ...state,
          condition: reducePendingInfectionExposure(
            state.condition,
            effect.requestedReduction,
          ).state,
        })
        break
      case 'daily-medical-usage-changed':
        state = deepFreeze({
          ...state,
          dailyMedicalUsage: { disinfectantUsesToday: effect.usesAfter },
        })
        break
      case 'scene-time-resolved':
        state = deepFreeze({ ...state, remainingTime: effect.remainingTimeAfter })
        break
      case 'health-lost':
        state = deepFreeze({
          ...state,
          condition: applyHealthLoss(
            state.condition,
            effect.requestedLoss,
            dependencies.config.combat.player,
          ).state,
        })
        break
      case 'scene-node-changed':
        state = deepFreeze({ ...state, currentNodeId: effect.toNodeId })
        break
      case 'scene-status-changed':
        state = deepFreeze({ ...state, status: effect.toStatus })
        break
      default:
        throw new SceneExplorationError('EFFECT_MEDICAL_MISMATCH', '探索医疗 Effect 含有非医疗结算步骤')
    }
  }
  return createSceneExplorationSnapshot(state, dependencies)
}
