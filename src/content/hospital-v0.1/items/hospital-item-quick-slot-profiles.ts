import { deepFreeze } from '../../../core/config'
import type { ItemQuickSlotProfile } from '../../../core/quick-slot'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

const eligible = [
  HOSPITAL_ITEM_IDS.bandage,
  HOSPITAL_ITEM_IDS.disinfectant,
  HOSPITAL_ITEM_IDS.painkiller,
]

const notEligible = [
  HOSPITAL_ITEM_IDS.metalPipe,
  HOSPITAL_ITEM_IDS.fireAxe,
  HOSPITAL_ITEM_IDS.heavyCoat,
  HOSPITAL_ITEM_IDS.crowbar,
  HOSPITAL_ITEM_IDS.flashlight,
  HOSPITAL_ITEM_IDS.toolkit,
  HOSPITAL_ITEM_IDS.firstAidKit,
  HOSPITAL_ITEM_IDS.ration,
  HOSPITAL_ITEM_IDS.infectionSuppressant,
  HOSPITAL_ITEM_IDS.standardBattery,
  HOSPITAL_ITEM_IDS.metalParts,
  HOSPITAL_ITEM_IDS.electronicComponents,
  HOSPITAL_ITEM_IDS.fabric,
  HOSPITAL_ITEM_IDS.isolationWardAccessCard,
  HOSPITAL_ITEM_IDS.sealedPathogenCase,
]

export const hospitalItemQuickSlotProfiles = deepFreeze([
  ...eligible.map((definitionId) => ({
    definitionId,
    kind: 'eligible' as const,
  })),
  ...notEligible.map((definitionId) => ({
    definitionId,
    kind: 'not-eligible' as const,
  })),
] satisfies readonly ItemQuickSlotProfile[])
