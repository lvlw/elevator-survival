import { describe, expect, it } from 'vitest'
import { context, fixture, rejection, wire } from './combat-test-fixtures'
import { deserializeCombatResidenceSave } from './combat-codec'
import { deserializeResidenceSave } from './codec'
import { deserializeTerminalResidenceSave } from './terminal-codec'
import { deserializeSupplyResidenceSave } from './supply-codec'
import * as publicApi from './combat-index'
import * as controlledApi from './combat-controlled'

describe('R01 R10 isolated format and exports', () => {
  it.each([1, 2, 3])('v4 rejects version %i without migration or fallback', formatVersion => {
    const h = fixture(), { e, policy } = context(h, h.value)
    expect(rejection(() => deserializeCombatResidenceSave(JSON.stringify({
      format: 'elevator-survival.residence-headless', formatVersion, state: h.value }), e, policy))).toBe('UNKNOWN_VERSION')
  })
  it.each(['v1', 'v2', 'v3'] as const)('actual old %s decoder rejects actual v4 before touching a policy', version => {
    const h = fixture(), text = wire(h.value)
    const run = version === 'v1' ? () => deserializeResidenceSave(text, undefined!) : version === 'v2'
      ? () => deserializeTerminalResidenceSave(text, undefined!) : () => deserializeSupplyResidenceSave(text, undefined!, undefined!)
    expect(rejection(run)).toBe('UNKNOWN_VERSION')
  })
  it.each(['extra', 'metadata', 'missing-state', 'bad-format', 'null', 'array', 'bad-version', 'bad-json'] as const)(
    'envelope %s cannot be normalized into v4', fault => {
      const h = fixture(), { e, policy } = context(h, h.value)
      const envelope: Record<string, unknown> = { format: 'elevator-survival.residence-headless', formatVersion: 4, state: h.value }
      if (fault === 'extra') envelope.current = h.value
      if (fault === 'metadata') envelope.expected = e
      if (fault === 'missing-state') delete envelope.state
      if (fault === 'bad-format') envelope.format = 'wrong'
      if (fault === 'bad-version') envelope.formatVersion = true
      const text = fault === 'null' ? 'null' : fault === 'array' ? '[]' : fault === 'bad-json' ? '{' : JSON.stringify(envelope)
      expect(rejection(() => deserializeCombatResidenceSave(text, e, policy))).toBe(fault === 'bad-json' ? 'INVALID_JSON' :
        fault === 'bad-format' ? 'UNKNOWN_FORMAT' : 'INVALID_ENVELOPE')
    })
  it('exact read-only and controlled exports do not include action or installation capabilities', () => {
    expect(Object.keys(publicApi).sort()).toEqual(['COMBAT_RESIDENCE_FORMAT', 'COMBAT_RESIDENCE_FORMAT_VERSION',
      'CombatResidenceSaveError', 'createCombatResidenceEnvelope', 'deserializeCombatResidenceSave', 'serializeCombatResidenceSave'].sort())
    expect(Object.keys(controlledApi).sort()).toEqual(['createCombatResidencePolicy', 'readCombatResidenceExpectation',
      'restoreCombatResidenceCandidate', 'validateCombatResidenceAggregate'].sort())
  })
})
