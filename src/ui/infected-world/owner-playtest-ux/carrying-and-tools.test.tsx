import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'

afterEach(() => vi.restoreAllMocks())

it('lamp users see real light search and can inspect, but cannot execute, a missing crow method', async () => {
  const observed = observeBrowser()
  const h = await mountUi()
  try {
    await h.d.setup('lamp', 'engineer')
    await h.d.send('进入封锁区')
    await h.d.move('大厅')
    const before = h.view()
    observed.clear()
    h.setItem.mockClear()
    h.entropy.mockClear()

    const actions = [...h.host.querySelectorAll<HTMLButtonElement>('.iw-room-interactions button:not(:disabled)')]
    expect(actions.some(button => button.textContent?.includes('使用撬棍'))).toBe(false)
    expect(actions.some(button => button.textContent?.includes('照明搜索'))).toBe(true)
    const alternate = h.host.querySelector<HTMLDetailsElement>('.iw-other-methods')!
    expect(alternate.open).toBe(false)
    const missing = [...alternate.querySelectorAll('button')].find(button => button.textContent?.includes('使用撬棍'))!
    expect(missing.disabled).toBe(true)
    expect(alternate.textContent).toContain('缺少撬棍')
    await h.flush(() => alternate.querySelector('summary')!.click())
    await h.flush(() => missing.click())
    expect(h.view()).toBe(before)
    expect(h.setItem).not.toHaveBeenCalled()
    expect(h.entropy).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
  } finally {
    await h.unmount()
  }
})

it('shows the actual equipment, complete backpack footprint and quick slots at the same time', async () => {
  const h = await mountUi()
  try {
    await h.d.setup('lamp', 'engineer')
    const before = h.view()
    h.setItem.mockClear()
    expect(h.host.querySelector('[role="tablist"]')).toBeNull()
    const equipment = h.host.querySelector('section[aria-label="装备"]')!
    expect(equipment.textContent).toContain('手电筒')
    const lamp = before.carried.find(item => item.container === 'utility')!
    if (lamp.resource.kind === 'none') throw new Error('Expected the actual equipped flashlight resource')
    expect(equipment.textContent).toContain('电量 ' + lamp.resource.current + ' / ' + lamp.resource.maximum)
    expect(h.host.querySelectorAll('[aria-label="背包格位"] .iw-grid-cell')).toHaveLength(24)
    expect(h.host.querySelector('[aria-label="快捷栏"]')?.textContent).toContain('绷带')
    expect(h.host.querySelector('.iw-bag-capacity')?.textContent).toContain('格位 0 / 24')
    expect(h.view()).toBe(before)
    expect(h.setItem).not.toHaveBeenCalled()
  } finally {
    await h.unmount()
  }
})
