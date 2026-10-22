import { describe, expect, it } from 'vitest'
import { playerHarness, begin, choose, send, ready, counts } from './player-test-fixtures'
describe('current opaque input descriptions', () => {
  it('uses current real selectors and performs zero writes dispatches or draws', () => {
    const h = playerHarness(); begin(h)
    const before = counts(h), dispatch = h.dispatch.mock.calls.length, raw = h.owner.getState().current
    const d = h.preplay.describeAction(choose(h.player, 'inventory', '放入背包'))
    expect(d.items[0].selector).toBe(ready(h.player).carried.find(i => i.container === 'quick')!.selector)
    expect(d.fields).toEqual(['item', 'placement']); expect(d.convenience).toBeNull()
    expect(counts(h)).toEqual(before); expect(h.dispatch).toHaveBeenCalledTimes(dispatch); expect(h.owner.getState().current).toBe(raw)
  })
  it('only ordinary pickup advertises first-fit convenience and ground candidates', () => {
    const h = playerHarness(); begin(h); send(h.player, 'move', '大厅'); send(h.player, 'source', '大厅搜索', {}, 'dark')
    const d = h.preplay.describeAction(choose(h.player, 'inventory', '拾取'))
    expect(d.convenience).toBe('ordinary-whole-pickup'); expect(d.items.length).toBeGreaterThan(0)
    expect(d.items.every(i => ready(h.player).ground.some(g => g.selector === i.selector && g.ordinary))).toBe(true)
    expect(h.preplay.describeAction(choose(h.player, 'task-transfer', '拾取任务物')).convenience).toBeNull()
  })
  it('rejects stale cross-session cloned and wrong-purpose handles', () => {
    const a = playerHarness(), b = playerHarness(); begin(a); begin(b)
    const old = choose(a.player, 'inventory', '放入背包')
    expect(() => b.preplay.describeAction(old)).toThrow()
    expect(() => a.preplay.describeAction({ ...old })).toThrow()
    expect(() => a.preplay.describeAction(ready(a.player).carried[0].selector)).toThrow()
    send(a.player, 'move', '大厅')
    expect(() => a.preplay.describeAction(old)).toThrow()
  })
  it('retrySave retains selector meaning and describes the same inputs', () => {
    const h = playerHarness(); begin(h)
    const action = choose(h.player, 'inventory', '放入背包'), before = h.preplay.describeAction(action)
    h.player.retrySave(); expect(h.preplay.describeAction(action)).toEqual(before)
  })
})
