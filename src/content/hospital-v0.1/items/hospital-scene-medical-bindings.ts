import type { SceneMedicalContentBindings } from '../../../core/scene-exploration'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

export const hospitalSceneMedicalContentBindings: SceneMedicalContentBindings =
  Object.freeze({
    bandageDefinitionId: HOSPITAL_ITEM_IDS.bandage,
    painkillerDefinitionId: HOSPITAL_ITEM_IDS.painkiller,
    disinfectantDefinitionId: HOSPITAL_ITEM_IDS.disinfectant,
    firstAidKitDefinitionId: HOSPITAL_ITEM_IDS.firstAidKit,
  })
