import { deepFreeze } from '../config'
import { getUntreatedOpenWounds } from '../condition'
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

  const untreatedWounds = getUntreatedOpenWounds(snapshot.condition)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  const result: UseSceneMedicalItemCommand[] = []
  for (const candidate of sources(snapshot, dependencies)) {
    if (candidate.medicalItem === 'bandage') {
      const canUse =
        snapshot.condition.currentHealth < dependencies.config.combat.player.maxHealth ||
        snapshot.condition.bleeding ||
        untreatedWounds.length > 0
      if (!canUse) continue
      if (untreatedWounds.length === 0) result.push({ source: candidate.source })
      else for (const wound of untreatedWounds) {
        result.push({ source: candidate.source, target: { kind: 'open-wound', woundId: wound.id } })
      }
      continue
    }
    if (candidate.medicalItem === 'painkiller') {
      if (!snapshot.condition.painkillerActive && (snapshot.condition.minorContusions > 0 || untreatedWounds.length > 0)) {
        result.push({ source: candidate.source })
      }
      continue
    }
    if (candidate.medicalItem === 'disinfectant') {
      if (
        snapshot.condition.pendingInfectionExposures > 0 &&
        snapshot.dailyMedicalUsage.disinfectantUsesToday < dependencies.config.medical.disinfectant.maxUsesPerDay
      ) result.push({ source: candidate.source })
      continue
    }
    const hasInjury = snapshot.condition.minorContusions > 0 || snapshot.condition.openWounds.length > 0
    const canUse =
      snapshot.condition.currentHealth < dependencies.config.combat.player.maxHealth ||
      hasInjury
    if (!canUse) continue
    if (snapshot.condition.minorContusions > 0) {
      result.push({ source: candidate.source, target: { kind: 'minor-contusion' } })
    }
    for (const wound of snapshot.condition.openWounds.slice().sort((left, right) => left.id.localeCompare(right.id))) {
      result.push({ source: candidate.source, target: { kind: 'open-wound', woundId: wound.id } })
    }
    if (!hasInjury) result.push({ source: candidate.source })
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
