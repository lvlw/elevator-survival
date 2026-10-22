import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

describe('infected-world real carried controls', () => {
  it('quick-slot context menu is read-only and explicit transfer renders the formal occupied footprint', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const before = h.view().carried.find(item => item.container === 'quick')!
      expect(h.host.querySelectorAll('[aria-label="背包格位"] .iw-grid-cell')).toHaveLength(24)
      const quick = h.host.querySelector<HTMLButtonElement>('[aria-label="快捷栏"] .iw-item')!
      observed.clear(); h.setItem.mockClear()
      await h.flush(() => quick.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })))
      expect(document.querySelector('[role="menu"]')).not.toBeNull()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
      expect(h.setItem).not.toHaveBeenCalled()
      await h.d.button('放入背包')
      expect(document.querySelector('[aria-label="行动参数"]')).not.toBeNull()
      expect(h.setItem).not.toHaveBeenCalled()
      await h.d.anchor(0, 0); await h.d.button('执行行动')
      const item = h.view().carried.find(item => item.container === 'backpack' && item.name === before.name)!
      expect(item).toMatchObject({ quantity: before.quantity, resource: before.resource, placement: { x: 0, y: 0, rotated: false } })
      expect(h.view().carried.some(item => item.container === 'quick')).toBe(false)
      const tile = h.host.querySelector<HTMLButtonElement>('[aria-label="背包格位"] .iw-item')!
      const xs = item.footprint.map(cell => cell.x), ys = item.footprint.map(cell => cell.y)
      expect(tile.style.gridColumn).toBe(`${Math.min(...xs) + 1} / ${Math.max(...xs) + 2}`)
      expect(tile.style.gridRow).toBe(`${Math.min(...ys) + 1} / ${Math.max(...ys) + 2}`)
      expect(item.footprint).toHaveLength(item.width * item.height)
      expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
      expect(h.host.querySelector('.iw-item-quantity')).toBeNull()
    } finally { await h.unmount() }
  })

  it('source results reopen without another search, draw, dispatch or write', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.task('大厅搜索', 'dark')
      expect(h.view().sources.find(source => source.label === '大厅搜索')?.completed).toBe(true)
      expect(h.host.querySelector('.iw-ground-items')).not.toBeNull()
      const ground = h.view().ground; expect(ground.length).toBeGreaterThan(0)
      observed.clear(); h.setItem.mockClear()
      await h.d.button('收起结果'); expect(h.host.querySelector('.iw-ground-items')).toBeNull()
      await h.d.button('查看结果'); expect(h.host.querySelectorAll('.iw-ground-items article')).toHaveLength(ground.length)
      expect(h.view().ground).toEqual(ground)
      expect(observed.counts()).toMatchObject({ source: 0, draw: 0, dispatch: 0, current: 0, notices: 0 })
      expect(h.setItem).not.toHaveBeenCalled()
    } finally { await h.unmount() }
  })
})
