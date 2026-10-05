import { describe, expect, it } from 'vitest'
import { fixture, states, expectation, mutable, readSupplyValue } from './supply-test-fixtures'
import { serializeSupplyResidenceSave as encode, deserializeSupplyResidenceSave as decode } from './supply-codec'
import { restoreSupplyResidenceCandidate } from './supply-expected'
import { validateSupplyResidenceAggregate } from './supply-validation'
import type { SupplyResidenceExpectation } from './supply-types'
describe('R-GUARD-01 independent initial execution and committed progress', () => {
  it('a genuinely valid other first-hub seed cannot self-prove via its four initial origins', () => {
    const f = fixture(), other = fixture({ seed: 'other-controlled-seed' })
    expect(readSupplyValue(other.initial, f.dependencies)).toEqual(other.initial)
    const expected = expectation(f.initial, f.dependencies)
    expect(() => validateSupplyResidenceAggregate(other.initial, expected, f.policy))
      .toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    expect(other.initial.missions[0].status).toBe('unaccepted')
    expect(other.initial.origins.filter(o => o.kind === 'initial')).toHaveLength(4)
    expect(validateSupplyResidenceAggregate(other.initial, expectation(other.initial, f.dependencies, 'other-controlled-seed'), f.policy)).toEqual(other.initial)
  })
  it.each(['first-hub', 'active-world', 'living-hub', 'dead'] as const)('%s requires matching external identity execution phase revision and cycle', phase => {
    const { f, rows } = states(), v = rows.find(v => v.phase === phase)!, e = expectation(v, f.dependencies)
    const text = encode(v, e, f.policy)
    const wrong: SupplyResidenceExpectation[] = [
      { ...e, phase: phase === 'dead' ? 'living-hub' : 'dead' }, { ...e, revision: e.revision + 1 }, { ...e, cycle: e.cycle + 1 },
      { ...e, identity: { ...e.identity, characterId: 'different' } },
      { ...e, identity: { ...e.identity, rulesVersion: 'different' } },
      { ...e, identity: { ...e.identity, configurationId: 'different' } },
      { ...e, initial: { ...e.initial, execution: { ...e.initial.execution, runId: 'other' } } },
      { ...e, initial: { ...e.initial, execution: { ...e.initial.execution, seed: 'other' } } },
      { ...e, missions: e.missions.map(m => m.status === 'unaccepted' ?
        { ...m, status: 'active', execution: e.initial.execution } : { ...m, execution: { ...m.execution, seed: 'other' } }) },
    ]
    for (const bad of wrong) expect(() => decode(text, bad, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    for (const key of ['configurationId', 'terminalConfigurationId', 'contentId'] as const) {
      const bad = mutable(v); bad[key] = 'different-binding'
      expect(() => encode(bad, e, f.policy)).toThrow()
    }
  })
  it('same-progress restore rejects internally legal changed body and missing independent state', () => {
    const f = fixture(), value = f.value, e = expectation(value, f.dependencies), candidate = mutable(value)
    candidate.character.body.energy--
    expect(validateSupplyResidenceAggregate(candidate, e, f.policy)).toEqual(candidate)
    expect(() => restoreSupplyResidenceCandidate(candidate, value, e, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    expect(() => restoreSupplyResidenceCandidate(value, undefined!, e, f.policy)).toThrow()
    expect(restoreSupplyResidenceCandidate(mutable(value), value, e, f.policy).value).toEqual(value)
  })
  it('absent expected is never manufactured from a candidate', () => {
    const f = fixture()
    expect(() => encode(f.initial, undefined!, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    const e = mutable(expectation(f.initial, f.dependencies))
    Reflect.deleteProperty(e, 'initial')
    expect(() => encode(f.initial, e, f.policy)).toThrow()
  })
})
