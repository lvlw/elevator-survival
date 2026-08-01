import { deepFreeze } from '../config'
import { getSceneNodeItems } from '../scene-items'
import { getPlayerVisibleNodeSearchState } from '../scene-search'
import type { SceneExplorationSnapshot } from './scene-exploration-types'

export function getPlayerVisibleSceneNodeState(
  snapshot: SceneExplorationSnapshot,
  nodeId: string,
) {
  return deepFreeze({
    search: getPlayerVisibleNodeSearchState(snapshot.searchState, nodeId),
    groundItems: getSceneNodeItems(snapshot.sceneItems, nodeId).map(
      ({ item }) => ({ ...item }),
    ),
  })
}
