import { describe, expect, it, vi, afterEach } from 'vitest'
import * as missions from '../../core/mission-lifecycle'
import { createTerminalAuthority, planResidenceTerminal } from '../../core/residence-terminal/controlled'
import { restoreTerminalResidenceCandidate, deserializeTerminalResidenceSave, serializeTerminalResidenceSave } from './terminal-index'
import { fixture, initial, history, normal, mutable, accepted } from './terminal-test-fixtures'

afterEach(() => vi.restoreAllMocks())
describe('B08 independent expected, never candidate-derived authorization', () => {
  it('cold needs no current; warm checks each mission against an independent fully validated expected', () => {
    const f = history(true); const candidate = mutable(f.current); const expected = mutable(f.current)
    expect(deserializeTerminalResidenceSave(serializeTerminalResidenceSave(candidate, f.policy), f.policy)).toEqual(expected)
    const restore = vi.spyOn(missions, 'restoreMissionCandidate')
    const result = restoreTerminalResidenceCandidate(candidate, expected, f.policy)
    expect(result).toEqual({ kind: 'terminal-residence-candidate', value: f.current })
    const explicit = restore.mock.calls.slice(-expected.missions.length)
    expect(explicit).toHaveLength(2)
    for (let i = 0; i < 2; i++) {
      const { formatVersion: _version, ...expectation } = expected.missions[i]
      expect(explicit[i][1]).toEqual(expectation)
      expect(explicit[i][1]).not.toBe(candidate.missions[i])
    }
  })
  it('missing expected is a semantic error; API does not silently become cold', () => {
    const f = fixture()
    // @ts-expect-error independent expected cannot be omitted from this API
    expect(() => restoreTerminalResidenceCandidate(f.value, undefined, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
  it.each(['identity', 'revision', 'body', 'money', 'item', 'site'])('individually valid %s change fails same-progress comparison', (fault) => {
    const f = fixture(); const changed = mutable(f.value)
    if (fault === 'identity') {
      changed.character.identity.characterId = 'other'; changed.site!.binding.identity.characterId = 'other'
      changed.missions.forEach((m) => { m.binding.characterId = 'other' })
    }
    if (fault === 'revision') changed.character.revision++
    if (fault === 'body') changed.character.body.energy--
    if (fault === 'money') changed.balance++
    if (fault === 'item') {
      changed.carried.equipment.utility = { instanceId: 'independent-lamp', definitionId: 'lamp', quantity: 1 }
      changed.itemStates.states.push({ instanceId: 'independent-lamp', definitionId: 'lamp', resource: { kind: 'charge', current: 1 } })
    }
    if (fault === 'site') changed.site!.facts[0].value = true
    const independent = accepted(changed, f.policy)
    expect(() => restoreTerminalResidenceCandidate(f.value, independent, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    expect(() => restoreTerminalResidenceCandidate(independent, f.value, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
  it('true old active cannot replace its native closed outcome', () => {
    const f = fixture(); const closed = normal(f)
    expect(() => restoreTerminalResidenceCandidate(f.value, closed, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    expect(() => restoreTerminalResidenceCandidate(closed, f.value, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
  it('internally consistent fresh remains cold-readable but cannot cover independently closed progress', () => {
    const f = initial(); const { value, authority } = f.depart()
    // Obtain the closure through A, never hand-write a terminal result.
    const a = createTerminalAuthority(value, authority, f.dependencies)
    const closed = planResidenceTerminal(value, { kind: 'withdraw', binding: value.site!.binding, expectedRevision: value.character.revision }, a).snapshot
    expect(accepted(f.fresh, f.policy).phase).toBe('fresh-hub')
    expect(() => restoreTerminalResidenceCandidate(f.fresh, closed, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
  it('self-consistent old monetary history forgery is not offline authentication; independent expected rejects', () => {
    const f = history(false); const changed = mutable(f.current)
    changed.receipts[0].before++; changed.balance++
    const coherent = accepted(changed, f.policy)
    expect(() => restoreTerminalResidenceCandidate(coherent, f.current, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
  it('invalid expected is not normalized, trusted or silently ignored', () => {
    const f = fixture(); const bad = mutable(f.value); bad.missions.pop()
    expect(() => restoreTerminalResidenceCandidate(f.value, bad, f.policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
})
