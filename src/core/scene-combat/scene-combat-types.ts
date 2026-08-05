import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  EnemyDefinitionCatalog,
  EnemyPersistentCombatState,
  ExplorationCombatUsageSnapshot,
} from '../combat'
import type { SceneGraph } from '../scene-graph'

export interface SceneCombatEncounterDefinition {
  readonly id: string
  readonly eventId: string
  readonly nodeId: string
  readonly enemyDefinitionId: string
  readonly triggerKind: 'enter-node-while-enemy-present'
}

export interface SceneCombatEncounterCatalog {
  readonly definitionIds: readonly string[]
  has(id: string): boolean
  get(id: string): Readonly<SceneCombatEncounterDefinition>
  getByNodeId(nodeId: string): Readonly<SceneCombatEncounterDefinition> | null
}

export type SceneCombatEncounterSnapshot =
  | Readonly<{
      kind: 'dormant'
      encounterId: string
      eventId: string
      nodeId: string
      enemy: EnemyPersistentCombatState
    }>
  | Readonly<{
      kind: 'active'
      encounterId: string
      eventId: string
      nodeId: string
      returnNodeId: string
      entryEdgeId: string
      engagement: 'first-entry' | 'reentry'
      combat: CombatEncounterSnapshot
    }>

export interface SceneCombatStateSnapshot {
  readonly encounters: readonly SceneCombatEncounterSnapshot[]
  readonly usage: ExplorationCombatUsageSnapshot
}

export interface SceneCombatDependencies {
  readonly encounterCatalog: SceneCombatEncounterCatalog
  readonly combat: CombatDependencies
}

export interface CreateSceneCombatEncounterCatalogDependencies {
  readonly graph: SceneGraph
  readonly enemyCatalog: EnemyDefinitionCatalog
}
