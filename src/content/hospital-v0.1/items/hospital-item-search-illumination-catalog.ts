import { createSearchIlluminationProfileCatalog } from '../../../core/scene-search'
import { hospitalItemCatalog } from './hospital-item-catalog'
import { hospitalItemSearchIlluminationProfiles } from './hospital-item-search-illumination-profiles'

export const hospitalItemSearchIlluminationCatalog =
  createSearchIlluminationProfileCatalog(
    hospitalItemSearchIlluminationProfiles,
    hospitalItemCatalog.definitionIds,
  )
