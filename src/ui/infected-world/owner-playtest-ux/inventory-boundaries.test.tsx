import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { createReservation } from '../../../app/infected-browser/reservation'
import { checkpointFor } from '../../../app/infected-browser/checkpoint'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../../app/infected-browser/schema'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { createCombatTestFactory } from '../../../core/residence-combat/test-fixtures'
import { readCombatValue } from '../../../core/residence-combat/validation'
import { expectation } from '../../../state/residence-save/combat-test-fixtures'
import { serializeCombatResidenceSave } from '../../../state/residence-save/combat-codec'
import { domRouteA } from '../route-test-fixtures'
import { InventoryPanel } from '../components/inventory-panel'
import { WorldStage } from '../components/world-stage'
import { StatusHud } from '../components/status-hud'
import { publicItemName } from '../labels'
import { mountUi } from './inventory-driver'
import { physicalMethodLimitation } from './physical-methods'

afterEach(() => vi.restoreAllMocks())

it('a real light search expends the last public charge and the next room no longer offers it as a main action', async () => {
  const { reservation, composition } = createReservation({
    characterId: 'owner-ux-tool-test', runId: 'combat-test-execution', seed: 'combat-seed', generation: 'owner-ux-tool-test',
  }, { tool: 'lamp', specialty: 'engineer' })
  const factory = createCombatTestFactory(() => composition.dependencies)
  const f = factory.fixture({ tool: 'lamp' })
  const hall = f.move(f.value, 'H1').snapshot
  const lampId = hall.carried.equipment.utility!.instanceId
  // Explicit TEST-only charge boundary, read and serialized by the unchanged strict codec.
  const value = readCombatValue({ ...hall, itemStates: { states: hall.itemStates.states.map(item =>
    item.instanceId === lampId ? { ...item, resource: { kind: 'charge', current: 1 } } : item) } }, f.deps)
  const expected = expectation(value, f.deps, { ...reservation.execution, ...reservation.choices })
  const checkpoint = checkpointFor(reservation, { expected, text: serializeCombatResidenceSave(value, expected, composition.policy) }, composition)
  const observed = observeBrowser()
  const h = await mountUi('unused', false, ports => {
    ports.disk.set(RESERVATION_KEY, JSON.stringify(reservation))
    ports.disk.set(CHECKPOINT_KEY, JSON.stringify(checkpoint))
  })
  try {
    expect(h.host.querySelector('.iw-equipped-resource:last-child')?.textContent).toBeTruthy()
    observed.clear()
    h.setItem.mockClear()
    await h.d.task('大厅搜索', 'lit')
    expect(h.view().carried.find(item => item.container === 'utility')?.resource).toMatchObject({ kind: 'charge', current: 0 })
    expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, source: 1 })
    expect(h.setItem.mock.calls.filter(([key]) => key === CHECKPOINT_KEY)).toHaveLength(1)
    await h.d.move('药房')
    expect(h.host.querySelector('.iw-room-interactions')?.textContent).toContain('无照明搜索')
    expect(h.host.querySelector('.iw-room-interactions')?.textContent).not.toContain(' · 照明搜索')
    expect(h.host.querySelector('.iw-other-methods')?.textContent).toContain('手电筒电量已耗尽')
    expect(h.host.querySelector('[aria-label="装备"]')?.textContent).toContain('电量 0 / 8')
  } finally {
    await h.unmount()
  }
})

it('preserves unknown clinical and incomplete inputs instead of deriving a refusal from them', async () => {
  const h = await mountUi()
  try {
    await h.d.setup('lamp', 'engineer')
    await h.d.send('进入封锁区')
    await h.d.move('大厅')
    const view = h.view()
    const controls = h.owner().controls()!
    const tool = view.sources.flatMap(source => source.choices).find(action => action.method === 'lit')!
    const medical = view.actions.find(action => action.family === 'medical')!
    const describeAction = vi.fn(controls.describeAction)
    const preview = vi.fn(controls.preview)
    expect(physicalMethodLimitation({ ...medical, method: 'crow', availability: 'unknown' }, view.carried, { describeAction, preview })).toBeNull()
    expect(describeAction).not.toHaveBeenCalled()
    const input = controls.describeAction(tool.selector)
    describeAction.mockReturnValue({ ...input, fields: ['item', 'materials'] })
    expect(physicalMethodLimitation(tool, view.carried, { describeAction, preview })).toBeNull()
    expect(preview).not.toHaveBeenCalled()
    describeAction.mockReturnValue({ ...input, items: [...input.items, { ...input.items[0], selector: { selection: 'opaque' } }] })
    preview.mockReturnValueOnce({ ...controls.preview({ action: tool.selector, item: input.items[0].selector }), qualification: { kind: 'unavailable', cost: null } })
    preview.mockReturnValueOnce({ ...controls.preview({ action: tool.selector, item: input.items[0].selector }), qualification: { kind: 'unknown', cost: null } })
    expect(physicalMethodLimitation(tool, view.carried, { describeAction, preview })).toBeNull()
  } finally {
    await h.unmount()
  }
})

it('real sample leave, failed placement, cancellation and pickup follow the original physical and protected route', async () => {
  const observed = observeBrowser()
  const h = await mountUi()
  try {
    await h.d.setup()
    for (let stage = 0; stage <= 4; stage++) await domRouteA(h.d, stage)
    const box = h.view().carried.find(item => item.name === '密封病原样本箱')!
    const sourcePlacement = box.placement!
    await h.d.menu(box.name, '留置任务物')
    expect(h.view().tasks.sample).toBe('left-in-world')
    expect(h.host.querySelector('[data-goal="sample"]')?.textContent).toContain('返程前取回留置的样本')
    expect(h.host.querySelector('.iw-ground-purpose')?.textContent).toContain('指定样本')
    const before = h.view()
    const occupied = before.carried.find(item => item.container === 'backpack' && item.placement)!.placement!
    observed.clear()
    h.setItem.mockClear()
    await h.d.button('拾取任务物 ' + publicItemName(box.name))
    await h.d.anchor(occupied.x, occupied.y)
    const form = document.querySelector('[aria-label="行动参数"]')!
    expect(form.querySelector('.iw-pickup-capacity-note')?.textContent).toMatch(/格位已有物品|超出背包边界/)
    expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    await h.d.button('取消')
    expect(h.view()).toBe(before)
    expect(h.setItem).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
    await h.d.button('拾取任务物 ' + publicItemName(box.name))
    await h.d.anchor(sourcePlacement.x, sourcePlacement.y)
    await h.d.button('执行行动')
    expect(h.view().tasks.sample).toBe('carried')
    expect(h.view().ground.some(item => item.name === box.name)).toBe(false)
    expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 })
    expect(h.setItem.mock.calls.filter(([key]) => key === CHECKPOINT_KEY)).toHaveLength(1)
  } finally {
    await h.unmount()
  }
}, 30000)

it('a full public footprint is informational, and a zero meter and low health remain explicit', async () => {
  const h = await mountUi()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await h.d.setup()
    await h.d.send('进入封锁区')
    await h.d.move('大厅')
    await h.d.task('大厅搜索', 'dark')
    const live = h.view()
    const metal = live.ground.find(item => item.name === '金属零件')!
    // TEST-only public DTO: a full footprint may still have room in a compatible stack.
    // The same formal pickup action and selected ground reference must reach the callback.
    const { width, height } = live.backpack
    const packed = Array.from({ length: width * height }, (_, index) => {
      const x = index % width, y = Math.floor(index / width)
      return { ...metal, selector: { selection: 'opaque' as const }, container: 'backpack' as const,
        placement: { x, y, rotated: false }, footprint: [{ x, y }] }
    })
    const view = { ...live, carried: packed, body: { ...live.body, bleeding: true,
      hp: { ...live.body.hp, current: 2 }, energy: { ...live.body.energy, current: 0 } } }
    const onAction = vi.fn()
    const controls = h.owner().controls()!
    await act(async () => root.render(<><StatusHud view={view} />
      <InventoryPanel view={view} onAction={onAction} describeAction={controls.describeAction} />
      <WorldStage view={view} onAction={onAction} readAction={controls} /></>))
    expect(host.querySelector('.iw-bag-capacity')?.textContent).toContain('24 / 24')
    const pickup = host.querySelector<HTMLButtonElement>('button[aria-label="拾取 金属零件"]')!
    expect(pickup.disabled).toBe(false)
    await act(async () => pickup.click())
    expect(onAction).toHaveBeenCalledWith(live.actions.find(action => action.label === '拾取'), metal)
    expect(host.querySelector<HTMLMeterElement>('meter[aria-label="精力"]')?.value).toBe(0)
    expect(host.querySelector<HTMLMeterElement>('meter[aria-label="生命"]')?.value).toBe(2)
    expect(host.querySelector('[aria-label="当前伤势"]')?.textContent).toMatch(/流血.*生命偏低/)
    expect(h.view()).toBe(live)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    await h.unmount()
  }
})
