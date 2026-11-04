import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import { READING_KEY } from '../../app/infected-browser/narrative-entry/reading'
afterEach(() => vi.restoreAllMocks())

describe('real React narrative entry', () => {
  it('reading all diary pages and apparent rest cannot create, grant, advance a day or save', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.button('睁开眼睛'); await h.d.button('查看显示屏'); await h.d.button('看看长椅上的本子')
      await h.d.button('下一页'); await h.d.button('下一页'); await h.d.button('读完日记')
      await h.d.button('靠墙休息'); await h.d.button('查看首次任务')
      expect(h.host.textContent).toContain('主动失败会关闭本委托')
      expect(h.owner().getSnapshot().status).toBe('setup')
      expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
      expect(o.counts()).toMatchObject({ initial: 0, dispatch: 0, current: 0, notices: 0, draw: 0, g1Cycle: 0 })
      await h.d.button('准备出发'); await h.d.setup('lamp', 'survival')
      expect(o.counts()).toMatchObject({ initial: 1, dispatch: 0, current: 1, notices: 1 })
      expect(h.view().point).toBe('first-hub')
      expect(h.owner().controls()!.getReading().marks).toContainEqual({ key: 'P03', state: 'read' })
      await h.d.send('进入封锁区')
      expect(h.host.querySelector('[aria-label="当前叙事"]')?.textContent).toContain('耳边的轰鸣')
      expect(o.counts()).toMatchObject({ dispatch: 1, current: 2, notices: 2 })
    } finally { await h.unmount() }
  })
  it('only the committed workorder reveals Zhou; read/review/cold resume do not investigate again', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.move('后勤控制间')
      expect(h.host.textContent).not.toContain('执行人：周衡')
      await h.d.task('现场互动'); await h.d.button('继续')
      expect(h.host.querySelector('[aria-label="当前叙事"]')?.textContent).toContain('执行人：周衡')
      const current = h.view(), checkpoint = h.disk.get(CHECKPOINT_KEY), writes = h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY).length
      o.clear(); await h.d.button('继续'); await h.d.button('读毕')
      expect(h.view()).toBe(current); expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
      expect(h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY)).toHaveLength(writes)
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
      await h.remount()
      expect(h.host.querySelector('[aria-label="当前叙事"]')).toBeNull()
      expect(h.host.textContent).not.toContain('执行人：周衡')
      const records = h.host.querySelector('summary')!
      await h.flush(() => records.click())
      const button = [...h.host.querySelectorAll<HTMLButtonElement>('.iw-records button')].find(b => b.textContent?.startsWith('停用工单'))!
      await h.flush(() => button.click())
      expect(h.host.textContent).toContain('执行人：周衡')
      expect(h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY)).toHaveLength(writes)
    } finally { await h.unmount() }
  })
  it('lost owner hides current prose and a detached old read callback cannot write', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const old = [...h.host.querySelectorAll<HTMLButtonElement>('.iw-narrative button')].find(b => b.textContent === '读毕')!
      const reading = h.disk.get(READING_KEY), checkpoint = h.disk.get(CHECKPOINT_KEY)
      await h.flush(() => h.owner().suspend())
      await h.flush(() => old.click())
      expect(h.host.querySelector('[aria-label="当前叙事"]')).toBeNull()
      expect(h.disk.get(READING_KEY)).toBe(reading); expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
    } finally { await h.unmount() }
  })
})
