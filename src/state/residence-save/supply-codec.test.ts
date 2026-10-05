import { describe, expect, it } from 'vitest'
import { fixture, expectation, mutable } from './supply-test-fixtures'
import { serializeSupplyResidenceSave as encode, deserializeSupplyResidenceSave as decode } from './supply-codec'
import { SUPPLY_RESIDENCE_FORMAT } from './supply-types'
describe('R03 strict v3 JSON/envelope boundary', () => {
  it.each(['', '{', 'null', '[]', 'true', '1', '"text"'])('rejects malformed or non-envelope %s', input => {
    const f = fixture()
    expect(() => decode(input, expectation(f.initial, f.dependencies), f.policy)).toThrow()
  })
  it.each([
    { format: SUPPLY_RESIDENCE_FORMAT, formatVersion: 3 },
    { format: SUPPLY_RESIDENCE_FORMAT, formatVersion: true, state: {} },
    { format: SUPPLY_RESIDENCE_FORMAT, formatVersion: 3.1, state: {} },
    { format: SUPPLY_RESIDENCE_FORMAT, formatVersion: Number.MAX_SAFE_INTEGER + 1, state: {} },
    { format: SUPPLY_RESIDENCE_FORMAT, formatVersion: 3, state: {}, extra: null },
    { format: 'other', formatVersion: 3, state: {} },
    { format: SUPPLY_RESIDENCE_FORMAT, formatVersion: 4, state: {} },
  ])('rejects envelope $format / $formatVersion with missing, extra or wrong fields', input => {
    const f = fixture()
    expect(() => decode(JSON.stringify(input), expectation(f.initial, f.dependencies), f.policy)).toThrow()
  })
  it('encode revalidates actual supplied value instead of serializing a nominal type', () => {
    const f = fixture(), v = mutable(f.initial), e = expectation(f.initial, f.dependencies)
    v.balance = 100
    expect(() => encode(v, e, f.policy)).toThrow()
    expect(() => decode(undefined!, e, f.policy)).toThrowError(expect.objectContaining({ code: 'INVALID_JSON' }))
  })
  it.each(['configurationId', 'contentId', 'terminalConfigurationId'] as const)('rejects wrong domain %s rather than migrating it', key => {
    const f = fixture(), v = mutable(f.value), e = expectation(f.value, f.dependencies)
    v[key] = 'wrong-binding'
    expect(() => decode(JSON.stringify({ format: SUPPLY_RESIDENCE_FORMAT, formatVersion: 3, state: v }), e, f.policy)).toThrow()
  })
})
