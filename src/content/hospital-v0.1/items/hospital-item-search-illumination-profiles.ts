import { deepFreeze } from '../../../core/config'
import type { ItemSearchIlluminationProfile } from '../../../core/scene-search'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_SLICE_ITEM_IDS,
} from './hospital-item-ids'

export const hospitalItemSearchIlluminationProfiles = deepFreeze(
  HOSPITAL_SLICE_ITEM_IDS.map((definitionId) => ({
    definitionId,
    kind:
      definitionId === HOSPITAL_ITEM_IDS.flashlight
        ? 'low-light-provider' as const
        : 'not-provider' as const,
  })) satisfies readonly ItemSearchIlluminationProfile[],
)
