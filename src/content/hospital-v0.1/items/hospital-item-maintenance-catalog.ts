import { createMaintenanceProfileCatalog } from '../../../core/hub-maintenance'
import { hospitalItemMaintenanceProfiles } from './hospital-item-maintenance-profiles'

export const hospitalItemMaintenanceCatalog = createMaintenanceProfileCatalog(
  hospitalItemMaintenanceProfiles,
)
