import type { EquipmentProfileCatalog, EquipmentSlotKind } from '../equipment'
import type { ItemCatalog } from '../inventory'
import type { ItemResourceCatalog, ItemResourceKind } from '../item-state'
import type { SceneGraph } from '../scene-graph'
import type { SearchItemInitialState } from '../scene-search'

export type FireDoorTimeKey =
  | 'accessCardTime'
  | 'crowbarTime'
  | 'toolkitTime'
  | 'fireAxeTime'
  | 'forceEntryTime'

export type SceneObstacleOptionDefinition =
  | Readonly<{
      id: string
      kind: 'backpack-item'
      timeKey: FireDoorTimeKey
      requiredDefinitionId: string
    }>
  | Readonly<{
      id: string
      kind: 'equipped-resource'
      timeKey: FireDoorTimeKey
      equipmentSlot: EquipmentSlotKind
      requiredDefinitionId: string
      resourceKind: Exclude<ItemResourceKind, 'none'>
      resourceSource:
        | 'fire-door-crowbar'
        | 'fire-door-toolkit'
        | 'fire-door-fire-axe'
      setsAlert: boolean
      spawnGrants: readonly Readonly<{
        definitionId: string
        quantity: number
        initialState: SearchItemInitialState
      }>[]
    }>
  | Readonly<{
      id: string
      kind: 'force-entry'
      timeKey: FireDoorTimeKey
      protectionDefinitionId: string
      protectionResourceKind: 'integrity'
    }>
  | Readonly<{ id: string; kind: 'decline' }>

export interface SceneObstacleDefinition {
  readonly id: string
  readonly eventId: string
  readonly edgeId: string
  readonly endpointNodeIds: readonly string[]
  readonly options: readonly SceneObstacleOptionDefinition[]
}

export interface SceneObstacleCatalog {
  readonly obstacleIds: readonly string[]
  has(obstacleId: string): boolean
  get(obstacleId: string): SceneObstacleDefinition
}

export interface SceneObstacleCatalogDependencies {
  readonly graph: SceneGraph
  readonly itemCatalog: ItemCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
}

export interface ObstacleRiskTrace {
  readonly algorithmVersion: string
  readonly streamId: string
  readonly drawIndex: number
  readonly roll: number
  readonly riskPercent: number
  readonly causedMinorContusion: boolean
  readonly usedImpactProtection: boolean
}

export interface SceneObstacleOutcomeMetadata {
  readonly setsAlert: boolean
  readonly alertReason: 'fire-door-force-entry' | 'fire-door-fire-axe' | null
  readonly impactProtectionActive: boolean
  readonly effectiveInjuryRiskPercent: number | null
}

export interface SceneObstaclePrimaryPlan {
  readonly obstacleId: string
  readonly optionId: string
  readonly actionTime: number
  readonly outcomeMetadata: SceneObstacleOutcomeMetadata
  readonly riskTrace: ObstacleRiskTrace | null
  readonly primaryEffects: readonly import('../scene-exploration/scene-exploration-types').SceneExplorationEffect[]
}
