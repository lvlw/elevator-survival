import type { SceneGraph } from '../core/scene-graph'
import {
  applyPlayerNavigationArrival,
  createInitialPlayerNavigationKnowledge,
  createSceneSurfaceObservationCatalog,
  type SceneSurfaceObservationCatalog,
} from '../core/scene-navigation'

/** Test-only explicit fixture: every incident route is surface-visible. */
export function createFullySurfaceVisibleNavigationCatalog(graph: SceneGraph) {
  return createSceneSurfaceObservationCatalog(
    graph.nodes.map(({ id }) => ({
      nodeId: id,
      surfaceVisibleEdgeIds: graph.edges
        .filter(({ from, to }) => from === id || to === id)
        .map(({ id: edgeId }) => edgeId),
    })),
    graph,
  )
}

export function createTestNavigationKnowledgeAlongPath(
  nodeIds: readonly string[],
  graph: SceneGraph,
  catalog: SceneSurfaceObservationCatalog,
) {
  const [entryNodeId, ...arrivals] = nodeIds
  if (!entryNodeId) throw new Error('Test navigation path must contain an entry node')
  let knowledge = createInitialPlayerNavigationKnowledge(entryNodeId, graph, catalog)
  for (const nodeId of arrivals) {
    knowledge = applyPlayerNavigationArrival(knowledge, nodeId, graph, catalog).knowledge
  }
  return knowledge
}
