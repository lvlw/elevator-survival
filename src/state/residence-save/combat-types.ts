import type { z } from 'zod'
import type { CombatDependencies, CombatValue } from '../../core/residence-combat/types'
import type { combatExpectationSchema } from './combat-schema'

export const COMBAT_RESIDENCE_FORMAT = 'elevator-survival.residence-headless' as const
export const COMBAT_RESIDENCE_FORMAT_VERSION = 4 as const
export type CombatResidencePolicy = Readonly<{ kind: 'combat-residence-policy' }>
export type CombatResidencePolicyInput = Readonly<{
  dependencies: CombatDependencies; randomAlgorithmVersion: string
}>
export type CombatResidenceExpectation = z.infer<typeof combatExpectationSchema>
export type CombatResidenceCandidate = Readonly<{ kind: 'combat-residence-candidate'; value: CombatValue }>
export type CombatResidenceEnvelope = Readonly<{
  format: typeof COMBAT_RESIDENCE_FORMAT; formatVersion: typeof COMBAT_RESIDENCE_FORMAT_VERSION; state: CombatValue
}>
export class CombatResidenceSaveError extends Error {
  constructor(public readonly code: 'INVALID_JSON' | 'INVALID_ENVELOPE' | 'UNKNOWN_FORMAT' | 'UNKNOWN_VERSION' |
    'INVALID_POLICY' | 'INVALID_STATE' | 'EXPECTED_MISMATCH' | 'UNSUPPORTED_STAGE', message: string) {
    super(message); this.name = 'CombatResidenceSaveError'
  }
}
