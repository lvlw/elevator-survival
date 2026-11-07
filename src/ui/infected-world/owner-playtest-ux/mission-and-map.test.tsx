import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../../app/infected-browser/schema'

afterEach(() => vi.restoreAllMocks())

it('keeps status, purpose and the safe next step together for each of three goals', async () => {
  const observed = observeBrowser()
  const h = await mountUi()
  try {
    await h.d.setup()
    await h.d.send('进入封锁区')
    const before = h.view()
    observed.clear()
    h.setItem.mockClear()
    h.entropy.mockClear()
    await h.d.button('任务目标')
    const dialog = document.querySelector('[role="dialog"][aria-label="任务目标"]')!
    const goals = [...dialog.querySelectorAll('[data-goal]')]
    expect(goals.map(goal => goal.getAttribute('data-goal'))).toEqual(['power', 'transfer', 'sample'])
    expect(goals[0].textContent).toContain('让医院转运支路恢复供电')
    expect(goals[1].textContent).toContain('供电恢复后')
    expect(goals[2].textContent).toContain('带回医院·电梯前室交付')
    for (const goal of goals) {
      expect(goal.querySelector('.iw-goal-state')?.textContent).toBeTruthy()
      expect(goal.querySelector('.iw-goal-next')?.textContent).toBeTruthy()
    }
    expect(dialog.textContent).not.toMatch(/追踪|周衡|转运支路柜|冷藏室|检修间|执行人/)
    expect(h.view()).toBe(before)
    expect(h.setItem).not.toHaveBeenCalled()
    expect(h.entropy).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
  } finally {
    await h.unmount()
  }
})

it('draws the disclosed logistics gate in the scene and binds the same name to its real move', async () => {
  const observed = observeBrowser()
  const h = await mountUi()
  try {
    await h.d.setup()
    await h.d.send('进入封锁区')
    await h.d.walk(['大厅', '后勤控制间'])
    const before = h.view()
    const cost = before.move.options.find(action => action.label === '岗亭')!.cost!
    observed.clear()
    h.setItem.mockClear()
    h.entropy.mockClear()
    const marker = h.host.querySelector<SVGGElement>('.iw-stage-map [data-map-external][aria-label*="物流·岗亭"]')
    expect(marker, 'public external endpoint in scene minimap').not.toBeNull()
    expect(h.host.querySelector('.iw-sidebar .iw-known-map')).toBeNull()
    const button = [...h.host.querySelectorAll('.iw-travel button')].find(b => b.textContent?.includes('物流·岗亭'))
    expect(button).toBeDefined()
    await h.flush(() => marker!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
    expect(h.host.querySelector('.iw-map-selection')?.textContent).toContain('后勤控制间')
    expect(h.view()).toBe(before)
    expect(h.entropy).not.toHaveBeenCalled()
    expect(h.setItem).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })

    await h.d.move('岗亭')
    expect(h.view().location).toEqual({ place: '物流', name: '岗亭' })
    expect(h.view().body.energy.current).toBe(before.body.energy.current - cost)
    expect(h.host.querySelector('.iw-known-map')?.getAttribute('data-map-place')).toBe('物流')
    expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 })
    expect(h.setItem.mock.calls.filter(([key]) => key === CHECKPOINT_KEY)).toHaveLength(1)
  } finally {
    await h.unmount()
  }
})
