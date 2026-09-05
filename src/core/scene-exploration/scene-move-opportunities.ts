import { deepFreeze } from '../config'
import { createMoveThroughSceneEdgeCommand } from './scene-move-command'
import { previewSceneMoveCommand } from './scene-move-resolution'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  MoveThroughSceneEdgeCommand,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

/**
 * Core-owned, currently executable Scene movement choice. Internal identities
 * are retained only so the interaction layer can dispatch the formal command.
 */
export interface SceneMoveOpportunity {
  readonly command: MoveThroughSceneEdgeCommand
  readonly destinationNodeId: string
  readonly destinationNodeName: string
  readonly accessGrantDefinitionId: string | null
}

export function getSceneMoveOpportunities(
  input: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
): readonly SceneMoveOpportunity[] {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  if (snapshot.status !== 'active') return deepFreeze([])
  const known = new Set(snapshot.navigationKnowledge.knownEdgeIds)
  const nodeNames = new Map(dependencies.graph.nodes.map(({ id, name }) => [id, name]))

  return deepFreeze(dependencies.graph.edges.flatMap((edge) => {
    if (!known.has(edge.id)) return []
    const destinationNodeId = edge.from === snapshot.currentNodeId
      ? edge.to
      : edge.bidirectional && edge.to === snapshot.currentNodeId
        ? edge.from
        : null
    if (destinationNodeId === null) return []
    const command = createMoveThroughSceneEdgeCommand({ edgeId: edge.id })
    if (!previewSceneMoveCommand(snapshot, command, dependencies).canExecute) return []
    const destinationNodeName = nodeNames.get(destinationNodeId)
    if (!destinationNodeName) throw new Error('正式场景图缺少可移动相邻节点名称')
    const profile = dependencies.edgeAccessCatalog?.has(edge.id)
      ? dependencies.edgeAccessCatalog.get(edge.id)
      : null
    const accessGrantDefinitionId = profile && snapshot.backpack.items.some(
      ({ definitionId }) => definitionId === profile.requiredDefinitionId,
    )
      ? profile.requiredDefinitionId
      : null
    return [{
      command,
      destinationNodeId,
      destinationNodeName,
      accessGrantDefinitionId,
    }]
  }))
}
