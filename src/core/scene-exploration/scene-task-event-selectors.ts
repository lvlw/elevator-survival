import { getItemState } from '../item-state'
import { getSceneTaskEventStatus } from '../scene-task-event'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  PlayerVisibleSceneTaskEvent,
  PlayerVisibleSceneTaskEventOption,
  SceneExplorationSnapshot,
  SceneTaskEventCommandDependencies,
  SceneTaskRiskTier,
} from './scene-exploration-types'

function riskTier(percent: number): SceneTaskRiskTier {
  if (percent === 0) return 'none'
  if (percent <= 20) return 'low'
  if (percent <= 40) return 'medium'
  return 'high'
}

export function getPlayerVisibleSceneTaskEvents(
  input: SceneExplorationSnapshot,
  dependencies: SceneTaskEventCommandDependencies,
): readonly PlayerVisibleSceneTaskEvent[] {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  if (snapshot.status !== 'active' || snapshot.condition.currentHealth === 0 || snapshot.remainingTime === 0) return Object.freeze([])
  const result: PlayerVisibleSceneTaskEvent[] = []
  for (const eventId of dependencies.taskEventCatalog.eventIds) {
    const event = dependencies.taskEventCatalog.get(eventId)
    if (event.nodeId !== snapshot.currentNodeId) continue
    const status = getSceneTaskEventStatus(snapshot.taskEvents, eventId)
    const armor = snapshot.equipment.armor
    const state = armor?.definitionId === event.impactProtection.definitionId ? getItemState(snapshot.itemStates, armor.instanceId) : null
    const activeCoat = state?.resource.kind === 'integrity' && state.resource.current >= 1
    const options: PlayerVisibleSceneTaskEventOption[] = event.options.map((option) => {
      if (option.kind === 'decline') return { optionId: option.id, kind: 'decline', actionTime: 0, effectiveRiskTier: 'none', impactProtectionActive: false, requiresBackpackPlacement: false }
      const raw = option.extractionMode === 'direct'
        ? dependencies.config.scene.pathogenCaseRetrieval.directContaminationRiskPercent
        : dependencies.config.scene.pathogenCaseRetrieval.cautiousContaminationRiskPercent
      const protectedRisk = option.extractionMode === 'direct'
        ? dependencies.config.scene.pathogenCaseRetrieval.protectedDirectContaminationRiskPercent
        : dependencies.config.scene.pathogenCaseRetrieval.protectedCautiousContaminationRiskPercent
      const protectedActive = activeCoat && protectedRisk < raw
      return {
        optionId: option.id,
        kind: 'extract',
        actionTime: option.extractionMode === 'direct' ? dependencies.config.scene.extractionTime.direct : dependencies.config.scene.extractionTime.cautious,
        effectiveRiskTier: riskTier(protectedActive ? protectedRisk : raw),
        impactProtectionActive: protectedActive,
        requiresBackpackPlacement: true,
      }
    })
    result.push({ eventId, status, options })
  }
  return Object.freeze(result)
}
