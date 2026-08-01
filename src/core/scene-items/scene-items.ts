import { deepFreeze } from '../config'
import { createSceneItemSnapshot, type SceneItemSnapshot } from '../scene-search'
import { SceneItemsError } from './scene-items-errors'
import type {
  SceneItemsDependencies,
  SceneItemsSnapshot,
} from './scene-items-types'

function fail(code: SceneItemsError['code'], message: string): never {
  throw new SceneItemsError(code, message)
}

export function createEmptySceneItemsSnapshot(
  dependencies: SceneItemsDependencies,
): SceneItemsSnapshot {
  return createSceneItemsSnapshot(
    {
      nodeStates: dependencies.graph.nodes.map(({ id }) => ({
        nodeId: id,
        items: [],
      })),
    },
    dependencies,
  )
}

export function createSceneItemsSnapshot(
  input: SceneItemsSnapshot,
  dependencies: SceneItemsDependencies,
): SceneItemsSnapshot {
  if (!input || typeof input !== 'object' || !Array.isArray(input.nodeStates)) {
    fail('INVALID_SCENE_ITEMS_STATE', '节点地面物品状态无效')
  }
  const expected = dependencies.graph.nodes.map(({ id }) => id).sort()
  const ids = new Set<string>()
  const nodes = input.nodeStates.map((node) => {
    if (
      !node ||
      typeof node !== 'object' ||
      Object.keys(node).sort().join('|') !== 'items|nodeId' ||
      typeof node.nodeId !== 'string' ||
      node.nodeId.trim().length === 0 ||
      !Array.isArray(node.items)
    ) {
      fail('INVALID_SCENE_ITEMS_STATE', '节点地面物品条目无效')
    }
    const items = node.items.map((item: Readonly<SceneItemSnapshot>) =>
      createSceneItemSnapshot(
        item,
        dependencies.itemCatalog,
        dependencies.itemResourceCatalog,
      ),
    )
    for (const item of items) {
      if (ids.has(item.item.instanceId)) {
        fail('DUPLICATE_INSTANCE_ID', `地面物品实例ID重复：${item.item.instanceId}`)
      }
      ids.add(item.item.instanceId)
    }
    return { nodeId: node.nodeId, items }
  })
  const actual = nodes.map(({ nodeId }) => nodeId).sort()
  if (
    new Set(actual).size !== actual.length ||
    actual.length !== expected.length ||
    actual.some((id, index) => id !== expected[index])
  ) {
    fail('INVALID_SCENE_ITEMS_STATE', '地面物品节点集合与场景图不一致')
  }
  return deepFreeze({
    nodeStates: nodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
  })
}

export function getSceneNodeItems(
  snapshot: SceneItemsSnapshot,
  nodeId: string,
): readonly Readonly<SceneItemSnapshot>[] {
  const node = snapshot.nodeStates.find((candidate) => candidate.nodeId === nodeId)
  if (!node) fail('UNKNOWN_NODE', `未知节点：${nodeId}`)
  return node.items
}

export function addSceneItems(
  snapshot: SceneItemsSnapshot,
  nodeId: string,
  inputs: readonly Readonly<SceneItemSnapshot>[],
  dependencies: SceneItemsDependencies,
): SceneItemsSnapshot {
  if (!snapshot.nodeStates.some((node) => node.nodeId === nodeId)) {
    fail('UNKNOWN_NODE', `未知节点：${nodeId}`)
  }
  return createSceneItemsSnapshot(
    {
      nodeStates: snapshot.nodeStates.map((node) => ({
        nodeId: node.nodeId,
        items: node.nodeId === nodeId ? [...node.items, ...inputs] : [...node.items],
      })),
    },
    dependencies,
  )
}

export function removeSceneItemQuantity(
  snapshot: SceneItemsSnapshot,
  nodeId: string,
  instanceId: string,
  quantity: number,
  dependencies: SceneItemsDependencies,
): SceneItemsSnapshot {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    fail('INVALID_REMOVE_QUANTITY', '移除数量必须是正安全整数')
  }
  const source = getSceneNodeItems(snapshot, nodeId).find(
    ({ item }) => item.instanceId === instanceId,
  )
  if (!source) fail('UNKNOWN_SCENE_ITEM', `节点地面物品不存在：${instanceId}`)
  if (quantity > source.item.quantity) {
    fail('INVALID_REMOVE_QUANTITY', '移除数量超过节点地面物品数量')
  }
  return createSceneItemsSnapshot(
    {
      nodeStates: snapshot.nodeStates.map((node) => ({
        nodeId: node.nodeId,
        items:
          node.nodeId !== nodeId
            ? [...node.items]
            : node.items.flatMap((entity) => {
                if (entity.item.instanceId !== instanceId) return [entity]
                if (quantity === entity.item.quantity) return []
                return [{
                  item: { ...entity.item, quantity: entity.item.quantity - quantity },
                  state: entity.state,
                }]
              }),
      })),
    },
    dependencies,
  )
}
