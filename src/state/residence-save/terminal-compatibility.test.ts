import { describe, expect, it } from 'vitest'
import * as old from './index'
import * as next from './terminal-index'
import * as controlled from './terminal-controlled'
import { fixture as oldFixture } from '../residence-session/test-fixtures'
import { fixture, normal, initial } from './terminal-test-fixtures'
import { createResidenceSavePolicy } from './validation'

describe('B09 unchanged v1 and independent v2 exports', () => {
  it('old exact seven, new exact eight, controlled exact one; no owner/install APIs', () => {
    expect(Object.keys(old).sort()).toEqual(['RESIDENCE_FORMAT', 'RESIDENCE_FORMAT_VERSION', 'ResidenceSaveError', 'createResidenceEnvelope',
      'deserializeResidenceSave', 'serializeResidenceSave', 'validateResidenceAggregate'].sort())
    expect(Object.keys(next).sort()).toEqual(['TERMINAL_RESIDENCE_FORMAT', 'TERMINAL_RESIDENCE_FORMAT_VERSION', 'TerminalResidenceSaveError',
      'createTerminalResidenceEnvelope', 'deserializeTerminalResidenceSave', 'restoreTerminalResidenceCandidate',
      'serializeTerminalResidenceSave', 'validateTerminalResidenceAggregate'].sort())
    expect(Object.keys(controlled).sort()).toEqual(['createTerminalResidenceSavePolicy'])
  })
  it.each(['fresh', 'active'] as const)('native old %s is still valid only through v1; no implicit migration either way', (kind) => {
    const oldF = oldFixture(); const f = initial()
    const oldValue = kind === 'fresh' ? oldF.fresh() : oldF.active()
    const text = old.serializeResidenceSave(oldValue, oldF.policy)
    expect(old.deserializeResidenceSave(text, oldF.policy)).toEqual(oldValue)
    expect(() => next.deserializeTerminalResidenceSave(text, f.policy)).toThrowError(expect.objectContaining({ code: 'UNKNOWN_VERSION' }))
    const v2 = next.serializeTerminalResidenceSave(kind === 'fresh' ? f.fresh : f.depart().value, f.policy)
    expect(() => old.deserializeResidenceSave(v2, oldF.policy)).toThrowError(expect.objectContaining({ code: 'UNKNOWN_VERSION' }))
  })
  it('old closed unsupported remains unchanged while v2 accepts complete native A result', () => {
    const f = fixture(); const result = normal(f)
    const p = createResidenceSavePolicy({ configuration: f.policy.configuration, rulesVersion: f.policy.rulesVersion,
      declarations: f.policy.declarations, catalogs: f.policy.policies.map((p) => p.catalog) })
    const oldShape = { phase: 'active-world', character: result.character, missions: result.missions, site: f.value.site,
      carried: result.carried, itemStates: result.itemStates }
    expect(() => old.validateResidenceAggregate(oldShape, p)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_STAGE' }))
    expect(next.deserializeTerminalResidenceSave(next.serializeTerminalResidenceSave(result, f.policy), f.policy)).toEqual(result)
  })
})
