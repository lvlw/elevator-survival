import { getEffectiveEnabledEdgeIds } from '../../core/scene-access'
import type { SceneExplorationSnapshot } from '../../core/scene-exploration'
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
  const effectiveEnabled = new Set(getEffectiveEnabledEdgeIds(
    scene,
    runtime.dependencies.edgeAccessCatalog,
  ))
  const nodeNames = new Map(
    runtime.dependencies.graph.nodes.map(({ id, name }) => [id, name]),
  )
  const result = runtime.dependencies.graph.edges
    .filter(({ id, from, to }) =>
      effectiveEnabled.has(id) &&
      (from === scene.currentNodeId || to === scene.currentNodeId),
    )
    .map(({ id, from, to }) => {
      const destinationNodeId = from === scene.currentNodeId ? to : from
      const destinationNodeName = nodeNames.get(destinationNodeId)
      if (!destinationNodeName) {
        throw new Error('正式场景图缺少可通行相邻节点名称')
      }
      const profile = runtime.dependencies.edgeAccessCatalog?.has(id)
        ? runtime.dependencies.edgeAccessCatalog.get(id)
        : null
      const accessGrantDefinitionId = profile && scene.backpack.items.some(
        ({ definitionId }) => definitionId === profile.requiredDefinitionId,
      )
        ? profile.requiredDefinitionId
        : null
      return Object.freeze({
        edgeId: id,
        destinationNodeId,
        destinationNodeName,
        accessGrantDefinitionId,
      })
    })
    .sort((left, right) =>
      left.destinationNodeName.localeCompare(right.destinationNodeName) ||
      left.edgeId.localeCompare(right.edgeId),
    )
  return Object.freeze(result)
}
