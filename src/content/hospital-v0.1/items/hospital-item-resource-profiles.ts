import type { ItemResourceProfile } from '../../../core/item-state'
import { deepFreeze } from '../../../core/config'
import { hospitalSliceV01RuleConfig } from '../rule-config'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

const maxima = hospitalSliceV01RuleConfig.maintenance.itemResourceMaximums

export const hospitalItemResourceProfiles = deepFreeze([
  {
    definitionId: HOSPITAL_ITEM_IDS.fireAxe,
    kind: 'durability',
    maximum: maxima.fireAxeDurability,
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.metalPipe,
    kind: 'durability',
    maximum: hospitalSliceV01RuleConfig.combat.metalPipe.maxDurability,
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.heavyCoat,
    kind: 'integrity',
    maximum: maxima.heavyCoatIntegrity,
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.crowbar,
    kind: 'durability',
    maximum: maxima.crowbarDurability,
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.flashlight,
    kind: 'charge',
    maximum: hospitalSliceV01RuleConfig.maintenance.flashlightCharge.maxCharge,
  },
  {
    definitionId: HOSPITAL_ITEM_IDS.toolkit,
    kind: 'durability',
    maximum: maxima.toolkitDurability,
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
  ].map((definitionId) => ({ definitionId, kind: 'none' as const })),
] satisfies readonly ItemResourceProfile[])
