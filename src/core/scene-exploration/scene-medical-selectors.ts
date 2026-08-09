import { deepFreeze } from '../config'
import { getAvailableMedicalTargets } from '../medical'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { validateSceneMedicalDependencies } from './scene-medical-dependencies'
import { getSceneMedicalItemKind } from './scene-medical-support'
import type {
  SceneExplorationSnapshot,
  SceneMedicalCommandDependencies,
  SceneMedicalItemSource,
  UseSceneMedicalItemCommand,
} from './scene-exploration-types'

function commandSortKey(command: UseSceneMedicalItemCommand): string {
  const source = command.source.container === 'backpack'
    ? `backpack:${command.source.itemInstanceId}`
    : `quick-slot:${command.source.quickSlotIndex}`
  const target = command.target?.kind === 'open-wound'
    ? `open-wound:${command.target.woundId}`
    : command.target?.kind ?? ''
  return `${source}:${target}`
}

function sources(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneMedicalCommandDependencies,
): readonly Readonly<{
  source: SceneMedicalItemSource
  medicalItem: 'bandage' | 'painkiller' | 'disinfectant' | 'first-aid-kit'
}>[] {
  const result: Array<{
    source: SceneMedicalItemSource
    medicalItem: 'bandage' | 'painkiller' | 'disinfectant' | 'first-aid-kit'
  }> = []
  for (const item of [...snapshot.backpack.items].sort((left, right) => left.instanceId.localeCompare(right.instanceId))) {
    const medicalItem = getSceneMedicalItemKind(item.definitionId, dependencies)
    if (medicalItem) result.push({ source: { container: 'backpack', itemInstanceId: item.instanceId }, medicalItem })
  }
  for (let quickSlotIndex = 0; quickSlotIndex < snapshot.quickSlots.slots.length; quickSlotIndex += 1) {
    const item = snapshot.quickSlots.slots[quickSlotIndex]
    if (!item) continue
    const medicalItem = getSceneMedicalItemKind(item.definitionId, dependencies)
    if (medicalItem) result.push({ source: { container: 'quick-slot', quickSlotIndex }, medicalItem })
  }
  return result
}

export function getAvailableSceneMedicalCommandsFromValidatedSnapshot(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneMedicalCommandDependencies,
): readonly UseSceneMedicalItemCommand[] {
  if (
    snapshot.status !== 'active' ||
    snapshot.condition.currentHealth === 0 ||
    snapshot.remainingTime === 0
  ) return deepFreeze([])

  const result: UseSceneMedicalItemCommand[] = []
  for (const candidate of sources(snapshot, dependencies)) {
    for (const target of getAvailableMedicalTargets(
      snapshot.condition,
      snapshot.dailyMedicalUsage,
      candidate.medicalItem,
      dependencies.config,
    )) {
      result.push(target ? { source: candidate.source, target } : { source: candidate.source })
    }
  }
  return deepFreeze(result.sort((left, right) => commandSortKey(left).localeCompare(commandSortKey(right))))
}

export function getAvailableSceneMedicalCommands(
  snapshotInput: SceneExplorationSnapshot,
  dependencies: SceneMedicalCommandDependencies,
): readonly UseSceneMedicalItemCommand[] {
  validateSceneMedicalDependencies(dependencies)
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  return getAvailableSceneMedicalCommandsFromValidatedSnapshot(snapshot, dependencies)
}
