import { deepFreeze } from '../../../core/config'
import type { ItemEquipmentProfile } from '../../../core/equipment'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

export const hospitalItemEquipmentProfiles = deepFreeze([
  {
    definitionId: HOSPITAL_ITEM_IDS.metalPipe,
    kind: 'equippable',
    eligibleSlots: ['weapon'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.fireAxe,
    kind: 'equippable',
    eligibleSlots: ['weapon'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.heavyCoat,
    kind: 'equippable',
    eligibleSlots: ['armor'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.crowbar,
    kind: 'equippable',
    eligibleSlots: ['utility'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.flashlight,
    kind: 'equippable',
    eligibleSlots: ['utility'],
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.toolkit,
    kind: 'equippable',
    eligibleSlots: ['utility'],
  },
  ...[
    HOSPITAL_ITEM_IDS.bandage,
    HOSPITAL_ITEM_IDS.disinfectant,
    HOSPITAL_ITEM_IDS.firstAidKit,
    HOSPITAL_ITEM_IDS.painkiller,
    HOSPITAL_ITEM_IDS.ration,
    HOSPITAL_ITEM_IDS.infectionSuppressant,
    HOSPITAL_ITEM_IDS.standardBattery,
    HOSPITAL_ITEM_IDS.metalParts,
    HOSPITAL_ITEM_IDS.electronicComponents,
    HOSPITAL_ITEM_IDS.fabric,
    HOSPITAL_ITEM_IDS.isolationWardAccessCard,
    HOSPITAL_ITEM_IDS.sealedPathogenCase,
  ].map((definitionId) => ({
    definitionId,
    kind: 'not-equippable' as const,
  })),
] satisfies readonly ItemEquipmentProfile[])
