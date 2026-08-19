import {
  HOSPITAL_SLICE_RULES_VERSION,
  hospitalHubSurvivalContentBindings,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSceneLaunchContent,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig,
  hospitalSliceV01SceneGraph,
  hospitalWorldThreatCatalog,
} from '../../content'
import type { CurrentDayHubDependencies } from '../../core/current-day-hub'
import type { RunTerminationDependencies } from '../../core/run-termination'
import type { SceneLaunchDependencies } from '../../core/scene-launch'
import { createRunSaveRulesRegistry } from './run-save-rules-registry'

export const hospitalCurrentDayHubDependencies: CurrentDayHubDependencies = Object.freeze({
  returnDependencies: Object.freeze({
    scene: Object.freeze({
      graph: hospitalSliceV01SceneGraph,
      physicalCatalog: hospitalItemCatalog,
      equipmentCatalog: hospitalItemEquipmentCatalog,
      quickSlotCatalog: hospitalItemQuickSlotCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      config: hospitalSliceV01RuleConfig,
    }),
    lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
  }),
  medicalBindings: hospitalSceneMedicalContentBindings,
  survivalBindings: hospitalHubSurvivalContentBindings,
  worldThreatCatalog: hospitalWorldThreatCatalog,
})

export const hospitalSceneLaunchDependencies: SceneLaunchDependencies = Object.freeze({
  currentDayHub: hospitalCurrentDayHubDependencies,
  content: hospitalSceneLaunchContent,
})

export const hospitalRunTerminationDependencies: RunTerminationDependencies = Object.freeze({
  currentDayHub: hospitalCurrentDayHubDependencies,
  sceneLaunch: hospitalSceneLaunchDependencies,
})

export const hospitalRunSaveRulesRegistry = createRunSaveRulesRegistry([{
  rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
  dependencies: Object.freeze({
    currentDayHub: hospitalCurrentDayHubDependencies,
    sceneLaunch: hospitalSceneLaunchDependencies,
    runTermination: hospitalRunTerminationDependencies,
  }),
}])
