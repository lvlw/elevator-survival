import { createSceneCombatEncounterCatalog } from '../../../core/scene-combat'
import { HOSPITAL_NODE_IDS, hospitalSliceV01SceneGraph } from '../hospital-scene-graph'
import { HOSPITAL_ENEMY_IDS, hospitalEnemyCatalog } from './hospital-infected-orderly'
import { hospitalCombatContentBindings } from './hospital-infected-orderly'
import {
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
} from '../items'
import { hospitalSliceV01RuleConfig } from '../rule-config'
import type { SceneCombatDependencies } from '../../../core/scene-combat'

export const HOSPITAL_COMBAT_ENCOUNTER_IDS = Object.freeze({
  infectedOrderly: 'encounter_hospital_infected_orderly',
} as const)

export const HOSPITAL_COMBAT_EVENT_IDS = Object.freeze({
  infectedOrderly: 'event_hospital_infected_orderly_encounter',
} as const)

export const hospitalInfectedOrderlyEncounterDefinition = Object.freeze({
  id: HOSPITAL_COMBAT_ENCOUNTER_IDS.infectedOrderly,
  eventId: HOSPITAL_COMBAT_EVENT_IDS.infectedOrderly,
  nodeId: HOSPITAL_NODE_IDS.isolationCorridor,
  enemyDefinitionId: HOSPITAL_ENEMY_IDS.infectedOrderly,
  triggerKind: 'enter-node-while-enemy-present' as const,
})

export const hospitalSceneCombatEncounterCatalog =
  createSceneCombatEncounterCatalog([
    hospitalInfectedOrderlyEncounterDefinition,
  ], {
    graph: hospitalSliceV01SceneGraph,
    enemyCatalog: hospitalEnemyCatalog,
  })

export function createHospitalSceneCombatDependencies(
  runSeed: string,
  sceneInstanceId: string,
): SceneCombatDependencies {
  return Object.freeze({
    encounterCatalog: hospitalSceneCombatEncounterCatalog,
    combat: Object.freeze({
      runSeed,
      sceneInstanceId,
      config: hospitalSliceV01RuleConfig,
      physicalCatalog: hospitalItemCatalog,
      equipmentCatalog: hospitalItemEquipmentCatalog,
      quickSlotCatalog: hospitalItemQuickSlotCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      enemyCatalog: hospitalEnemyCatalog,
      bindings: hospitalCombatContentBindings,
    }),
  })
}
