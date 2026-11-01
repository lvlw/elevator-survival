import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'
import { publicItemName } from './labels'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })
describe('R2 real shell and the blocking pharmacy route', () => {
  it('uses the current scene, reveals, picks every actual instance, empties and reopens without a second search', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); expect(h.host.querySelector('.iw-stage')?.getAttribute('data-scene')).toBe('hub')
      await h.d.send('进入封锁区'); await h.d.walk(['大厅', '药房'])
      expect(h.view().location).toEqual({ place: '医院', name: '药房' })
      expect(h.host.querySelector('.iw-stage')?.getAttribute('data-scene')).toBe('医院/药房')
      expect(h.host.querySelector<HTMLImageElement>('.iw-scene-plate')?.src).toContain('bg-h2-v1.png')
      expect(h.view().ground).toHaveLength(0)
      expect(h.view().sources.find(s => s.label === '药房搜索')?.completed).toBe(false)
      await h.d.task('药房搜索', 'dark')
      expect(h.view().sources.find(s => s.label === '药房搜索')?.completed).toBe(true)
      const count = h.view().ground.length; expect(count).toBeGreaterThan(0)
      expect(h.host.querySelectorAll('.iw-ground-items article')).toHaveLength(count)
      for (let index = 0; index < count; index++) {
        const item = h.view().ground[0]!
        await h.d.button('拾取 ' + publicItemName(item.name))
        expect(document.querySelector('[aria-label="行动参数"]')).toBeNull()
        expect(h.view().ground).toHaveLength(count - index - 1)
      }
      expect(h.host.querySelector('.iw-ground')?.getAttribute('data-empty')).toBe('true')
      observed.clear(); h.setItem.mockClear()
      const current = h.view()
      await h.d.button('收起结果'); await h.d.button('查看结果')
      expect(h.host.querySelectorAll('.iw-ground-items article')).toHaveLength(0)
      expect(h.view()).toEqual(current)
      expect(observed.counts()).toMatchObject({ source: 0, draw: 0, dispatch: 0, current: 0, notices: 0 })
      expect(h.setItem).not.toHaveBeenCalled()
      expect(h.host.querySelector('[aria-label="任务与已知信息"]')).not.toBeNull()
      expect(h.host.querySelector('[aria-label="已知地点拓扑，只读"]')).not.toBeNull()
      expect(h.host.querySelectorAll('[aria-label="背包格位"] .iw-grid-cell')).toHaveLength(24)
    } finally { await h.unmount() }
  })
  it('task, body, map, help and maximizing keep the same public context with no dispatch or save', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const current = h.view(); observed.clear(); h.setItem.mockClear()
      for (const label of ['任务目标', '身体', '展开已知区域', '帮助']) {
        await h.d.button(label); expect(document.querySelector('.iw-content-layer')).not.toBeNull()
        await h.d.button('放大'); await h.d.button('还原'); await h.d.button('关闭')
        expect(h.view()).toEqual(current)
      }
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
      expect(h.setItem).not.toHaveBeenCalled()
    } finally { await h.unmount() }
  })
})
