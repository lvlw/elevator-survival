import type { FrozenRuleConfig } from '../config'
import { deepFreeze } from '../config'
import { calculateAdjustedTravelTime, classifyLoad } from '../load'
import { SceneGraphError } from './graph-errors'
import { findShortestPath } from './shortest-path'
import type {
  FindReturnRouteInput,
  ReturnRouteResult,
} from './graph-types'

export function findReturnRoute(
  input: FindReturnRouteInput,
  config: FrozenRuleConfig,
): ReturnRouteResult {
  const safetyNodeIds = input.graph.nodes
    .filter((node) => node.isReturnSafetyNode)
    .map((node) => node.id)
  const load = classifyLoad(input.totalWeight, config.backpack)
  const currentIsSafetyNode = safetyNodeIds.includes(input.currentNodeId)

  if (currentIsSafetyNode) {
    return deepFreeze({
      startNodeId: input.currentNodeId,
      safetyNodeId: input.currentNodeId,
      nodeIds: [input.currentNodeId],
      edgeIds: [],
      edgeCount: 0,
      baseReturnTime: 0,
      loadTier: load.tier,
      travelTimeAdjustment: null,
      estimatedReturnTime: 0,
    })
  }

  const path = findShortestPath({
    graph: input.graph,
    startNodeId: input.currentNodeId,
    targetNodeIds: safetyNodeIds,
    availability: input.availability,
  })
  if (!path) {
    throw new SceneGraphError(
      'NO_RETURN_ROUTE',
      `节点${input.currentNodeId}没有可达的安全返回路线`,
    )
  }

  const adjustment = calculateAdjustedTravelTime(
    {
      baseTime: path.totalTime,
      totalWeight: input.totalWeight,
      hasMinorContusion: input.hasMinorContusion,
      analgesiaActive: input.analgesiaActive,
    },
    config,
  )

  return deepFreeze({
    startNodeId: input.currentNodeId,
    safetyNodeId: path.targetNodeId,
    nodeIds: [...path.nodeIds],
    edgeIds: [...path.edgeIds],
    edgeCount: path.edgeCount,
    baseReturnTime: path.totalTime,
    loadTier: adjustment.loadTier,
    travelTimeAdjustment: adjustment,
    estimatedReturnTime: adjustment.finalTime,
  })
}
