import { createEquipmentProfileCatalog } from '../../../core/equipment'
import { HOSPITAL_SLICE_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemEquipmentProfiles } from './hospital-item-equipment-profiles'

export const hospitalItemEquipmentCatalog = createEquipmentProfileCatalog(
  hospitalItemEquipmentProfiles,
  HOSPITAL_SLICE_ITEM_IDS,
)
