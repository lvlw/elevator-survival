import { deepFreeze } from '../config'
import {
  calculateBackpackWeightSubtotal,
  InventoryError,
} from '../inventory'
import { classifyLoad } from '../load'
import { getSceneNodeItems } from '../scene-items'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { planNodeItemPickupStacking } from './node-item-pickup-stacking'
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

function exactCommand(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createPickUpRevealedNodeItemCommand(
  input: unknown,
): PickUpRevealedNodeItemCommand {
  if (!exactCommand(input, ['nodeItemInstanceId', 'quantity', 'placement'])) {
    fail('INVALID_EXTRACTED_INSTANCE_ID', '拾取命令不得由调用方提供新实例ID')
  }
  if (
    typeof input.nodeItemInstanceId !== 'string' ||
    input.nodeItemInstanceId.trim().length === 0
  ) {
    throw new SceneExplorationError('UNKNOWN_NODE_ITEM', '节点物品实例ID不能为空')
  }
  if (!Number.isSafeInteger(input.quantity) || (input.quantity as number) <= 0) {
    fail('INVALID_PICKUP_QUANTITY', '拾取数量必须是正安全整数')
  }
  if (
    !exactCommand(input.placement, ['x', 'y', 'rotated']) ||
    !Number.isSafeInteger(input.placement.x) ||
    (input.placement.x as number) < 0 ||
    !Number.isSafeInteger(input.placement.y) ||
    (input.placement.y as number) < 0 ||
    typeof input.placement.rotated !== 'boolean'
  ) {
    fail('INVALID_BACKPACK_PLACEMENT', '拾取目标摆放无效')
  }
  return deepFreeze({
    nodeItemInstanceId: input.nodeItemInstanceId,
    quantity: input.quantity as number,
    placement: {
      x: input.placement.x as number,
      y: input.placement.y as number,
      rotated: input.placement.rotated,
    },
  })
}

export function buildNodeItemPickupTransitionPlan(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const command = createPickUpRevealedNodeItemCommand(commandInput)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景已终止')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能拾取物品')
  }

  const source = getSceneNodeItems(
    snapshot.sceneItems,
    snapshot.currentNodeId,
  ).find(
    (entity) => entity.item.instanceId === command.nodeItemInstanceId,
  )
  if (!source) {
    const existsAtAnotherRevealedNode =
      snapshot.searchState.nodeStates.some(
        (node) =>
          node.nodeId !== snapshot.currentNodeId &&
          getSceneNodeItems(snapshot.sceneItems, node.nodeId).some(
            (entity) =>
              entity.item.instanceId === command.nodeItemInstanceId,
          ),
      )
    throw new SceneExplorationError(
      existsAtAnotherRevealedNode
        ? 'NODE_ITEM_NOT_AT_CURRENT_NODE'
        : 'UNKNOWN_NODE_ITEM',
      '指定物品不在当前节点地面',
    )
  }
  if (command.quantity > source.item.quantity) {
    fail('INVALID_PICKUP_QUANTITY', '拾取数量超过节点剩余数量')
  }

  const pickupKind =
    command.quantity === source.item.quantity ? 'full' : 'partial'
  let stackingPlan
  try {
    stackingPlan = planNodeItemPickupStacking({
      snapshot,
      source,
      quantity: command.quantity,
      placement: command.placement,
      dependencies,
    })
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
    stackingPlan.backpack,
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

  const firstTransfer = stackingPlan.transfers[0]!
  const effect: SceneExplorationEffect = {
    kind: 'scene-item-picked-up',
    nodeId: snapshot.currentNodeId,
    sourceInstanceId: source.item.instanceId,
    definitionId: source.item.definitionId,
    quantityBefore: source.item.quantity,
    quantityPicked: command.quantity,
    quantityRemaining: source.item.quantity - command.quantity,
    destinationInstanceId: firstTransfer.targetInstanceId,
    destinationPlacement: firstTransfer.placement,
    destinationItemState: firstTransfer.itemState,
    transfers: stackingPlan.transfers,
    pickupKind,
  }
  return deepFreeze({
    command: {
      nodeItemInstanceId: command.nodeItemInstanceId,
      quantity: command.quantity,
      placement: { ...command.placement },
    },
    metadata: {
      nodeId: snapshot.currentNodeId,
      sourceInstanceId: source.item.instanceId,
      destinationInstanceId: firstTransfer.targetInstanceId,
      definitionId: source.item.definitionId,
      quantityPicked: command.quantity,
      quantityRemaining: source.item.quantity - command.quantity,
      pickupKind,
      destinationPlacement: firstTransfer.placement,
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
    { kind: 'node-item-pickup', command: plan.command },
  )
  return deepFreeze({
    ...plan.metadata,
    effects: plan.effects,
    snapshot,
  })
}

export function previewNodeItemPickupCommand(
  snapshot: SceneExplorationSnapshot,
  command: unknown,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupPreview {
  try {
    const initialSnapshot = createSceneExplorationSnapshot(
      snapshot,
      dependencies,
    )
    const plan = buildNodeItemPickupTransitionPlan(
      initialSnapshot,
      command,
      dependencies,
    )
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
  command: unknown,
  dependencies: SceneExplorationDependencies,
): NodeItemPickupResolution {
  const initialSnapshot = createSceneExplorationSnapshot(
    snapshot,
    dependencies,
  )
  const plan = buildNodeItemPickupTransitionPlan(
    initialSnapshot,
    command,
    dependencies,
  )
  const result = materializeEvaluation(
    initialSnapshot,
    plan,
    dependencies,
  )
  return deepFreeze({ result, snapshot: result.snapshot })
}
