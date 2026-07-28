import type { FrozenRuleConfig } from '../config'
import type { PlayerConditionSnapshot } from '../condition'
import type { BackpackSnapshot, ItemCatalog } from '../inventory'
import type {
  AdjustedTravelTimeResult,
  CarryableLoadTier,
} from '../load'
import type {
  ReturnRouteResult,
  SceneGraph,
} from '../scene-graph'
import type { TimedSceneActionOutcome } from '../scene'
import type { SceneSearchStateSnapshot } from '../scene-search'
import type { SceneExplorationErrorCode } from './scene-exploration-errors'

export type SceneExplorationStatus =
  | 'active'
  | 'safe-returned'
  | 'forced-returned'
  | 'dead'

export interface SceneExplorationSnapshot {
  readonly sceneInstanceId: string
  readonly searchState: SceneSearchStateSnapshot
  readonly status: SceneExplorationStatus
  readonly currentNodeId: string
  readonly remainingTime: number
  readonly enabledEdgeIds: readonly string[]
  readonly backpack: BackpackSnapshot
  readonly condition: PlayerConditionSnapshot
}

export interface SceneExplorationDependencies {
  readonly graph: SceneGraph
  readonly physicalCatalog: ItemCatalog
  readonly config: FrozenRuleConfig
}

export interface MoveThroughSceneEdgeCommand {
  readonly edgeId: string
}

export type SceneMoveHealthLossSource =
  | 'post-action-bleeding'
  | 'forced-return-base'
  | 'forced-return-bleeding'

export type SceneExplorationEffect =
  | Readonly<{
      kind: 'scene-node-changed'
      reason: 'movement'
      fromNodeId: string
      toNodeId: string
      edgeId: string
    }>
  | Readonly<{
      kind: 'scene-node-changed'
      reason: 'forced-return'
      fromNodeId: string
      toNodeId: string
      routeNodeIds: readonly string[]
      routeEdgeIds: readonly string[]
    }>
  | Readonly<{
      kind: 'scene-time-resolved'
      remainingTimeBefore: number
      actionTimeCost: number
      remainingTimeAfter: number
      overtimeDebt: number
    }>
  | Readonly<{
      kind: 'health-lost'
      source: SceneMoveHealthLossSource
      requestedLoss: number
      actualLoss: number
      healthBefore: number
      healthAfter: number
    }>
  | Readonly<{
      kind: 'scene-status-changed'
      fromStatus: SceneExplorationStatus
      toStatus: SceneExplorationStatus
      reason: 'safe-return' | 'forced-return' | 'death'
    }>

export interface SceneMoveEvaluation {
  readonly originNodeId: string
  readonly destinationNodeId: string
  readonly edgeId: string
  readonly baseMovementTime: number
  readonly finalMovementTime: number
  readonly backpackWeight: number
  readonly loadTier: CarryableLoadTier
  readonly minorContusionModifierApplied: boolean
  readonly movementAdjustment: AdjustedTravelTimeResult
  readonly returnRoute: ReturnRouteResult
  readonly sceneOutcome: TimedSceneActionOutcome
  readonly effects: readonly SceneExplorationEffect[]
  readonly snapshot: SceneExplorationSnapshot
}

export interface SceneMoveTransitionPlan {
  readonly command: MoveThroughSceneEdgeCommand
  readonly metadata: Omit<SceneMoveEvaluation, 'effects' | 'snapshot'>
  readonly effects: readonly SceneExplorationEffect[]
}

export type SceneMoveEffect = SceneExplorationEffect

export type SceneMovePreview =
  | Readonly<{ canExecute: true; result: SceneMoveEvaluation }>
  | Readonly<{
      canExecute: false
      rejectionCode: SceneExplorationErrorCode
    }>

export interface SceneMoveResolution {
  readonly result: SceneMoveEvaluation
  readonly snapshot: SceneExplorationSnapshot
}
