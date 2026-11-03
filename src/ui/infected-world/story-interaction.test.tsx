import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import { RESERVATION_KEY } from '../../app/infected-browser/schema'
import { fixture, bodyBoundary } from '../../state/residence-save/combat-test-fixtures'
import { strictRecords } from './committed-presentation-test-fixtures'
afterEach(() => vi.restoreAllMocks())

it('a unique crowbar method retains original L3, cancel is zero effect, and confirmed death cannot show door success', async () => {
  const f = fixture(), hall = f.move(f.value, 'H1').snapshot
  const value = bodyBoundary(hall, f.deps, { condition: { ...hall.character.body.condition, currentHealth: 1, bleeding: true } })
  const records = strictRecords(value, f.deps), o = observeBrowser()
  const h = await mountUi('E03-A-seed-01', false, ports => { ports.disk.set(RESERVATION_KEY, records.reservation); ports.disk.set(CHECKPOINT_KEY, records.checkpoint) })
  try {
    const before = h.view(), checkpoint = h.disk.get(CHECKPOINT_KEY)
    o.clear(); h.setItem.mockClear()
    await h.d.button('隔离防火门 · 使用撬棍')
    expect(h.host.querySelector('[aria-label="行动参数"]')).toBeNull()
    expect(h.host.querySelector('[aria-label="保护确认"]')?.textContent).toContain('本命令将导致死亡')
    expect(h.view()).toBe(before); expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
    expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0 })
    await h.d.button('取消'); expect(h.setItem).not.toHaveBeenCalled()
    await h.d.button('隔离防火门 · 使用撬棍'); await h.d.button('确认执行')
    expect(h.view().phase).toBe('dead')
    expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 })
    expect(h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY)).toHaveLength(1)
    expect(h.host.querySelector('[aria-label="当前叙事"]')).toBeNull()
    expect(h.host.textContent).not.toContain('门沿轨道退开')
  } finally { await h.unmount() }
})

it('real first combat has one short introduction and a stationary victory line without gating actions', async () => {
  const h = await mountUi()
  try {
    await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅')
    await h.d.task('隔离防火门', 'crow'); await h.d.move('隔离走廊')
    expect(h.view().combat?.opponent.visualKey).toBe('infected-orderly')
    expect(h.host.querySelector('[aria-label="当前叙事"]')?.textContent).toContain('没有回答')
    await h.d.fight()
    expect(h.view().point).toBe('stable-active')
    expect(h.host.querySelector('[aria-label="当前叙事"]')?.textContent).toContain('你握着武器又等了片刻，才稍稍松开手')
    expect(h.view().location?.name).toBe('隔离走廊')
  } finally { await h.unmount() }
})

it('one real lit-search click uses one dispatch/current/notice/checkpoint, without a single-option form', async () => {
  const o = observeBrowser(), h = await mountUi()
  try {
    await h.d.setup('lamp', 'scout'); await h.d.send('进入封锁区'); await h.d.move('大厅')
    const before = h.view().carried.find(i => i.container === 'utility')!.resource
    const button = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '大厅搜索 · 照明搜索')!
    o.clear(); h.setItem.mockClear()
    await h.flush(() => { button.click(); button.click() })
    expect(h.host.querySelector('[aria-label="行动参数"],[aria-label="保护确认"]')).toBeNull()
    expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1, source: 1 })
    expect(h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY)).toHaveLength(1)
    const after = h.view().carried.find(i => i.container === 'utility')!.resource
    if (before.kind !== 'none' && after.kind !== 'none') expect(h.host.querySelector('.iw-recent-feedback')?.textContent).toContain(`实际电量消耗 ${before.current - after.current}`)
    for (const item of [...h.view().ground]) await h.d.button(`拾取 ${item.name}`)
    expect(h.view().ground).toEqual([])
    expect(h.host.querySelector('.iw-ground')?.getAttribute('data-empty')).toBe('true')
    const current = h.view(), writes = h.setItem.mock.calls.length
    o.clear(); await h.d.button('收起结果'); await h.d.button('查看结果')
    expect(h.view()).toBe(current); expect(h.setItem).toHaveBeenCalledTimes(writes)
    expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
  } finally { await h.unmount() }
})

it('hover/focus has short public purpose, leaves F1 details available and does no gameplay, entropy or storage', async () => {
  const o = observeBrowser(), h = await mountUi()
  try {
    await h.d.setup('lamp', 'survival'); await h.d.send('进入封锁区'); await h.d.move('大厅')
    const current = h.view(), disk = new Map(h.disk), writes = h.setItem.mock.calls.length, entropy = h.entropy.mock.calls.length
    const action = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '大厅搜索 · 照明搜索')!
    o.clear(); await h.flush(() => action.focus())
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('精力消耗：8')
    expect(h.host.querySelector('.iw-information-trigger')).toBeNull()
    await h.d.information('大厅搜索 · 照明搜索')
    expect(document.querySelector('[aria-label="行动说明"]')?.textContent).toContain('精力消耗：8')
    await h.d.button('关闭说明')
    const bandage = h.host.querySelector<HTMLButtonElement>('.iw-quick .iw-item')!
    await h.flush(() => bandage.focus())
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('基础恢复1点生命并止血')
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('第一次合格使用时总共恢复2点')
    await h.flush(() => bandage.blur())
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    expect(h.view()).toBe(current); expect(h.disk).toEqual(disk); expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.entropy).toHaveBeenCalledTimes(entropy)
    expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0, source: 0, medical: 0 })
  } finally { await h.unmount() }
})
