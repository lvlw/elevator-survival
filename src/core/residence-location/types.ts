import type { BodyStep, CharacterCycleState, CycleAuthority, ResidenceDependencies, ResidenceIdentity } from '../character-cycle'
import type { EnemyDefinitionCatalog, EnemyPersistentCombatState } from '../combat'
import type { DeepReadonly } from '../config'
import type { RunIdentity } from '../domain/run-identity'
import type { ItemCatalog, ItemInstance } from '../inventory'
import type { ItemResourceCatalog, ItemStateCollectionSnapshot } from '../item-state'
import type { MissionDeclaration, MissionLifecycleValue } from '../mission-lifecycle'
import type { CarriedItemContainersSnapshot, QuickSlotDependencies } from '../quick-slot'
import type { LocationCatalogData } from './catalog'

export type LocationBinding = Readonly<{
  identity: ResidenceIdentity; mission: MissionDeclaration; execution: RunIdentity
  catalogId: string; catalogVersion: string
}>
export type LocationKnowledge = DeepReadonly<{
  knownNodeIds: string[]; visitedNodeIds: string[]; knownEdgeIds: string[]
  routes: { edgeId: string; observedFromNodeId: string; passable: boolean }[]
}>
export type ResidenceSite = DeepReadonly<{
  binding: LocationBinding; nodeId: string
  facts: { id: string; value: boolean }[]
  sources: { id: string; claimed: boolean; drawIndex: number }[]
  ground: { nodeId: string; items: ItemInstance[] }[]
  enemies: { id: string; state: EnemyPersistentCombatState; riskDrawIndex: number }[]
  pending: { kind: 'none' } | { kind: 'combat-required'; enemyId: string }
  knowledge: LocationKnowledge
}>
/** One local proposal aggregate, not a Store, Save format or complete character history. */
export type ResidenceLocationSnapshot = Readonly<{
  character: CharacterCycleState; site: ResidenceSite
  carried: CarriedItemContainersSnapshot; itemStates: ItemStateCollectionSnapshot
}>
export type LocationAuthority = Readonly<{ cycle: CycleAuthority; mission: MissionLifecycleValue }>
export type LocationCatalog = Readonly<{
  data: DeepReadonly<LocationCatalogData>; physical: ItemCatalog; resources: ItemResourceCatalog
  containers: QuickSlotDependencies; enemies: EnemyDefinitionCatalog
}>
export type LocationDependencies = Readonly<{ residence: ResidenceDependencies; catalog: LocationCatalog }>
export type LocationCommand = Readonly<{ binding: LocationBinding; expectedRevision: number }> & (
  | Readonly<{ kind: 'move'; edgeId: string }>
  | Readonly<{ kind: 'reveal'; sourceId: string }>
  | Readonly<{ kind: 'pickup'; instanceId: string; placement: Readonly<{ x: number; y: number; rotated: boolean }> }>
  | Readonly<{ kind: 'drop'; instanceId: string }>
)
export type LocationPlan = Readonly<{
  kind: 'residence-location-plan'; base: Readonly<{ binding: LocationBinding; revision: number }>
  snapshot: ResidenceLocationSnapshot; energyCost: number; steps: readonly BodyStep[]
  coordination: 'stable-local-result' | 'combat-required' | 'death-required'
}>
export class LocationError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'BINDING_MISMATCH' | 'STALE_PLAN' | 'NOT_ACTIVE' |
    'NOT_AVAILABLE' | 'CANNOT_CARRY' | 'COORDINATION_REQUIRED', message: string) {
    super(message); this.name = 'LocationError'
  }
}
