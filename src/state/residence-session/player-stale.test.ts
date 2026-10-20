import { describe, expect, it } from 'vitest'
import { begin, playerHarness, ready, choose, send, counts } from './player-test-fixtures'
import { request, coldSaved } from './combat-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'

describe('Q08 Q09 opaque bindings reject stale or misplaced references', () => {
  it('external native command invalidates still-legal old action; no silent revision refresh', () => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'move', '大厅')
    h.owner.dispatch(request(h, 'rest'))
    const n = counts(h), v = h.owner.getState().current, disk = h.disk(), calls = h.dispatch.mock.calls.length
    expect(h.player.query().status).toBe('blocked')
    expect(h.player.execute({ action }).kind).toBe('rejected')
    expect(counts(h)).toEqual(n); expect(h.dispatch).toHaveBeenCalledTimes(calls)
    expect(h.owner.getState().current).toBe(v); expect(h.disk()).toBe(disk)
    h.synchronize(); expect(h.player.execute({ action }).kind).toBe('rejected')
  })
  it('cross facade and cold restore do not reuse even same-name same-revision handles', () => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'move', '大厅')
    const another = wrapPlayerSession(h.owner, h.policy, infectedWorldPlayerLabels)
    expect(another.player.execute({ action }).kind).toBe('rejected')
    const cold = coldSaved(h), restored = wrapPlayerSession(cold.owner, cold.policy, infectedWorldPlayerLabels)
    expect(restored.player.execute({ action }).kind).toBe('rejected')
    expect(cold.storage.write).not.toHaveBeenCalled(); expect(cold.listener).not.toHaveBeenCalled()
  })
  it('moved/consumed objects and phase changes reject old action and item references', () => {
    const h = playerHarness(); begin(h); const oldView = ready(h.player), oldItem = oldView.carried[0].selector
    send(h.player, 'move', '大厅')
    const n = counts(h)
    expect(h.player.execute({ action: choose(h.player, 'inventory', '留置'), item: oldItem }).kind).toBe('rejected')
    expect(h.player.execute({ action: oldView.move.options[0].selector }).kind).toBe('rejected')
    expect(counts(h)).toEqual(n)
  })
  it('forged equal JSON and wrong-purpose references have no fallback', () => {
    const h = playerHarness(); begin(h); const q = ready(h.player), n = counts(h)
    expect(h.player.execute({ action: { ...q.move.options[0].selector } }).kind).toBe('rejected')
    expect(h.player.execute({ action: q.carried[0].selector }).kind).toBe('rejected')
    expect(h.player.execute({ action: choose(h.player, 'medical', '使用药食'), item: choose(h.player, 'move', '大厅') }).kind).toBe('rejected')
    expect(counts(h)).toEqual(n)
  })
  it('uncommitted invalid selection keeps valid handles stable', () => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'move', '大厅')
    expect(h.player.execute({ action, quantity: 1 }).kind).toBe('rejected')
    expect(choose(h.player, 'move', '大厅')).toBe(action)
    expect(h.player.execute({ action }).kind).toBe('committed')
  })
})
