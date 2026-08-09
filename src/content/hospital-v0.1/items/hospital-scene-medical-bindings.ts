import type { MedicalContentBindings } from '../../../core/medical'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

export const hospitalSceneMedicalContentBindings: MedicalContentBindings =
  Object.freeze({
    bandageDefinitionId: HOSPITAL_ITEM_IDS.bandage,
    painkillerDefinitionId: HOSPITAL_ITEM_IDS.painkiller,
    disinfectantDefinitionId: HOSPITAL_ITEM_IDS.disinfectant,
    firstAidKitDefinitionId: HOSPITAL_ITEM_IDS.firstAidKit,
  })
