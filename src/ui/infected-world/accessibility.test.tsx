import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

describe('infected-world keyboard and read-only access', () => {
  it('keyboard menu opens, moves focus, closes and restores the item trigger with zero gameplay', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const tile = h.host.querySelector<HTMLButtonElement>('[aria-label="快捷栏"] .iw-item')!
      observed.clear(); h.setItem.mockClear()
      await h.flush(() => { tile.focus(); tile.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true })) })
      const menu = document.querySelector('[role="menu"]')!
      const buttons = [...menu.querySelectorAll('button')]
      expect(document.activeElement).toBe(buttons[0])
      await h.flush(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })))
      expect(document.activeElement).toBe(buttons[1])
      await h.flush(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
      expect(document.querySelector('[role="menu"]')).toBeNull(); expect(document.activeElement).toBe(tile)
      expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0, consume: 0 })
    } finally { await h.unmount() }
  })

  it('a necessary-input dialog focuses cancel and Escape returns to its actual trigger without executing', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.button('药食与维护')
      observed.clear(); h.setItem.mockClear()
      const trigger = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === '使用药食')!
      await h.flush(() => { trigger.focus(); trigger.click() })
      expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')
      expect(document.activeElement?.textContent).toBe('取消')
      await h.flush(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      expect(document.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull(); expect(document.activeElement).toBe(trigger)
      expect(document.querySelector('[aria-label="行动说明"]')?.getAttribute('aria-modal')).toBe('false')
      expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0, medical: 0 })
    } finally { await h.unmount() }
  })
})
