import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { ItemPicture } from './components/item-inspection'
import { itemImage, itemPlaceholder } from './assets'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })
describe('R2 actual item inspection and bounded picture failures', () => {
  it('inspection uses the current quick item, is read-only, then transfers it exactly once through original parameters', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const before = h.view(), original = before.carried.find(item => item.container === 'quick')!
      const tile = h.host.querySelector<HTMLButtonElement>('[aria-label="快捷栏"] .iw-item')!
      observed.clear(); h.setItem.mockClear()
      await h.flush(() => tile.click())
      const detail = document.querySelector('[aria-label="绷带 · 详情"]')!
      expect(detail.textContent).toContain('快捷位'); expect(detail.querySelector('img')?.getAttribute('src')).toBe(itemImage(original.name))
      expect(document.querySelector('[role="menu"]')).toBeNull()
      expect(h.view()).toBe(before); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
      await h.d.button('放入背包'); await h.d.anchor(0, 0); await h.d.button('执行行动')
      expect(h.view().carried.find(item => item.name === original.name)).toMatchObject({ container: 'backpack', quantity: original.quantity, resource: original.resource, placement: { x: 0, y: 0, rotated: false } })
      expect(document.querySelector('[aria-label="绷带 · 详情"]')).toBeNull()
      expect(document.querySelector('.iw-content-layer')).toBeNull()
      expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
    } finally { await h.unmount() }
  })
  it('old image errors cannot replace the current item; current failure falls back and the next item has its own source', async () => {
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
    try {
      await act(async () => root.render(<ItemPicture name="绷带" />)); const old = host.querySelector('img')!
      await act(async () => root.render(<ItemPicture name="感染抑制剂" />))
      await act(async () => old.dispatchEvent(new Event('error')))
      expect(host.querySelector('img')!.getAttribute('src')).toBe(itemImage('感染抑制剂'))
      await act(async () => host.querySelector('img')!.dispatchEvent(new Event('error')))
      expect(host.querySelector('img')!.getAttribute('src')).toBe(itemPlaceholder)
      await act(async () => root.render(<ItemPicture name="通用电池" />))
      expect(host.querySelector('img')!.getAttribute('src')).toBe(itemImage('通用电池'))
      expect(itemImage('component')).toBe(itemImage('转运组件')); expect(itemImage('module')).toBe(itemImage('通信模块'))
    } finally { await act(async () => root.unmount()); host.remove() }
  })
})
