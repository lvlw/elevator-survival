import { deepFreeze } from '../config'
import {
  addItemToBackpack,
  calculateBackpackWeightSubtotal,
  createItemInstance,
  InventoryError,
} from '../inventory'
import { createItemState } from '../item-state'
import { classifyLoad } from '../load'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  NodeItemPickupEvaluation,
  NodeItemPickupPreview,
  NodeItemPickupResolution,
  NodeItemPickupTransitionPlan,
  PickUpRevealedNodeItemCommand,
  SceneExplorationDependencies,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

function fail(
  code:
    | 'INVALID_PICKUP_QUANTITY'
    | 'INVALID_EXTRACTED_INSTANCE_ID'
    | 'PARTIAL_PICKUP_NOT_ALLOWED'
    | 'DUPLICATE_DESTINATION_INSTANCE'
    | 'INVALID_BACKPACK_PLACEMENT',
  message: string,
): never {
  throw new SceneExplorationError(code, message)
}

function allKnownInstanceIds(
  snapshot: SceneExplorationSnapshot,
): Set<string> {
  const ids = new Set<string>()
  for (const item of snapshot.backpack.items) ids.add(item.instanceId)
  for (const item of Object.values(snapshot.equipment)) {
    if (item) ids.add(item.instanceId)
  }
  for (const item of snapshot.quickSlots.slots) {
    if (item) ids.add(item.instanceId)
  }
  for (const node of snapshot.searchState.nodeStates) {
    const sceneItems =
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems
        : node.kind === 'searched'
          ? node.revealedItems
          : []
    for (const entity of sceneItems) ids.add(entity.item.instanceId)
  }
  return ids
}

function evaluate(
  snapshotInput: SceneExplorationSnapshot,
  command: PickUpRevealedNodeItemCommand,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景已终止')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能拾取物品')
  }
  if (
    typeof command.nodeItemInstanceId !== 'string' ||
    command.nodeItemInstanceId.trim().length === 0
  ) {
    throw new SceneExplorationError(
      'UNKNOWN_NODE_ITEM',
      '节点物品实例ID不能为空',
    )
  }
  if (!Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
    fail('INVALID_PICKUP_QUANTITY', '拾取数量必须是正安全整数')
  }
  if (
    !command.placement ||
    typeof command.placement !== 'object' ||
    !Number.isSafeInteger(command.placement.x) ||
    command.placement.x < 0 ||
    !Number.isSafeInteger(command.placement.y) ||
    command.placement.y < 0 ||
    typeof command.placement.rotated !== 'boolean'
  ) {
    fail('INVALID_BACKPACK_PLACEMENT', '拾取目标摆放无效')
  }

  const current = snapshot.searchState.nodeStates.find(
    (node) => node.nodeId === snapshot.currentNodeId,
  )
  if (!current || current.kind !== 'searched') {
    throw new SceneExplorationError(
      'NODE_NOT_SEARCHED',
      '当前节点尚未完成主要搜索',
    )
  }
  const source = current.revealedItems.find(
    (entity) => entity.item.instanceId === command.nodeItemInstanceId,
  )
  if (!source) {
    const existsAtAnotherRevealedNode =
      snapshot.searchState.nodeStates.some(
        (node) =>
          node.nodeId !== snapshot.currentNodeId &&
          node.kind === 'searched' &&
          node.revealedItems.some(
            (entity) =>
              entity.item.instanceId === command.nodeItemInstanceId,
          ),
      )
    throw new SceneExplorationError(
      existsAtAnotherRevealedNode
        ? 'NODE_ITEM_NOT_AT_CURRENT_NODE'
        : 'UNKNOWN_NODE_ITEM',
      '指定物品不在当前已搜索节点',
    )
  }
  if (command.quantity > source.item.quantity) {
    fail('INVALID_PICKUP_QUANTITY', '拾取数量超过节点剩余数量')
  }

  const pickupKind =
    command.quantity === source.item.quantity ? 'full' : 'partial'
  const definition = dependencies.physicalCatalog.get(
    source.item.definitionId,
  )
  let destinationInstanceId: string
  if (pickupKind === 'full') {
    if (command.extractedInstanceId !== undefined) {
      fail(
        'INVALID_EXTRACTED_INSTANCE_ID',
        '完整拾取不得提供新的物品实例ID',
      )
    }
    destinationInstanceId = source.item.instanceId
  } else {
    if (definition.stacking.kind !== 'stackable') {
      fail('PARTIAL_PICKUP_NOT_ALLOWED', '非堆叠物品不能部分拾取')
    }
    if (source.state.resource.kind !== 'none') {
      fail('PARTIAL_PICKUP_NOT_ALLOWED', '带资源状态的物品不能部分拾取')
    }
    if (
      typeof command.extractedInstanceId !== 'string' ||
      command.extractedInstanceId.trim().length === 0
    ) {
      fail(
        'INVALID_EXTRACTED_INSTANCE_ID',
        '部分拾取必须由调用方提供新实例ID',
      )
    }
    if (allKnownInstanceIds(snapshot).has(command.extractedInstanceId)) {
      fail(
        'DUPLICATE_DESTINATION_INSTANCE',
        '部分拾取的新实例ID已存在',
      )
    }
    destinationInstanceId = command.extractedInstanceId
  }

  const destinationItem = createItemInstance(
    {
      instanceId: destinationInstanceId,
      definitionId: source.item.definitionId,
      quantity: command.quantity,
    },
    dependencies.physicalCatalog,
  )
  const destinationItemState =
    pickupKind === 'full'
      ? source.state
      : createItemState(
          {
            instanceId: destinationInstanceId,
            definitionId: source.item.definitionId,
            resource: { kind: 'none' },
          },
          dependencies.itemResourceCatalog,
        )
  const destinationPlacement = {
    x: command.placement.x,
    y: command.placement.y,
    rotated: command.placement.rotated,
  }
  let backpackAfter
  try {
    backpackAfter = addItemToBackpack(
      snapshot.backpack,
      destinationItem,
      { instanceId: destinationInstanceId, ...destinationPlacement },
      dependencies.physicalCatalog,
    )
  } catch (error) {
    if (error instanceof InventoryError) {
      fail('INVALID_BACKPACK_PLACEMENT', error.message)
    }
    throw error
  }
  const backpackWeightBefore = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const backpackWeightAfter = calculateBackpackWeightSubtotal(
    backpackAfter,
    dependencies.physicalCatalog,
  )
  const loadAfter = classifyLoad(
    backpackWeightAfter,
    dependencies.config.backpack,
  )
  if (!loadAfter.canCarry) {
    throw new SceneExplorationError(
      'CANNOT_CARRY',
      '拾取后达到无法携带档位',
    )
  }

  const effect: SceneExplorationEffect = {
    kind: 'scene-item-picked-up',
    nodeId: snapshot.currentNodeId,
    sourceInstanceId: source.item.instanceId,
    definitionId: source.item.definitionId,
    quantityBefore: source.item.quantity,
    quantityPicked: command.quantity,
    quantityRemaining: source.item.quantity - command.quantity,
    destinationInstanceId,
    destinationPlacement,
    destinationItemState,
    pickupKind,
  }
  return deepFreeze({
    command: {
      nodeItemInstanceId: command.nodeItemInstanceId,
      quantity: command.quantity,
      placement: { ...destinationPlacement },
      ...(command.extractedInstanceId === undefined
        ? {}
        : { extractedInstanceId: command.extractedInstanceId }),
    },
    metadata: {
      nodeId: snapshot.currentNodeId,
      sourceInstanceId: source.item.instanceId,
      destinationInstanceId,
      definitionId: source.item.definitionId,
      quantityPicked: command.quantity,
      quantityRemaining: source.item.quantity - command.quantity,
      pickupKind,
      destinationPlacement,
      backpackWeightBefore,
      backpackWeightAfter,
      loadTierAfter: loadAfter.tier,
    },
    effects: [effect],
  })
}

function materializeEvaluation(
  initialSnapshot: SceneExplorationSnapshot,
  plan: NodeItemPickupTransitionPlan,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupEvaluation {
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

export function previewNodeItemPickupCommand(
  snapshot: SceneExplorationSnapshot,
  command: PickUpRevealedNodeItemCommand,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupPreview {
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

export function resolveNodeItemPickupCommand(
  snapshot: SceneExplorationSnapshot,
  command: PickUpRevealedNodeItemCommand,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupResolution {
  const initialSnapshot = createSceneExplorationSnapshot(
    snapshot,
    dependencies,
  )
  const plan = evaluate(initialSnapshot, command, dependencies)
  const result = materializeEvaluation(
    initialSnapshot,
    plan,
    dependencies,
  )
  return deepFreeze({ result, snapshot: result.snapshot })
}
