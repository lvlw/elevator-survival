import type { HubMaintenanceContentBindings } from '../../../core/hub-maintenance'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemMaintenanceCatalog } from './hospital-item-maintenance-catalog'
import { hospitalDeviceRechargeCatalog } from './hospital-device-recharge-catalog'

export const hospitalHubMaintenanceContentBindings: HubMaintenanceContentBindings = Object.freeze({
  profiles: hospitalItemMaintenanceCatalog,
  deviceRechargeCatalog: hospitalDeviceRechargeCatalog,
  materials: Object.freeze({
    metalPartsDefinitionId: HOSPITAL_ITEM_IDS.metalParts,
    fabricDefinitionId: HOSPITAL_ITEM_IDS.fabric,
    electronicComponentsDefinitionId: HOSPITAL_ITEM_IDS.electronicComponents,
  }),
})
