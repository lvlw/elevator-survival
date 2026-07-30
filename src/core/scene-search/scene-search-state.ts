import { deepFreeze } from '../config'
import type { ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'
import type { SceneGraph } from '../scene-graph'
import { createSceneItemSnapshot } from './scene-item-snapshot'
import { SceneSearchError } from './scene-search-errors'
import { materializeMainSearchOutcome } from './scene-search-materialization'
import type {
  MainSearchState,
  SceneSearchStateCreationInput,
  SceneSearchStateSnapshot,
} from './scene-search-types'

export function validateSceneSearchState(
  state: SceneSearchStateSnapshot,
  graph: SceneGraph,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): SceneSearchStateSnapshot {
  if (state.sceneInstanceId.trim().length === 0) {
    throw new SceneSearchError('INVALID_SCENE_INSTANCE_ID', '场景实例ID不能为空')
  }
  const expected = graph.nodes.map((node) => node.id).sort()
  const actual = state.nodeStates.map((node) => node.nodeId).sort()
  if (new Set(actual).size !== actual.length || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new SceneSearchError('INVALID_SEARCH_STATE', '搜索状态节点集合与场景图不一致')
  }
  const instanceIds = new Set<string>()
  for (const node of state.nodeStates) {
    const items =
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems
        : node.kind === 'searched'
          ? node.revealedItems
          : []
    for (const input of items) {
      const entity = createSceneItemSnapshot(
        input,
        itemCatalog,
        resourceCatalog,
      )
      if (instanceIds.has(entity.item.instanceId)) {
        throw new SceneSearchError('DUPLICATE_INSTANCE_ID', `搜索实例ID重复：${entity.item.instanceId}`)
      }
      instanceIds.add(entity.item.instanceId)
    }
  }
  return deepFreeze({
    sceneInstanceId: state.sceneInstanceId,
    nodeStates: state.nodeStates.map((node) => ({ ...node })).sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
  })
}

export function createSceneSearchState(
  input: SceneSearchStateCreationInput,
): SceneSearchStateSnapshot {
  if (input.sceneInstanceId.trim().length === 0) {
    throw new SceneSearchError('INVALID_SCENE_INSTANCE_ID', '场景实例ID不能为空')
  }
  const nodeStates: MainSearchState[] = input.graph.nodes.map((node) =>
    input.searchCatalog.has(node.id)
      ? {
          kind: 'unsearched',
          nodeId: node.id,
          preparedOutcome: materializeMainSearchOutcome(
            input.runSeed,
            input.sceneInstanceId,
            input.searchCatalog.get(node.id),
            input.itemCatalog,
            input.itemResourceCatalog,
          ),
        }
      : { kind: 'not-available', nodeId: node.id },
  )
  return validateSceneSearchState(
    { sceneInstanceId: input.sceneInstanceId, nodeStates },
    input.graph,
    input.itemCatalog,
    input.itemResourceCatalog,
  )
}

export function revealPreparedMainSearchOutcome(
  state: SceneSearchStateSnapshot,
  nodeId: string,
): SceneSearchStateSnapshot {
  const target = state.nodeStates.find((node) => node.nodeId === nodeId)
  if (!target) throw new SceneSearchError('UNKNOWN_NODE', `未知节点：${nodeId}`)
  if (target.kind === 'not-available') {
    throw new SceneSearchError('NODE_NOT_SEARCHABLE', `节点不可搜索：${nodeId}`)
  }
  if (target.kind === 'searched') {
    throw new SceneSearchError('ALREADY_SEARCHED', `节点已完成主要搜索：${nodeId}`)
  }
  return deepFreeze({
    sceneInstanceId: state.sceneInstanceId,
    nodeStates: state.nodeStates.map((node) =>
      node.nodeId === nodeId
        ? {
            kind: 'searched' as const,
            nodeId,
            revealedItems: [...target.preparedOutcome.revealedItems],
            revealedIntelIds: [...target.preparedOutcome.revealedIntelIds],
          }
        : node,
    ),
  })
}
