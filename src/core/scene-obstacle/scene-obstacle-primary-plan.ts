import { deepFreeze } from '../config'
import { createItemInstance } from '../inventory'
import { getItemState, previewCommittedResourceAction } from '../item-state'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { createSceneItemSnapshot, createSearchItemState } from '../scene-search'
import { SceneExplorationError } from '../scene-exploration/scene-exploration-errors'
import { createPerformSceneObstacleOptionCommand } from './scene-obstacle-command'
import type {
  PerformSceneObstacleOptionCommand,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneObstacleCommandDependencies,
} from '../scene-exploration/scene-exploration-types'
import type {
  ObstacleRiskTrace,
  SceneObstaclePrimaryPlan,
} from './scene-obstacle-types'

export function createStableObstacleSpawnInstanceId(
  sceneInstanceId: string,
  eventId: string,
  optionId: string,
  grantIndex: number,
): string {
  return [
    'obstacle',
    sceneInstanceId,
    eventId,
    optionId,
    '0',
    String(grantIndex),
  ]
    .map(encodeURIComponent)
    .join(':')
}

function resourceEffect(
  state: SceneExplorationSnapshot,
  dependencies: SceneObstacleCommandDependencies,
  input: Readonly<{
    equipmentSlot: 'weapon' | 'armor' | 'utility'
    requiredDefinitionId: string
    resourceKind: 'durability' | 'integrity' | 'charge'
    source:
      | 'fire-door-crowbar'
      | 'fire-door-toolkit'
      | 'fire-door-fire-axe'
      | 'fire-door-impact-protection'
    cost: number
  }>,
): Extract<SceneExplorationEffect, { readonly kind: 'item-resource-consumed' }> {
  const item = state.equipment[input.equipmentSlot]
  if (!item || item.definitionId !== input.requiredDefinitionId) {
    throw new SceneExplorationError(
      'OBSTACLE_QUALIFICATION_FAILED',
      '所需装备未装备在指定槽位',
    )
  }
  const itemState = getItemState(state.itemStates, item.instanceId)
  if (itemState.resource.kind !== input.resourceKind) {
    throw new SceneExplorationError(
      'OBSTACLE_QUALIFICATION_FAILED',
      '装备资源类型不符',
    )
  }
  const preview = previewCommittedResourceAction(itemState, input.cost)
  if (!preview.allowed || preview.kind !== input.resourceKind) {
    throw new SceneExplorationError(
      'OBSTACLE_QUALIFICATION_FAILED',
      '装备资源不足',
    )
  }
  return {
    kind: 'item-resource-consumed',
    source: input.source,
    equipmentSlot: input.equipmentSlot,
    instanceId: item.instanceId,
    definitionId: item.definitionId,
    resourceKind: preview.kind,
    currentBefore: preview.currentBefore,
    requestedCost: preview.requestedCost,
    consumed: preview.consumed,
    currentAfter: preview.currentAfter,
    depleted: preview.depleted,
  }
}

export function createSceneObstaclePrimaryPlan(
  snapshot: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneObstacleCommandDependencies,
): SceneObstaclePrimaryPlan {
  const command = createPerformSceneObstacleOptionCommand(commandInput)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景已终止')
  }
  if (!dependencies.obstacleCatalog.has(command.obstacleId)) {
    throw new SceneExplorationError('UNKNOWN_OBSTACLE', '未知场景障碍')
  }
  const obstacle = dependencies.obstacleCatalog.get(command.obstacleId)
  if (!obstacle.endpointNodeIds.includes(snapshot.currentNodeId)) {
    throw new SceneExplorationError(
      'OBSTACLE_NOT_AT_CURRENT_NODE',
      '当前节点不是障碍端点',
    )
  }
  if (snapshot.enabledEdgeIds.includes(obstacle.edgeId)) {
    throw new SceneExplorationError(
      'OBSTACLE_ALREADY_RESOLVED',
      '场景障碍已经处理',
    )
  }
  const option = obstacle.options.find(({ id }) => id === command.optionId)
  if (!option) {
    throw new SceneExplorationError('UNKNOWN_OBSTACLE_OPTION', '未知障碍选项')
  }
  if (option.kind === 'decline') {
    return deepFreeze({
      obstacleId: obstacle.id,
      optionId: option.id,
      actionTime: 0,
      outcomeMetadata: {
        setsAlert: false,
        alertReason: null,
        impactProtectionActive: false,
        effectiveInjuryRiskPercent: null,
      },
      riskTrace: null,
      primaryEffects: [{
        kind: 'scene-obstacle-declined',
        obstacleId: obstacle.id,
        optionId: option.id,
        nodeId: snapshot.currentNodeId,
        edgeId: obstacle.edgeId,
      }],
    })
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError(
      'PLAYER_DEAD',
      '死亡玩家不能处理障碍',
    )
  }
  if (snapshot.remainingTime === 0) {
    throw new SceneExplorationError(
      'SCENE_TIME_EXHAUSTED',
      '场景时间已耗尽',
    )
  }

  const effects: SceneExplorationEffect[] = []
  let riskTrace: ObstacleRiskTrace | null = null
  const resourceCost =
    dependencies.config.scene.fireDoor.equippedItemResourceCost

  if (option.kind === 'backpack-item') {
    if (
      !snapshot.backpack.items.some(
        ({ definitionId }) => definitionId === option.requiredDefinitionId,
      )
    ) {
      throw new SceneExplorationError(
        'OBSTACLE_QUALIFICATION_FAILED',
        '背包中缺少所需权限物品',
      )
    }
  } else if (option.kind === 'equipped-resource') {
    effects.push(
      resourceEffect(snapshot, dependencies, {
        equipmentSlot: option.equipmentSlot,
        requiredDefinitionId: option.requiredDefinitionId,
        resourceKind: option.resourceKind,
        source: option.resourceSource,
        cost: resourceCost,
      }),
    )
  } else {
    const armor = snapshot.equipment.armor
    if (armor?.definitionId === option.protectionDefinitionId) {
      const state = getItemState(snapshot.itemStates, armor.instanceId)
      if (
        state.resource.kind === option.protectionResourceKind &&
        state.resource.current >= 1
      ) {
        effects.push(
          resourceEffect(snapshot, dependencies, {
            equipmentSlot: 'armor',
            requiredDefinitionId: option.protectionDefinitionId,
            resourceKind: option.protectionResourceKind,
            source: 'fire-door-impact-protection',
            cost: dependencies.config.scene.fireDoor
              .impactProtectionIntegrityCost,
          }),
        )
      }
    }
  }

  effects.push({
    kind: 'scene-edge-enabled',
    obstacleId: obstacle.id,
    edgeId: obstacle.edgeId,
    nodeId: snapshot.currentNodeId,
    optionId: option.id,
  })

  if (option.kind === 'equipped-resource') {
    option.spawnGrants.forEach((grant, grantIndex) => {
      const item = createItemInstance(
        {
          instanceId: createStableObstacleSpawnInstanceId(
            snapshot.sceneInstanceId,
            obstacle.eventId,
            option.id,
            grantIndex,
          ),
          definitionId: grant.definitionId,
          quantity: grant.quantity,
        },
        dependencies.physicalCatalog,
      )
      effects.push({
        kind: 'scene-item-spawned',
        nodeId: snapshot.currentNodeId,
        sourceEventId: obstacle.eventId,
        sourceOptionId: option.id,
        entity: createSceneItemSnapshot(
          {
            item,
            state: createSearchItemState(
              item,
              grant.initialState,
              dependencies.itemResourceCatalog,
            ),
          },
          dependencies.physicalCatalog,
          dependencies.itemResourceCatalog,
        ),
      })
    })
  }

  const impactProtectionActive = option.kind === 'force-entry' && effects.some(
    (effect) =>
      effect.kind === 'item-resource-consumed' &&
      effect.source === 'fire-door-impact-protection',
  )
  const alertReason = option.kind === 'force-entry'
    ? 'fire-door-force-entry' as const
    : option.kind === 'equipped-resource' && option.setsAlert
      ? 'fire-door-fire-axe' as const
      : null
  const outcomeMetadata = deepFreeze({
    setsAlert: alertReason !== null,
    alertReason,
    impactProtectionActive,
    effectiveInjuryRiskPercent: option.kind === 'force-entry'
      ? impactProtectionActive
        ? dependencies.config.scene.fireDoor.protectedForceEntryInjuryRiskPercent
        : dependencies.config.scene.fireDoor.forceEntryInjuryRiskPercent
      : null,
  })
  if (outcomeMetadata.setsAlert && snapshot.alertState === 'unalerted') {
    if (outcomeMetadata.alertReason === null) {
      throw new SceneExplorationError(
        'UNKNOWN_OBSTACLE_OPTION',
        '警觉障碍选项必须拥有正式警觉原因',
      )
    }
    effects.push({
      kind: 'scene-alert-changed',
      fromAlertState: 'unalerted',
      toAlertState: 'alerted',
      reason: outcomeMetadata.alertReason,
    })
  }

  if (option.kind === 'force-entry') {
    const riskPercent = outcomeMetadata.effectiveInjuryRiskPercent
    if (riskPercent === null) {
      throw new SceneExplorationError(
        'UNKNOWN_OBSTACLE_OPTION',
        '强行撞门必须拥有正式有效伤势风险',
      )
    }
    const streamId = createStreamId(
      'scene-obstacle',
      snapshot.sceneInstanceId,
      obstacle.eventId,
      option.id,
      '0',
      'injury-risk',
    )
    const draw = drawIntInclusive(
      createRandomCursor(dependencies.runSeed, streamId),
      1,
      100,
    )
    const causedMinorContusion = draw.value <= riskPercent
    riskTrace = deepFreeze({
      algorithmVersion: RANDOM_ALGORITHM_VERSION,
      streamId,
      drawIndex: draw.nextCursor.drawIndex - 1,
      roll: draw.value,
      riskPercent,
      causedMinorContusion,
      usedImpactProtection: outcomeMetadata.impactProtectionActive,
    })
    effects.push({
      kind: 'scene-obstacle-risk-resolved',
      obstacleId: obstacle.id,
      optionId: option.id,
      ...riskTrace,
    })
    if (causedMinorContusion) {
      effects.push({
        kind: 'minor-contusion-added',
        source: 'fire-door-force-entry',
        countBefore: snapshot.condition.minorContusions,
        added: 1,
        countAfter: snapshot.condition.minorContusions + 1,
      })
    }
  }

  return deepFreeze({
    obstacleId: obstacle.id,
    optionId: option.id,
    actionTime: dependencies.config.scene.fireDoor[option.timeKey],
    outcomeMetadata,
    riskTrace,
    primaryEffects: effects,
  })
}
