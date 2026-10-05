import type { ResidenceIdentity } from '../../core/character-cycle'
import type { RunIdentity } from '../../core/domain/run-identity'
import type { MissionBinding, MissionExpectation } from '../../core/mission-lifecycle'
import type { SupplyDependencies, SupplyValue } from '../../core/residence-supply/types'

export const SUPPLY_RESIDENCE_FORMAT = 'elevator-survival.residence-headless' as const
export const SUPPLY_RESIDENCE_FORMAT_VERSION = 3 as const
/** Issued configuration handle only; not gameplay or installation authority. */
export type SupplyResidencePolicy = Readonly<{ kind: 'supply-residence-policy' }>
/** Mandatory external facts, never inferred from the untrusted candidate. */
export type SupplyResidenceExpectation = Readonly<{
  identity: ResidenceIdentity; phase: SupplyValue['phase']; revision: number; cycle: number
  missions: readonly MissionExpectation[]
  initial: Readonly<{ binding: MissionBinding; execution: RunIdentity }>
}>
export type SupplyResidenceEnvelope = Readonly<{
  format: typeof SUPPLY_RESIDENCE_FORMAT; formatVersion: typeof SUPPLY_RESIDENCE_FORMAT_VERSION
  state: SupplyValue
}>
export type SupplyResidenceCandidate = Readonly<{ kind: 'supply-residence-candidate'; value: SupplyValue }>
export type SupplyResidenceDependencies = SupplyDependencies
export class SupplyResidenceSaveError extends Error {
  constructor(public readonly code: 'INVALID_JSON' | 'INVALID_ENVELOPE' | 'UNKNOWN_FORMAT' | 'UNKNOWN_VERSION' |
    'INVALID_POLICY' | 'INVALID_STATE' | 'EXPECTED_MISMATCH' | 'UNSUPPORTED_STAGE', message: string) {
    super(message); this.name = 'SupplyResidenceSaveError'
  }
}
