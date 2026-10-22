import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'

afterEach(() => vi.restoreAllMocks())

describe('React confirmation cancellation and invalidation', () => {
  it('normal return uses the formal protected confirmation and cancel is zero IO', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const before = h.view(), writes = h.setItem.mock.calls.length
      o.clear()
      await h.d.button('失败止损返回'); expect(h.host.querySelector('[aria-label="保护确认"]')).not.toBeNull()
      expect(h.setItem).toHaveBeenCalledTimes(writes); await h.d.button('取消')
      expect(h.view()).toBe(before); expect(h.setItem).toHaveBeenCalledTimes(writes)
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
    } finally { await h.unmount() }
  })
  it('two same-stack confirm DOM clicks produce only one final terminal checkpoint', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.button('失败止损返回')
      const writes = h.setItem.mock.calls.length, confirm = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '确认执行')!
      const before = o.owners.at(-1)!.getState().current!, cycle = before.character.cycle, day = h.view().taskDay
      o.clear()
      await h.flush(() => { confirm.click(); confirm.click() })
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1); expect(h.view().point).toBe('living-hub')
      expect(h.view().terminal.result!.outcome).toBe('voluntary-failure')
      expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1, terminal: 1, g1Cycle: 1, draw: 0 })
      const after = o.owners.at(-1)!.getState().current!
      expect(after.receipts.at(-1)!.steps).toEqual([]); expect(after.character.cycle).toBe(cycle); expect(h.view().taskDay).toBe(day)
    } finally { await h.unmount() }
  })
  it('external formal movement invalidates the old terminal confirmation without an extra command', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.button('失败止损返回')
      const confirm = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '确认执行')!
      const move = h.view().move.options.find(a => a.label === '大厅')!
      await h.flush(() => { expect(h.owner().controls()!.execute({ action: move.selector }).kind).toBe('committed') })
      const writes = h.setItem.mock.calls.length
      o.clear()
      expect(h.host.querySelector('[aria-label="保护确认"]')).toBeNull(); await h.flush(() => confirm.click())
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.view().location!.name).toBe('大厅')
      expect(h.host.textContent).toContain('原选择已失效')
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
    } finally { await h.unmount() }
  })
})
