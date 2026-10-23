import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'

afterEach(() => vi.restoreAllMocks())
it('R04 cold restore describes no new page write, not absence of a saved checkpoint', async () => {
  const o = observeBrowser(), h = await mountUi()
  try {
    await h.d.setup(); expect(h.view().persistence.feedback).toBe('saved')
    const disk = new Map(h.disk), writes = h.setItem.mock.calls.length; o.clear(); await h.remount()
    expect(h.view().point).toBe('first-hub'); expect(h.view().persistence.feedback).toBe('not-attempted')
    expect(h.host.querySelector('[role="status"]')!.textContent).toContain('本页面尚未执行新的保存操作')
    expect(h.host.textContent).not.toContain('尚未尝试保存')
    expect(h.disk).toEqual(disk); expect(h.setItem).toHaveBeenCalledTimes(writes)
    expect(o.counts()).toMatchObject({ initial: 0, dispatch: 0, notices: 0, draw: 0 })
  } finally { await h.unmount() }
})
