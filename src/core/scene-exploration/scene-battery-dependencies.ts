import { SceneExplorationError } from './scene-exploration-errors'
import type { SceneBatteryCommandDependencies } from './scene-exploration-types'

export function validateSceneBatteryDependencies(dependencies: SceneBatteryCommandDependencies): void {
  const catalog = dependencies.deviceRechargeCatalog
  if (!catalog || !Array.isArray(catalog.bindings) || typeof catalog.get !== 'function' ||
    typeof catalog.getBindingsForSupply !== 'function' || typeof catalog.getBindingsForTarget !== 'function' ||
    dependencies.config.scene.batteryUseTime <= 0 ||
    dependencies.config.maintenance.flashlightCharge.batteryUnits !== 1 ||
    dependencies.config.maintenance.flashlightCharge.chargeRecovery <= 0) {
    throw new SceneExplorationError('INVALID_SCENE_BATTERY_BINDINGS', '场景电池充能依赖无效')
  }
  for (const binding of catalog.bindings) {
    if (!dependencies.physicalCatalog.has(binding.supplyDefinitionId) ||
      !dependencies.physicalCatalog.has(binding.targetDefinitionId) ||
      dependencies.itemResourceCatalog.get(binding.supplyDefinitionId).kind !== 'none' ||
      dependencies.itemResourceCatalog.get(binding.targetDefinitionId).kind !== binding.targetResourceKind) {
      throw new SceneExplorationError('INVALID_SCENE_BATTERY_BINDINGS', '场景电池充能目录与物品资源不一致')
    }
  }
}
