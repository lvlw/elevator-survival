import { createDeviceRechargeCatalog } from '../../../core/device-recharge'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

export const hospitalDeviceRechargeCatalog = createDeviceRechargeCatalog([
  {
    supplyDefinitionId: HOSPITAL_ITEM_IDS.standardBattery,
    targetDefinitionId: HOSPITAL_ITEM_IDS.flashlight,
    targetResourceKind: 'charge',
  },
])
