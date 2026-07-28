import { createQuickSlotProfileCatalog } from '../../../core/quick-slot'
import { HOSPITAL_SLICE_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemQuickSlotProfiles } from './hospital-item-quick-slot-profiles'

export const hospitalItemQuickSlotCatalog = createQuickSlotProfileCatalog(
  hospitalItemQuickSlotProfiles,
  HOSPITAL_SLICE_ITEM_IDS,
)
