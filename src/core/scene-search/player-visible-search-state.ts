import { deepFreeze } from '../config'
import { SceneSearchError } from './scene-search-errors'
import type {
  PlayerVisibleNodeSearchState,
  SceneSearchStateSnapshot,
} from './scene-search-types'

export function getPlayerVisibleNodeSearchState(
  searchState: SceneSearchStateSnapshot,
  nodeId: string,
): PlayerVisibleNodeSearchState {
  const node = searchState.nodeStates.find(
    (candidate) => candidate.nodeId === nodeId,
  )
  if (!node) {
    throw new SceneSearchError('UNKNOWN_NODE', `未知节点：${nodeId}`)
  }
  if (node.kind === 'not-available') {
    return deepFreeze({ kind: 'not-available', nodeId })
  }
  if (node.kind === 'unsearched') {
    return deepFreeze({ kind: 'available-unsearched', nodeId })
  }
  return deepFreeze({
    kind: 'searched',
    nodeId,
    revealedItems: node.revealedItems.map((item) => ({ ...item })),
    revealedIntelIds: [...node.revealedIntelIds],
  })
}
