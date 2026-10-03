import type { PlayerConditionSnapshot } from '../condition'
import type { DeepReadonly } from '../config'
import type { RunIdentity } from '../domain/run-identity'
import type { MissionDeclaration, MissionLifecycleValue, MissionScope } from '../mission-lifecycle'
import type { ResidenceConfig } from '../residence-config'

export type ResidenceIdentity = Readonly<{ characterId: string; rulesVersion: string; configurationId: string }>
export type ResidenceBody = Readonly<{
  condition: PlayerConditionSnapshot
  energy: number
  infectionProgress: number
  satiety: number
  suppression: number
  quotasRemaining: ResidenceConfig['config']['quota']
}>
export type ActiveCycleClock = Readonly<{
  kind: 'active'; mission: MissionDeclaration; execution: RunIdentity
  startCycle: number; taskDay: number
}>
export type CycleClosure = Readonly<{
  mission: MissionDeclaration; execution: RunIdentity
  startCycle: number; endCycle: number; taskDay: number
  outcome: 'success' | 'voluntary-failure' | 'deadline-failure'
}>
export type CycleClock = ActiveCycleClock | Readonly<{ kind: 'first-ready' }> |
  Readonly<{ kind: 'return-due' | 'deadline-ready'; source: CycleClosure }>
export type CharacterCycleState = Readonly<{
  identity: ResidenceIdentity; revision: number; cycle: number
  body: ResidenceBody; clock: CycleClock
}>

/** Supplied by the future coordinator, independently of requests/candidates.
 * Neither this interface nor G1 proves the complete character history. */
export type CycleAuthority = Readonly<{
  identity: ResidenceIdentity; revision: number; cycle: number
  stableContext: 'stable' | 'unsettled'
  /** Upstream content/position owner establishes the available rest type. */
  rest: 'A' | 'C' | null
  lifecycle: ActiveCycleClock | Readonly<{ kind: 'first' }> | Readonly<{ kind: 'closed'; source: CycleClosure }>
  normalReturn: 'success' | 'voluntary-failure' | null
  departure: Readonly<{
    mission: Extract<MissionLifecycleValue, { status: 'unaccepted' }>
    execution: RunIdentity
  }> | null
}>
export type ResidenceDependencies = Readonly<{
  configuration: ResidenceConfig
  rulesVersion: string
  scope: MissionScope
}>
export type ResidenceRequestBinding = Readonly<{ identity: ResidenceIdentity; expectedRevision: number }>
export type CycleRequest = ResidenceRequestBinding & (
  | Readonly<{ kind: 'rest'; rest: 'A' | 'C' }>
  | Readonly<{ kind: 'normal-return' }>
  | Readonly<{ kind: 'deadline' }>
  | Readonly<{ kind: 'depart'; commissionId: string }>
)
export type BodyStep = DeepReadonly<{
  kind: 'primary' | 'action-bleeding' | 'cycle-bleeding' | 'infection' | 'hunger' | 'end-cycle'
  healthBefore: number; healthAfter: number
  facts: Record<string, number | boolean>
}>
export type CyclePlan = Readonly<{
  base: Readonly<{ identity: ResidenceIdentity; revision: number }>
  snapshot: CharacterCycleState
  steps: readonly BodyStep[]
  outcome: 'alive' | 'death'
  deathCause: BodyStep['kind'] | null
  /** A proposed ready is not evidence that the mission was already closed. */
  requiresDeadlineClosure: CycleClosure | null
}>
