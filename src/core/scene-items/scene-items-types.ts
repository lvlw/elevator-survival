import type { ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'
import type { SceneGraph } from '../scene-graph'
import type { SceneItemSnapshot } from '../scene-search'

export interface SceneNodeItemsState {
  readonly nodeId: string
  readonly items: readonly Readonly<SceneItemSnapshot>[]
}

export interface SceneItemsSnapshot {
  readonly nodeStates: readonly Readonly<SceneNodeItemsState>[]
}

export interface SceneItemsDependencies {
  readonly graph: SceneGraph
  readonly itemCatalog: ItemCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
}
