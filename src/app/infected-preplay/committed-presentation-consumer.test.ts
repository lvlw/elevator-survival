import { afterEach, describe, expect, it, vi } from 'vitest'
import { appFromValue, appChoose, commit } from './test-fixtures'
import { entered } from '../../state/residence-session/combat-test-fixtures'
import { counts } from '../../state/residence-session/player-test-fixtures'
import { presentationOf, referenceConsumer } from './committed-presentation-test-fixtures'

afterEach(() => vi.useRealTimers())
describe('B1 K14 TEST-only finite reference consumer', () => {
  it('real tokens are accepted in order once; cancel, skip and reduced consume without any gameplay callbacks', () => {
    vi.useFakeTimers()
    const f = entered(), h = appFromValue(f.value, f.deps), consumer = referenceConsumer()
    const first = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '金属管攻击') }))
    consumer.activate(first.token.scope); const n = counts(h), ticket = consumer.consume(first)!
    expect(consumer.consume(first)).toBeNull(); consumer.cancel(); expect(ticket.finish()).toBe(false)
    vi.runAllTimers(); expect(consumer.counts()).toEqual({ accepted: 1, settled: 0, high: 0, pending: false })
    expect(consumer.consume(first, 'skip')).toBeNull(); expect(counts(h)).toEqual(n)
    const second = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '防御') })), afterSecond = counts(h)
    expect(consumer.consume(second, 'skip')).not.toBeNull(); expect(consumer.consume(second)).toBeNull()
    expect(consumer.counts()).toEqual({ accepted: 2, settled: 1, high: 1, pending: false }); expect(counts(h)).toEqual(afterSecond)
    const third = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '防御') })), afterThird = counts(h)
    expect(consumer.consume(third, 'reduced')).not.toBeNull(); vi.runAllTimers()
    expect(consumer.counts()).toEqual({ accepted: 3, settled: 2, high: 2, pending: false }); expect(counts(h)).toEqual(afterThird)
  })
  it('scope replacement rejects delayed old results and callbacks, even with identical serialized empty scopes', () => {
    vi.useFakeTimers()
    const f = entered(), a = appFromValue(f.value, f.deps), b = appFromValue(f.value, f.deps), consumer = referenceConsumer()
    const first = presentationOf(commit(a.app, { action: appChoose(a.app, 'combat', '防御') }))
    const next = presentationOf(commit(b.app, { action: appChoose(b.app, 'combat', '防御') }))
    expect(first.token.scope).not.toBe(next.token.scope); expect(JSON.stringify(first.token)).toBe(JSON.stringify(next.token))
    consumer.activate(first.token.scope); const late = consumer.consume(first)!
    expect(consumer.consume(next)).toBeNull(); consumer.activate(next.token.scope)
    expect(late.finish()).toBe(false); expect(consumer.consume(first)).toBeNull()
    const current = consumer.consume(next)!; vi.advanceTimersByTime(20)
    expect(current.finish()).toBe(false); expect(consumer.counts().settled).toBe(1)
  })
  it('unmount/view-switch/current-owner invalidation only cancels local presentation; the real commit stays', () => {
    vi.useFakeTimers()
    const f = entered(), h = appFromValue(f.value, f.deps); let valid = true
    const consumer = referenceConsumer(() => valid), p = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '防御') }))
    const value = h.owner.getState().current, disk = h.disk(), n = counts(h)
    consumer.activate(p.token.scope); const ticket = consumer.consume(p)!
    valid = false; expect(ticket.finish()).toBe(false); consumer.cancel(); vi.runAllTimers()
    expect(consumer.consume(p)).toBeNull(); expect(h.owner.getState().current).toBe(value); expect(h.disk()).toBe(disk); expect(counts(h)).toEqual(n)
  })
})
