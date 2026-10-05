import type { BodyStep, CharacterCycleState, CycleAuthority, ResidenceDependencies } from '../character-cycle'
import type { DeepReadonly } from '../config'
import type { ItemInstance } from '../inventory'
import type { ItemState, ItemStateCollectionSnapshot } from '../item-state'
import type { MissionLifecycleValue } from '../mission-lifecycle'
import type { CarriedItemContainersSnapshot } from '../quick-slot'
import type { LocationBinding, LocationCatalog, ResidenceSite } from '../residence-location'
import type { TerminalConfig, TerminalOutcome } from '../residence-terminal'
import type { RandomCursor, RandomDraw } from '../random'
import type { TaskCatalog } from '../residence-task/catalog'
import type { SupplyConfig } from './config'

export type SupplyDependencies = Readonly<{
  residence: ResidenceDependencies; terminal: TerminalConfig; configuration: SupplyConfig
  catalog: LocationCatalog; catalogs: readonly LocationCatalog[]; tasks: TaskCatalog
  draw: (cursor: RandomCursor, min: number, max: number) => RandomDraw<number>
}>
export type UnitRange = Readonly<{ originId: string; start: number; end: number }>
export type SupplyOrigin = Readonly<{
  id: string; binding: LocationBinding; placeId: string; nodeId: string; producerId: string
  ordinal: number; definitionId: string; quantity: number; drawIndex: number; kind: 'initial' | 'ordinary' | 'task'
  initialSpecialty: 'scout' | 'engineer' | 'survival' | null
}>
export type SupplyAllocation = Readonly<{ instanceId: string; ranges: readonly UnitRange[] }>
export type SupplyUnitTransfer = Readonly<{ from: string; to: string; revision: number; kind: 'split' | 'merge'; ranges: readonly UnitRange[] }>
export type SupplyLineage = Readonly<{ instanceId: string; originId: string | null; parentId: string | null;
  revision: number; quantityBefore: number; quantity: number }>
export type SupplyDisposition = Readonly<{
  binding: LocationBinding
  id: string; kind: 'consumed' | 'installed' | 'delivered' | 'partial-delivery' | 'returned-special' | 'revoked-permission' | 'death-unavailable'
  reason: 'medical' | 'recipe' | 'terminal'
  cycle: number; revision: number; item: ItemInstance; state: ItemState; ranges: readonly UnitRange[]
}>
export type InvestigationWitness = Readonly<{ nodeId: string; factId: string; edgeIds: readonly string[] }>
export type SupplyProduction = Readonly<{ binding: LocationBinding; producerId: string; method: string;
  revision: number; originIds: readonly string[]; factId: string | null; drawIndex: number }>
export type SupplyReceipt = Readonly<{
  binding: LocationBinding; outcome: TerminalOutcome
  source: 'normal-return' | 'deadline' | 'supply-death' | 'location-death'
  startCycle: number; endCycle: number; taskDay: number; revision: number
  steps: readonly BodyStep[]; before: number; reward: number; penalty: number; forfeited: number
  dispositionIds: readonly string[]
}>
/** Pure domain value only. NOT_SUPPORTED_BY_V2: no codec or current installation. */
export type SupplyValue = DeepReadonly<{
  protocol: 'residence-supply-pure-v1'; configurationId: string; contentId: string
  terminalConfigurationId: string; phase: 'first-hub' | 'active-world' | 'living-hub' | 'dead'
  character: CharacterCycleState; missions: MissionLifecycleValue[]; balance: number
  site: ResidenceSite | null; carried: CarriedItemContainersSnapshot; itemStates: ItemStateCollectionSnapshot
  warehouse: { items: ItemInstance[]; itemStates: ItemStateCollectionSnapshot }
  origins: SupplyOrigin[]; allocations: SupplyAllocation[]; dispositions: SupplyDisposition[]; lineage: SupplyLineage[]
  unitTransfers: SupplyUnitTransfer[]
  archives: { site: ResidenceSite; itemStates: ItemStateCollectionSnapshot; witnesses: InvestigationWitness[] }[]
  witnesses: InvestigationWitness[]
  choices: { tool: 'crow' | 'lamp' | 'toolbox'; specialty: 'scout' | 'engineer' | 'survival'; firstBandageUsed: boolean }
  receipts: SupplyReceipt[]
  productions: SupplyProduction[]
}>
export type SupplyAuthority = Readonly<{ kind: 'supply-authority' }>
export type SupplyPlan = Readonly<{
  kind: 'residence-supply-plan'; snapshot: SupplyValue
  base: Readonly<{ revision: number; configurationId: string; contentId: string }>
  steps: readonly BodyStep[]; energyCost: number
  producer: 'departure' | 'move' | 'rest' | 'inventory' | 'medical' | 'maintenance' | 'task' | 'terminal'
  outcome: 'alive' | 'death'; deathCause: BodyStep['kind'] | null
}>
export type SupplyIndependentContext = Readonly<{ cycle: CycleAuthority; missions: readonly MissionLifecycleValue[] }>
export class SupplyError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'BINDING_MISMATCH' | 'STALE_AUTHORITY' | 'UNISSUED_PLAN' |
    'NOT_AVAILABLE' | 'CANNOT_CARRY' | 'INVALID_PROVENANCE' | 'NOT_SUPPORTED_BY_V2', message: string) {
    super(message); this.name = 'SupplyError'
  }
}
