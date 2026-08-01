import { deepFreeze } from '../config'
import {
  hasMinorContusions,
} from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { calculateAdjustedTravelTime, classifyLoad } from '../load'
import {
  findReturnRoute,
  getSceneEdgeTraversal,
  SceneGraphError,
} from '../scene-graph'
import { resolveTimedSceneAction } from '../scene'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  MoveThroughSceneEdgeCommand,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneMoveEffect,
  SceneMoveEvaluation,
  SceneMovePreview,
  SceneMoveResolution,
  SceneMoveTransitionPlan,
} from './scene-exploration-types'

function graphFailure(error: unknown): never {
  if (!(error instanceof SceneGraphError)) throw error
  const mapping = {
    INVALID_EDGE: 'UNKNOWN_EDGE',
    UNKNOWN_EDGE: 'UNKNOWN_EDGE',
    EDGE_NOT_ENABLED: 'EDGE_NOT_ENABLED',
    EDGE_NOT_CONNECTED: 'EDGE_NOT_CONNECTED',
    UNKNOWN_NODE: 'INVALID_CURRENT_NODE',
    UNKNOWN_ENABLED_EDGE: 'INVALID_INPUT',
    DUPLICATE_ENABLED_EDGE: 'INVALID_INPUT',
    NO_RETURN_ROUTE: 'NO_RETURN_ROUTE',
  } as const
  throw new SceneExplorationError(
    mapping[error.code as keyof typeof mapping] ?? 'INVALID_INPUT',
    error.message,
  )
}

function addHealthEffect(
  effects: SceneMoveEffect[],
  source: 'post-action-bleeding' | 'forced-return-base' | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  if (requestedLoss === 0) return healthBefore
  const actualLoss = Math.min(healthBefore, requestedLoss)
  const healthAfter = healthBefore - actualLoss
  if (actualLoss > 0) {
    effects.push({
      kind: 'health-lost',
      source,
      requestedLoss,
      actualLoss,
      healthBefore,
      healthAfter,
    })
  }
  return healthAfter
}

function evaluate(
  snapshotInput: SceneExplorationSnapshot,
  command: MoveThroughSceneEdgeCommand,
  dependencies: SceneExplorationDependencies,
): SceneMoveTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景已终止')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能移动')
  }
  if (snapshot.remainingTime === 0) {
    throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间已耗尽')
  }
  if (command.edgeId.trim().length === 0) {
    throw new SceneExplorationError('INVALID_EDGE_ID', '边ID不能为空')
  }

  let traversal
  const effectiveEnabledEdgeIds = getEffectiveEnabledEdgeIds(
    snapshot,
    dependencies.edgeAccessCatalog,
  )
  try {
    traversal = getSceneEdgeTraversal(
      dependencies.graph,
      command.edgeId,
      snapshot.currentNodeId,
      { enabledEdgeIds: effectiveEnabledEdgeIds },
    )
  } catch (error) {
    graphFailure(error)
  }

  const backpackWeight = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const load = classifyLoad(backpackWeight, dependencies.config.backpack)
  if (!load.canCarry) {
    throw new SceneExplorationError('CANNOT_CARRY', '无法携带状态不能移动')
  }
  const hasMinorContusion = hasMinorContusions(snapshot.condition)
  const movementAdjustment = calculateAdjustedTravelTime(
    {
      baseTime: traversal.edge.baseTravelTime,
      totalWeight: backpackWeight,
      hasMinorContusion,
      analgesiaActive: snapshot.condition.painkillerActive,
    },
    dependencies.config,
  )
  let returnRoute
  try {
    returnRoute = findReturnRoute(
      {
        graph: dependencies.graph,
        currentNodeId: traversal.toNodeId,
        availability: { enabledEdgeIds: effectiveEnabledEdgeIds },
        totalWeight: backpackWeight,
        hasMinorContusion,
        analgesiaActive: snapshot.condition.painkillerActive,
      },
      dependencies.config,
    )
  } catch (error) {
    graphFailure(error)
  }
  const destinationIsSafetyNode = dependencies.graph.nodes.some(
    (node) => node.id === traversal.toNodeId && node.isReturnSafetyNode,
  )
  const sceneOutcome = resolveTimedSceneAction(
    { remainingTime: snapshot.remainingTime },
    {
      currentHealth: snapshot.condition.currentHealth,
      maxHealth: dependencies.config.combat.player.maxHealth,
      bleeding: snapshot.condition.bleeding,
    },
    {
      timeCost: movementAdjustment.finalTime,
      healthAfterPrimaryEffect: snapshot.condition.currentHealth,
      bleedingAfterPrimaryEffect: snapshot.condition.bleeding,
      estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime,
      reachesElevatorSafety: destinationIsSafetyNode,
    },
    {
      postActionBleedingDamage:
        dependencies.config.scene.postActionBleedingDamage,
      forcedReturn: dependencies.config.forcedReturn,
    },
  )

  const effects: SceneMoveEffect[] = [
    {
      kind: 'scene-node-changed',
      reason: 'movement',
      fromNodeId: snapshot.currentNodeId,
      toNodeId: traversal.toNodeId,
      edgeId: command.edgeId,
    },
    {
      kind: 'scene-time-resolved',
      remainingTimeBefore: snapshot.remainingTime,
      actionTimeCost: movementAdjustment.finalTime,
      remainingTimeAfter: sceneOutcome.clock.remainingTime,
      overtimeDebt: sceneOutcome.overtimeDebt,
    },
  ]
  let effectHealth = snapshot.condition.currentHealth
  effectHealth = addHealthEffect(
    effects,
    'post-action-bleeding',
    sceneOutcome.postActionBleedingDamage,
    effectHealth,
  )
  effectHealth = addHealthEffect(
    effects,
    'forced-return-base',
    sceneOutcome.forcedReturnBaseDamage,
    effectHealth,
  )
  addHealthEffect(
    effects,
    'forced-return-bleeding',
    sceneOutcome.forcedReturnBleedingDamage,
    effectHealth,
  )

  const status: SceneExplorationStatus =
    sceneOutcome.kind === 'death'
      ? 'dead'
      : sceneOutcome.kind === 'safe-return'
        ? 'safe-returned'
        : sceneOutcome.kind === 'forced-return'
          ? 'forced-returned'
          : 'active'
  if (status === 'forced-returned') {
    effects.push({
      kind: 'scene-node-changed',
      reason: 'forced-return',
      fromNodeId: traversal.toNodeId,
      toNodeId: returnRoute.safetyNodeId,
      routeNodeIds: [...returnRoute.nodeIds],
      routeEdgeIds: [...returnRoute.edgeIds],
    })
  }
  if (status !== snapshot.status) {
    effects.push({
      kind: 'scene-status-changed',
      fromStatus: snapshot.status,
      toStatus: status,
      reason:
        status === 'dead'
          ? 'death'
          : status === 'safe-returned'
            ? 'safe-return'
            : 'forced-return',
    })
  }
  return deepFreeze({
    command: { ...command },
    metadata: {
      originNodeId: snapshot.currentNodeId,
      destinationNodeId: traversal.toNodeId,
      edgeId: command.edgeId,
      baseMovementTime: traversal.edge.baseTravelTime,
      finalMovementTime: movementAdjustment.finalTime,
      backpackWeight,
      loadTier: movementAdjustment.loadTier,
      minorContusionModifierApplied:
        movementAdjustment.minorContusionModifierApplied,
      movementAdjustment,
      returnRoute,
      sceneOutcome,
    },
    effects,
  })
}

function materializeEvaluation(
  initialSnapshot: SceneExplorationSnapshot,
  plan: SceneMoveTransitionPlan,
  dependencies: SceneExplorationDependencies,
): SceneMoveEvaluation {
  const snapshot = applySceneExplorationEffects(
    initialSnapshot,
    plan.effects,
    dependencies,
  )
  return deepFreeze({
    ...plan.metadata,
    effects: plan.effects,
    snapshot,
  })
}

export function previewSceneMoveCommand(
  snapshot: SceneExplorationSnapshot,
  command: MoveThroughSceneEdgeCommand,
  dependencies: SceneExplorationDependencies,
): SceneMovePreview {
  try {
    const initialSnapshot = createSceneExplorationSnapshot(
      snapshot,
      dependencies,
    )
    const plan = evaluate(initialSnapshot, command, dependencies)
    return deepFreeze({
      canExecute: true,
      result: materializeEvaluation(initialSnapshot, plan, dependencies),
    })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}

export function resolveSceneMoveCommand(
  snapshot: SceneExplorationSnapshot,
  command: MoveThroughSceneEdgeCommand,
  dependencies: SceneExplorationDependencies,
): SceneMoveResolution {
  const initialSnapshot = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = evaluate(initialSnapshot, command, dependencies)
  const result = materializeEvaluation(initialSnapshot, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
