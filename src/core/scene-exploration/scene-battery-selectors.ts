import { deepFreeze } from '../config'
import { getItemState } from '../item-state'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { validateSceneBatteryDependencies } from './scene-battery-dependencies'
import type { SceneBatteryCommandDependencies, SceneExplorationSnapshot, UseSceneBatteryCommand } from './scene-exploration-types'

function candidates(snapshot: SceneExplorationSnapshot, dependencies: SceneBatteryCommandDependencies): readonly UseSceneBatteryCommand[] {
  if (snapshot.status !== 'active' || snapshot.condition.currentHealth === 0 || snapshot.remainingTime === 0) return deepFreeze([])
  const batteries = snapshot.backpack.items.filter((item) =>
    item.quantity > 0 && getItemState(snapshot.itemStates, item.instanceId).resource.kind === 'none' &&
    dependencies.deviceRechargeCatalog.getBindingsForSupply(item.definitionId).length > 0,
  )
  const targets = [
    ...snapshot.backpack.items.map((item) => ({ item, state: getItemState(snapshot.itemStates, item.instanceId) })),
    ...(['weapon', 'armor', 'utility'] as const).flatMap((slot) => {
      const item = snapshot.equipment[slot]
      return item ? [{ item, state: getItemState(snapshot.itemStates, item.instanceId) }] : []
    }),
  ].filter(({ item, state }) => {
    if (state.resource.kind === 'none') return false
    const profile = dependencies.itemResourceCatalog.get(item.definitionId)
    if (profile.kind === 'none') return false
    return dependencies.deviceRechargeCatalog.getBindingsForTarget(item.definitionId).some((binding) =>
      binding.targetResourceKind === state.resource.kind && state.resource.current < profile.maximum,
    )
  })
  return deepFreeze(batteries.flatMap((battery) => targets.filter(({ item }) =>
    dependencies.deviceRechargeCatalog.get(battery.definitionId, item.definitionId),
  ).map(({ item }) => ({ batteryInstanceId: battery.instanceId, targetInstanceId: item.instanceId }))).sort((left, right) =>
    `${left.batteryInstanceId}\u0000${left.targetInstanceId}`.localeCompare(`${right.batteryInstanceId}\u0000${right.targetInstanceId}`),
  ))
}

export function getAvailableSceneBatteryCommandsFromValidatedSnapshot(snapshot: SceneExplorationSnapshot, dependencies: SceneBatteryCommandDependencies): readonly UseSceneBatteryCommand[] {
  return candidates(snapshot, dependencies)
}

export function getAvailableSceneBatteryCommands(snapshotInput: SceneExplorationSnapshot, dependencies: SceneBatteryCommandDependencies): readonly UseSceneBatteryCommand[] {
  validateSceneBatteryDependencies(dependencies)
  return candidates(createSceneExplorationSnapshot(snapshotInput, dependencies), dependencies)
}
