import type { DeepReadonly } from '../config'
import type { RunIdentity } from '../domain/run-identity'

export type MissionDeclaration = Readonly<{
  worldId: string
  templateId: string
  commissionId: string
  rulesVersion: string
  contractVersion: string
}>

export type MissionBinding = Readonly<{
  characterId: string
  mission: MissionDeclaration
}>

/** Controlled, version-checked dependency snapshot; not a content supplier. */
export type MissionScope = DeepReadonly<{
  characterId: string
  declarations: readonly MissionDeclaration[]
}>

export type MissionOutcome =
  | 'success'
  | 'voluntary-failure'
  | 'deadline-failure'
  | 'death'

export type MissionExpectation = DeepReadonly<
  | { binding: MissionBinding; status: 'unaccepted' }
  | { binding: MissionBinding; status: 'active'; execution: RunIdentity }
  | {
      binding: MissionBinding
      status: 'closed'
      execution: RunIdentity
      outcome: MissionOutcome
    }
>

/** Narrow value format, deliberately unrelated to browser Run Save format. */
export type MissionLifecycleValue = MissionExpectation & Readonly<{ formatVersion: 1 }>

/** Validation result only. No method or callback can install this candidate. */
export type MissionCandidate = Readonly<{
  kind: 'mission-lifecycle-candidate'
  value: MissionLifecycleValue
}>

export type MissionExecutionRequest = Readonly<{
  binding: MissionBinding
  execution: RunIdentity
}>

/** Only a future rule coordinator may produce these results, never player UI. */
export type MissionTerminationResult = MissionExecutionRequest & Readonly<{
  outcome: MissionOutcome
}>

export type MissionLifecycleErrorCode =
  | 'INVALID_INPUT'
  | 'MISSING_FACT'
  | 'UNKNOWN_FORMAT'
  | 'UNKNOWN_RULES_VERSION'
  | 'DUPLICATE_DECLARATION'
  | 'UNDECLARED_MISSION'
  | 'BINDING_MISMATCH'
  | 'EXECUTION_MISMATCH'
  | 'RESTORE_STATE_MISMATCH'
  | 'ALREADY_ACTIVE'
  | 'MISSION_CLOSED'
  | 'NOT_ACTIVE'
  | 'DUPLICATE_FACT'

export class MissionLifecycleError extends Error {
  constructor(public readonly code: MissionLifecycleErrorCode, message: string) {
    super(message)
    this.name = 'MissionLifecycleError'
  }
}
