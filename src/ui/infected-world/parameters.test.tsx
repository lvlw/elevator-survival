import { describe, expect, it } from 'vitest'
import { mountUi } from './test-fixtures'

async function foodStack() {
  const h = await mountUi(); await h.d.setup(); await h.d.send('进入封锁区')
  await h.d.walk(['大厅', '后勤控制间', '岗亭', '登记室'])
  await h.d.task('开启物流柜', 'crow'); await h.d.task('物流柜物资'); await h.d.button('拾取 压缩口粮')
  return h
}
function menuItem(host: HTMLElement, name: string, ordinal = 0) {
  const item = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="背包格位"] .iw-item')]
    .filter(b => b.getAttribute('aria-label')?.startsWith(name))[ordinal]
  if (!item) throw new Error('Expected actual item tile ' + name)
  item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }))
}
describe('explicit UI parameters use formal safe preview', () => {
  it('split starts with no quantity or placement and cancellation is zero IO', async () => {
    const h = await foodStack()
    try {
      const before = h.view(), writes = h.setItem.mock.calls.length
      await h.flush(() => menuItem(h.host, '压缩口粮')); await h.d.button('拆分')
      expect(h.host.querySelector<HTMLInputElement>('[aria-label="数量"]')!.value).toBe('')
      expect(h.host.querySelectorAll('.iw-selected-anchor')).toHaveLength(0)
      expect([...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '执行行动')!.disabled).toBe(true)
      await h.d.input('数量', '1'); await h.d.anchor(5, 3)
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.view()).toBe(before)
      await h.d.button('取消'); expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.view()).toBe(before)
    } finally { await h.unmount() }
  })
  it('split and explicit partial merge preserve weight and produce one checkpoint each', async () => {
    const h = await foodStack()
    try {
      const weight = h.view().backpack.weight, writes = h.setItem.mock.calls.length
      await h.d.menu('压缩口粮', '拆分', { quantity: 1, placement: [1, 0] })
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
      expect(h.view().carried.filter(i => i.name === '压缩口粮').map(i => i.quantity)).toEqual([1, 1])
      expect(h.view().backpack.weight).toBe(weight)
      await h.flush(() => menuItem(h.host, '压缩口粮')); await h.d.button('合并')
      const select = h.host.querySelector<HTMLSelectElement>('[aria-label="目标堆叠"]')!
      await h.flush(() => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, '1'); select.dispatchEvent(new Event('change', { bubbles: true })) })
      await h.d.input('数量', '1'); await h.d.button('执行行动')
      expect(h.setItem).toHaveBeenCalledTimes(writes + 2)
      expect(h.view().carried.filter(i => i.name === '压缩口粮').map(i => i.quantity)).toEqual([2])
      expect(h.view().backpack.weight).toBe(weight)
    } finally { await h.unmount() }
  })
  it('a legal edge placement is judged by formal preview while editing writes nothing', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.task('大厅搜索', 'dark'); await h.d.button('拾取 金属零件')
      const writes = h.setItem.mock.calls.length
      await h.flush(() => menuItem(h.host, '金属零件')); await h.d.button('移动物品')
      // The 1x1 material is legal at the edge; the UI has no local geometry legality formula.
      await h.d.anchor(5, 3)
      expect(h.host.textContent).toContain('正式资格：可执行')
      expect(h.setItem).toHaveBeenCalledTimes(writes)
      await h.d.button('取消')
    } finally { await h.unmount() }
  })
})
