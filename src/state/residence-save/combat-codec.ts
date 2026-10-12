import { deepFreeze } from '../../core/config'
import { parseResidence } from '../../core/residence-config/validation'
import { combatDataBoundary } from './combat-body-history'
import { combatEnvelopeSchema } from './combat-schema'
import { validateCombatResidenceAggregate } from './combat-validation'
import { COMBAT_RESIDENCE_FORMAT, COMBAT_RESIDENCE_FORMAT_VERSION, CombatResidenceSaveError,
  type CombatResidenceEnvelope, type CombatResidenceCandidate, type CombatResidenceExpectation, type CombatResidencePolicy } from './combat-types'

export function createCombatResidenceEnvelope(input: unknown, expected: CombatResidenceExpectation,
  policy: CombatResidencePolicy): CombatResidenceEnvelope {
  return deepFreeze({ format: COMBAT_RESIDENCE_FORMAT, formatVersion: COMBAT_RESIDENCE_FORMAT_VERSION,
    state: validateCombatResidenceAggregate(input, expected, policy) })
}
export function serializeCombatResidenceSave(input: unknown, expected: CombatResidenceExpectation, policy: CombatResidencePolicy): string {
  // Validate raw values first: stringify must not erase NaN, extra keys or undefined.
  return JSON.stringify(createCombatResidenceEnvelope(input, expected, policy))
}
export function deserializeCombatResidenceSave(input: string, expected: CombatResidenceExpectation,
  policy: CombatResidencePolicy): CombatResidenceCandidate {
  if (typeof input !== 'string') throw new CombatResidenceSaveError('INVALID_JSON', 'Expected a serialized string')
  let raw: unknown
  try { raw = JSON.parse(input) } catch (error) {
    if (error instanceof SyntaxError) throw new CombatResidenceSaveError('INVALID_JSON', 'Invalid JSON')
    throw error
  }
  const envelope = combatDataBoundary('INVALID_ENVELOPE', () => parseResidence(combatEnvelopeSchema, raw))
  if (!Object.prototype.hasOwnProperty.call(envelope, 'state')) throw new CombatResidenceSaveError('INVALID_ENVELOPE', 'Missing state')
  if (envelope.format !== COMBAT_RESIDENCE_FORMAT) throw new CombatResidenceSaveError('UNKNOWN_FORMAT', 'Unknown v4 format')
  if (envelope.formatVersion !== COMBAT_RESIDENCE_FORMAT_VERSION) throw new CombatResidenceSaveError('UNKNOWN_VERSION', 'No implicit format migration')
  return deepFreeze({ kind: 'combat-residence-candidate', value: validateCombatResidenceAggregate(envelope.state, expected, policy) })
}
