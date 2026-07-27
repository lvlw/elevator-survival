import { createItemResourceCatalog } from '../../../core/item-state'
import { HOSPITAL_SLICE_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemResourceProfiles } from './hospital-item-resource-profiles'

export const hospitalItemResourceCatalog = createItemResourceCatalog(
  hospitalItemResourceProfiles,
  HOSPITAL_SLICE_ITEM_IDS,
)
