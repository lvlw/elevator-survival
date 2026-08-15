import type {
  SceneLaunchContentDefinition,
  SceneRuntimeContentBundle,
} from '../../core/scene-launch'
import { createHospitalSceneCombatDependencies } from './combat'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import {
  hospitalDeviceRechargeCatalog,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalItemSearchIlluminationCatalog,
  hospitalSceneMedicalContentBindings,
} from './items'
import {
  hospitalSceneEdgeAccessCatalog,
  hospitalSceneObstacleCatalog,
} from './obstacles'
import { hospitalSliceV01RuleConfig } from './rule-config'
import { hospitalMainSearchCatalog } from './search'
import { hospitalSceneTaskEventCatalog } from './task-events'

export const HOSPITAL_SCENE_DEFINITION_ID = 'scene_blockaded_hospital_emergency_floor_1'

export function createHospitalSceneRuntimeBundle(
  runSeed: string,
  sceneInstanceId: string,
): SceneRuntimeContentBundle {
  return Object.freeze({
    sceneDefinitionId: HOSPITAL_SCENE_DEFINITION_ID,
    entryNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    initialEnabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
    dependencies: Object.freeze({
      graph: hospitalSliceV01SceneGraph,
      physicalCatalog: hospitalItemCatalog,
      equipmentCatalog: hospitalItemEquipmentCatalog,
      quickSlotCatalog: hospitalItemQuickSlotCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      config: hospitalSliceV01RuleConfig,
      edgeAccessCatalog: hospitalSceneEdgeAccessCatalog,
      searchCatalog: hospitalMainSearchCatalog,
      searchIlluminationCatalog: hospitalItemSearchIlluminationCatalog,
      obstacleCatalog: hospitalSceneObstacleCatalog,
      sceneCombat: createHospitalSceneCombatDependencies(runSeed, sceneInstanceId),
      taskEventCatalog: hospitalSceneTaskEventCatalog,
      medicalBindings: hospitalSceneMedicalContentBindings,
      lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
      deviceRechargeCatalog: hospitalDeviceRechargeCatalog,
      runSeed,
    }),
  })
}

export const hospitalSceneLaunchContent = Object.freeze({
  sceneDefinitionId: HOSPITAL_SCENE_DEFINITION_ID,
  createRuntime: createHospitalSceneRuntimeBundle,
} satisfies SceneLaunchContentDefinition)
