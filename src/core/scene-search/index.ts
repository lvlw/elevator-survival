export { SceneSearchError, type SceneSearchErrorCode } from './scene-search-errors'
export { createMainSearchDefinitionCatalog } from './scene-search-definition-catalog'
export { createSearchIlluminationProfileCatalog } from './search-illumination-profile-catalog'
export { materializeMainSearchOutcome } from './scene-search-materialization'
export { getPlayerVisibleNodeSearchState } from './player-visible-search-state'
export {
  createSceneSearchState,
  revealPreparedMainSearchOutcome,
  validateSceneSearchState,
} from './scene-search-state'
export type {
  MainSearchDefinition,
  MainSearchDefinitionCatalog,
  MainSearchState,
  ItemSearchIlluminationProfile,
  PlayerVisibleNodeSearchState,
  PreparedMainSearchOutcome,
  SceneSearchStateCreationInput,
  SceneSearchStateSnapshot,
  SearchItemGrant,
  SearchRandomTrace,
  SearchIlluminationProfileCatalog,
  WeightedSearchItemChoice,
  WeightedSearchItemEntry,
} from './scene-search-types'
