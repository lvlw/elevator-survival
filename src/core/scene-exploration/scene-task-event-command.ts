import { deepFreeze } from '../config'
import { addPendingInfectionExposure, applyHealthLoss, hasMinorContusions } from '../condition'
import { addItemToBackpack, createItemInstance } from '../inventory'
import { consumeCommittedResource, getItemState, replaceItemState } from '../item-state'
import { addRunIntel } from '../run-intel'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, SceneGraphError } from '../scene-graph'
import {
  completeSceneTaskEvent,
  createSceneTaskEventPrimaryPlan,
} from '../scene-task-event'
import { resolveTimedSceneAction } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneTaskEventCommandDependencies,
  SceneTaskEventEvaluation,
  SceneTaskEventPreview,
  SceneTaskEventResolution,
  SceneTaskEventTransitionPlan,
} from './scene-exploration-types'
export { createPerformSceneTaskEventCommand } from './scene-task-event-validation'

function graphFailure(error: unknown): never {
  if (error instanceof SceneGraphError) throw new SceneExplorationError(error.code === 'NO_RETURN_ROUTE' ? 'NO_RETURN_ROUTE' : 'INVALID_INPUT', error.message)
  throw error
}

function addHealthEffect(
  effects: SceneExplorationEffect[],
  source: 'post-action-bleeding' | 'forced-return-base' | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  if (requestedLoss === 0) return healthBefore
  const actualLoss = Math.min(healthBefore, requestedLoss)
  const healthAfter = healthBefore - actualLoss
  effects.push({ kind: 'health-lost', source, requestedLoss, actualLoss, healthBefore, healthAfter })
  return healthAfter
}

export function buildSceneTaskEventTransitionPlan(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneTaskEventCommandDependencies,
): SceneTaskEventTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const primary = createSceneTaskEventPrimaryPlan(snapshot, commandInput, dependencies)
  const normalized = primary.command
  if (primary.metadata.kind === 'decline') {
    return deepFreeze({
      command: normalized,
      metadata: {
        eventId: primary.metadata.eventId,
        optionId: primary.metadata.optionId,
        actionTime: 0,
        riskTrace: null,
        returnRoute: null,
        sceneOutcome: null,
      },
      effects: primary.primaryEffects,
    })
  }
  const effects: SceneExplorationEffect[] = [...primary.primaryEffects]

  let returnRoute
  try {
    returnRoute = findReturnRoute({
      graph: dependencies.graph, currentNodeId: snapshot.currentNodeId,
      availability: { enabledEdgeIds: getEffectiveEnabledEdgeIds({ ...snapshot, backpack: primary.backpackAfter }, dependencies.edgeAccessCatalog) },
      totalWeight: primary.backpackWeightAfter,
      hasMinorContusion: hasMinorContusions(primary.conditionAfter),
      analgesiaActive: primary.conditionAfter.painkillerActive,
    }, dependencies.config)
  } catch (error) { graphFailure(error) }
  const currentIsSafetyNode = dependencies.graph.nodes.some(({ id, isReturnSafetyNode }) => id === snapshot.currentNodeId && isReturnSafetyNode)
  const sceneOutcome = resolveTimedSceneAction(
    { remainingTime: snapshot.remainingTime },
    { currentHealth: snapshot.condition.currentHealth, maxHealth: dependencies.config.combat.player.maxHealth, bleeding: snapshot.condition.bleeding },
    { timeCost: primary.metadata.actionTime, healthAfterPrimaryEffect: primary.conditionAfter.currentHealth, bleedingAfterPrimaryEffect: primary.conditionAfter.bleeding, estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime, endsExplorationAtSafety: false, isAtSafetyAfterAction: currentIsSafetyNode },
    { postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage, forcedReturn: dependencies.config.forcedReturn },
  )
  effects.push({ kind: 'scene-time-resolved', remainingTimeBefore: snapshot.remainingTime, actionTimeCost: primary.metadata.actionTime, remainingTimeAfter: sceneOutcome.clock.remainingTime, overtimeDebt: sceneOutcome.overtimeDebt })
  let health = primary.conditionAfter.currentHealth
  health = addHealthEffect(effects, 'post-action-bleeding', sceneOutcome.postActionBleedingDamage, health)
  health = addHealthEffect(effects, 'forced-return-base', sceneOutcome.forcedReturnBaseDamage, health)
  addHealthEffect(effects, 'forced-return-bleeding', sceneOutcome.forcedReturnBleedingDamage, health)
  const status: SceneExplorationStatus = sceneOutcome.kind === 'death' ? 'dead' : sceneOutcome.kind === 'safe-return' ? 'safe-returned' : sceneOutcome.kind === 'forced-return' ? 'forced-returned' : 'active'
  if (status === 'forced-returned') effects.push({ kind: 'scene-node-changed', reason: 'forced-return', fromNodeId: snapshot.currentNodeId, toNodeId: returnRoute.safetyNodeId, routeNodeIds: [...returnRoute.nodeIds], routeEdgeIds: [...returnRoute.edgeIds] })
  if (status !== snapshot.status) effects.push({ kind: 'scene-status-changed', fromStatus: snapshot.status, toStatus: status, reason: status === 'dead' ? 'death' : status === 'safe-returned' ? 'safe-return' : 'forced-return' })
  return deepFreeze({
    command: normalized,
    metadata: {
      eventId: primary.metadata.eventId,
      optionId: primary.metadata.optionId,
      actionTime: primary.metadata.actionTime,
      riskTrace: primary.riskTrace,
      returnRoute,
      sceneOutcome,
    },
    effects,
  })
}

function materialize(initial: SceneExplorationSnapshot, plan: SceneTaskEventTransitionPlan, dependencies: SceneTaskEventCommandDependencies): SceneTaskEventEvaluation {
  const snapshot = applySceneExplorationEffects(initial, plan.effects, dependencies)
  return deepFreeze({ ...plan.metadata, effects: plan.effects, snapshot })
}

export function previewSceneTaskEventCommand(snapshot: SceneExplorationSnapshot, input: unknown, dependencies: SceneTaskEventCommandDependencies): SceneTaskEventPreview {
  try {
    const initial = createSceneExplorationSnapshot(snapshot, dependencies)
    const plan = buildSceneTaskEventTransitionPlan(initial, input, dependencies)
    return deepFreeze({ canExecute: true, result: materialize(initial, plan, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) return deepFreeze({ canExecute: false, rejectionCode: error.code })
    throw error
  }
}

export function resolveSceneTaskEventCommand(snapshot: SceneExplorationSnapshot, input: unknown, dependencies: SceneTaskEventCommandDependencies): SceneTaskEventResolution {
  const initial = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = buildSceneTaskEventTransitionPlan(initial, input, dependencies)
  const result = materialize(initial, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}

/** Kept here so effect application can share the single official evaluator. */
export function applySceneTaskEventEffects(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  dependencies: SceneTaskEventCommandDependencies,
): SceneExplorationSnapshot {
  const first = effects[0]
  if (!first) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 不能为空')
  const commandInput = first.kind === 'scene-task-event-declined'
    ? { eventId: first.eventId, optionId: first.optionId }
    : first.kind === 'item-resource-consumed' && first.source === 'pathogen-case-impact-protection'
      ? (() => {
          const acquired = effects.find((effect): effect is Extract<SceneExplorationEffect, { kind: 'scene-task-item-acquired' }> => effect.kind === 'scene-task-item-acquired')
          if (!acquired) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件缺少样本箱取得 Effect')
          return { eventId: acquired.eventId, optionId: acquired.optionId, placement: acquired.placement }
        })()
      : first.kind === 'scene-task-risk-resolved'
        ? (() => {
            const acquired = effects.find((effect): effect is Extract<SceneExplorationEffect, { kind: 'scene-task-item-acquired' }> => effect.kind === 'scene-task-item-acquired')
            if (!acquired) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件缺少样本箱取得 Effect')
            return { eventId: acquired.eventId, optionId: acquired.optionId, placement: acquired.placement }
          })()
        : null
  if (!commandInput) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 主体无效')
  const initial = createSceneExplorationSnapshot(initialSnapshot, dependencies)
  const expected = buildSceneTaskEventTransitionPlan(initial, commandInput, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 与冻结正式计划不一致')
  let state = initial
  for (const effect of effects) {
    switch (effect.kind) {
      case 'item-resource-consumed': {
        if (effect.source !== 'pathogen-case-impact-protection') throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件包含无关资源消耗')
        const current = getItemState(state.itemStates, effect.instanceId)
        const result = consumeCommittedResource(current, effect.requestedCost)
        state = deepFreeze({ ...state, itemStates: replaceItemState(state.itemStates, result.state) })
        break
      }
      case 'scene-task-risk-resolved':
        break
      case 'scene-infection-exposure-added':
        state = deepFreeze({ ...state, condition: addPendingInfectionExposure(state.condition, effect.added) })
        break
      case 'scene-task-item-acquired': {
        const item = createItemInstance({ instanceId: effect.instanceId, definitionId: effect.definitionId, quantity: 1 }, dependencies.physicalCatalog)
        state = deepFreeze({
          ...state,
          backpack: addItemToBackpack(state.backpack, item, { instanceId: item.instanceId, ...effect.placement }, dependencies.physicalCatalog),
          itemStates: { states: [...state.itemStates.states, effect.itemState] },
        })
        break
      }
      case 'run-intel-added':
        state = deepFreeze({ ...state, runIntelLog: addRunIntel(state.runIntelLog, effect.intelId) })
        break
      case 'scene-task-event-completed':
        state = deepFreeze({
          ...state,
          taskEvents: completeSceneTaskEvent(
            state.taskEvents,
            effect.eventId,
            dependencies.taskEventCatalog,
          ),
        })
        break
      case 'scene-task-event-declined':
        break
      case 'scene-time-resolved': state = deepFreeze({ ...state, remainingTime: effect.remainingTimeAfter }); break
      case 'health-lost': state = deepFreeze({ ...state, condition: applyHealthLoss(state.condition, effect.requestedLoss, dependencies.config.combat.player).state }); break
      case 'scene-node-changed': state = deepFreeze({ ...state, currentNodeId: effect.toNodeId }); break
      case 'scene-status-changed': state = deepFreeze({ ...state, status: effect.toStatus }); break
      default: throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件包含无关 Effect')
    }
  }
  return createSceneExplorationSnapshot(state, dependencies)
}
