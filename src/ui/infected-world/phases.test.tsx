import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

describe('infected-world phase presentation through real controls', () => {
  it('first Hub stays locked until explicit depart; explicit closure produces static living Hub', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); expect(h.view().point).toBe('first-hub')
      observed.clear(); h.setItem.mockClear()
      await h.d.send('进入封锁区')
      expect(h.view()).toMatchObject({ phase: 'active-world', point: 'stable-active', location: { name: '电梯前室' } })
      expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
      expect(h.host.querySelector('[aria-label="相邻方向"]')).not.toBeNull()
      await h.d.send('失败止损返回')
      expect(h.view()).toMatchObject({ phase: 'living-hub', point: 'living-hub' })
      expect(h.host.textContent).toContain('已止损返回')
      expect(h.host.textContent).toContain('当前没有后继内容')
      const after = observed.counts(); await h.render()
      expect(observed.counts()).toEqual(after)
      expect(h.host.querySelector('[aria-label="相邻方向"]')).toBeNull()
      expect([...h.host.querySelectorAll('button')].some(button => button.textContent === '进入封锁区')).toBe(false)
    } finally { await h.unmount() }
  })

  it('a read error is a blocking system state, never empty setup or death', async () => {
    const observed = observeBrowser(), h = await mountUi('read-error')
    try {
      h.faults.read = true; await h.remount()
      expect(h.owner().getSnapshot().status).toBe('read-error')
      expect(h.host.textContent).toContain('读取存档失败')
      expect(h.host.querySelector('input[name="tool"]')).toBeNull()
      expect(h.host.textContent).not.toContain('玩家死亡')
      expect(h.host.textContent).toContain('不会把问题当成空档')
      expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ initial: 0, dispatch: 0, current: 0 })
      expect(h.host.textContent).not.toMatch(/清空存档|重置游戏|重新创建/)
    } finally { await h.unmount() }
  })

  it('pagehide suspends the old context and requires explicit reacquisition', async () => {
    const observed = observeBrowser(), h = await mountUi('lifecycle-system')
    try {
      const former = h.owner().controls()
      await h.flush(() => h.lifecycle.dispatchEvent(new Event('pagehide')))
      expect(h.owner().getSnapshot().status).toBe('suspended')
      expect(h.host.textContent).toContain('旧选择已失效')
      expect(h.host.textContent).toContain('重新取得独占')
      expect(h.owner().controls()).toBeNull()
      await h.d.button('重新取得独占')
      expect(h.owner().getSnapshot().status).toBe('setup')
      expect(h.owner().controls()).not.toBe(former)
      expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ initial: 0, dispatch: 0, current: 0 })
    } finally { await h.unmount() }
  })
})
