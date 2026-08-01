import { deepFreeze } from '../config'
import { addMinorContusion, hasMinorContusions } from '../condition'
import { calculateBackpackWeightSubtotal, createItemInstance } from '../inventory'
import { getItemState, previewCommittedResourceAction } from '../item-state'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, SceneGraphError } from '../scene-graph'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { resolveTimedSceneAction } from '../scene'
import { createSceneItemSnapshot, createSearchItemState } from '../scene-search'
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

function stableSpawnInstanceId(
  sceneInstanceId: string,
  eventId: string,
  optionId: string,
  grantIndex: number,
): string {
  return ['obstacle', sceneInstanceId, eventId, optionId, '0', String(grantIndex)]
    .map(encodeURIComponent)
    .join(':')
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
  if (actualLoss > 0) {
    effects.push({ kind: 'health-lost', source, requestedLoss, actualLoss, healthBefore, healthAfter })
  }
  return healthAfter
}

function evaluate(
  input: SceneExplorationSnapshot,
  command: PerformSceneObstacleOptionCommand,
  dependencies: SceneObstacleCommandDependencies,
) {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  if (snapshot.status !== 'active') throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景已终止')
  if (!dependencies.obstacleCatalog.has(command.obstacleId)) {
    throw new SceneExplorationError('UNKNOWN_OBSTACLE', '未知场景障碍')
  }
  const obstacle = dependencies.obstacleCatalog.get(command.obstacleId)
  if (!obstacle.endpointNodeIds.includes(snapshot.currentNodeId)) {
    throw new SceneExplorationError('OBSTACLE_NOT_AT_CURRENT_NODE', '当前节点不是障碍端点')
  }
  if (snapshot.enabledEdgeIds.includes(obstacle.edgeId)) {
    throw new SceneExplorationError('OBSTACLE_ALREADY_RESOLVED', '场景障碍已经处理')
  }
  const option = obstacle.options.find(({ id }) => id === command.optionId)
  if (!option) throw new SceneExplorationError('UNKNOWN_OBSTACLE_OPTION', '未知障碍选项')
  if (option.kind === 'decline') {
    const effects: readonly SceneExplorationEffect[] = deepFreeze([{
      kind: 'scene-obstacle-declined',
      obstacleId: obstacle.id,
      optionId: option.id,
      nodeId: snapshot.currentNodeId,
      edgeId: obstacle.edgeId,
    }])
    return deepFreeze({ actionTime: 0, riskTrace: null, effects })
  }
  if (snapshot.condition.currentHealth === 0) throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能处理障碍')
  if (snapshot.remainingTime === 0) throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间已耗尽')

  const effects: SceneExplorationEffect[] = []
  let riskTrace = null
  let conditionAfter = snapshot.condition
  const resourceCost = dependencies.config.scene.fireDoor.equippedItemResourceCost
  if (option.kind === 'backpack-item') {
    if (!snapshot.backpack.items.some(({ definitionId }) => definitionId === option.requiredDefinitionId)) {
      throw new SceneExplorationError('OBSTACLE_QUALIFICATION_FAILED', '背包中缺少所需权限物品')
    }
  } else if (option.kind === 'equipped-resource') {
    const item = snapshot.equipment[option.equipmentSlot]
    if (!item || item.definitionId !== option.requiredDefinitionId) {
      throw new SceneExplorationError('OBSTACLE_QUALIFICATION_FAILED', '所需装备未装备在指定槽位')
    }
    const state = getItemState(snapshot.itemStates, item.instanceId)
    if (state.resource.kind !== option.resourceKind) {
      throw new SceneExplorationError('OBSTACLE_QUALIFICATION_FAILED', '装备资源类型不符')
    }
    const preview = previewCommittedResourceAction(state, resourceCost)
    if (!preview.allowed || preview.kind !== option.resourceKind) {
      throw new SceneExplorationError('OBSTACLE_QUALIFICATION_FAILED', '装备资源不足')
    }
    effects.push({
      kind: 'item-resource-consumed',
      source: option.resourceSource,
      equipmentSlot: option.equipmentSlot,
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      resourceKind: preview.kind,
      currentBefore: preview.currentBefore,
      requestedCost: preview.requestedCost,
      consumed: preview.consumed,
      currentAfter: preview.currentAfter,
      depleted: preview.depleted,
    })
  } else {
    const armor = snapshot.equipment.armor
    let protectedByCoat = false
    if (armor?.definitionId === option.protectionDefinitionId) {
      const state = getItemState(snapshot.itemStates, armor.instanceId)
      if (state.resource.kind === option.protectionResourceKind && state.resource.current >= 1) {
        protectedByCoat = true
        const cost = dependencies.config.scene.fireDoor.impactProtectionIntegrityCost
        const preview = previewCommittedResourceAction(state, cost)
        if (!preview.allowed || preview.kind !== 'integrity') {
          throw new SceneExplorationError('OBSTACLE_QUALIFICATION_FAILED', '防护装备完整度状态无效')
        }
        effects.push({
          kind: 'item-resource-consumed',
          source: 'fire-door-impact-protection',
          equipmentSlot: 'armor',
          instanceId: armor.instanceId,
          definitionId: armor.definitionId,
          resourceKind: preview.kind,
          currentBefore: preview.currentBefore,
          requestedCost: preview.requestedCost,
          consumed: preview.consumed,
          currentAfter: preview.currentAfter,
          depleted: preview.depleted,
        })
      }
    }
    const riskPercent = protectedByCoat
      ? dependencies.config.scene.fireDoor.protectedForceEntryInjuryRiskPercent
      : dependencies.config.scene.fireDoor.forceEntryInjuryRiskPercent
    const streamId = createStreamId(
      'scene-obstacle',
      snapshot.sceneInstanceId,
      obstacle.eventId,
      option.id,
      '0',
      'injury-risk',
    )
    const draw = drawIntInclusive(createRandomCursor(dependencies.runSeed, streamId), 1, 100)
    const causedMinorContusion = draw.value <= riskPercent
    riskTrace = deepFreeze({
      algorithmVersion: RANDOM_ALGORITHM_VERSION,
      streamId,
      drawIndex: draw.nextCursor.drawIndex - 1,
      roll: draw.value,
      riskPercent,
      causedMinorContusion,
      usedImpactProtection: protectedByCoat,
    })
    if (causedMinorContusion) conditionAfter = addMinorContusion(conditionAfter)
  }

  effects.push({
    kind: 'scene-edge-enabled',
    obstacleId: obstacle.id,
    edgeId: obstacle.edgeId,
    nodeId: snapshot.currentNodeId,
    optionId: option.id,
  })
  if (option.kind === 'equipped-resource') {
    option.spawnGrants.forEach((grant, index) => {
      const item = createItemInstance({
        instanceId: stableSpawnInstanceId(snapshot.sceneInstanceId, obstacle.eventId, option.id, index),
        definitionId: grant.definitionId,
        quantity: grant.quantity,
      }, dependencies.physicalCatalog)
      effects.push({
        kind: 'scene-item-spawned',
        nodeId: snapshot.currentNodeId,
        sourceEventId: obstacle.eventId,
        sourceOptionId: option.id,
        entity: createSceneItemSnapshot({
          item,
          state: createSearchItemState(item, grant.initialState, dependencies.itemResourceCatalog),
        }, dependencies.physicalCatalog, dependencies.itemResourceCatalog),
      })
    })
  }
  const setsAlert = option.kind === 'force-entry' ||
    (option.kind === 'equipped-resource' && option.setsAlert)
  if (setsAlert && snapshot.alertState === 'unalerted') {
    effects.push({
      kind: 'scene-alert-changed',
      fromAlertState: 'unalerted',
      toAlertState: 'alerted',
      reason: option.kind === 'force-entry' ? 'fire-door-force-entry' : 'fire-door-fire-axe',
    })
  }
  if (option.kind === 'force-entry' && riskTrace?.causedMinorContusion) {
    effects.push({
      kind: 'minor-contusion-added',
      source: 'fire-door-force-entry',
      countBefore: snapshot.condition.minorContusions,
      added: 1,
      countAfter: snapshot.condition.minorContusions + 1,
    })
  }

  const actionTime = dependencies.config.scene.fireDoor[option.timeKey]
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
      reachesElevatorSafety: currentIsSafety,
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
  return deepFreeze({ actionTime, riskTrace, effects })
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
    effects: plan.effects,
    snapshot,
  })
}

export function previewSceneObstacleOptionCommand(
  snapshot: SceneExplorationSnapshot,
  command: PerformSceneObstacleOptionCommand,
  dependencies: SceneObstacleCommandDependencies,
): SceneObstaclePreview {
  try {
    const initial = createSceneExplorationSnapshot(snapshot, dependencies)
    return deepFreeze({ canExecute: true, result: materialize(initial, evaluate(initial, command, dependencies), command, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) return deepFreeze({ canExecute: false, rejectionCode: error.code })
    throw error
  }
}

export function resolveSceneObstacleOptionCommand(
  snapshot: SceneExplorationSnapshot,
  command: PerformSceneObstacleOptionCommand,
  dependencies: SceneObstacleCommandDependencies,
): SceneObstacleResolution {
  const initial = createSceneExplorationSnapshot(snapshot, dependencies)
  const result = materialize(initial, evaluate(initial, command, dependencies), command, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
