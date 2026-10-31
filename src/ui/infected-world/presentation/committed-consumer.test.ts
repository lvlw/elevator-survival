import { describe, expect, it } from 'vitest'
import { createCommittedConsumer } from './committed-consumer'
import { nativePresentation, tokenAt } from './committed-consumer-test-fixtures'

describe('C1 bounded direct-result consumer', () => {
  it.each([0, 8, Number.MAX_SAFE_INTEGER])('first genuine-scope ordinal %s can join without replaying gaps', ordinal => {
    const c = createCommittedConsumer(), p = tokenAt(nativePresentation(), ordinal)
    expect(c.accept(p)).not.toBeNull(); expect(c.state().cue).toMatchObject({ action: 'defend', phase: 'active' })
    expect(c.accept(p)).toBeNull(); expect(c.accept({ ...p, token: { ...p.token } })).toBeNull()
  })
  it('same reference scope keeps one monotonic high-water across cancellation, skip and gaps', () => {
    const c = createCommittedConsumer(), p = nativePresentation()
    c.accept(tokenAt(p, 5)); c.cancel(); expect(c.accept(tokenAt(p, 4))).toBeNull()
    expect(c.accept(tokenAt(p, 5))).toBeNull(); expect(c.accept(tokenAt(p, 9))).not.toBeNull()
    c.skip(); expect(c.state().cue?.phase).toBe('settled'); expect(c.accept(tokenAt(p, 9))).toBeNull()
    expect(c.accept(tokenAt(p, 10))).not.toBeNull()
  })
  it('a new scope object cannot revive or reset an existing owner lifetime', () => {
    const p = nativePresentation(), c = createCommittedConsumer(); c.accept(p); c.cancel()
    expect(c.accept(tokenAt(p, 100, Object.freeze({})))).toBeNull()
    expect(c.accept(tokenAt(p, 1))).not.toBeNull()
    const newLifetime = createCommittedConsumer(); expect(newLifetime.accept(tokenAt(p, 37, Object.freeze({})))).not.toBeNull()
  })
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('invalid ordinal %s never starts feedback', ordinal => {
    const c = createCommittedConsumer(); expect(c.accept(tokenAt(nativePresentation(), ordinal))).toBeNull(); expect(c.state().cue).toBeNull()
  })
  it('old timer generations cannot finish a newer action and disposal is final', () => {
    const c = createCommittedConsumer(), p = nativePresentation(), old = c.accept(p)!
    c.cancel(); const next = c.accept(tokenAt(p, 1))!
    expect(c.settle(old)).toBe(false); expect(c.state().cue?.phase).toBe('active')
    expect(c.settle(next)).toBe(true); expect(c.settle(next)).toBe(false)
    c.dispose(); expect(c.accept(tokenAt(p, 2))).toBeNull(); expect(c.state().cue).toBeNull()
  })
  it('reduction consumes before any simulated rendering failure; no token resurrection', () => {
    const c = createCommittedConsumer(), p = nativePresentation(); c.accept(p)
    expect(() => { throw new Error('TEST rendering failure') }).toThrow('TEST rendering failure')
    c.cancel(); c.skip(); expect(c.accept(p)).toBeNull()
  })
  it('hidden fields and ordinal magnitude do not influence the complete local cue', () => {
    const p = nativePresentation(), a = createCommittedConsumer(), b = createCommittedConsumer()
    const poisoned = Object.defineProperty({ ...tokenAt(p, 900) }, 'privateResponses', { get() { throw new Error('private read') } })
    a.accept(p); b.accept(poisoned); expect(a.state()).toEqual(b.state())
  })
  it('even a malformed multi-record payload cannot become an enemy/hit timeline', () => {
    const p = nativePresentation(), c = createCommittedConsumer()
    expect(c.accept({ ...p, sequence: [p.sequence[0], p.sequence[0]] } as unknown as typeof p)).toBeNull()
  })
})
