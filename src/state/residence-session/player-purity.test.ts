import { afterEach, describe, expect, it, vi } from 'vitest'
import { observe, expectSaveOnly } from './combat-test-observers'
import * as clinical from '../../core/residence-supply/shared-medical'
import { begin, playerHarness, ready, choose, send, counts } from './player-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('Q10 independent zero-side-effect windows', () => {
  it('query/setup/valid preview/resolve/rejected selection do not produce, draw, authorize, dispatch, read/write or notify', () => {
    const h = playerHarness(); begin(h); const o = observe(h), effects = vi.spyOn(clinical, 'evaluateSupplyClinical')
    const before = h.owner.getState().current, disk = h.disk()
    o.clear(); h.dispatch.mockClear()
    for (const run of [() => h.player.query(), () => h.player.setup(),
      () => h.player.preview({ action: choose(h.player, 'move', '大厅') }),
      () => h.player.resolve({ action: choose(h.player, 'move', '大厅') }),
      () => h.player.preview({ action: {} }), () => h.player.execute({ action: {} })]) {
      o.clear(); h.dispatch.mockClear(); run()
      expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0))
      expect(h.dispatch).not.toHaveBeenCalled(); expect(effects).not.toHaveBeenCalled()
      expect(h.owner.getState().current).toBe(before); expect(h.disk()).toBe(disk)
    }
  })
  it('one random source commit, failed save, then save-only retry: no repeat source/draw/issuance/notification', () => {
    const h = playerHarness(); begin(h); send(h.player, 'move', '大厅')
    const action = choose(h.player, 'source', '大厅搜索', 'dark'), o = observe(h)
    o.clear(); h.dispatch.mockClear()
    for (let i = 0; i < 4; i++) expect(h.player.preview({ action }).kind).toBe('available')
    expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0))
    h.faults.write = true; expect(h.player.execute({ action }).kind).toBe('committed')
    const n: Record<string, number> = o.counts()
    expect(n.source).toBe(1); expect(n.draw).toBe(1); expect(n.origin).toBe(2)
    expect(n.write).toBe(1); expect(n.batches).toBe(1); expect(n.current).toBe(1); expect(n.read).toBe(0)
    expect(h.dispatch).toHaveBeenCalledTimes(1); expect(ready(h.player).ground.length).toBeGreaterThan(0)
    const value = h.owner.getState().current!, productions = value.productions, origins = value.origins
    h.faults.write = false; o.clear(); h.dispatch.mockClear(); h.player.retrySave()
    expectSaveOnly(o.counts()); expect(h.dispatch).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(value); expect(value.productions).toBe(productions); expect(value.origins).toBe(origins)
  })
})
