import type { FrozenRuleConfig } from '../config'
import type { PlayerConditionSnapshot } from '../condition'
import type {
  EquipmentProfileCatalog,
  EquipmentSnapshot,
} from '../equipment'
import type { BackpackSnapshot, ItemCatalog } from '../inventory'
import type {
  ItemResourceCatalog,
  ItemResourceKind,
  ItemStateCollectionSnapshot,
} from '../item-state'
import type {
  AdjustedTravelTimeResult,
  CarryableLoadTier,
} from '../load'
import type {
  ReturnRouteResult,
  SceneGraph,
} from '../scene-graph'
import type { TimedSceneActionOutcome } from '../scene'
import type {
  MainSearchDefinitionCatalog,
  SceneSearchStateSnapshot,
  SearchIlluminationProfileCatalog,
} from '../scene-search'
import type {
  QuickSlotProfileCatalog,
  QuickSlotSnapshot,
} from '../quick-slot'
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
  readonly equipment: EquipmentSnapshot
  readonly quickSlots: QuickSlotSnapshot
  readonly itemStates: ItemStateCollectionSnapshot
  readonly condition: PlayerConditionSnapshot
}

export interface SceneExplorationDependencies {
  readonly graph: SceneGraph
  readonly physicalCatalog: ItemCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
  readonly quickSlotCatalog: QuickSlotProfileCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly config: FrozenRuleConfig
}

export interface MainSearchCommandDependencies
  extends SceneExplorationDependencies {
  readonly searchCatalog: MainSearchDefinitionCatalog
  readonly searchIlluminationCatalog: SearchIlluminationProfileCatalog
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
      kind: 'item-resource-consumed'
      source: 'main-search-illumination'
      instanceId: string
      definitionId: string
      resourceKind: ItemResourceKind
      currentBefore: number
      requestedCost: number
      consumed: number
      currentAfter: number
      depleted: boolean
    }>
  | Readonly<{
      kind: 'scene-main-search-revealed'
      nodeId: string
      searchOrdinal: number
      revealedItemInstanceIds: readonly string[]
      revealedItemSummary: readonly Readonly<{
        definitionId: string
        quantity: number
      }>[]
      revealedIntelIds: readonly string[]
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

export type SearchIlluminationChoice =
  | 'use-equipped-flashlight'
  | 'search-without-flashlight'

export interface PerformMainSearchCommand {
  readonly illumination: SearchIlluminationChoice
}

export type MainSearchLightingOutcome = 'illuminated' | 'low-light'

export interface MainSearchEvaluation {
  readonly nodeId: string
  readonly searchOrdinal: number
  readonly illumination: SearchIlluminationChoice
  readonly lightingOutcome: MainSearchLightingOutcome
  readonly actionTime: number
  readonly flashlightInstanceId: string | null
  readonly backpackWeight: number
  readonly loadTier: CarryableLoadTier
  readonly returnRoute: ReturnRouteResult
  readonly sceneOutcome: TimedSceneActionOutcome
  readonly effects: readonly SceneExplorationEffect[]
  readonly snapshot: SceneExplorationSnapshot
}

export interface MainSearchTransitionPlan {
  readonly command: PerformMainSearchCommand
  readonly metadata: Omit<MainSearchEvaluation, 'effects' | 'snapshot'>
  readonly effects: readonly SceneExplorationEffect[]
}

export type MainSearchPreview =
  | Readonly<{ canExecute: true; result: MainSearchEvaluation }>
  | Readonly<{
      canExecute: false
      rejectionCode: SceneExplorationErrorCode
    }>

export interface MainSearchResolution {
  readonly result: MainSearchEvaluation
  readonly snapshot: SceneExplorationSnapshot
}

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
