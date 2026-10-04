import { describe, expect, it } from 'vitest'
import { fixture, mutable } from '../residence-session/test-fixtures'
import { createResidenceEnvelope, deserializeResidenceSave, serializeResidenceSave, ResidenceSaveError } from './index'
import { createResidenceSavePolicy } from './validation'

describe('G3 S02/S04 strict string codec', () => {
  it.each(['fresh', 'active'] as const)('round trips complete %s through actual JSON string', (kind) => {
    const f = fixture(); const state = kind === 'fresh' ? f.fresh() : f.active()
    const text = serializeResidenceSave(state, f.policy)
    expect(JSON.parse(text)).toEqual({ format: 'elevator-survival.residence-headless', formatVersion: 1, state })
    const next = deserializeResidenceSave(text, f.policy)
    expect(next).toEqual(state); expect(next).not.toBe(state); expect(Object.isFrozen(next.character.body.condition)).toBe(true)
  })
  it.each([
    ['{', 'INVALID_JSON'], ['null', 'INVALID_ENVELOPE'], ['{}', 'INVALID_ENVELOPE'], ['[]', 'INVALID_ENVELOPE'],
    ['{"saveFormatVersion":2,"kind":"scene-session"}', 'INVALID_ENVELOPE'],
  ])('rejects %s without treating it as no-save', (text, code) => {
    const f = fixture(); expect(() => deserializeResidenceSave(text, f.policy)).toThrowError(expect.objectContaining({ code }))
  })
  it.each(['format', 'version', 'rules', 'configuration', 'catalog', 'catalogVersion', 'extra', 'missing'])('rejects envelope/config %s', (mode) => {
    const f = fixture(); const raw = mutable(createResidenceEnvelope(f.fresh(), f.policy))
    if (mode === 'format') Reflect.set(raw, 'format', 'hospital')
    if (mode === 'version') Reflect.set(raw, 'formatVersion', 2)
    if (mode === 'rules') raw.state.character.identity.rulesVersion = 'other'
    if (mode === 'configuration') raw.state.character.identity.configurationId = 'other'
    if (raw.state.phase === 'fresh-hub') {
      if (mode === 'catalog') raw.state.catalogRef.catalogId = 'unknown'
      if (mode === 'catalogVersion') raw.state.catalogRef.catalogVersion = 'unknown'
    }
    if (mode === 'extra') Reflect.set(raw, 'savePolicy', 'overwrite')
    if (mode === 'missing') Reflect.deleteProperty(raw, 'state')
    const code = { format: 'UNKNOWN_FORMAT', version: 'UNKNOWN_VERSION', rules: 'UNKNOWN_RULES', configuration: 'UNKNOWN_CONFIGURATION',
      catalog: 'UNKNOWN_CATALOG', catalogVersion: 'UNKNOWN_CATALOG', extra: 'INVALID_ENVELOPE', missing: 'INVALID_ENVELOPE' }[mode]
    expect(() => deserializeResidenceSave(JSON.stringify(raw), f.policy)).toThrowError(expect.objectContaining({ code }))
  })
  it('cannot substitute a look-alike policy or catalog, or enlarge rules by archive declarations', () => {
    const f = fixture()
    expect(() => serializeResidenceSave(f.active(), { ...f.policy })).toThrow(ResidenceSaveError)
    expect(() => createResidenceSavePolicy({ ...f.policy, catalogs: [{ ...f.dependencies.catalog }] })).toThrow()
    expect(() => createResidenceSavePolicy({ ...f.policy, rulesVersion: 'anything' })).toThrow()
  })
})
