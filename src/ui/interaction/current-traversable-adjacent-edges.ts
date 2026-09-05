import {
  getSceneMoveOpportunities,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import type { SceneRuntimeContentBundle } from '../../core/scene-launch'

/**
 * Player-presentable, currently traversable adjacency. This deliberately is
 * not a complete known-map query: it only exposes edges the formal Scene
 * access rules currently allow from the player's current node.
 */
export interface CurrentTraversableAdjacentEdge {
  readonly edgeId: string
  readonly destinationNodeId: string
  readonly destinationNodeName: string
  /** Present only when the current canonical backpack satisfies formal access metadata. */
  readonly accessGrantDefinitionId: string | null
}

export function getCurrentTraversableAdjacentEdges(
  scene: SceneExplorationSnapshot,
  runtime: SceneRuntimeContentBundle,
): readonly CurrentTraversableAdjacentEdge[] {
  return Object.freeze(getSceneMoveOpportunities(scene, runtime.dependencies).map((opportunity) =>
    Object.freeze({
      edgeId: opportunity.command.edgeId,
      destinationNodeId: opportunity.destinationNodeId,
      destinationNodeName: opportunity.destinationNodeName,
      accessGrantDefinitionId: opportunity.accessGrantDefinitionId,
    }),
  ))
}
