import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'

afterEach(() => vi.restoreAllMocks())

it('ends a real withdrawal with an explicit chapter end and no active navigation or repeat settlement', async () => {
  const observed = observeBrowser()
  const h = await mountUi()
  try {
    await h.d.setup()
    await h.d.send('进入封锁区')
    await h.d.send('失败止损返回')
    const before = h.view()
    expect(before.terminal.result?.outcome).toBe('voluntary-failure')
    const terminal = h.host.querySelector('[aria-label="终局摘要"]')!
    expect(terminal.textContent).toContain('本测试章节已结束')
    expect(terminal.textContent).toContain('没有下一关')
    expect(terminal.textContent).toContain('确认保存成功后即可关闭页面')
    expect(h.host.querySelector('.iw-known-map,.iw-travel,.iw-goal-next')).toBeNull()
    expect(h.host.textContent).not.toMatch(/重新开始|回当前位置|追踪线索|尚无已知地点/)
    observed.clear()
    h.setItem.mockClear()
    await h.d.button('回顾本次结局')
    expect(terminal.querySelector('[aria-label="医院叙事"]')).not.toBeNull()
    expect(h.view()).toBe(before)
    expect(h.setItem).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, terminal: 0, draw: 0 })
  } finally {
    await h.unmount()
  }
})
