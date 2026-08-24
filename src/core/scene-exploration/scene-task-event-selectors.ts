import {
  getSceneTaskEventOptionPrimaryMetadata,
  getSceneTaskEventStatus,
} from '../scene-task-event'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  PlayerVisibleSceneTaskEvent,
  PlayerVisibleSceneTaskEventOption,
  SceneExplorationSnapshot,
  SceneTaskEventCommandDependencies,
} from './scene-exploration-types'

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
    const encounter = snapshot.combatState.encounters.find(
      ({ encounterId }) => encounterId === event.requiredDefeatedEncounterId,
    )
    if (
      status === 'completed' ||
      !encounter ||
      encounter.kind !== 'dormant' ||
      !encounter.enemy.defeated
    ) {
      result.push({ eventId, status, options: [] })
      continue
    }
    const options: PlayerVisibleSceneTaskEventOption[] = event.options.flatMap((option) => {
      try {
        const metadata = getSceneTaskEventOptionPrimaryMetadata(
          snapshot,
          event.id,
          option.id,
          dependencies,
        )
        return [{
          optionId: metadata.optionId,
          kind: metadata.kind,
          actionTime: metadata.actionTime,
          effectiveRiskTier: metadata.effectiveRiskTier,
          impactProtectionActive: metadata.impactProtectionActive,
          requiresBackpackPlacement: metadata.requiresBackpackPlacement,
        }]
      } catch (error) {
        if (error instanceof SceneExplorationError) return []
        throw error
      }
    })
    result.push({ eventId, status, options })
  }
  return Object.freeze(result)
}
