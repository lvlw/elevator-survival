import { deepFreeze } from '../config'
import type {
  SceneTaskEventCatalog,
  SceneTaskEventStateSnapshot,
  SceneTaskEventStatus,
} from './scene-task-event-types'
import { SceneTaskEventError } from './scene-task-event-catalog'

export function createInitialSceneTaskEventState(
  catalog?: SceneTaskEventCatalog,
): SceneTaskEventStateSnapshot {
  return createSceneTaskEventStateSnapshot({
    entries: (catalog?.eventIds ?? []).map((eventId) => ({ eventId, status: 'available' as const })),
  }, catalog)
}

export function createSceneTaskEventStateSnapshot(
  input: SceneTaskEventStateSnapshot,
  catalog?: SceneTaskEventCatalog,
): SceneTaskEventStateSnapshot {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Array.isArray(input.entries)) {
    throw new SceneTaskEventError('Invalid task event state snapshot.')
  }
  const entries = input.entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).sort().join(',') !== 'eventId,status' ||
      typeof entry.eventId !== 'string' || entry.eventId.trim().length === 0 ||
      (entry.status !== 'available' && entry.status !== 'completed')) {
      throw new SceneTaskEventError('Invalid task event state entry.')
    }
    return { eventId: entry.eventId, status: entry.status as SceneTaskEventStatus }
  })
  const ids = entries.map(({ eventId }) => eventId)
  if (new Set(ids).size !== ids.length || ids.some((id, index) => index > 0 && id.localeCompare(ids[index - 1]) <= 0)) {
    throw new SceneTaskEventError('Task event entries must be unique and sorted.')
  }
  if (!catalog && entries.length !== 0) {
    throw new SceneTaskEventError('Task event state requires a task event catalog.')
  }
  if (catalog && (ids.length !== catalog.eventIds.length || ids.some((id, index) => id !== catalog.eventIds[index]))) {
    throw new SceneTaskEventError('Task event state does not match the task event catalog.')
  }
  return deepFreeze({ entries })
}

export function getSceneTaskEventStatus(
  state: SceneTaskEventStateSnapshot,
  eventId: string,
): SceneTaskEventStatus {
  const entry = state.entries.find((candidate) => candidate.eventId === eventId)
  if (!entry) throw new SceneTaskEventError(`Unknown task event state: ${eventId}`)
  return entry.status
}

export function completeSceneTaskEvent(
  state: SceneTaskEventStateSnapshot,
  eventId: string,
  catalog: SceneTaskEventCatalog,
): SceneTaskEventStateSnapshot {
  if (getSceneTaskEventStatus(state, eventId) !== 'available') {
    throw new SceneTaskEventError(`Task event is not available: ${eventId}`)
  }
  return createSceneTaskEventStateSnapshot({
    entries: state.entries.map((entry) => entry.eventId === eventId ? { ...entry, status: 'completed' as const } : entry),
  }, catalog)
}

export function createStableSceneTaskEventItemInstanceId(
  sceneInstanceId: string,
  eventId: string,
  outputIndex: number,
): string {
  if ([sceneInstanceId, eventId].some((value) => value.trim().length === 0) || !Number.isSafeInteger(outputIndex) || outputIndex < 0) {
    throw new SceneTaskEventError('Invalid stable task item identity input.')
  }
  return `scene-task:${encodeURIComponent(sceneInstanceId)}:${encodeURIComponent(eventId)}:${outputIndex}`
}
