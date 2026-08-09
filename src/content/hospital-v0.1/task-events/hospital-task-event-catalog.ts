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
    { id: 'cautious-extraction', kind: 'extract' as const, extractionMode: 'cautious' as const },
    { id: 'direct-extraction', kind: 'extract' as const, extractionMode: 'direct' as const },
    { id: 'decline', kind: 'decline' as const },
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
