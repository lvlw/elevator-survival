import { deepFreeze } from '../../../core/config'
import type { MainSearchDefinition } from '../../../core/scene-search'
import { HOSPITAL_NODE_IDS } from '../hospital-scene-graph'
import { HOSPITAL_ITEM_IDS } from '../items'
import { HOSPITAL_INTEL_IDS } from './hospital-search-ids'

export const hospitalMainSearchDefinitions = deepFreeze([
  {
    nodeId: HOSPITAL_NODE_IDS.emergencyHall,
    searchOrdinal: 0,
    fixedItemGrants: [
      { definitionId: HOSPITAL_ITEM_IDS.metalParts, quantity: 1 },
    ],
    weightedItemChoice: {
      entries: [
        { grant: { definitionId: HOSPITAL_ITEM_IDS.standardBattery, quantity: 1 }, weight: 40 },
        { grant: { definitionId: HOSPITAL_ITEM_IDS.fabric, quantity: 1 }, weight: 30 },
        { grant: { definitionId: HOSPITAL_ITEM_IDS.electronicComponents, quantity: 1 }, weight: 30 },
      ],
    },
    fixedIntelIds: [HOSPITAL_INTEL_IDS.accessRouteHint],
  },
  {
    nodeId: HOSPITAL_NODE_IDS.pharmacy,
    searchOrdinal: 0,
    fixedItemGrants: [
      { definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 },
    ],
    weightedItemChoice: {
      entries: [
        { grant: { definitionId: HOSPITAL_ITEM_IDS.disinfectant, quantity: 1 }, weight: 35 },
        { grant: { definitionId: HOSPITAL_ITEM_IDS.painkiller, quantity: 1 }, weight: 30 },
        { grant: { definitionId: HOSPITAL_ITEM_IDS.firstAidKit, quantity: 1 }, weight: 20 },
        { grant: { definitionId: HOSPITAL_ITEM_IDS.infectionSuppressant, quantity: 1 }, weight: 15 },
      ],
    },
    fixedIntelIds: [],
  },
  {
    nodeId: HOSPITAL_NODE_IDS.securityOffice,
    searchOrdinal: 0,
    fixedItemGrants: [
      { definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard, quantity: 1 },
      { definitionId: HOSPITAL_ITEM_IDS.standardBattery, quantity: 1 },
    ],
    weightedItemChoice: null,
    fixedIntelIds: [HOSPITAL_INTEL_IDS.securityMonitoringRecord],
  },
] satisfies readonly MainSearchDefinition[])
