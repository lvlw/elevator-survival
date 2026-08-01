import type { ItemCatalog, ItemInstance } from '../inventory'
import type {
  ItemResourceCatalog,
  ItemState,
} from '../item-state'
import type { SceneGraph } from '../scene-graph'

export type SearchItemInitialState =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'explicit'; current: number }>

export interface SearchItemGrant {
  readonly definitionId: string
  readonly quantity: number
  readonly initialState: SearchItemInitialState
}

export interface SceneItemSnapshot {
  readonly item: Readonly<ItemInstance>
  readonly state: Readonly<ItemState>
}

export interface WeightedSearchItemEntry {
  readonly grant: SearchItemGrant
  readonly weight: number
}

export interface WeightedSearchItemChoice {
  readonly entries: readonly WeightedSearchItemEntry[]
}

export interface MainSearchDefinition {
  readonly nodeId: string
  readonly searchOrdinal: number
  readonly fixedItemGrants: readonly SearchItemGrant[]
  readonly weightedItemChoice: WeightedSearchItemChoice | null
  readonly fixedIntelIds: readonly string[]
}

export interface MainSearchDefinitionCatalog {
  readonly nodeIds: readonly string[]
  has(nodeId: string): boolean
  get(nodeId: string): MainSearchDefinition
}

export interface SearchRandomTrace {
  readonly algorithmVersion: string
  readonly streamId: string
  readonly drawIndex: number
  readonly selectedDefinitionId: string
}

export interface PreparedMainSearchOutcome {
  readonly nodeId: string
  readonly searchOrdinal: number
  readonly revealedItems: readonly Readonly<SceneItemSnapshot>[]
  readonly revealedIntelIds: readonly string[]
  readonly randomTrace: SearchRandomTrace | null
}

export type MainSearchState =
  | Readonly<{ kind: 'not-available'; nodeId: string }>
  | Readonly<{
      kind: 'unsearched'
      nodeId: string
      preparedOutcome: PreparedMainSearchOutcome
    }>
  | Readonly<{
      kind: 'searched'
      nodeId: string
      revealedIntelIds: readonly string[]
    }>

export interface SceneSearchStateSnapshot {
  readonly sceneInstanceId: string
  readonly nodeStates: readonly MainSearchState[]
}

export interface SceneSearchStateCreationInput {
  readonly runSeed: string
  readonly sceneInstanceId: string
  readonly graph: SceneGraph
  readonly searchCatalog: MainSearchDefinitionCatalog
  readonly itemCatalog: ItemCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
}

export type ItemSearchIlluminationProfile = Readonly<{
  definitionId: string
  kind: 'not-provider' | 'low-light-provider'
}>

export interface SearchIlluminationProfileCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): ItemSearchIlluminationProfile
}

export type PlayerVisibleNodeSearchState =
  | Readonly<{ kind: 'not-available'; nodeId: string }>
  | Readonly<{ kind: 'available-unsearched'; nodeId: string }>
  | Readonly<{
      kind: 'searched'
      nodeId: string
      revealedIntelIds: readonly string[]
    }>
