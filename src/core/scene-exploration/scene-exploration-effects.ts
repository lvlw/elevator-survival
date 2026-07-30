import { deepFreeze } from '../config'
import { applyHealthLoss, type PlayerHealthRules } from '../condition'
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
  let primaryKind: 'movement' | 'main-search' | 'pickup' | null = null
  let sawResourceConsumption = false
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
        const node = state.searchState.nodeStates.find(
          (candidate) => candidate.nodeId === effect.nodeId,
        )
        if (!node || node.kind !== 'searched') {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect节点尚未完成搜索')
        }
        const source = node.revealedItems.find(
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
              : candidate.kind === 'searched'
                ? candidate.revealedItems
                : []
          for (const entity of entities) {
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
        const nextSource =
          effect.quantityRemaining === 0
            ? null
            : createSceneItemSnapshot(
                {
                  item: {
                    ...source.item,
                    quantity: effect.quantityRemaining,
                  },
                  state: source.state,
                },
                dependencies.physicalCatalog,
                dependencies.itemResourceCatalog,
              )
        const searchState = deepFreeze({
          ...state.searchState,
          nodeStates: state.searchState.nodeStates.map((candidate) =>
            candidate.nodeId === effect.nodeId &&
            candidate.kind === 'searched'
              ? {
                  ...candidate,
                  revealedItems: candidate.revealedItems.flatMap(
                    (entity) =>
                      entity.item.instanceId === effect.sourceInstanceId
                        ? nextSource
                          ? [nextSource]
                          : []
                        : [entity],
                  ),
                }
              : candidate,
          ),
        })
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
          searchState,
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
          sawTime ||
          effect.source !== 'main-search-illumination'
        ) {
          fail('INVALID_EFFECT_ORDER', '搜索照明资源Effect顺序非法')
        }
        const utility = state.equipment.utility
        if (
          !utility ||
          utility.instanceId !== effect.instanceId ||
          utility.definitionId !== effect.definitionId ||
          effect.resourceKind !== 'charge'
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect与实用装备不一致')
        }
        const itemState = getItemState(state.itemStates, effect.instanceId)
        if (
          itemState.definitionId !== effect.definitionId ||
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
        break
      }
      case 'scene-main-search-revealed': {
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
        const revealedNode = revealed.nodeStates.find(
          (node) => node.nodeId === effect.nodeId,
        )
        if (!revealedNode || revealedNode.kind !== 'searched') {
          fail('EFFECT_SEARCH_MISMATCH', '主要搜索揭示结果无效')
        }
        const actualIds = revealedNode.revealedItems.map(
          ({ item }) => item.instanceId,
        )
        const actualSummary = summarizeRevealedItems(
          revealedNode.revealedItems.map(({ item }) => item),
        )
        if (
          !sameValue(actualIds, effect.revealedItemInstanceIds) ||
          !sameValue(actualSummary, effect.revealedItemSummary) ||
          !sameValue(
            revealedNode.revealedIntelIds,
            effect.revealedIntelIds,
          )
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '主要搜索Effect的揭示列表被篡改')
        }
        state = deepFreeze({ ...state, searchState: revealed })
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
    (primaryKind !== 'pickup' && !sawTime) ||
    (primaryKind === 'pickup' && sawTime)
  ) {
    fail('INCOMPLETE_EFFECT_PLAN', 'Effect计划缺少主要效果或时间结算')
  }
  if (sawResourceConsumption && primaryKind !== 'main-search') {
    fail('INCOMPLETE_EFFECT_PLAN', '照明资源消费后缺少主要搜索揭示')
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
