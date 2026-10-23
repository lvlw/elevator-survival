import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { actionName } from './labels'

afterEach(() => vi.restoreAllMocks())
describe('R01 complete actions have independently readable L0 information', () => {
  it.each(['source', 'investigation'] as const)('%s information matches formal preview before one-click execution', async kind => {
    const h = await mountUi(), o = observeBrowser()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅')
      if (kind === 'investigation') await h.d.move('后勤控制间')
      const controls = h.owner().controls()!
      const action = kind === 'source' ? h.view().sources.flatMap(s => s.choices).find(a => a.method === 'dark')! :
        h.view().tasks.choices.find(a => controls.describeAction(a.selector).fields.length === 0)!
      expect(action).toBeDefined(); expect(controls.describeAction(action.selector).fields).toEqual([])
      const metadata = controls.preview({ action: action.selector }), before = h.view(), writes = h.setItem.mock.calls.length, reads = h.getItem.mock.calls.length
      o.clear()
      const information = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.getAttribute('aria-label') === `查看${actionName(action)}说明`)
      expect(information, 'R01 actual DOM lacks an independent pre-execution information entry').toBeDefined()
      await h.flush(() => information!.click())
      const panel = document.querySelector('[aria-label="行动说明"]')!
      expect(panel).not.toBeNull(); expect(panel.textContent).toContain(`精力消耗：${metadata.qualification.cost}`)
      for (const text of metadata.facts!.mechanisms) expect(panel.textContent).toContain(text)
      await h.d.button('关闭说明')
      expect(h.view()).toBe(before); expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.getItem).toHaveBeenCalledTimes(reads)
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0, task: 0, source: 0 })
      await h.d.button(actionName(action))
      expect(h.host.querySelector('[aria-label="保护确认"]')).toBeNull()
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1); expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 })
    } finally { await h.unmount() }
  })
})
