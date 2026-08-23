import { deepFreeze } from '../config'
import { addMinorContusion, hasMinorContusions } from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, SceneGraphError } from '../scene-graph'
import { createPerformSceneObstacleOptionCommand, createSceneObstaclePrimaryPlan } from '../scene-obstacle'
import { resolveTimedSceneAction } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  PerformSceneObstacleOptionCommand,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneObstacleCommandDependencies,
  SceneObstacleEvaluation,
  SceneObstaclePreview,
  SceneObstacleResolution,
} from './scene-exploration-types'
import type { SceneObstaclePrimaryPlan } from '../scene-obstacle'

function addHealthEffect(
  effects: SceneExplorationEffect[],
  source: 'post-action-bleeding' | 'forced-return-base' | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  if (requestedLoss === 0) return healthBefore
  const actualLoss = Math.min(healthBefore, requestedLoss)
  const healthAfter = healthBefore - actualLoss
  if (actualLoss > 0) {
    effects.push({ kind: 'health-lost', source, requestedLoss, actualLoss, healthBefore, healthAfter })
  }
  return healthAfter
}

function evaluateTimedPlan(
  snapshot: SceneExplorationSnapshot,
  command: PerformSceneObstacleOptionCommand,
  primaryPlan: SceneObstaclePrimaryPlan,
  primaryEffects: readonly SceneExplorationEffect[],
  conditionAfter: SceneExplorationSnapshot['condition'],
  dependencies: SceneObstacleCommandDependencies,
) {
  if (primaryPlan.actionTime === 0) {
    return deepFreeze({
      actionTime: 0,
      riskTrace: primaryPlan.riskTrace,
      returnRoute: null,
      sceneOutcome: null,
      effects: primaryEffects,
    })
  }
  const obstacle = dependencies.obstacleCatalog.get(command.obstacleId)
  const effects: SceneExplorationEffect[] = [...primaryEffects]
  const actionTime = primaryPlan.actionTime
  const backpackWeight = calculateBackpackWeightSubtotal(snapshot.backpack, dependencies.physicalCatalog)
  const enabledAfter = [...getEffectiveEnabledEdgeIds(snapshot, dependencies.edgeAccessCatalog), obstacle.edgeId]
  let returnRoute
  try {
    returnRoute = findReturnRoute({
      graph: dependencies.graph,
      currentNodeId: snapshot.currentNodeId,
      availability: { enabledEdgeIds: [...new Set(enabledAfter)] },
      totalWeight: backpackWeight,
      hasMinorContusion: hasMinorContusions(conditionAfter),
      analgesiaActive: conditionAfter.painkillerActive,
    }, dependencies.config)
  } catch (error) {
    if (error instanceof SceneGraphError) throw new SceneExplorationError('NO_RETURN_ROUTE', error.message)
    throw error
  }
  const currentIsSafety = dependencies.graph.nodes.some(({ id, isReturnSafetyNode }) => id === snapshot.currentNodeId && isReturnSafetyNode)
  const sceneOutcome = resolveTimedSceneAction(
    { remainingTime: snapshot.remainingTime },
    {
      currentHealth: conditionAfter.currentHealth,
      maxHealth: dependencies.config.combat.player.maxHealth,
      bleeding: conditionAfter.bleeding,
    },
    {
      timeCost: actionTime,
      healthAfterPrimaryEffect: conditionAfter.currentHealth,
      bleedingAfterPrimaryEffect: conditionAfter.bleeding,
      estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime,
      endsExplorationAtSafety: false,
      isAtSafetyAfterAction: currentIsSafety,
    },
    {
      postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage,
      forcedReturn: dependencies.config.forcedReturn,
    },
  )
  effects.push({
    kind: 'scene-time-resolved',
    remainingTimeBefore: snapshot.remainingTime,
    actionTimeCost: actionTime,
    remainingTimeAfter: sceneOutcome.clock.remainingTime,
    overtimeDebt: sceneOutcome.overtimeDebt,
  })
  let health = conditionAfter.currentHealth
  health = addHealthEffect(effects, 'post-action-bleeding', sceneOutcome.postActionBleedingDamage, health)
  health = addHealthEffect(effects, 'forced-return-base', sceneOutcome.forcedReturnBaseDamage, health)
  addHealthEffect(effects, 'forced-return-bleeding', sceneOutcome.forcedReturnBleedingDamage, health)
  const status: SceneExplorationStatus = sceneOutcome.kind === 'death'
    ? 'dead'
    : sceneOutcome.kind === 'forced-return'
      ? 'forced-returned'
      : sceneOutcome.kind === 'safe-return'
        ? 'safe-returned'
        : 'active'
  if (status === 'forced-returned') {
    effects.push({
      kind: 'scene-node-changed',
      reason: 'forced-return',
      fromNodeId: snapshot.currentNodeId,
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
      reason: status === 'dead' ? 'death' : status === 'safe-returned' ? 'safe-return' : 'forced-return',
    })
  }
  return deepFreeze({
    actionTime,
    riskTrace: primaryPlan.riskTrace,
    returnRoute,
    sceneOutcome,
    effects,
  })
}

function evaluate(
  input: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneObstacleCommandDependencies,
) {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  const command = createPerformSceneObstacleOptionCommand(commandInput)
  const primaryPlan = createSceneObstaclePrimaryPlan(
    snapshot,
    command,
    dependencies,
  )
  const riskTrace = primaryPlan.riskTrace
  const conditionAfter = riskTrace?.causedMinorContusion
    ? addMinorContusion(snapshot.condition)
    : snapshot.condition
  return evaluateTimedPlan(
    snapshot,
    command,
    primaryPlan,
    primaryPlan.primaryEffects,
    conditionAfter,
    dependencies,
  )
}

/**
 * Builds one hypothetical force-entry outcome using the same formal timed
 * action evaluator as resolution. Hidden deterministic risk facts are removed
 * before the branch is returned.
 */
export function previewSceneObstacleOutcomeBranch(
  input: SceneExplorationSnapshot,
  commandInput: unknown,
  causedMinorContusion: boolean,
  dependencies: SceneObstacleCommandDependencies,
) {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  const command = createPerformSceneObstacleOptionCommand(commandInput)
  const primaryPlan = createSceneObstaclePrimaryPlan(snapshot, command, dependencies)
  const option = dependencies.obstacleCatalog.get(command.obstacleId).options.find(
    ({ id }) => id === command.optionId,
  )
  if (option?.kind !== 'force-entry') {
    throw new SceneExplorationError(
      'UNKNOWN_OBSTACLE_OPTION',
      '只有风险障碍选项能够生成结果分支',
    )
  }
  const safePrimaryEffects = primaryPlan.primaryEffects.filter(
    (effect) => effect.kind !== 'scene-obstacle-risk-resolved' &&
      effect.kind !== 'minor-contusion-added',
  )
  const conditionAfter = causedMinorContusion
    ? addMinorContusion(snapshot.condition)
    : snapshot.condition
  const result = evaluateTimedPlan(
    snapshot,
    command,
    primaryPlan,
    safePrimaryEffects,
    conditionAfter,
    dependencies,
  )
  if (!result.returnRoute || !result.sceneOutcome) {
    throw new SceneExplorationError(
      'UNKNOWN_OBSTACLE_OPTION',
      '风险障碍选项必须产生正式时间结算',
    )
  }
  return deepFreeze({
    actionTime: result.actionTime,
    returnRoute: result.returnRoute,
    sceneOutcome: result.sceneOutcome,
  })
}

function materialize(
  initial: SceneExplorationSnapshot,
  plan: ReturnType<typeof evaluate>,
  command: PerformSceneObstacleOptionCommand,
  dependencies: SceneObstacleCommandDependencies,
): SceneObstacleEvaluation {
  const snapshot = applySceneExplorationEffects(initial, plan.effects, dependencies)
  return deepFreeze({
    obstacleId: command.obstacleId,
    optionId: command.optionId,
    actionTime: plan.actionTime,
    riskTrace: plan.riskTrace,
    returnRoute: plan.returnRoute,
    sceneOutcome: plan.sceneOutcome,
    effects: plan.effects,
    snapshot,
  })
}

export function previewSceneObstacleOptionCommand(
  snapshot: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneObstacleCommandDependencies,
): SceneObstaclePreview {
  try {
    const initial = createSceneExplorationSnapshot(snapshot, dependencies)
    const command = createPerformSceneObstacleOptionCommand(commandInput)
    return deepFreeze({ canExecute: true, result: materialize(initial, evaluate(initial, command, dependencies), command, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) return deepFreeze({ canExecute: false, rejectionCode: error.code })
    throw error
  }
}

export function resolveSceneObstacleOptionCommand(
  snapshot: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneObstacleCommandDependencies,
): SceneObstacleResolution {
  const initial = createSceneExplorationSnapshot(snapshot, dependencies)
  const command = createPerformSceneObstacleOptionCommand(commandInput)
  const result = materialize(initial, evaluate(initial, command, dependencies), command, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
