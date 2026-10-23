import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { domRouteA } from './route-test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { itemMenuActions } from './menu-options'
import { fixture, bodyBoundary, expectation } from '../../state/residence-save/combat-test-fixtures'
import { createReservation } from '../../app/infected-browser/reservation'
import { checkpointFor } from '../../app/infected-browser/checkpoint'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../app/infected-browser/schema'
import { serializeCombatResidenceSave } from '../../state/residence-save/combat-codec'
import { drawIntInclusive } from '../../core/random'

afterEach(() => vi.restoreAllMocks())
describe('R03 object menu respects the exact safe input candidate', () => {
  it('hidden infection and exposure do not alter suppressant/disinfectant menus, candidates or unknown previews', async () => {
    for (const [definition, name, minimum] of [['consumable_infection_suppressant', '感染抑制剂', false], ['consumable_disinfectant', '消毒剂', true]] as const) {
    const f = fixture({ hp: 8, draw: (c, min, max) => ({ ...drawIntInclusive(c, min, max), value: minimum ? min : max }) }), outputs: string[][] = []
    let v = f.move(f.value, 'H1').snapshot; v = f.move(v, 'H2').snapshot
    v = f.source(v, 'H2-search', { method: 'dark' }).snapshot
      const item = v.site!.ground.find(g => g.nodeId === 'H2')!.items.find(i => i.definitionId === definition)!
      expect(item).toBeDefined(); v = f.inventory(v, 'pickup', { instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
    for (const [infectionProgress, pending] of [[61, 0], [89, 2]]) {
      const boundary = bodyBoundary(v, f.deps, { infectionProgress, condition: { ...v.character.body.condition, pendingInfectionExposures: pending } })
      const initial = { runId: 'combat-test-execution', seed: 'combat-seed', tool: 'crow', specialty: 'engineer' }
      const { reservation, composition } = createReservation({ characterId: f.deps.supply.residence.scope.characterId,
        runId: initial.runId, seed: initial.seed, generation: 'R03-privacy-TEST-generation' }, { tool: initial.tool, specialty: initial.specialty })
      const expected = expectation(boundary, f.deps, initial), text = serializeCombatResidenceSave(boundary, expected, composition.policy)
      const checkpoint = checkpointFor(reservation, { text, expected }, composition), h = await mountUi('unused', false, setup => {
        setup.disk.set(RESERVATION_KEY, JSON.stringify(reservation)); setup.disk.set(CHECKPOINT_KEY, JSON.stringify(checkpoint))
      }), rows: string[] = []
      try {
          const tile = h.host.querySelector<HTMLButtonElement>(`[aria-label="背包格位"] button[aria-label^="${name}"]`)!
          expect(tile).not.toBeNull(); await h.flush(() => tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
          rows.push(document.querySelector('[role="menu"]')!.outerHTML)
          await h.d.button('使用药食')
          expect(h.host.querySelector('[aria-label="行动参数"] h2')!.textContent).toContain(name)
          expect(h.host.querySelector('[aria-label="正式行动预览"]')!.textContent).toContain('目标资格未知')
          rows.push(h.host.querySelector('[aria-label="行动参数"]')!.outerHTML); await h.d.button('取消')
        expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled(); outputs.push(rows)
      } finally { await h.unmount() }
    }
    expect(outputs[0]).toEqual(outputs[1])
    }
  })
  it('eligible quick bandage retains its exact entity, consumes once and never refills automatically', async () => {
    const h = await mountUi(), o = observeBrowser()
    try {
      await h.d.setup(); await domRouteA(h.d, 0); await h.d.fight()
      const bandage = h.view().carried.find(i => i.container === 'quick' && i.name === '绷带')!, writes = h.setItem.mock.calls.length
      expect(bandage).toBeDefined(); const before = h.view()
      const tile = h.host.querySelector<HTMLButtonElement>('[aria-label="快捷栏"] button[aria-label^="绷带"]')!
      o.clear(); await h.flush(() => tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
      expect(document.querySelector('[role="menu"]')!.textContent).toContain('使用药食')
      await h.d.button('使用药食')
      const select = h.host.querySelector<HTMLSelectElement>('select[aria-label="物品"]')!
      const medical = before.actions.find(a => a.family === 'medical')!, inputs = h.owner().controls()!.describeAction(medical.selector)
      expect(inputs.items[Number(select.value)].selector).toBe(bandage.selector)
      const wound = before.body.wounds.find(w => w.treatment === 'untreated')
      if (wound) await h.d.select('伤口', '伤口' + wound.ordinal)
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(o.counts()).toMatchObject({ dispatch: 0, consume: 0, draw: 0 })
      await h.d.button('执行行动'); await h.d.confirm()
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
      expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1, medical: 1 })
      const next = h.view().carried.find(i => i.container === 'quick' && i.slot === bandage.slot)
      if (bandage.quantity === 1) expect(next).toBeUndefined()
      else expect(next?.quantity).toBe(bandage.quantity - 1)
    } finally { await h.unmount() }
  })

  it('a cloned or previous-current opaque item never acquires a menu by matching its name', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const before = h.view(), item = before.carried.find(i => i.container === 'quick')!, describe = h.owner().controls()!.describeAction
      expect(itemMenuActions(before, { ...item, selector: Object.freeze({ ...item.selector }) }, describe)).toEqual([])
      await h.d.move('大厅')
      expect(itemMenuActions(h.view(), item, h.owner().controls()!.describeAction)).toEqual([])
    } finally { await h.unmount() }
  })
  it('real ordinary metal is not offered as medical input', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.task('大厅搜索', 'dark'); await h.d.button('拾取 金属零件')
      const tile = h.host.querySelector<HTMLButtonElement>('[aria-label="背包格位"] button[aria-label^="金属零件"]')!, writes = h.setItem.mock.calls.length
      expect(tile).not.toBeNull(); await h.flush(() => tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
      const menu = document.querySelector('[role="menu"]')!
      expect(menu.textContent, 'R03 non-medical metal incorrectly inherits global medical action').not.toContain('使用药食')
      expect(menu.textContent).toContain('移动物品'); await h.d.button('关闭菜单'); expect(h.setItem).toHaveBeenCalledTimes(writes)
    } finally { await h.unmount() }
  })
  it('real task module keeps move and leave but not medical', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); for (let stage = 0; stage < 4; stage++) await domRouteA(h.d, stage)
      const item = h.view().carried.find(i => i.name === 'module')!, index = h.view().carried.filter(i => i.container === 'backpack').indexOf(item)
      expect(item).toBeDefined(); const tile = h.host.querySelectorAll<HTMLButtonElement>('[aria-label="背包格位"] .iw-item')[index]!
      await h.flush(() => tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
      const menu = document.querySelector('[role="menu"]')!
      expect(menu.textContent, 'R03 task module incorrectly inherits global medical action').not.toContain('使用药食')
      expect(menu.textContent).toContain('移动物品'); expect(menu.textContent).toContain('留置任务物')
    } finally { await h.unmount() }
  }, 30000)
})
