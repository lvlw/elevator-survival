import { deepFreeze } from '../../../core/config'
import type { MaintenanceProfile } from '../../../core/hub-maintenance'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

/**
 * Only formally confirmed maintenance mappings appear here. In particular,
 * the fire axe deliberately has no profile until its repair tier and recipe
 * are confirmed by a later decision.
 */
export const hospitalItemMaintenanceProfiles = deepFreeze([
  {
    definitionId: HOSPITAL_ITEM_IDS.metalPipe,
    resourceKind: 'durability',
    maintenanceTier: 'basic',
    repairFamily: 'mechanical',
    operations: ['base-labor', 'mechanical-material-repair'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.heavyCoat,
    resourceKind: 'integrity',
    maintenanceTier: 'basic',
    repairFamily: 'textile',
    operations: ['base-labor', 'textile-material-repair'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.crowbar,
    resourceKind: 'durability',
    maintenanceTier: 'basic',
    repairFamily: 'mechanical',
    operations: ['base-labor', 'mechanical-material-repair'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.flashlight,
    resourceKind: 'charge',
    maintenanceTier: 'basic',
    repairFamily: 'electronic-charge',
    operations: ['flashlight-charge'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.toolkit,
    resourceKind: 'durability',
    maintenanceTier: 'professional',
    repairFamily: 'professional-composite',
    operations: ['toolkit-repair'],
  },
] satisfies readonly MaintenanceProfile[])
