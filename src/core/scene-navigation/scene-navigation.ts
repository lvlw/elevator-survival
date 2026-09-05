import { deepFreeze } from '../config'
import type { SceneGraph } from '../scene-graph'

export interface SceneSurfaceObservationDefinition {
  readonly nodeId: string
  readonly surfaceVisibleEdgeIds: readonly string[]
}

export interface SceneSurfaceObservationCatalog {
  readonly entries: readonly Readonly<SceneSurfaceObservationDefinition>[]
  get(nodeId: string): Readonly<SceneSurfaceObservationDefinition>
}

export interface PlayerNavigationKnowledgeSnapshot {
  readonly discoveredNodeIds: readonly string[]
  readonly visitedNodeIds: readonly string[]
  readonly knownEdgeIds: readonly string[]
}

export interface PlayerNavigationKnowledgeDelta {
  readonly arrivalNodeId: string
  readonly addedDiscoveredNodeIds: readonly string[]
  readonly addedVisitedNodeIds: readonly string[]
  readonly addedKnownEdgeIds: readonly string[]
}

export interface PlayerNavigationArrivalResult {
  readonly knowledge: PlayerNavigationKnowledgeSnapshot
  readonly delta: PlayerNavigationKnowledgeDelta
}

export class SceneNavigationError extends Error {
  constructor(
    public readonly code: 'INVALID_CATALOG' | 'INVALID_KNOWLEDGE',
    message: string,
  ) {
    super(message)
    this.name = 'SceneNavigationError'
  }
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function strictStringIds(
  value: unknown,
  validIds: ReadonlySet<string>,
  label: string,
): readonly string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', `${label}必须是字符串数组`)
  }
  const result = value as string[]
  if (new Set(result).size !== result.length) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', `${label}不能包含重复ID`)
  }
  if (result.some((id) => !validIds.has(id))) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', `${label}包含未知ID`)
  }
  return [...result].sort()
}

export function createSceneSurfaceObservationCatalog(
  input: unknown,
  graph: SceneGraph,
): SceneSurfaceObservationCatalog {
  if (!Array.isArray(input)) {
    throw new SceneNavigationError('INVALID_CATALOG', '表层观察目录必须是数组')
  }
  const nodeIds = new Set(graph.nodes.map(({ id }) => id))
  const edges = new Map(graph.edges.map((edge) => [edge.id, edge]))
  const seenNodes = new Set<string>()
  const entries = input.map((entry) => {
    if (!exact(entry, ['nodeId', 'surfaceVisibleEdgeIds']) ||
      typeof entry.nodeId !== 'string' || !nodeIds.has(entry.nodeId) ||
      !Array.isArray(entry.surfaceVisibleEdgeIds) ||
      entry.surfaceVisibleEdgeIds.some((id) => typeof id !== 'string')) {
      throw new SceneNavigationError('INVALID_CATALOG', '表层观察目录项结构或节点无效')
    }
    if (seenNodes.has(entry.nodeId)) {
      throw new SceneNavigationError('INVALID_CATALOG', `表层观察节点重复：${entry.nodeId}`)
    }
    seenNodes.add(entry.nodeId)
    const edgeIds = entry.surfaceVisibleEdgeIds as string[]
    if (new Set(edgeIds).size !== edgeIds.length) {
      throw new SceneNavigationError('INVALID_CATALOG', `节点${entry.nodeId}的可见边重复`)
    }
    for (const edgeId of edgeIds) {
      const edge = edges.get(edgeId)
      if (!edge || (edge.from !== entry.nodeId && edge.to !== entry.nodeId)) {
        throw new SceneNavigationError('INVALID_CATALOG', `节点${entry.nodeId}引用未知或不相连的可见边`)
      }
    }
    return { nodeId: entry.nodeId, surfaceVisibleEdgeIds: [...edgeIds].sort() }
  })
  if (seenNodes.size !== graph.nodes.length || graph.nodes.some(({ id }) => !seenNodes.has(id))) {
    throw new SceneNavigationError('INVALID_CATALOG', '每个正式节点必须恰好拥有一项表层观察配置')
  }
  const canonical = deepFreeze(entries.sort((a, b) => a.nodeId.localeCompare(b.nodeId)))
  const byNode = new Map(canonical.map((entry) => [entry.nodeId, entry]))
  return deepFreeze({
    entries: canonical,
    get(nodeId: string) {
      const entry = byNode.get(nodeId)
      if (!entry) throw new SceneNavigationError('INVALID_CATALOG', `未知表层观察节点：${nodeId}`)
      return entry
    },
  })
}

export function createPlayerNavigationKnowledgeSnapshot(
  input: unknown,
  currentNodeId: string,
  graph: SceneGraph,
  catalog: SceneSurfaceObservationCatalog,
): PlayerNavigationKnowledgeSnapshot {
  if (!exact(input, ['discoveredNodeIds', 'knownEdgeIds', 'visitedNodeIds'])) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', '导航知识必须包含且只包含全部正式字段')
  }
  const nodes = new Set(graph.nodes.map(({ id }) => id))
  const edges = new Map(graph.edges.map((edge) => [edge.id, edge]))
  const discoveredNodeIds = strictStringIds(input.discoveredNodeIds, nodes, '已发现节点')
  const visitedNodeIds = strictStringIds(input.visitedNodeIds, nodes, '已访问节点')
  const knownEdgeIds = strictStringIds(input.knownEdgeIds, new Set(edges.keys()), '已知路线')
  const discovered = new Set(discoveredNodeIds)
  const visited = new Set(visitedNodeIds)
  const known = new Set(knownEdgeIds)
  if ([...visited].some((id) => !discovered.has(id))) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', '已访问节点必须属于已发现节点')
  }
  if (!visited.has(currentNodeId)) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', '当前节点必须属于已访问节点')
  }
  for (const edgeId of known) {
    const edge = edges.get(edgeId)!
    if (!discovered.has(edge.from) || !discovered.has(edge.to)) {
      throw new SceneNavigationError('INVALID_KNOWLEDGE', '已知路线的两个端点都必须已发现')
    }
  }
  for (const nodeId of visited) {
    for (const edgeId of catalog.get(nodeId).surfaceVisibleEdgeIds) {
      if (!known.has(edgeId)) {
        throw new SceneNavigationError('INVALID_KNOWLEDGE', '已访问节点要求的表层路线知识不能缺失')
      }
    }
  }
  return deepFreeze({ discoveredNodeIds, visitedNodeIds, knownEdgeIds })
}

export function applyPlayerNavigationArrival(
  current: PlayerNavigationKnowledgeSnapshot,
  arrivalNodeId: string,
  graph: SceneGraph,
  catalog: SceneSurfaceObservationCatalog,
): PlayerNavigationArrivalResult {
  const before = createPlayerNavigationKnowledgeSnapshot(current, current.visitedNodeIds[0] ?? arrivalNodeId, graph, catalog)
  const discovered = new Set(before.discoveredNodeIds)
  const visited = new Set(before.visitedNodeIds)
  const known = new Set(before.knownEdgeIds)
  const addedDiscoveredNodeIds: string[] = []
  const addedVisitedNodeIds: string[] = []
  const addedKnownEdgeIds: string[] = []
  if (!visited.has(arrivalNodeId)) {
    if (!discovered.has(arrivalNodeId)) addedDiscoveredNodeIds.push(arrivalNodeId)
    discovered.add(arrivalNodeId)
    visited.add(arrivalNodeId)
    addedVisitedNodeIds.push(arrivalNodeId)
    for (const edgeId of catalog.get(arrivalNodeId).surfaceVisibleEdgeIds) {
      const edge = graph.edges.find(({ id }) => id === edgeId)!
      if (!known.has(edgeId)) addedKnownEdgeIds.push(edgeId)
      known.add(edgeId)
      for (const endpoint of [edge.from, edge.to]) {
        if (!discovered.has(endpoint)) addedDiscoveredNodeIds.push(endpoint)
        discovered.add(endpoint)
      }
    }
  }
  const knowledge = createPlayerNavigationKnowledgeSnapshot({
    discoveredNodeIds: [...discovered],
    visitedNodeIds: [...visited],
    knownEdgeIds: [...known],
  }, arrivalNodeId, graph, catalog)
  return deepFreeze({
    knowledge,
    delta: {
      arrivalNodeId,
      addedDiscoveredNodeIds: [...new Set(addedDiscoveredNodeIds)].sort(),
      addedVisitedNodeIds: addedVisitedNodeIds.sort(),
      addedKnownEdgeIds: addedKnownEdgeIds.sort(),
    },
  })
}

export function createInitialPlayerNavigationKnowledge(
  entryNodeId: string,
  graph: SceneGraph,
  catalog: SceneSurfaceObservationCatalog,
): PlayerNavigationKnowledgeSnapshot {
  if (!graph.nodes.some(({ id }) => id === entryNodeId)) {
    throw new SceneNavigationError('INVALID_KNOWLEDGE', '入口节点不存在于正式场景图')
  }
  const discovered = new Set([entryNodeId])
  const known = catalog.get(entryNodeId).surfaceVisibleEdgeIds
  for (const edgeId of known) {
    const edge = graph.edges.find(({ id }) => id === edgeId)!
    discovered.add(edge.from)
    discovered.add(edge.to)
  }
  return createPlayerNavigationKnowledgeSnapshot({
    discoveredNodeIds: [...discovered],
    visitedNodeIds: [entryNodeId],
    knownEdgeIds: [...known],
  }, entryNodeId, graph, catalog)
}

export function intersectKnownEdgeIds(
  knowledge: PlayerNavigationKnowledgeSnapshot,
  enabledEdgeIds: readonly string[],
): readonly string[] {
  const known = new Set(knowledge.knownEdgeIds)
  return deepFreeze(enabledEdgeIds.filter((id) => known.has(id)).sort())
}
