import { describe, expect, it, vi } from 'vitest'
import { begin, playerHarness, ready, send, choose, counts } from './player-test-fixtures'

describe('Q08 Q09 strict, pure parameter selection', () => {
  it.each([NaN, Infinity, -1, 0.5, true, Number.MAX_SAFE_INTEGER + 1])('rejects quantity %s without dispatch/write/notification', quantity => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'inventory', '拆分'), before = h.owner.getState().current, n = counts(h)
    const dispatches = h.dispatch.mock.calls.length
    expect(h.player.preview({ action, quantity }).kind).not.toBe('available')
    expect(counts(h)).toEqual(n); expect(h.owner.getState().current).toBe(before)
    expect(h.dispatch).toHaveBeenCalledTimes(dispatches)
  })
  it('descriptor-first rejection never invokes getters; rejects extra keys, sparse arrays and wrong-purpose objects', () => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'inventory', '拾取'), getter = vi.fn(() => action)
    const before = counts(h), request = Object.defineProperty({}, 'action', { enumerable: true, get: getter })
    expect(h.player.preview(request).kind).not.toBe('available'); expect(getter).not.toHaveBeenCalled()
    for (const r of [{ action, nextState: {} }, { action: {} }, { action, materials: new Array(1) }, { action, item: action }])
      expect(h.player.execute(r).kind).toBe('rejected')
    expect(counts(h)).toEqual(before)
  })
  it('move preview/resolve reuse formal cost and never change canonical or storage', () => {
    const h = playerHarness(); begin(h); const q = ready(h.player), action = q.move.options.find(a => a.label === '大厅')!
    const before = h.owner.getState().current, n = counts(h)
    for (let i = 0; i < 8; i++) {
      expect(h.player.preview({ action: action.selector })).toEqual({ kind: 'available', cost: action.cost })
      expect(h.player.resolve({ action: action.selector })).toEqual({ kind: 'available', cost: action.cost })
      expect(ready(h.player).move.options[0].selector).toBe(q.move.options[0].selector)
    }
    expect(counts(h)).toEqual(n); expect(h.owner.getState().current).toBe(before)
    send(h.player, 'move', '大厅')
    expect(h.storage.write.mock.calls.length).toBe(n.writes + 1); expect(h.listener.mock.calls.length).toBe(n.notices + 1)
  })
})
