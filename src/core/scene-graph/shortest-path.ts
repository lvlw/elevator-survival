import { deepFreeze } from '../config'
import { SceneGraphError } from './graph-errors'
import { validateTraversalAvailability } from './scene-graph'
import type {
  FindShortestPathInput,
  SceneEdgeDefinition,
  ShortestPathResult,
} from './graph-types'

interface Candidate {
  readonly nodeId: string
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly totalTime: number
}

function compareStringSequences(
  left: readonly string[],
  right: readonly string[],
): number {
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    if (left[index] < right[index]) return -1
    if (left[index] > right[index]) return 1
  }
  return left.length - right.length
}

function compareCandidates(left: Candidate, right: Candidate): number {
  return (
    left.totalTime - right.totalTime ||
    left.edgeIds.length - right.edgeIds.length ||
    compareStringSequences(left.edgeIds, right.edgeIds) ||
    compareStringSequences(left.nodeIds, right.nodeIds)
  )
}

function assertKnownNode(
  nodeIds: ReadonlySet<string>,
  nodeId: string,
  label: string,
): void {
  if (!nodeIds.has(nodeId)) {
    throw new SceneGraphError('UNKNOWN_NODE', `${label}是未知节点：${nodeId}`)
  }
}

function addSafeTime(left: number, right: number): number {
  const result = left + right
  if (!Number.isSafeInteger(result)) {
    throw new SceneGraphError('PATH_TIME_OVERFLOW', '路径时间超出安全整数范围')
  }
  return result
}

function getTraversalDestinations(
  edge: Readonly<SceneEdgeDefinition>,
  nodeId: string,
): readonly string[] {
  if (edge.from === nodeId) return [edge.to]
  if (edge.bidirectional && edge.to === nodeId) return [edge.from]
  return []
}

export function findShortestPath(
  input: FindShortestPathInput,
): ShortestPathResult | null {
  const nodeIds = new Set(input.graph.nodes.map((node) => node.id))
  assertKnownNode(nodeIds, input.startNodeId, '起点')

  if (input.targetNodeIds.length === 0) {
    throw new SceneGraphError('UNKNOWN_NODE', '目标节点集合不能为空')
  }
  for (const target of input.targetNodeIds) {
    assertKnownNode(nodeIds, target, '目标')
  }

  const targets = new Set(input.targetNodeIds)
  const enabled = validateTraversalAvailability(input.graph, input.availability)
  const queue: Candidate[] = [{
    nodeId: input.startNodeId,
    nodeIds: [input.startNodeId],
    edgeIds: [],
    totalTime: 0,
  }]
  const best = new Map<string, Candidate>()

  while (queue.length > 0) {
    queue.sort(compareCandidates)
    const current = queue.shift()!
    const existing = best.get(current.nodeId)
    if (existing && compareCandidates(existing, current) <= 0) continue
    best.set(current.nodeId, current)

    if (targets.has(current.nodeId)) {
      return deepFreeze({
        startNodeId: input.startNodeId,
        targetNodeId: current.nodeId,
        nodeIds: [...current.nodeIds],
        edgeIds: [...current.edgeIds],
        totalTime: current.totalTime,
        edgeCount: current.edgeIds.length,
      })
    }

    for (const edge of input.graph.edges) {
      if (!enabled.has(edge.id)) continue
      for (const destination of getTraversalDestinations(edge, current.nodeId)) {
        const cost = input.edgeCost
          ? input.edgeCost({
              edge,
              fromNodeId: current.nodeId,
              toNodeId: destination,
            })
          : edge.baseTravelTime
        if (!Number.isSafeInteger(cost) || cost <= 0) {
          throw new SceneGraphError(
            'INVALID_EDGE_COST',
            `边${edge.id}的寻路成本必须是正安全整数`,
          )
        }
        queue.push({
          nodeId: destination,
          nodeIds: [...current.nodeIds, destination],
          edgeIds: [...current.edgeIds, edge.id],
          totalTime: addSafeTime(current.totalTime, cost),
        })
      }
    }
  }

  return null
}
