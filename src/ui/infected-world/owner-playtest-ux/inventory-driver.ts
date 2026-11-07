// TEST ONLY. The real route driver is reused except for the removed backpack tab.
import { mountUi as mount } from '../test-fixtures'
import type { UiDriver } from '../route-test-fixtures'
import { publicItemName } from '../labels'

type InventoryHarness = Pick<Awaited<ReturnType<typeof mount>>, 'host' | 'flush' | 'd'>
export function withInventoryDriver<T extends InventoryHarness>(harness: T) {
  const base = harness.d
  const menu: UiDriver['menu'] = async (name, label, fields = {}, ordinal = 0) => {
    const display = publicItemName(name)
    const tiles = [...harness.host.querySelectorAll<HTMLButtonElement>('[aria-label="背包格位"] .iw-item')]
      .filter(tile => tile.getAttribute('aria-label')?.startsWith(display + ' '))
    const tile = tiles[ordinal]
    if (!tile) throw new Error('DOM_TEST_ASSERTION: backpack menu ' + name + '/' + ordinal)
    await harness.flush(() => tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 })))
    await base.button(label)
    await base.fields(fields)
    await base.button('执行行动')
    await base.confirm()
  }
  const pick: UiDriver['pick'] = async (name, x, y = 0) => {
    const priorQuantity = base.view().carried.filter(item => item.container === 'backpack' && item.name === name).reduce((sum,item)=>sum+item.quantity,0)
    const prior = base.view().carried.filter(item => item.container === 'backpack').map(item => `${item.placement!.x},${item.placement!.y}`)
    const item = base.view().ground.find(candidate => candidate.name === name)
    if (!item) throw new Error('DOM_TEST_ASSERTION: ground ' + name)
    await base.button((item.ordinary ? '拾取 ' : '拾取任务物 ') + publicItemName(name))
    if (document.querySelector('[aria-label="行动参数"]')) {
      if (document.querySelector('[aria-label="数量"]')) await base.input('数量', String(item.quantity))
      await base.anchor(x, y)
      await base.button('执行行动')
      await base.confirm()
    }
    if (item.ordinary) {
      const carried = base.view().carried.filter(candidate => candidate.container === 'backpack' && candidate.name === name)
      const ordinal = carried.findIndex(candidate => !prior.includes(`${candidate.placement!.x},${candidate.placement!.y}`))
      if (ordinal < 0) { if (carried.reduce((sum,candidate)=>sum+candidate.quantity,0) !== priorQuantity+item.quantity) throw new Error('DOM_TEST_ASSERTION: real acquired quantity merged'); return }
      await menu(name, '移动物品', { placement: [x, y] }, ordinal)
    }
  }
  return { ...harness, d: { ...base, menu, pick } }
}

export async function mountUi(...args: Parameters<typeof mount>) {
  return withInventoryDriver(await mount(...args))
}
