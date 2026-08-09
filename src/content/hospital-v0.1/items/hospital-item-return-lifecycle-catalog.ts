import {
  createItemReturnLifecycleCatalog,
  type ItemReturnLifecycleProfile,
} from '../../../core/run-return'
import { hospitalItemCatalog } from './hospital-item-catalog'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_SLICE_ITEM_IDS,
} from './hospital-item-ids'

export const hospitalItemReturnLifecycleProfiles = Object.freeze(
  HOSPITAL_SLICE_ITEM_IDS.map((definitionId): ItemReturnLifecycleProfile => ({
    definitionId,
    kind: definitionId === HOSPITAL_ITEM_IDS.sealedPathogenCase
      ? 'quest'
      : definitionId === HOSPITAL_ITEM_IDS.isolationWardAccessCard
        ? 'permission'
        : 'ordinary',
  })),
)

export const hospitalItemReturnLifecycleCatalog = createItemReturnLifecycleCatalog(
  hospitalItemReturnLifecycleProfiles,
  hospitalItemCatalog,
)
