import { describe, expect, it } from 'vitest'
import { browserFixture, setup, choose, send } from './test-fixtures'
describe('lease-bound readonly input delegation', () => {
  it('describes inputs through the unique controller without IO or notifications', async () => {
    const h = browserFixture(); await setup(h); send(h.owner, 'depart', '进入封锁区')
    const before = h.owner.getSnapshot(), reads = h.getItem.mock.calls.length, writes = h.setItem.mock.calls.length
    const d = h.owner.controls()!.describeAction(choose(h.owner, 'inventory', '放入背包'))
    expect(d.fields).toEqual(['item', 'placement']); expect(h.owner.getSnapshot()).toBe(before)
    expect(h.getItem).toHaveBeenCalledTimes(reads); expect(h.setItem).toHaveBeenCalledTimes(writes); h.owner.dispose()
  })
  it('old controls and action descriptions cannot survive lease loss', async () => {
    const h = browserFixture(); await setup(h); send(h.owner, 'depart', '进入封锁区')
    const old = h.owner.controls()!, action = choose(h.owner, 'inventory', '放入背包')
    h.owner.suspend(); expect(() => old.describeAction(action)).toThrow(); h.owner.dispose()
  })
})
