import { deepFreeze } from '../config'
import type { SceneExplorationSnapshot } from './scene-exploration-types'

/**
 * Returns every physical item instance that currently exists in a scene.
 *
 * This includes carried containers, ground items, and prepared outcomes for
 * unsearched nodes. Prepared outcomes are physical instances even before they
 * are revealed, so newly created instances cannot collide with them.
 */
export function getScenePhysicalItemInstanceIds(
  snapshot: SceneExplorationSnapshot,
): readonly string[] {
  const ids = [
    ...snapshot.backpack.items.map(({ instanceId }) => instanceId),
    ...Object.values(snapshot.equipment)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map(({ instanceId }) => instanceId),
    ...snapshot.quickSlots.slots
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map(({ instanceId }) => instanceId),
    ...snapshot.searchState.nodeStates.flatMap((node) =>
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems.map(({ item }) => item.instanceId)
        : [],
    ),
    ...snapshot.sceneItems.nodeStates.flatMap((node) =>
      node.items.map(({ item }) => item.instanceId),
    ),
  ]
  return deepFreeze([...ids].sort((left, right) => left.localeCompare(right)))
}
