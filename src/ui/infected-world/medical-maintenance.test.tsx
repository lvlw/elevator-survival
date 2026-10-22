import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'

afterEach(() => vi.restoreAllMocks())

describe('real DOM medical and maintenance input flow', () => {
  it('after real retreat repairs with the explicitly selected second material stack then uses a real bandage', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.task('大厅搜索', 'dark'); await h.d.button('拾取 金属零件')
      await h.d.walk(['后勤控制间', '岗亭', '登记室', '维修库']); await h.d.task('开启侧室', 'crow'); await h.d.task('物流侧室物资'); await h.d.button('拾取 金属零件')
      await h.d.walk(['登记室', '岗亭', '后勤控制间', '大厅']); await h.d.rest()
      await h.d.task('隔离防火门', 'crow'); await h.d.move('隔离走廊'); await h.d.send('金属管攻击'); await h.d.send('蓄力打击'); await h.d.send('退却')
      expect(h.view().point).toBe('stable-active')
      const metals = h.view().carried.filter(i => i.name === '金属零件'), oldResource = h.view().carried.find(i => i.container === 'weapon')!.resource
      expect(metals).toHaveLength(2)
      const firstPlacement = metals[0].placement, secondPlacement = metals[1].placement, writes = h.setItem.mock.calls.length
      await h.d.button('药食与维护'); await h.d.button('机械维护')
      expect(h.host.textContent).toContain('机械维修共享总池 15')
      expect(h.host.querySelector<HTMLInputElement>('[aria-label="金属零件来源1用量"]')!.value).toBe('')
      expect(h.host.querySelector<HTMLInputElement>('[aria-label="金属零件来源2用量"]')!.value).toBe('')
      await h.d.input('金属零件来源2用量', '1'); await h.d.input('金属管分配', '15')
      expect(h.host.textContent).toContain('正式资格：可执行'); expect(h.setItem).toHaveBeenCalledTimes(writes)
      o.clear()
      await h.d.button('执行行动')
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
      expect(h.view().carried.filter(i => i.name === '金属零件').map(i => i.placement)).toEqual([firstPlacement])
      expect(firstPlacement).not.toEqual(secondPlacement)
      expect(o.counts()).toMatchObject({ maintenance: 1, dispatch: 1, current: 1, notices: 1, g1Action: 1, g1Cycle: 0, draw: 0 })
      const current = h.view().carried.find(i => i.container === 'weapon')!.resource
      expect(oldResource.kind).toBe('durability'); expect(current.kind).toBe('durability')
      if (oldResource.kind === 'durability' && current.kind === 'durability') expect(current.current).toBeGreaterThan(oldResource.current)
      const hadBandage = h.view().carried.some(i => i.name === '绷带')
      expect(hadBandage).toBe(true); expect(await h.d.medical('绷带')).toBe(true)
      expect(h.view().carried.some(i => i.container === 'quick' && i.name === '绷带')).toBe(false)
      expect(h.view().point).toBe('stable-active')
    } finally { await h.unmount() }
  }, 30000)
})
