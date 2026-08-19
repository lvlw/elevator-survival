import { deepFreeze } from '../config'
import {
  addItemToBackpack,
  createBackpackSnapshot,
  createItemInstance,
  deriveStableSplitInstanceId,
  type BackpackPlacement,
} from '../inventory'
import {
  areItemStatesStackCompatible,
  createItemState,
  createItemStateCollectionSnapshot,
  getItemState,
  type ItemState,
} from '../item-state'
import type { SceneItemSnapshot } from '../scene-search'
import { SceneExplorationError } from './scene-exploration-errors'
import { getScenePhysicalItemInstanceIds } from './scene-physical-items'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

export type NodePickupTransfer = Readonly<{
  kind: 'merge-existing' | 'create-stack'
  targetInstanceId: string
  definitionId: string
  quantityBefore: number
  quantityMoved: number
  quantityAfter: number
  placement: Omit<BackpackPlacement, 'instanceId'>
  itemState: Readonly<ItemState>
}>

export function planNodeItemPickupStacking(input: Readonly<{
  snapshot: SceneExplorationSnapshot
  source: SceneItemSnapshot
  quantity: number
  placement: Omit<BackpackPlacement, 'instanceId'>
  dependencies: SceneExplorationDependencies
}>): Readonly<{
  transfers: readonly NodePickupTransfer[]
  backpack: SceneExplorationSnapshot['backpack']
  itemStates: SceneExplorationSnapshot['itemStates']
}> {
  const { snapshot, source, quantity, placement, dependencies } = input
  const definition = dependencies.physicalCatalog.get(source.item.definitionId)
  const stacking = definition.stacking
  let remaining = quantity
  let backpack = snapshot.backpack
  let itemStates = snapshot.itemStates
  const transfers: NodePickupTransfer[] = []

  if (stacking.kind === 'stackable') {
    const targets = [...snapshot.backpack.placements]
      .sort((left, right) =>
        left.y - right.y || left.x - right.x ||
        left.instanceId.localeCompare(right.instanceId),
      )
      .map((candidate) => snapshot.backpack.items.find(
        ({ instanceId }) => instanceId === candidate.instanceId,
      )!)
      .filter((candidate) =>
        candidate.definitionId === source.item.definitionId &&
        candidate.quantity < stacking.maxQuantity &&
        areItemStatesStackCompatible(
          getItemState(snapshot.itemStates, candidate.instanceId),
          source.state,
        ),
      )
    for (const target of targets) {
      if (remaining === 0) break
      const moved = Math.min(remaining, stacking.maxQuantity - target.quantity)
      const targetPlacement = snapshot.backpack.placements.find(
        ({ instanceId }) => instanceId === target.instanceId,
      )!
      backpack = createBackpackSnapshot({
        ...backpack,
        items: backpack.items.map((candidate) =>
          candidate.instanceId === target.instanceId
            ? { ...candidate, quantity: candidate.quantity + moved }
            : candidate,
        ),
      }, dependencies.physicalCatalog)
      transfers.push({
        kind: 'merge-existing',
        targetInstanceId: target.instanceId,
        definitionId: target.definitionId,
        quantityBefore: target.quantity,
        quantityMoved: moved,
        quantityAfter: target.quantity + moved,
        placement: {
          x: targetPlacement.x,
          y: targetPlacement.y,
          rotated: targetPlacement.rotated,
        },
        itemState: getItemState(snapshot.itemStates, target.instanceId),
      })
      remaining -= moved
    }
  }

  if (remaining > 0) {
    if (quantity < source.item.quantity && stacking.kind !== 'stackable') {
      throw new SceneExplorationError('PARTIAL_PICKUP_NOT_ALLOWED', '非堆叠物品不能部分拾取')
    }
    if (quantity < source.item.quantity && source.state.resource.kind !== 'none') {
      throw new SceneExplorationError('PARTIAL_PICKUP_NOT_ALLOWED', '带资源状态的物品不能部分拾取')
    }
    const instanceId = quantity === source.item.quantity
      ? source.item.instanceId
      : deriveStableSplitInstanceId({
          scope: `scene-node-pickup-split:${snapshot.sceneInstanceId}`,
          sourceInstanceId: source.item.instanceId,
          sourceQuantityBeforeSplit: source.item.quantity,
          quantity: remaining,
        })
    if (
      instanceId !== source.item.instanceId &&
      getScenePhysicalItemInstanceIds(snapshot).includes(instanceId)
    ) {
      throw new SceneExplorationError('DUPLICATE_DESTINATION_INSTANCE', '部分拾取的新实例ID已存在')
    }
    const state = quantity === source.item.quantity
      ? source.state
      : createItemState({
          instanceId,
          definitionId: source.item.definitionId,
          resource: { kind: 'none' },
        }, dependencies.itemResourceCatalog)
    backpack = addItemToBackpack(
      backpack,
      createItemInstance({
        instanceId,
        definitionId: source.item.definitionId,
        quantity: remaining,
      }, dependencies.physicalCatalog),
      { instanceId, ...placement },
      dependencies.physicalCatalog,
    )
    transfers.push({
      kind: 'create-stack',
      targetInstanceId: instanceId,
      definitionId: source.item.definitionId,
      quantityBefore: 0,
      quantityMoved: remaining,
      quantityAfter: remaining,
      placement,
      itemState: state,
    })
    const carried = [
      ...backpack.items,
      ...Object.values(snapshot.equipment).filter(
        (item): item is NonNullable<typeof item> => item !== null,
      ),
      ...snapshot.quickSlots.slots.filter(
        (item): item is NonNullable<typeof item> => item !== null,
      ),
    ]
    itemStates = createItemStateCollectionSnapshot(
      [...itemStates.states, state],
      carried,
      dependencies.itemResourceCatalog,
    )
  }

  return deepFreeze({ transfers, backpack, itemStates })
}
