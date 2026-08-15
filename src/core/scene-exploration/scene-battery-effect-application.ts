import { deepFreeze } from '../config'
import { applyHealthLoss } from '../condition'
import { createBackpackSnapshot, removeItemFromBackpack } from '../inventory'
import { getItemState, removeItemState, replaceItemState, restoreItemResource } from '../item-state'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { validateSceneBatteryDependencies } from './scene-battery-dependencies'
import { buildSceneBatteryTransitionPlan } from './scene-battery-transition-plan'
import { createUseSceneBatteryCommand } from './scene-battery-validation'
import type { SceneBatteryCommandDependencies, SceneExplorationEffect, SceneExplorationSnapshot } from './scene-exploration-types'

function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right) }

function consume(state: SceneExplorationSnapshot, effect: Extract<SceneExplorationEffect, { kind: 'scene-battery-consumed' }>, dependencies: SceneBatteryCommandDependencies): SceneExplorationSnapshot {
  const item = state.backpack.items.find(({ instanceId }) => instanceId === effect.instanceId)
  if (!item) throw new SceneExplorationError('EFFECT_BATTERY_MISMATCH', '电池消费实例不存在')
  if (item.quantity === 1) {
    const removed = removeItemFromBackpack(state.backpack, item.instanceId, dependencies.physicalCatalog)
    return deepFreeze({ ...state, backpack: removed.snapshot, itemStates: removeItemState(state.itemStates, item.instanceId) })
  }
  return deepFreeze({ ...state, backpack: createBackpackSnapshot({ ...state.backpack, items: state.backpack.items.map((candidate) => candidate.instanceId === item.instanceId ? { ...candidate, quantity: candidate.quantity - 1 } : candidate) }, dependencies.physicalCatalog) })
}

export function applySceneBatteryEffects(initialSnapshot: SceneExplorationSnapshot, effects: readonly SceneExplorationEffect[], dependencies: SceneBatteryCommandDependencies): SceneExplorationSnapshot {
  validateSceneBatteryDependencies(dependencies)
  const initial = createSceneExplorationSnapshot(initialSnapshot, dependencies)
  const consumed = effects[0]
  if (!consumed || consumed.kind !== 'scene-battery-consumed') throw new SceneExplorationError('EFFECT_BATTERY_MISMATCH', '场景电池 Effect 缺少消费步骤')
  const command = createUseSceneBatteryCommand(consumed.command)
  const expected = buildSceneBatteryTransitionPlan(initial, command, dependencies)
  if (!same(effects, expected.effects)) throw new SceneExplorationError('EFFECT_BATTERY_MISMATCH', '场景电池 Effect 与正式计划不一致')
  let state = initial
  for (const effect of effects) {
    switch (effect.kind) {
      case 'scene-battery-consumed': state = consume(state, effect, dependencies); break
      case 'scene-device-resource-restored': {
        const current = getItemState(state.itemStates, effect.targetInstanceId)
        const restored = restoreItemResource(current, effect.requestedRecovery, dependencies.itemResourceCatalog)
        state = deepFreeze({ ...state, itemStates: replaceItemState(state.itemStates, restored.state) })
        break
      }
      case 'scene-time-resolved': state = deepFreeze({ ...state, remainingTime: effect.remainingTimeAfter }); break
      case 'health-lost': state = deepFreeze({ ...state, condition: applyHealthLoss(state.condition, effect.requestedLoss, dependencies.config.combat.player).state }); break
      case 'scene-node-changed': state = deepFreeze({ ...state, currentNodeId: effect.toNodeId }); break
      case 'scene-status-changed': state = deepFreeze({ ...state, status: effect.toStatus }); break
      default: throw new SceneExplorationError('EFFECT_BATTERY_MISMATCH', '场景电池 Effect 包含非法步骤')
    }
  }
  return createSceneExplorationSnapshot(state, dependencies)
}
