import type { FrozenRuleConfig } from '../config'
import type { PlayerConditionSnapshot } from '../condition'
import type { DailyMedicalUsageSnapshot } from '../daily-state'
import type {
  EquipmentProfileCatalog,
  EquipmentSnapshot,
} from '../equipment'
import type {
  BackpackPlacement,
  BackpackSnapshot,
  ItemCatalog,
} from '../inventory'
import type {
  ItemResourceCatalog,
  ItemResourceKind,
  ItemState,
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
import type { SceneItemsSnapshot } from '../scene-items'
import type { SceneEdgeAccessCatalog } from '../scene-access'
import type {
  ObstacleRiskTrace,
  SceneObstacleCatalog,
} from '../scene-obstacle'
import type { SceneItemSnapshot } from '../scene-search'
import type {
  QuickSlotProfileCatalog,
  QuickSlotSnapshot,
} from '../quick-slot'
import type { SceneExplorationErrorCode } from './scene-exploration-errors'
import type {
  CombatPlayerActionCommand,
  CombatTransitionPlan,
  EnemyPersistentCombatState,
  ExplorationCombatUsageSnapshot,
} from '../combat'
import type {
  SceneCombatDependencies,
  SceneCombatStateSnapshot,
} from '../scene-combat'

export type SceneExplorationStatus =
  | 'active'
  | 'combat'
  | 'safe-returned'
  | 'forced-returned'
  | 'dead'

export type SceneAlertState = 'unalerted' | 'alerted'

export interface SceneExplorationSnapshot {
  readonly sceneInstanceId: string
  readonly searchState: SceneSearchStateSnapshot
  readonly sceneItems: SceneItemsSnapshot
  readonly alertState: SceneAlertState
  readonly status: SceneExplorationStatus
  readonly currentNodeId: string
  readonly remainingTime: number
  readonly enabledEdgeIds: readonly string[]
  readonly backpack: BackpackSnapshot
  readonly equipment: EquipmentSnapshot
  readonly quickSlots: QuickSlotSnapshot
  readonly itemStates: ItemStateCollectionSnapshot
  readonly condition: PlayerConditionSnapshot
  readonly dailyMedicalUsage: DailyMedicalUsageSnapshot
  readonly combatState: SceneCombatStateSnapshot
}

export type SceneExplorationSnapshotInput = SceneExplorationSnapshot

export type SceneExplorationInitialSnapshotInput = Omit<
  SceneExplorationSnapshot,
  'status' | 'alertState' | 'sceneItems' | 'combatState'
> & Partial<Pick<
  SceneExplorationSnapshot,
  'alertState' | 'sceneItems' | 'combatState'
>>

export type SceneMedicalItemKind =
  | 'bandage'
  | 'painkiller'
  | 'disinfectant'
  | 'first-aid-kit'

export interface SceneMedicalContentBindings {
  readonly bandageDefinitionId: string
  readonly painkillerDefinitionId: string
  readonly disinfectantDefinitionId: string
  readonly firstAidKitDefinitionId: string
}

export interface SceneExplorationDependencies {
  readonly graph: SceneGraph
  readonly physicalCatalog: ItemCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
  readonly quickSlotCatalog: QuickSlotProfileCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly config: FrozenRuleConfig
  readonly edgeAccessCatalog?: SceneEdgeAccessCatalog
  readonly obstacleCatalog?: SceneObstacleCatalog
  readonly sceneCombat?: SceneCombatDependencies
  readonly medicalBindings?: SceneMedicalContentBindings
}

export interface SceneMedicalCommandDependencies
  extends SceneExplorationDependencies {
  readonly medicalBindings: SceneMedicalContentBindings
}

export interface MainSearchCommandDependencies
  extends SceneExplorationDependencies {
  readonly searchCatalog: MainSearchDefinitionCatalog
  readonly searchIlluminationCatalog: SearchIlluminationProfileCatalog
}

export interface SceneObstacleCommandDependencies
  extends SceneExplorationDependencies {
  readonly runSeed: string
  readonly obstacleCatalog: SceneObstacleCatalog
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
      kind: 'scene-medical-item-consumed'
      command: UseSceneMedicalItemCommand
      medicalItem: SceneMedicalItemKind
      sourceContainer: 'backpack' | 'quick-slot'
      sourceSlotIndex: number | null
      instanceId: string
      definitionId: string
      quantityBefore: number
      quantityConsumed: 1
      quantityAfter: number
    }>
  | Readonly<{
      kind: 'scene-health-restored'
      source: 'scene-bandage' | 'scene-first-aid-kit'
      healthBefore: number
      requestedRecovery: number
      actualRecovery: number
      healthAfter: number
      unusedRecovery: number
    }>
  | Readonly<{
      kind: 'scene-open-wound-treated'
      source: 'scene-bandage'
      woundId: string
      woundKind: import('../condition').OpenWoundSnapshot['kind']
      treatmentBefore: 'untreated'
      treatmentAfter: 'treated'
    }>
  | Readonly<{
      kind: 'scene-open-wound-removed'
      source: 'scene-first-aid-kit'
      woundId: string
      woundKind: import('../condition').OpenWoundSnapshot['kind']
    }>
  | Readonly<{
      kind: 'scene-minor-contusion-removed'
      source: 'scene-first-aid-kit'
      countBefore: number
      removed: 1
      countAfter: number
    }>
  | Readonly<{
      kind: 'scene-bleeding-changed'
      source: 'scene-bandage' | 'scene-first-aid-kit'
      before: boolean
      after: boolean
    }>
  | Readonly<{
      kind: 'scene-painkiller-changed'
      before: false
      after: true
    }>
  | Readonly<{
      kind: 'scene-infection-exposure-reduced'
      source: 'scene-disinfectant'
      exposuresBefore: number
      requestedReduction: number
      actualReduction: number
      exposuresAfter: number
      unusedReduction: number
    }>
  | Readonly<{
      kind: 'daily-medical-usage-changed'
      usage: 'disinfectant'
      usesBefore: number
      usesAfter: number
    }>
  | Readonly<{
      kind: 'scene-item-picked-up'
      nodeId: string
      sourceInstanceId: string
      definitionId: string
      quantityBefore: number
      quantityPicked: number
      quantityRemaining: number
      destinationInstanceId: string
      destinationPlacement: Omit<BackpackPlacement, 'instanceId'>
      destinationItemState: Readonly<ItemState>
      pickupKind: 'full' | 'partial'
    }>
  | Readonly<{
      kind: 'scene-node-changed'
      reason: 'movement'
      fromNodeId: string
      toNodeId: string
      edgeId: string
    }>
  | Readonly<{
      kind: 'scene-node-changed'
      reason: 'combat-escape'
      fromNodeId: string
      toNodeId: string
      encounterId: string
    }>
  | Readonly<{
      kind: 'scene-combat-started'
      encounterId: string
      eventId: string
      nodeId: string
      returnNodeId: string
      entryEdgeId: string
      enemyInstanceId: string
      engagement: 'first-entry' | 'reentry'
      combat: import('../combat').CombatEncounterSnapshot
    }>
  | Readonly<{
      kind: 'scene-combat-advanced'
      encounterId: string
      command: CombatPlayerActionCommand
      combatPlan: CombatTransitionPlan
    }>
  | Readonly<{
      kind: 'scene-combat-time-resolved'
      encounterId: string
      combatOutcome: 'victory' | 'escaped' | 'defeat'
      elapsedCtb: number
      minimumSceneTime: number
      ctbPerStep: number
      sceneTimePerStep: number
      sceneTimeCost: number
      remainingTimeBefore: number
      remainingTimeAfter: number
      overtimeDebt: number
    }>
  | Readonly<{
      kind: 'scene-combat-ended'
      encounterId: string
      eventId: string
      outcome: 'victory' | 'escaped' | 'defeat'
      combatNodeId: string
      escapeReturnNodeId: string | null
      enemy: EnemyPersistentCombatState
      usageBefore: ExplorationCombatUsageSnapshot
      usageAfter: ExplorationCombatUsageSnapshot
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
      source:
        | 'main-search-illumination'
        | 'fire-door-crowbar'
        | 'fire-door-toolkit'
        | 'fire-door-fire-axe'
        | 'fire-door-impact-protection'
      equipmentSlot: 'weapon' | 'armor' | 'utility'
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
      kind: 'scene-edge-enabled'
      obstacleId: string
      edgeId: string
      nodeId: string
      optionId: string
    }>
  | Readonly<{
      kind: 'scene-item-spawned'
      nodeId: string
      sourceEventId: string
      sourceOptionId: string
      entity: Readonly<SceneItemSnapshot>
    }>
  | Readonly<{
      kind: 'scene-alert-changed'
      fromAlertState: SceneAlertState
      toAlertState: 'alerted'
      reason: 'fire-door-fire-axe' | 'fire-door-force-entry'
    }>
  | Readonly<{
      kind: 'scene-obstacle-risk-resolved'
      obstacleId: string
      optionId: string
      algorithmVersion: string
      streamId: string
      drawIndex: number
      roll: number
      riskPercent: number
      causedMinorContusion: boolean
      usedImpactProtection: boolean
    }>
  | Readonly<{
      kind: 'minor-contusion-added'
      source: 'fire-door-force-entry'
      countBefore: number
      added: 1
      countAfter: number
    }>
  | Readonly<{
      kind: 'scene-obstacle-declined'
      obstacleId: string
      optionId: string
      nodeId: string
      edgeId: string
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
        | 'combat-started' | 'combat-victory' | 'combat-escaped'
    }>

export interface SceneCombatPlayerActionEvaluation {
  readonly encounterId: string
  readonly command: CombatPlayerActionCommand
  readonly combatPlan: CombatTransitionPlan
  readonly effects: readonly SceneExplorationEffect[]
  readonly snapshot: SceneExplorationSnapshot
}

export type SceneCombatPlayerActionPreview =
  | Readonly<{ canExecute: true; result: SceneCombatPlayerActionEvaluation }>
  | Readonly<{ canExecute: false; rejectionCode: SceneExplorationErrorCode }>

export interface SceneCombatPlayerActionResolution {
  readonly result: SceneCombatPlayerActionEvaluation
  readonly snapshot: SceneExplorationSnapshot
}

export type SearchIlluminationChoice =
  | 'use-equipped-flashlight'
  | 'search-without-flashlight'

export interface PerformMainSearchCommand {
  readonly illumination: SearchIlluminationChoice
}

export interface PickUpRevealedNodeItemCommand {
  readonly nodeItemInstanceId: string
  readonly quantity: number
  readonly placement: Omit<BackpackPlacement, 'instanceId'>
  readonly extractedInstanceId?: string
}

export interface PerformSceneObstacleOptionCommand {
  readonly obstacleId: string
  readonly optionId: string
}

export type SceneMedicalItemSource =
  | Readonly<{
      container: 'backpack'
      itemInstanceId: string
    }>
  | Readonly<{
      container: 'quick-slot'
      quickSlotIndex: number
    }>

export type SceneMedicalTarget =
  | Readonly<{
      kind: 'open-wound'
      woundId: string
    }>
  | Readonly<{
      kind: 'minor-contusion'
    }>

export interface UseSceneMedicalItemCommand {
  readonly source: SceneMedicalItemSource
  readonly target?: SceneMedicalTarget
}

export interface SceneMedicalEvaluation {
  readonly medicalItem: SceneMedicalItemKind
  readonly sourceContainer: SceneMedicalItemSource['container']
  readonly sourceInstanceId: string
  readonly actionTime: number
  readonly returnRoute: ReturnRouteResult
  readonly sceneOutcome: TimedSceneActionOutcome
  readonly effects: readonly SceneExplorationEffect[]
  readonly snapshot: SceneExplorationSnapshot
}

export interface SceneMedicalTransitionPlan {
  readonly command: UseSceneMedicalItemCommand
  readonly metadata: Omit<SceneMedicalEvaluation, 'effects' | 'snapshot'>
  readonly effects: readonly SceneExplorationEffect[]
}

export type SceneMedicalPreview =
  | Readonly<{ canExecute: true; result: SceneMedicalEvaluation }>
  | Readonly<{ canExecute: false; rejectionCode: SceneExplorationErrorCode }>

export interface SceneMedicalResolution {
  readonly result: SceneMedicalEvaluation
  readonly snapshot: SceneExplorationSnapshot
}

export interface SceneObstacleEvaluation {
  readonly obstacleId: string
  readonly optionId: string
  readonly actionTime: number
  readonly riskTrace: ObstacleRiskTrace | null
  readonly effects: readonly SceneExplorationEffect[]
  readonly snapshot: SceneExplorationSnapshot
}

export type SceneObstaclePreview =
  | Readonly<{ canExecute: true; result: SceneObstacleEvaluation }>
  | Readonly<{ canExecute: false; rejectionCode: SceneExplorationErrorCode }>

export interface SceneObstacleResolution {
  readonly result: SceneObstacleEvaluation
  readonly snapshot: SceneExplorationSnapshot
}

export interface NodeItemPickupEvaluation {
  readonly nodeId: string
  readonly sourceInstanceId: string
  readonly destinationInstanceId: string
  readonly definitionId: string
  readonly quantityPicked: number
  readonly quantityRemaining: number
  readonly pickupKind: 'full' | 'partial'
  readonly destinationPlacement: Omit<BackpackPlacement, 'instanceId'>
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly loadTierAfter: CarryableLoadTier
  readonly effects: readonly SceneExplorationEffect[]
  readonly snapshot: SceneExplorationSnapshot
}

export interface NodeItemPickupTransitionPlan {
  readonly command: PickUpRevealedNodeItemCommand
  readonly metadata: Omit<NodeItemPickupEvaluation, 'effects' | 'snapshot'>
  readonly effects: readonly SceneExplorationEffect[]
}

export type NodeItemPickupPreview =
  | Readonly<{ canExecute: true; result: NodeItemPickupEvaluation }>
  | Readonly<{
      canExecute: false
      rejectionCode: SceneExplorationErrorCode
    }>

export interface NodeItemPickupResolution {
  readonly result: NodeItemPickupEvaluation
  readonly snapshot: SceneExplorationSnapshot
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
