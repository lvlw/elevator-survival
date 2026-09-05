import { createFirstCombatEncounter, createReentryCombatEncounter } from '../combat'
import { deepFreeze } from '../config'
import { hasMinorContusions } from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { calculateAdjustedTravelTime, classifyLoad } from '../load'
import { resolveTimedSceneAction } from '../scene'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { applyPlayerNavigationArrival } from '../scene-navigation'
import {
  getSceneEdgeTraversal,
  SceneGraphError,
} from '../scene-graph'
import { createMoveThroughSceneEdgeCommand } from './scene-move-command'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { findPlayerKnownReturnRoute } from './scene-navigation-return'
import type {
  MoveThroughSceneEdgeCommand,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneMoveEffect,
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

export function buildSceneMoveTransitionPlan(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: MoveThroughSceneEdgeCommand,
  dependencies: SceneExplorationDependencies,
): SceneMoveTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const command = createMoveThroughSceneEdgeCommand(commandInput)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景当前不允许移动')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能移动')
  }
  if (snapshot.remainingTime === 0) {
    throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间已耗尽')
  }
  const effectiveEnabledEdgeIds = getEffectiveEnabledEdgeIds(
    snapshot,
    dependencies.edgeAccessCatalog,
  )
  if (!dependencies.graph.edges.some(({ id }) => id === command.edgeId)) {
    throw new SceneExplorationError('UNKNOWN_EDGE', `未知边：${command.edgeId}`)
  }
  if (!snapshot.navigationKnowledge.knownEdgeIds.includes(command.edgeId)) {
    throw new SceneExplorationError('EDGE_NOT_KNOWN', '玩家尚未发现该路线')
  }
  let traversal
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
  const movementAdjustment = calculateAdjustedTravelTime({
    baseTime: traversal.edge.baseTravelTime,
    totalWeight: backpackWeight,
    hasMinorContusion,
    analgesiaActive: snapshot.condition.painkillerActive,
  }, dependencies.config)
  const navigationArrival = applyPlayerNavigationArrival(
    snapshot.navigationKnowledge,
    traversal.toNodeId,
    dependencies.graph,
    dependencies.navigationCatalog,
  )
  let returnRoute
  try {
    returnRoute = findPlayerKnownReturnRoute(snapshot, dependencies, {
      currentNodeId: traversal.toNodeId,
      navigationKnowledge: navigationArrival.knowledge,
    })
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
      endsExplorationAtSafety: destinationIsSafetyNode,
      isAtSafetyAfterAction: destinationIsSafetyNode,
    },
    {
      postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage,
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
  ]
  if (
    navigationArrival.delta.addedDiscoveredNodeIds.length > 0 ||
    navigationArrival.delta.addedVisitedNodeIds.length > 0 ||
    navigationArrival.delta.addedKnownEdgeIds.length > 0
  ) {
    effects.push({
      kind: 'scene-navigation-knowledge-updated',
      reason: 'first-arrival',
      ...navigationArrival.delta,
    })
  }
  effects.push({
      kind: 'scene-time-resolved',
      remainingTimeBefore: snapshot.remainingTime,
      actionTimeCost: movementAdjustment.finalTime,
      remainingTimeAfter: sceneOutcome.clock.remainingTime,
      overtimeDebt: sceneOutcome.overtimeDebt,
    })
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
  if (status === 'active' && dependencies.sceneCombat) {
    const definition = dependencies.sceneCombat.encounterCatalog.getByNodeId(
      traversal.toNodeId,
    )
    const encounter = definition
      ? snapshot.combatState.encounters.find(
          ({ encounterId }) => encounterId === definition.id,
        )
      : null
    if (definition && encounter?.kind === 'dormant' && !encounter.enemy.defeated) {
      const combatInput = {
        playerCondition: { ...snapshot.condition, currentHealth: effectHealth },
        backpack: snapshot.backpack,
        equipment: snapshot.equipment,
        quickSlots: snapshot.quickSlots,
        itemStates: snapshot.itemStates,
        enemy: encounter.enemy,
        usage: snapshot.combatState.usage,
      }
      const combat = encounter.enemy.hasBeenEncountered
        ? createReentryCombatEncounter(combatInput, dependencies.sceneCombat.combat)
        : createFirstCombatEncounter(
            combatInput,
            snapshot.alertState,
            dependencies.sceneCombat.combat,
          )
      effects.push({
        kind: 'scene-combat-started',
        encounterId: definition.id,
        eventId: definition.eventId,
        nodeId: definition.nodeId,
        returnNodeId: snapshot.currentNodeId,
        entryEdgeId: traversal.edge.id,
        enemyInstanceId: encounter.enemy.enemyInstanceId,
        engagement: encounter.enemy.hasBeenEncountered ? 'reentry' : 'first-entry',
        combat,
      })
      effects.push({
        kind: 'scene-status-changed',
        fromStatus: 'active',
        toStatus: 'combat',
        reason: 'combat-started',
      })
    }
  }
  return deepFreeze({
    command,
    metadata: {
      originNodeId: snapshot.currentNodeId,
      destinationNodeId: traversal.toNodeId,
      edgeId: command.edgeId,
      baseMovementTime: traversal.edge.baseTravelTime,
      finalMovementTime: movementAdjustment.finalTime,
      backpackWeight,
      loadTier: movementAdjustment.loadTier,
      minorContusionModifierApplied: movementAdjustment.minorContusionModifierApplied,
      movementAdjustment,
      returnRoute,
      sceneOutcome,
    },
    effects,
  })
}
