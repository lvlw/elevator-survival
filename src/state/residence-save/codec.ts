import { z } from 'zod'
import { parseResidence } from '../../core/residence-config/validation'
import { deepFreeze } from '../../core/config'
import { validateResidenceAggregate } from './validation'
import { RESIDENCE_FORMAT, RESIDENCE_FORMAT_VERSION, ResidenceSaveError,
  type ResidenceEnvelope, type ResidenceSavePolicy } from './types'

export function createResidenceEnvelope(input: unknown, policy: ResidenceSavePolicy): ResidenceEnvelope {
  return deepFreeze({ format: RESIDENCE_FORMAT, formatVersion: RESIDENCE_FORMAT_VERSION,
    state: validateResidenceAggregate(input, policy) })
}
export function serializeResidenceSave(input: unknown, policy: ResidenceSavePolicy): string {
  return JSON.stringify(createResidenceEnvelope(input, policy))
}
export function deserializeResidenceSave(serialized: string, policy: ResidenceSavePolicy) {
  if (typeof serialized !== 'string') throw new ResidenceSaveError('INVALID_JSON', 'Storage must return a string')
  let raw: unknown
  try { raw = JSON.parse(serialized) } catch { throw new ResidenceSaveError('INVALID_JSON', 'Invalid JSON') }
  let envelope: { format: string; formatVersion: number; state: unknown }
  try { envelope = parseResidence(z.strictObject({ format: z.string(), formatVersion: z.number(), state: z.unknown() }), raw) }
  catch { throw new ResidenceSaveError('INVALID_ENVELOPE', 'Invalid residence envelope') }
  if (envelope.format !== RESIDENCE_FORMAT) throw new ResidenceSaveError('UNKNOWN_FORMAT', 'Unknown residence format')
  if (envelope.formatVersion !== RESIDENCE_FORMAT_VERSION) throw new ResidenceSaveError('UNKNOWN_VERSION', 'Unknown residence version')
  return validateResidenceAggregate(envelope.state, policy)
}
