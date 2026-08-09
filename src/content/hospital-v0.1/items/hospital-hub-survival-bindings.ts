import type { HubSurvivalContentBindings } from '../../../core/current-day-hub'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

export const hospitalHubSurvivalContentBindings: HubSurvivalContentBindings = Object.freeze({
  infectionSuppressantDefinitionId: HOSPITAL_ITEM_IDS.infectionSuppressant,
  rationDefinitionId: HOSPITAL_ITEM_IDS.ration,
})
