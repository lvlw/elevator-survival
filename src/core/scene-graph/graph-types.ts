import type { AdjustedTravelTimeResult, LoadTier } from '../load'

export interface SceneNodeDefinition {
  readonly id: string
  readonly name: string
  readonly isReturnSafetyNode: boolean
}

export interface SceneEdgeDefinition {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly baseTravelTime: number
  readonly bidirectional: boolean
}

export interface SceneGraphDefinition {
  readonly nodes: readonly SceneNodeDefinition[]
  readonly edges: readonly SceneEdgeDefinition[]
}

export interface SceneGraph {
  readonly nodes: readonly Readonly<SceneNodeDefinition>[]
  readonly edges: readonly Readonly<SceneEdgeDefinition>[]
}

export interface TraversalAvailability {
  readonly enabledEdgeIds: ReadonlySet<string> | readonly string[]
}

export interface PathCostContext {
  readonly edge: Readonly<SceneEdgeDefinition>
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface FindShortestPathInput {
  readonly graph: SceneGraph
  readonly startNodeId: string
  readonly targetNodeIds: readonly string[]
  readonly availability: TraversalAvailability
  readonly edgeCost?: (context: PathCostContext) => number
}

export interface ShortestPathResult {
  readonly startNodeId: string
  readonly targetNodeId: string
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly totalTime: number
  readonly edgeCount: number
}

export interface FindReturnRouteInput {
  readonly graph: SceneGraph
  readonly currentNodeId: string
  readonly availability: TraversalAvailability
  readonly totalWeight: number
  readonly hasMinorContusion: boolean
  readonly analgesiaActive: boolean
}

export interface ReturnRouteResult {
  readonly startNodeId: string
  readonly safetyNodeId: string
  readonly nodeIds: readonly string[]
  readonly edgeIds: readonly string[]
  readonly edgeCount: number
  readonly baseReturnTime: number
  readonly loadTier: LoadTier
  readonly travelTimeAdjustment: AdjustedTravelTimeResult | null
  readonly estimatedReturnTime: number
}
