import { createSceneTaskEventCatalog } from '../../../core/scene-task-event'
import {
  hospitalSceneCombatEncounterCatalog,
  HOSPITAL_COMBAT_ENCOUNTER_IDS,
} from '../combat/hospital-scene-combat'
import { HOSPITAL_NODE_IDS, hospitalSliceV01SceneGraph } from '../hospital-scene-graph'
import {
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemResourceCatalog,
  HOSPITAL_ITEM_IDS,
} from '../items'
import { HOSPITAL_INTEL_IDS } from '../search/hospital-search-ids'

export const HOSPITAL_TASK_EVENT_IDS = Object.freeze({
  pathogenCaseRetrieval: 'event_hospital_pathogen_case_retrieval',
} as const)

export const HOSPITAL_TASK_EVENT_OPTION_IDS = Object.freeze({
  cautiousExtraction: 'cautious-extraction',
  directExtraction: 'direct-extraction',
  decline: 'decline',
} as const)

export const hospitalPathogenCaseRetrievalDefinition = Object.freeze({
  id: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval,
  nodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
  requiredDefeatedEncounterId: HOSPITAL_COMBAT_ENCOUNTER_IDS.infectedOrderly,
  outputDefinitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
  outputIndex: 0,
  originIntelId: HOSPITAL_INTEL_IDS.pathogenCaseOrigin,
  impactProtection: {
    equipmentSlot: 'armor' as const,
    definitionId: HOSPITAL_ITEM_IDS.heavyCoat,
    resourceKind: 'integrity' as const,
  },
  options: [
    { id: HOSPITAL_TASK_EVENT_OPTION_IDS.cautiousExtraction, kind: 'extract' as const, extractionMode: 'cautious' as const },
    { id: HOSPITAL_TASK_EVENT_OPTION_IDS.directExtraction, kind: 'extract' as const, extractionMode: 'direct' as const },
    { id: HOSPITAL_TASK_EVENT_OPTION_IDS.decline, kind: 'decline' as const },
  ],
})

export const hospitalSceneTaskEventCatalog = createSceneTaskEventCatalog(
  [hospitalPathogenCaseRetrievalDefinition],
  {
    graph: hospitalSliceV01SceneGraph,
    itemCatalog: hospitalItemCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    encounterCatalog: hospitalSceneCombatEncounterCatalog,
  },
)
