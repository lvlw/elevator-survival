import { deepFreeze } from '../config'
import {
  addMinorContusion,
  applyHealthLoss,
  type PlayerHealthRules,
} from '../condition'
import {
  addItemToBackpack,
  calculateBackpackWeightSubtotal,
  createItemInstance,
} from '../inventory'
import {
  consumeCommittedResource,
  createItemState,
  createItemStateCollectionSnapshot,
  getItemState,
  replaceItemState,
} from '../item-state'
import { classifyLoad } from '../load'
import {
  addSceneItems,
  getSceneNodeItems,
  removeSceneItemQuantity,
} from '../scene-items'
import {
  createSceneItemSnapshot,
  revealPreparedMainSearchOutcome,
} from '../scene-search'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  SceneExplorationEffect,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

const HEALTH_SOURCE_ORDER = [
  'post-action-bleeding',
  'forced-return-base',
  'forced-return-bleeding',
] as const

function fail(
  code:
    | 'INVALID_EFFECT_ORDER'
    | 'EFFECT_NODE_MISMATCH'
    | 'EFFECT_TIME_MISMATCH'
    | 'EFFECT_HEALTH_MISMATCH'
    | 'EFFECT_STATUS_MISMATCH'
    | 'EFFECT_HEALTH_RESULT_MISMATCH'
    | 'EFFECT_RESOURCE_MISMATCH'
    | 'EFFECT_SEARCH_MISMATCH'
    | 'EFFECT_PICKUP_MISMATCH'
    | 'EFFECT_OBSTACLE_MISMATCH'
    | 'EFFECT_ALERT_MISMATCH'
    | 'EFFECT_CONTUSION_MISMATCH'
    | 'EFFECT_SPAWN_MISMATCH'
    | 'INCOMPLETE_EFFECT_PLAN',
  message: string,
): never {
  throw new SceneExplorationError(code, message)
}

function summarizeRevealedItems(
  items: readonly Readonly<{
    definitionId: string
    quantity: number
  }>[],
): readonly Readonly<{ definitionId: string; quantity: number }>[] {
  const quantities = new Map<string, number>()
  for (const item of items) {
    quantities.set(
      item.definitionId,
      (quantities.get(item.definitionId) ?? 0) + item.quantity,
    )
  }
  return [...quantities.entries()]
    .map(([definitionId, quantity]) => ({ definitionId, quantity }))
    .sort((left, right) => left.definitionId.localeCompare(right.definitionId))
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function applySceneExplorationEffects(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  rulesOrDependencies: PlayerHealthRules | SceneExplorationDependencies,
): SceneExplorationSnapshot {
  const dependencies =
    'graph' in rulesOrDependencies ? rulesOrDependencies : null
  const healthRules = dependencies
    ? dependencies.config.combat.player
    : (rulesOrDependencies as PlayerHealthRules)
  if (effects.length === 0) {
    throw new SceneExplorationError('EMPTY_EFFECTS', 'Effect计划不能为空')
  }
  const declaredHealthOrder = effects
    .filter((effect) => effect.kind === 'health-lost')
    .map((effect) => HEALTH_SOURCE_ORDER.indexOf(effect.source))
  if (
    declaredHealthOrder.some(
      (order, index) =>
        order < 0 ||
        (index > 0 && order <= declaredHealthOrder[index - 1]),
    )
  ) {
    throw new SceneExplorationError(
      'INVALID_EFFECT_ORDER',
      '生命损失来源顺序非法或重复',
    )
  }

  let state = deepFreeze({
    ...initialSnapshot,
    searchState: initialSnapshot.searchState,
    sceneItems: initialSnapshot.sceneItems,
    equipment: initialSnapshot.equipment,
    quickSlots: initialSnapshot.quickSlots,
    itemStates: initialSnapshot.itemStates,
    enabledEdgeIds: [...initialSnapshot.enabledEdgeIds],
    backpack: {
      ...initialSnapshot.backpack,
      items: initialSnapshot.backpack.items.map((item) => ({ ...item })),
      placements: initialSnapshot.backpack.placements.map((placement) => ({
        ...placement,
      })),
    },
    condition: { ...initialSnapshot.condition },
  })
  let primaryKind: 'movement' | 'main-search' | 'pickup' | 'obstacle' | 'decline' | null = null
  let sawResourceConsumption = false
  let consumedResourceEffect: Extract<
    SceneExplorationEffect,
    { readonly kind: 'item-resource-consumed' }
  > | null = null
  let activeObstacleId: string | null = null
  let activeObstacleOptionId: string | null = null
  let sawTime = false
  let sawForcedReturn = false
  let sawStatus = false
  let lastHealthOrder = -1

  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index] as SceneExplorationEffect & {
      readonly kind: string
    }
    if (sawStatus) {
      fail('INVALID_EFFECT_ORDER', '状态变化必须是最后一个Effect')
    }

    switch (effect.kind) {
      case 'scene-item-picked-up': {
        if (
          index !== 0 ||
          effects.length !== 1 ||
          primaryKind !== null ||
          sawResourceConsumption ||
          sawTime
        ) {
          fail('INVALID_EFFECT_ORDER', '拾取Effect必须是唯一Effect')
        }
        if (!dependencies) {
          fail(
            'EFFECT_PICKUP_MISMATCH',
            '拾取Effect回放需要完整场景探索依赖',
          )
        }
        if (
          effect.nodeId !== state.currentNodeId ||
          state.status !== 'active' ||
          state.condition.currentHealth === 0
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect的场景状态无效')
        }
        const source = getSceneNodeItems(
          state.sceneItems,
          effect.nodeId,
        ).find(
          (entity) =>
            entity.item.instanceId === effect.sourceInstanceId,
        )
        if (
          !source ||
          source.item.definitionId !== effect.definitionId ||
          source.item.quantity !== effect.quantityBefore ||
          !Number.isSafeInteger(effect.quantityPicked) ||
          effect.quantityPicked <= 0 ||
          effect.quantityPicked > effect.quantityBefore ||
          effect.quantityRemaining !==
            effect.quantityBefore - effect.quantityPicked
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect源物品或数量不一致')
        }
        const expectedKind =
          effect.quantityRemaining === 0 ? 'full' : 'partial'
        if (effect.pickupKind !== expectedKind) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect类型与剩余数量不一致')
        }
        const definition = dependencies.physicalCatalog.get(
          effect.definitionId,
        )
        if (
          (expectedKind === 'full' &&
            effect.destinationInstanceId !== effect.sourceInstanceId) ||
          (expectedKind === 'partial' &&
            (effect.destinationInstanceId === effect.sourceInstanceId ||
              definition.stacking.kind !== 'stackable' ||
              source.state.resource.kind !== 'none'))
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect目标实例身份非法')
        }
        const knownIds = new Set<string>([
          ...state.backpack.items.map((item) => item.instanceId),
          ...Object.values(state.equipment)
            .filter((item) => item !== null)
            .map((item) => item.instanceId),
          ...state.quickSlots.slots
            .filter((item) => item !== null)
            .map((item) => item.instanceId),
        ])
        for (const candidate of state.searchState.nodeStates) {
          const entities =
            candidate.kind === 'unsearched'
              ? candidate.preparedOutcome.revealedItems
              : []
          for (const entity of entities) {
            if (entity.item.instanceId !== effect.sourceInstanceId) {
              knownIds.add(entity.item.instanceId)
            }
          }
        }
        for (const candidate of state.sceneItems.nodeStates) {
          for (const entity of candidate.items) {
            if (entity.item.instanceId !== effect.sourceInstanceId) {
              knownIds.add(entity.item.instanceId)
            }
          }
        }
        if (
          expectedKind === 'partial' &&
          (typeof effect.destinationInstanceId !== 'string' ||
            effect.destinationInstanceId.trim().length === 0 ||
            knownIds.has(effect.destinationInstanceId))
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect目标实例ID重复或为空')
        }
        let destinationState
        try {
          destinationState = createItemState(
            effect.destinationItemState,
            dependencies.itemResourceCatalog,
          )
        } catch {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect目标资源状态非法')
        }
        if (
          destinationState.instanceId !== effect.destinationInstanceId ||
          destinationState.definitionId !== effect.definitionId ||
          (expectedKind === 'full' &&
            !sameValue(destinationState, source.state)) ||
          (expectedKind === 'partial' &&
            destinationState.resource.kind !== 'none')
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect目标资源状态被篡改')
        }
        const destinationItem = createItemInstance(
          {
            instanceId: effect.destinationInstanceId,
            definitionId: effect.definitionId,
            quantity: effect.quantityPicked,
          },
          dependencies.physicalCatalog,
        )
        if (
          !effect.destinationPlacement ||
          typeof effect.destinationPlacement !== 'object' ||
          !Number.isSafeInteger(effect.destinationPlacement.x) ||
          effect.destinationPlacement.x < 0 ||
          !Number.isSafeInteger(effect.destinationPlacement.y) ||
          effect.destinationPlacement.y < 0 ||
          typeof effect.destinationPlacement.rotated !== 'boolean'
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect目标摆放声明非法')
        }
        let backpack
        try {
          backpack = addItemToBackpack(
            state.backpack,
            destinationItem,
            {
              instanceId: effect.destinationInstanceId,
              ...effect.destinationPlacement,
            },
            dependencies.physicalCatalog,
          )
        } catch {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect目标摆放非法')
        }
        const weight = calculateBackpackWeightSubtotal(
          backpack,
          dependencies.physicalCatalog,
        )
        if (
          !classifyLoad(weight, dependencies.config.backpack).canCarry
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect导致无法携带')
        }
        const sceneItems = removeSceneItemQuantity(
          state.sceneItems,
          effect.nodeId,
          effect.sourceInstanceId,
          effect.quantityPicked,
          {
            graph: dependencies.graph,
            itemCatalog: dependencies.physicalCatalog,
            itemResourceCatalog: dependencies.itemResourceCatalog,
          },
        )
        const carriedItems = [
          ...backpack.items,
          ...Object.values(state.equipment).filter(
            (item): item is NonNullable<typeof item> => item !== null,
          ),
          ...state.quickSlots.slots.filter(
            (item): item is NonNullable<typeof item> => item !== null,
          ),
        ]
        let itemStates
        try {
          itemStates = createItemStateCollectionSnapshot(
            [...state.itemStates.states, destinationState],
            carriedItems,
            dependencies.itemResourceCatalog,
          )
        } catch {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect无法建立随身资源状态')
        }
        state = deepFreeze({
          ...state,
          sceneItems,
          backpack,
          itemStates,
        })
        primaryKind = 'pickup'
        break
      }
      case 'item-resource-consumed': {
        if (
          index !== 0 ||
          sawResourceConsumption ||
          primaryKind !== null ||
          sawTime
        ) {
          fail('INVALID_EFFECT_ORDER', '装备资源Effect顺序非法')
        }
        const equipped = state.equipment[effect.equipmentSlot]
        if (
          !equipped ||
          equipped.instanceId !== effect.instanceId ||
          equipped.definitionId !== effect.definitionId ||
          (effect.source === 'main-search-illumination' &&
            (effect.equipmentSlot !== 'utility' || effect.resourceKind !== 'charge'))
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '资源Effect与声明装备槽不一致')
        }
        const itemState = getItemState(state.itemStates, effect.instanceId)
        if (
          itemState.definitionId !== effect.definitionId ||
          itemState.resource.kind === 'none' ||
          itemState.resource.kind !== effect.resourceKind ||
          itemState.resource.current !== effect.currentBefore
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect的before不一致')
        }
        let result
        try {
          result = consumeCommittedResource(
            itemState,
            effect.requestedCost,
          )
        } catch {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect无法合法消费')
        }
        if (
          result.consumed !== effect.consumed ||
          result.currentAfter !== effect.currentAfter ||
          result.depleted !== effect.depleted
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect声明与结算不一致')
        }
        state = deepFreeze({
          ...state,
          itemStates: replaceItemState(state.itemStates, result.state),
        })
        sawResourceConsumption = true
        consumedResourceEffect = effect
        break
      }
      case 'scene-edge-enabled': {
        const expectedIndex = sawResourceConsumption ? 1 : 0
        const obstacle = dependencies?.obstacleCatalog?.has(effect.obstacleId)
          ? dependencies.obstacleCatalog.get(effect.obstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === effect.optionId)
        const resourceMatches =
          option?.kind === 'equipped-resource'
            ? consumedResourceEffect !== null &&
              consumedResourceEffect.source === option.resourceSource &&
              consumedResourceEffect.equipmentSlot === option.equipmentSlot &&
              consumedResourceEffect.definitionId === option.requiredDefinitionId &&
              consumedResourceEffect.requestedCost === dependencies?.config.scene.fireDoor.equippedItemResourceCost
            : option?.kind === 'force-entry'
              ? consumedResourceEffect === null ||
                (consumedResourceEffect.source === 'fire-door-impact-protection' &&
                  consumedResourceEffect.equipmentSlot === 'armor' &&
                  consumedResourceEffect.definitionId === option.protectionDefinitionId &&
                  consumedResourceEffect.requestedCost === dependencies?.config.scene.fireDoor.impactProtectionIntegrityCost)
              : consumedResourceEffect === null
        if (
          index !== expectedIndex ||
          primaryKind !== null ||
          !obstacle ||
          !option ||
          option.kind === 'decline' ||
          !resourceMatches ||
          obstacle.edgeId !== effect.edgeId ||
          !obstacle.endpointNodeIds.includes(state.currentNodeId) ||
          effect.nodeId !== state.currentNodeId ||
          state.enabledEdgeIds.includes(effect.edgeId)
        ) {
          fail('EFFECT_OBSTACLE_MISMATCH', '障碍开边Effect与当前状态不一致')
        }
        state = deepFreeze({
          ...state,
          enabledEdgeIds: [...state.enabledEdgeIds, effect.edgeId].sort(),
        })
        primaryKind = 'obstacle'
        activeObstacleId = effect.obstacleId
        activeObstacleOptionId = effect.optionId
        break
      }
      case 'scene-item-spawned': {
        const obstacle = activeObstacleId
          ? dependencies?.obstacleCatalog?.get(activeObstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === activeObstacleOptionId)
        const matchesGrant =
          option?.kind === 'equipped-resource' &&
          obstacle?.eventId === effect.sourceEventId &&
          option.id === effect.sourceOptionId &&
          option.spawnGrants.some(
            (grant) =>
              grant.definitionId === effect.entity.item.definitionId &&
              grant.quantity === effect.entity.item.quantity,
          )
        if (primaryKind !== 'obstacle' || sawTime || effect.nodeId !== state.currentNodeId || !matchesGrant) {
          fail('INVALID_EFFECT_ORDER', '场景物品产出Effect顺序非法')
        }
        let entity
        try {
          entity = createSceneItemSnapshot(
            effect.entity,
            dependencies!.physicalCatalog,
            dependencies!.itemResourceCatalog,
          )
        } catch {
          fail('EFFECT_SPAWN_MISMATCH', '场景物品产出实体无效')
        }
        const sceneItems = addSceneItems(
          state.sceneItems,
          effect.nodeId,
          [entity],
          {
            graph: dependencies!.graph,
            itemCatalog: dependencies!.physicalCatalog,
            itemResourceCatalog: dependencies!.itemResourceCatalog,
          },
        )
        state = deepFreeze({ ...state, sceneItems })
        break
      }
      case 'scene-alert-changed': {
        const obstacle = activeObstacleId
          ? dependencies?.obstacleCatalog?.get(activeObstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === activeObstacleOptionId)
        const expectedReason =
          option?.kind === 'force-entry'
            ? 'fire-door-force-entry'
            : option?.kind === 'equipped-resource' && option.setsAlert
              ? 'fire-door-fire-axe'
              : null
        if (
          primaryKind !== 'obstacle' ||
          sawTime ||
          state.alertState !== effect.fromAlertState ||
          effect.toAlertState !== 'alerted' ||
          effect.reason !== expectedReason
        ) {
          fail('EFFECT_ALERT_MISMATCH', '警觉Effect与当前状态不一致')
        }
        state = deepFreeze({ ...state, alertState: 'alerted' as const })
        break
      }
      case 'minor-contusion-added': {
        const obstacle = activeObstacleId
          ? dependencies?.obstacleCatalog?.get(activeObstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === activeObstacleOptionId)
        if (
          primaryKind !== 'obstacle' ||
          sawTime ||
          effect.added !== 1 ||
          state.condition.minorContusions !== effect.countBefore ||
          effect.countAfter !== effect.countBefore + 1 ||
          option?.kind !== 'force-entry'
        ) {
          fail('EFFECT_CONTUSION_MISMATCH', '轻微挫伤Effect与当前状态不一致')
        }
        state = deepFreeze({
          ...state,
          condition: addMinorContusion(state.condition),
        })
        break
      }
      case 'scene-obstacle-declined': {
        const obstacle = dependencies?.obstacleCatalog?.has(effect.obstacleId)
          ? dependencies.obstacleCatalog.get(effect.obstacleId)
          : null
        if (
          effects.length !== 1 ||
          index !== 0 ||
          !obstacle ||
          obstacle.options.find(({ id }) => id === effect.optionId)?.kind !== 'decline' ||
          obstacle.edgeId !== effect.edgeId ||
          effect.nodeId !== state.currentNodeId ||
          state.enabledEdgeIds.includes(effect.edgeId)
        ) {
          fail('EFFECT_OBSTACLE_MISMATCH', '放弃障碍Effect与当前状态不一致')
        }
        primaryKind = 'decline'
        break
      }
      case 'scene-main-search-revealed': {
        if (!dependencies) {
          fail('EFFECT_SEARCH_MISMATCH', '搜索Effect回放需要完整场景依赖')
        }
        if (
          primaryKind !== null ||
          sawTime ||
          index !== (sawResourceConsumption ? 1 : 0) ||
          effect.nodeId !== state.currentNodeId
        ) {
          fail('INVALID_EFFECT_ORDER', '主要搜索揭示Effect顺序非法')
        }
        const current = state.searchState.nodeStates.find(
          (node) => node.nodeId === effect.nodeId,
        )
        if (
          !current ||
          current.kind !== 'unsearched' ||
          current.preparedOutcome.searchOrdinal !== effect.searchOrdinal
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '主要搜索状态或序号不一致')
        }
        const revealed = revealPreparedMainSearchOutcome(
          state.searchState,
          effect.nodeId,
        )
        const actualIds = current.preparedOutcome.revealedItems.map(
          ({ item }) => item.instanceId,
        )
        const actualSummary = summarizeRevealedItems(
          current.preparedOutcome.revealedItems.map(({ item }) => item),
        )
        if (
          !sameValue(actualIds, effect.revealedItemInstanceIds) ||
          !sameValue(actualSummary, effect.revealedItemSummary) ||
          !sameValue(
            current.preparedOutcome.revealedIntelIds,
            effect.revealedIntelIds,
          )
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '主要搜索Effect的揭示列表被篡改')
        }
        const sceneItems = addSceneItems(
          state.sceneItems,
          effect.nodeId,
          current.preparedOutcome.revealedItems,
          {
            graph: dependencies.graph,
            itemCatalog: dependencies.physicalCatalog,
            itemResourceCatalog: dependencies.itemResourceCatalog,
          },
        )
        state = deepFreeze({ ...state, searchState: revealed, sceneItems })
        primaryKind = 'main-search'
        break
      }
      case 'scene-node-changed': {
        if (effect.fromNodeId !== state.currentNodeId) {
          fail('EFFECT_NODE_MISMATCH', '节点Effect的from与当前节点不一致')
        }
        if (effect.reason === 'movement') {
          if (index !== 0 || primaryKind !== null || sawResourceConsumption) {
            fail('INVALID_EFFECT_ORDER', '主要移动节点变化必须唯一且位于首位')
          }
          primaryKind = 'movement'
        } else {
          if (primaryKind === null || !sawTime || sawForcedReturn) {
            fail('INVALID_EFFECT_ORDER', '强制返程节点变化顺序非法')
          }
          sawForcedReturn = true
        }
        state = deepFreeze({ ...state, currentNodeId: effect.toNodeId })
        break
      }
      case 'scene-time-resolved': {
        const expectedIndex =
          primaryKind === 'movement'
            ? 1
            : primaryKind === 'main-search'
              ? sawResourceConsumption
                ? 2
                : 1
              : primaryKind === 'obstacle'
                ? index
                : -1
        if (sawTime || index !== expectedIndex) {
          fail('INVALID_EFFECT_ORDER', '时间Effect必须紧随主要效果且只能出现一次')
        }
        if (effect.remainingTimeBefore !== state.remainingTime) {
          fail('EFFECT_TIME_MISMATCH', '时间Effect的before与当前时间不一致')
        }
        if (
          !Number.isSafeInteger(effect.actionTimeCost) ||
          effect.actionTimeCost <= 0 ||
          effect.remainingTimeAfter !==
            Math.max(0, effect.remainingTimeBefore - effect.actionTimeCost) ||
          effect.overtimeDebt !==
            Math.max(0, effect.actionTimeCost - effect.remainingTimeBefore)
        ) {
          fail('EFFECT_TIME_MISMATCH', '时间Effect声明的结算结果不一致')
        }
        sawTime = true
        state = deepFreeze({
          ...state,
          remainingTime: effect.remainingTimeAfter,
        })
        break
      }
      case 'health-lost': {
        if (!sawTime || sawForcedReturn) {
          fail('INVALID_EFFECT_ORDER', '生命损失Effect顺序非法')
        }
        const sourceOrder = HEALTH_SOURCE_ORDER.indexOf(effect.source)
        if (sourceOrder < 0 || sourceOrder <= lastHealthOrder) {
          fail('INVALID_EFFECT_ORDER', '生命损失来源顺序非法或重复')
        }
        if (effect.healthBefore !== state.condition.currentHealth) {
          fail('EFFECT_HEALTH_MISMATCH', '生命Effect的before与当前生命不一致')
        }
        const result = applyHealthLoss(
          state.condition,
          effect.requestedLoss,
          healthRules,
        )
        if (
          result.actualLoss !== effect.actualLoss ||
          result.healthAfter !== effect.healthAfter
        ) {
          fail(
            'EFFECT_HEALTH_RESULT_MISMATCH',
            '生命Effect声明与条件模块结算不一致',
          )
        }
        lastHealthOrder = sourceOrder
        state = deepFreeze({ ...state, condition: result.state })
        break
      }
      case 'scene-status-changed': {
        if (primaryKind === null || !sawTime || index !== effects.length - 1) {
          fail('INVALID_EFFECT_ORDER', '状态变化顺序非法')
        }
        if (effect.fromStatus !== state.status) {
          fail('EFFECT_STATUS_MISMATCH', '状态Effect的before与当前状态不一致')
        }
        const expectedReason =
          effect.toStatus === 'dead'
            ? 'death'
            : effect.toStatus === 'safe-returned'
              ? 'safe-return'
              : effect.toStatus === 'forced-returned'
                ? 'forced-return'
                : null
        if (expectedReason === null || effect.reason !== expectedReason) {
          fail('EFFECT_STATUS_MISMATCH', '状态变化原因与目标状态不一致')
        }
        if (
          (effect.toStatus === 'dead') !==
          (state.condition.currentHealth === 0)
        ) {
          fail('EFFECT_STATUS_MISMATCH', '死亡状态与生命结果不一致')
        }
        if (effect.toStatus === 'forced-returned' && !sawForcedReturn) {
          fail('INCOMPLETE_EFFECT_PLAN', '强制返程状态缺少节点变化Effect')
        }
        if (effect.toStatus !== 'forced-returned' && sawForcedReturn) {
          fail('EFFECT_STATUS_MISMATCH', '非强制返程状态包含返程节点变化')
        }
        sawStatus = true
        state = deepFreeze({ ...state, status: effect.toStatus })
        break
      }
      default:
        throw new SceneExplorationError(
          'UNKNOWN_EFFECT',
          `未知场景探索Effect：${String(
            (effects[index] as unknown as { readonly kind: unknown }).kind,
          )}`,
        )
    }
  }

  if (
    primaryKind === null ||
    (primaryKind !== 'pickup' && primaryKind !== 'decline' && !sawTime) ||
    (primaryKind === 'pickup' && sawTime)
  ) {
    fail('INCOMPLETE_EFFECT_PLAN', 'Effect计划缺少主要效果或时间结算')
  }
  if (sawResourceConsumption && primaryKind !== 'main-search') {
    if (primaryKind !== 'obstacle') {
      fail('INCOMPLETE_EFFECT_PLAN', '装备资源消费后缺少对应主要效果')
    }
  }
  if (state.condition.currentHealth === 0 && state.status !== 'dead') {
    fail('INCOMPLETE_EFFECT_PLAN', '生命归零后必须提交dead状态')
  }
  if (sawForcedReturn && state.status !== 'forced-returned') {
    fail('INCOMPLETE_EFFECT_PLAN', '强制返程节点变化后必须提交对应状态')
  }
  return dependencies
    ? createSceneExplorationSnapshot(state, dependencies)
    : deepFreeze(state)
}
