import { deepFreeze } from '../config'
import { SceneGraphError } from './graph-errors'
import type {
  SceneEdgeDefinition,
  SceneGraph,
  SceneGraphDefinition,
  SceneNodeDefinition,
  TraversalAvailability,
} from './graph-types'

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function equivalentEdgeKey(edge: SceneEdgeDefinition): string {
  const endpoints = edge.bidirectional
    ? [edge.from, edge.to].sort()
    : [edge.from, edge.to]

  return JSON.stringify([
    endpoints[0],
    endpoints[1],
    edge.baseTravelTime,
    edge.bidirectional,
  ])
}

export function createSceneGraph(definition: SceneGraphDefinition): SceneGraph {
  if (definition.nodes.length === 0) {
    throw new SceneGraphError('EMPTY_GRAPH', '场景图至少需要一个节点')
  }

  const nodeIds = new Set<string>()
  const nodes = definition.nodes.map((node): SceneNodeDefinition => {
    if (!isNonEmpty(node.id) || !isNonEmpty(node.name)) {
      throw new SceneGraphError('INVALID_NODE', '节点ID和名称不能为空')
    }
    if (nodeIds.has(node.id)) {
      throw new SceneGraphError('DUPLICATE_NODE_ID', `重复节点ID：${node.id}`)
    }
    nodeIds.add(node.id)
    return { ...node }
  })

  if (!nodes.some((node) => node.isReturnSafetyNode)) {
    throw new SceneGraphError(
      'NO_RETURN_SAFETY_NODE',
      '场景图至少需要一个安全返回节点',
    )
  }

  const edgeIds = new Set<string>()
  const edgeKeys = new Set<string>()
  const edges = definition.edges.map((edge): SceneEdgeDefinition => {
    if (!isNonEmpty(edge.id)) {
      throw new SceneGraphError('INVALID_EDGE', '边ID不能为空')
    }
    if (edgeIds.has(edge.id)) {
      throw new SceneGraphError('DUPLICATE_EDGE_ID', `重复边ID：${edge.id}`)
    }
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new SceneGraphError(
        'UNKNOWN_EDGE_NODE',
        `边${edge.id}引用了未知节点`,
      )
    }
    if (edge.from === edge.to) {
      throw new SceneGraphError('SELF_LOOP', `边${edge.id}不能形成自环`)
    }
    if (!Number.isSafeInteger(edge.baseTravelTime) || edge.baseTravelTime <= 0) {
      throw new SceneGraphError(
        'INVALID_EDGE',
        `边${edge.id}的基础移动时间必须是正安全整数`,
      )
    }

    const key = equivalentEdgeKey(edge)
    if (edgeKeys.has(key)) {
      throw new SceneGraphError('DUPLICATE_EDGE', `存在完全等价的重复边：${edge.id}`)
    }

    edgeIds.add(edge.id)
    edgeKeys.add(key)
    return { ...edge }
  })

  return deepFreeze({ nodes, edges })
}

export function validateTraversalAvailability(
  graph: SceneGraph,
  availability: TraversalAvailability,
): ReadonlySet<string> {
  const knownEdgeIds = new Set(graph.edges.map((edge) => edge.id))
  const values = Array.isArray(availability.enabledEdgeIds)
    ? availability.enabledEdgeIds
    : [...availability.enabledEdgeIds]
  const enabled = new Set<string>()

  for (const edgeId of values) {
    if (!knownEdgeIds.has(edgeId)) {
      throw new SceneGraphError(
        'UNKNOWN_ENABLED_EDGE',
        `启用了未知边：${edgeId}`,
      )
    }
    if (enabled.has(edgeId)) {
      throw new SceneGraphError(
        'DUPLICATE_ENABLED_EDGE',
        `启用边集合包含重复ID：${edgeId}`,
      )
    }
    enabled.add(edgeId)
  }

  return enabled
}
