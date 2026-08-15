import type { HubMaintenanceContentBindings } from '../../../core/hub-maintenance'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemMaintenanceCatalog } from './hospital-item-maintenance-catalog'

export const hospitalHubMaintenanceContentBindings: HubMaintenanceContentBindings = Object.freeze({
  profiles: hospitalItemMaintenanceCatalog,
  materials: Object.freeze({
    metalPartsDefinitionId: HOSPITAL_ITEM_IDS.metalParts,
    fabricDefinitionId: HOSPITAL_ITEM_IDS.fabric,
    electronicComponentsDefinitionId: HOSPITAL_ITEM_IDS.electronicComponents,
    standardBatteryDefinitionId: HOSPITAL_ITEM_IDS.standardBattery,
  }),
})
