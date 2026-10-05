import { describe, expect, it } from 'vitest'
import * as v1 from './index'
import * as v2 from './terminal-index'
import * as v3 from './supply-index'
import * as controlled from './supply-controlled'
import { fixture as oldFixture } from '../residence-session/test-fixtures'
import { initial as v2Fixture } from './terminal-test-fixtures'
import { fixture, expectation } from './supply-test-fixtures'
describe('R05 independent v3 exports and bidirectional version rejection', () => {
  it('does not extend either old public surface or expose authority/current/storage', () => {
    expect(Object.keys(v1).sort()).toEqual(['RESIDENCE_FORMAT', 'RESIDENCE_FORMAT_VERSION', 'ResidenceSaveError',
      'createResidenceEnvelope', 'deserializeResidenceSave', 'serializeResidenceSave', 'validateResidenceAggregate'].sort())
    expect(Object.keys(v2).sort()).toEqual(['TERMINAL_RESIDENCE_FORMAT', 'TERMINAL_RESIDENCE_FORMAT_VERSION', 'TerminalResidenceSaveError',
      'createTerminalResidenceEnvelope', 'deserializeTerminalResidenceSave', 'restoreTerminalResidenceCandidate',
      'serializeTerminalResidenceSave', 'validateTerminalResidenceAggregate'].sort())
    expect(Object.keys(v3).sort()).toEqual(['SUPPLY_RESIDENCE_FORMAT', 'SUPPLY_RESIDENCE_FORMAT_VERSION', 'SupplyResidenceSaveError',
      'createSupplyResidenceEnvelope', 'serializeSupplyResidenceSave', 'deserializeSupplyResidenceSave'].sort())
    expect(Object.keys(controlled).sort()).toEqual(['createSupplyResidencePolicy', 'validateSupplyResidenceAggregate', 'restoreSupplyResidenceCandidate'].sort())
  })
  it.each(['fresh', 'active'] as const)('real v1/v2 %s and v3 reject both directions', kind => {
    const a = oldFixture(), b = v2Fixture(), c = fixture(), e = expectation(c.initial, c.dependencies)
    const oldValue = kind === 'fresh' ? a.fresh() : a.active()
    const text1 = v1.serializeResidenceSave(oldValue, a.policy)
    const value2 = kind === 'fresh' ? b.fresh : b.depart().value
    const text2 = v2.serializeTerminalResidenceSave(value2, b.policy)
    expect(v1.deserializeResidenceSave(text1, a.policy)).toEqual(oldValue)
    expect(v2.deserializeTerminalResidenceSave(text2, b.policy)).toEqual(value2)
    for (const text of [text1, text2]) expect(() => v3.deserializeSupplyResidenceSave(text, e, c.policy))
      .toThrowError(expect.objectContaining({ code: 'UNKNOWN_VERSION' }))
    const text3 = v3.serializeSupplyResidenceSave(c.initial, e, c.policy)
    expect(() => v1.deserializeResidenceSave(text3, a.policy)).toThrowError(expect.objectContaining({ code: 'UNKNOWN_VERSION' }))
    expect(() => v2.deserializeTerminalResidenceSave(text3, b.policy)).toThrowError(expect.objectContaining({ code: 'UNKNOWN_VERSION' }))
  })
})
