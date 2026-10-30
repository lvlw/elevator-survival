import { afterEach, describe, expect, it, vi } from 'vitest'
import { observe, expectSaveOnly } from './combat-test-observers'
import { entered } from './combat-test-fixtures'
import { fromValue, ready, choose, send } from './player-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('A independent read windows and exact commit counts', () => {
  it('repeated live query/preview/resolve/describeAction/synchronize do not produce, draw, issue, replace, write or notify', () => {
    const f = entered(), h = fromValue(f.value, f.deps), action = choose(h.player, 'combat', '金属管攻击')
    const value = h.owner.getState().current!, revision = value.character.revision, disk = h.disk(), o = observe(h)
    for (const run of [() => h.player.query(), () => h.player.preview({ action }), () => h.player.resolve({ action }),
      () => h.preplay.describeAction(action), () => h.synchronize()]) {
      o.clear(); h.dispatch.mockClear()
      for (let n = 0; n < 4; n++) run()
      expect(Object.values(o.counts()).every(n => n === 0)).toBe(true)
      expect(h.dispatch).not.toHaveBeenCalled(); expect(h.owner.getState().current).toBe(value)
      expect(value.character.revision).toBe(revision); expect(h.disk()).toBe(disk)
      expect(choose(h.player, 'combat', '金属管攻击')).toBe(action)
    }
  })
  it('one actual action uses original P/CTB/current/write/notice once; failed-save retry is save-only', () => {
    const f = entered(), h = fromValue(f.value, f.deps), o = observe(h)
    o.clear(); h.dispatch.mockClear(); h.faults.write = true
    send(h.player, 'combat', '金属管攻击')
    expect(o.counts()).toMatchObject({ combat: 1, ctb: 1, ctbPlan: 1, ctbReduce: 1, current: 1, write: 1, batches: 1, read: 0 })
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    const value = h.owner.getState().current, action = choose(h.player, 'combat', '防御')
    h.faults.write = false; o.clear(); h.dispatch.mockClear(); h.player.retrySave()
    expectSaveOnly(o.counts()); expect(h.dispatch).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(value); expect(choose(h.player, 'combat', '防御')).toBe(action)
    expect(ready(h.player).combat!.opponent.name).toBe('感染护工')
    console.log('A-COUNTS ' + JSON.stringify(o.counts()))
  })
})
