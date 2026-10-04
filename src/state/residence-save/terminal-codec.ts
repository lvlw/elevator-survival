import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { parseResidence } from '../../core/residence-config/validation'
import { validateTerminalResidenceAggregate } from './terminal-validation'
import { TERMINAL_RESIDENCE_FORMAT, TERMINAL_RESIDENCE_FORMAT_VERSION, TerminalResidenceSaveError,
  type TerminalResidenceEnvelope, type TerminalResidenceSavePolicy } from './terminal-types'

export function createTerminalResidenceEnvelope(input: unknown, policy: TerminalResidenceSavePolicy): TerminalResidenceEnvelope {
  return deepFreeze({ format: TERMINAL_RESIDENCE_FORMAT, formatVersion: TERMINAL_RESIDENCE_FORMAT_VERSION,
    state: validateTerminalResidenceAggregate(input, policy) })
}
export function serializeTerminalResidenceSave(input: unknown, policy: TerminalResidenceSavePolicy): string {
  const envelope = createTerminalResidenceEnvelope(input, policy)
  return JSON.stringify(envelope)
}
export function deserializeTerminalResidenceSave(input: string, policy: TerminalResidenceSavePolicy) {
  if (typeof input !== 'string') throw new TerminalResidenceSaveError('INVALID_JSON', 'Expected a serialized string')
  let raw: unknown
  try { raw = JSON.parse(input) }
  catch { throw new TerminalResidenceSaveError('INVALID_JSON', 'Invalid JSON document') }
  let envelope: { format: string; formatVersion: number; state: unknown }
  try {
    envelope = parseResidence(z.strictObject({ format: z.string(), formatVersion: z.number().int(), state: z.unknown() }), raw)
    if (!Object.prototype.hasOwnProperty.call(raw, 'state')) throw new Error('Missing state')
  } catch { throw new TerminalResidenceSaveError('INVALID_ENVELOPE', 'Expected exact format/version/state envelope') }
  if (envelope.format !== TERMINAL_RESIDENCE_FORMAT) throw new TerminalResidenceSaveError('UNKNOWN_FORMAT', 'Unsupported format')
  if (envelope.formatVersion !== TERMINAL_RESIDENCE_FORMAT_VERSION) throw new TerminalResidenceSaveError('UNKNOWN_VERSION', 'Unsupported format version; no migration')
  return validateTerminalResidenceAggregate(envelope.state, policy)
}
