import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { domRouteA } from './route-test-fixtures'

afterEach(() => vi.restoreAllMocks())
describe('R02 approved public explanations', () => {
  it.each([
    ['crow', /门|柜/], ['lamp', /电量/], ['toolbox', /门|柜/],
    ['scout', /完整核对.*精力/], ['engineer', /转运组件.*精力/], ['survival', /第一次.*绷带.*生命/],
  ] as const)('%s has a concrete explanation before any creation', async (value, meaning) => {
    const h = await mountUi()
    try {
      const radio = h.host.querySelector<HTMLInputElement>(`input[value="${value}"]`)!
      expect(radio).not.toBeNull(); expect(radio.closest('label')!.textContent).toMatch(meaning)
      const reads = h.getItem.mock.calls.length
      await h.flush(() => radio.focus())
      expect(h.getItem).toHaveBeenCalledTimes(reads); expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
    } finally { await h.unmount() }
  })
  it('real carried component and module use the same Chinese names in tile, menu and explicit input', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); for (let stage = 0; stage < 4; stage++) await domRouteA(h.d, stage)
      const rawModule = h.view().carried.find(i => i.name === 'module')!, rawComponent = h.view().carried.find(i => i.name === 'component')!
      expect(rawModule).toBeDefined(); expect(rawComponent).toBeDefined()
      const tile = h.host.querySelector<HTMLButtonElement>('[aria-label="背包格位"] button[aria-label^="通信模块"]')!
      expect(tile, 'R02 public task object still has its engineering placeholder name').not.toBeNull()
      expect(tile.title).toContain('通信模块'); expect(h.host.querySelector('[title^="转运组件"]')).not.toBeNull()
      await h.flush(() => tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
      expect(document.querySelector('[role="menu"]')!.textContent).toContain('通信模块')
      await h.d.button('移动物品')
      const selected = h.host.querySelector<HTMLSelectElement>('select[aria-label="物品"]')!
      expect(selected.selectedOptions[0].textContent).toContain('通信模块')
      expect(h.view().carried.find(i => i.name === 'module')!.selector).toBe(rawModule.selector)
      expect(h.host.innerHTML).not.toMatch(/\bcomponent\b|\bmodule\b/)
      await h.d.button('取消')
    } finally { await h.unmount() }
  }, 30000)
})
