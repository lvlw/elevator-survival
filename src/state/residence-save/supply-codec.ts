import { deepFreeze } from '../../core/config'
import { parseResidence } from '../../core/residence-config/validation'
import { supplyEnvelopeSchema } from './supply-schema'
import { validateSupplyResidenceAggregate } from './supply-validation'
import { SUPPLY_RESIDENCE_FORMAT, SUPPLY_RESIDENCE_FORMAT_VERSION, SupplyResidenceSaveError,
  type SupplyResidenceEnvelope, type SupplyResidenceCandidate, type SupplyResidenceExpectation, type SupplyResidencePolicy } from './supply-types'

export function createSupplyResidenceEnvelope(input: unknown, expected: SupplyResidenceExpectation,
  policy: SupplyResidencePolicy): SupplyResidenceEnvelope {
  return deepFreeze({ format: SUPPLY_RESIDENCE_FORMAT, formatVersion: SUPPLY_RESIDENCE_FORMAT_VERSION,
    state: validateSupplyResidenceAggregate(input, expected, policy) })
}
export function serializeSupplyResidenceSave(input: unknown, expected: SupplyResidenceExpectation, policy: SupplyResidencePolicy): string {
  return JSON.stringify(createSupplyResidenceEnvelope(input, expected, policy))
}
export function deserializeSupplyResidenceSave(input: string, expected: SupplyResidenceExpectation,
  policy: SupplyResidencePolicy): SupplyResidenceCandidate {
  if (typeof input !== 'string') throw new SupplyResidenceSaveError('INVALID_JSON', 'Expected serialized string')
  let raw: unknown
  try { raw = JSON.parse(input) }
  catch { throw new SupplyResidenceSaveError('INVALID_JSON', 'Invalid JSON') }
  let envelope: { format: string; formatVersion: number; state: unknown }
  try {
    envelope = parseResidence(supplyEnvelopeSchema, raw)
    if (!Object.prototype.hasOwnProperty.call(raw, 'state')) throw new Error('Missing state')
  } catch { throw new SupplyResidenceSaveError('INVALID_ENVELOPE', 'Expected exact format/version/state envelope') }
  if (envelope.format !== SUPPLY_RESIDENCE_FORMAT) throw new SupplyResidenceSaveError('UNKNOWN_FORMAT', 'Unknown format family')
  if (envelope.formatVersion !== SUPPLY_RESIDENCE_FORMAT_VERSION)
    throw new SupplyResidenceSaveError('UNKNOWN_VERSION', 'Expected v3; no migration')
  return deepFreeze({ kind: 'supply-residence-candidate',
    value: validateSupplyResidenceAggregate(envelope.state, expected, policy) })
}
