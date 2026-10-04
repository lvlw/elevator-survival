import type { BodyStep, CharacterCycleState, ResidenceDependencies } from '../character-cycle'
import type { DeepReadonly } from '../config'
import type { ItemInstance } from '../inventory'
import type { ItemState, ItemStateCollectionSnapshot } from '../item-state'
import type { MissionLifecycleValue } from '../mission-lifecycle'
import type { CarriedItemContainersSnapshot } from '../quick-slot'
import type { LocationBinding, LocationCatalog, ResidenceSite } from '../residence-location'

export type TerminalConfig = DeepReadonly<{ configurationId: string; config: {
  success_reward: number; initial_balance: number; balance_max: number; failure_penalty: number
} }>
export type TerminalPolicy = Readonly<{
  catalog: LocationCatalog; returnNodeId: string; powerFactId: string; transferFactId: string
  sampleSourceId: string; sampleOrdinal: number
  specialDefinitionIds: readonly string[]; permissionDefinitionIds: readonly string[]
}>
export type TerminalDependencies = Readonly<{
  residence: ResidenceDependencies; configuration: TerminalConfig; policies: readonly TerminalPolicy[]
}>
export type TerminalOutcome = 'success' | 'voluntary-failure' | 'deadline-failure' | 'death'
export type DispositionKind = 'delivered' | 'partial-delivery' | 'returned-special' | 'revoked-permission' |
  'death-unavailable' | 'installed' | 'consumed' | 'destroyed'
export type TerminalDisposition = Readonly<{
  binding: LocationBinding; cycle: number; source: 'prior-effect' | 'terminal'; kind: DispositionKind; item: ItemInstance; state: ItemState
}>
export type TerminalReceipt = Readonly<{
  binding: LocationBinding; outcome: TerminalOutcome; startCycle: number; endCycle: number; taskDay: number
  revision: number; source: 'normal-return' | 'deadline' | 'location-death'
  deathCause: BodyStep['kind'] | null; steps: readonly BodyStep[]
  before: number; reward: number; penalty: number; forfeited: number
  dispositionIds: readonly string[]
}>
/** Passive sites contain no duplicate body, wallet or usable inventory owner. */
export type TerminalArchive = Readonly<{ site: ResidenceSite; itemStates: ItemStateCollectionSnapshot }>
export type TerminalSnapshot = Readonly<{
  phase: 'active-world' | 'living-hub' | 'dead'; terminalConfigurationId: string
  character: CharacterCycleState; missions: readonly MissionLifecycleValue[]; balance: number
  site: ResidenceSite | null; carried: CarriedItemContainersSnapshot; itemStates: ItemStateCollectionSnapshot
  warehouse: Readonly<{ items: readonly ItemInstance[]; itemStates: ItemStateCollectionSnapshot }>
  archives: readonly TerminalArchive[]; dispositions: readonly TerminalDisposition[]; receipts: readonly TerminalReceipt[]
}>
export type TerminalCommand = Readonly<{
  kind: 'deliver' | 'withdraw' | 'deadline'; binding: LocationBinding; expectedRevision: number
}>
/** Technical capability only; contains no current snapshot or mutable game ledger. */
export type TerminalAuthority = Readonly<{ kind: 'residence-terminal-authority' }>
export type TerminalPlan = Readonly<{
  kind: 'residence-terminal-plan'; base: Readonly<{ binding: LocationBinding; revision: number }>
  snapshot: TerminalSnapshot
}>
export class TerminalError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'BINDING_MISMATCH' | 'STALE_AUTHORITY' |
    'NOT_AVAILABLE' | 'INVALID_RESULT' | 'UNISSUED_PLAN', message: string) {
    super(message); this.name = 'TerminalError'
  }
}
