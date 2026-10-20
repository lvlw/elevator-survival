import { describe, expect, it } from 'vitest'
import { begin, playerHarness, ready, send, choose, playerItem, counts, fromValue } from './player-test-fixtures'
import { fixture, bodyBoundary } from './combat-test-fixtures'
import { win } from '../residence-save/combat-test-fixtures'
import { request } from './combat-test-fixtures'
import { simultaneous, livingEnemyDeath } from '../residence-save/combat-review-simultaneous-fixtures'

describe('Q04 Q08 Q09 explicit real inventory selection', () => {
  it('pickup/move/split/merge/drop/pickup preserve real units, resource binding and weight; old handles expire', () => {
    const f = fixture(); let value = f.value
    for (const node of ['H1', 'H7', 'L0', 'L1']) value = f.move(value, node).snapshot
    value = f.task(value, 'l1-open', { method: 'crow', toolInstanceId: value.carried.equipment.utility!.instanceId }).snapshot
    value = f.source(value, 'L1-cabinet').snapshot
    value = bodyBoundary(value, f.deps, { condition: { ...value.character.body.condition, bleeding: true } })
    const h = fromValue(value, f.deps), p = h.player, item = playerItem(p, '压缩口粮', 'ground'), originalBody = value.character.body
    send(p, 'inventory', '拾取', { item: item.selector, placement: { x: 0, y: 0, rotated: false } })
    const original = h.owner.getState().current!.carried.backpack.items.find(i => i.quantity === item.quantity)!.instanceId
    const weight = ready(p).backpack.weight
    send(p, 'inventory', '移动物品', { item: playerItem(p, '压缩口粮', 'backpack').selector, placement: { x: 1, y: 0, rotated: false } })
    const stale = playerItem(p, '压缩口粮', 'backpack').selector
    send(p, 'inventory', '拆分', { item: stale, quantity: 1, placement: { x: 2, y: 0, rotated: false } })
    expect(ready(p).backpack.weight).toBe(weight)
    const split = ready(p).carried.filter(i => i.name === '压缩口粮' && i.container === 'backpack')
    expect(split).toHaveLength(2)
    const n = counts(h); expect(p.execute({ action: choose(p, 'inventory', '留置'), item: stale }).kind).toBe('rejected'); expect(counts(h)).toEqual(n)
    const target = split.find(i => i.placement!.x === 1)!, source = split.find(i => i.placement!.x === 2)!
    send(p, 'inventory', '合并', { item: source.selector, targetItem: target.selector, quantity: 1 })
    expect(ready(p).backpack.weight).toBe(weight)
    expect(h.owner.getState().current!.carried.backpack.items.some(i => i.instanceId === original && i.quantity === item.quantity)).toBe(true)
    send(p, 'inventory', '留置', { item: playerItem(p, '压缩口粮', 'backpack').selector })
    expect(ready(p).backpack.weight).toBe(0)
    send(p, 'inventory', '拾取', { item: playerItem(p, '压缩口粮', 'ground').selector, placement: { x: 0, y: 0, rotated: false } })
    const final = h.owner.getState().current!
    expect(final.carried.backpack.items.some(i => i.instanceId === original)).toBe(true)
    expect(final.itemStates.states.some(s => s.instanceId === original)).toBe(true)
    expect(final.character.body).toEqual(originalBody)
  })
  it('explicit to-quick and to-backpack move the same actual unit; no refill or selection default', () => {
    const h = playerHarness(); begin(h); send(h.player, 'move', '大厅'); send(h.player, 'move', '药房'); send(h.player, 'source', '药房搜索', {}, 'dark')
    send(h.player, 'inventory', '拾取', { item: playerItem(h.player, '绷带', 'ground').selector, placement: { x: 0, y: 0, rotated: false } })
    const before = h.owner.getState().current!, p = h.player
    send(p, 'inventory', '放入快捷栏', { item: playerItem(p, '绷带', 'backpack').selector, slot: 1 })
    const unit = h.owner.getState().current!.carried.quickSlots.slots[1]!, state = h.owner.getState().current!.itemStates.states.find(s => s.instanceId === unit.instanceId)!
    const selected = ready(p).carried.find(i => i.container === 'quick' && i.slot === 1)!
    send(p, 'inventory', '放入背包', { item: selected.selector, placement: { x: 2, y: 0, rotated: false } })
    const after = h.owner.getState().current!
    expect(after.carried.quickSlots.slots[1]).toBeNull()
    expect(after.carried.quickSlots.slots[0]).toEqual(before.carried.quickSlots.slots[0])
    expect(after.carried.backpack.items).toContainEqual(unit); expect(after.itemStates.states).toContainEqual(state)
    expect(after.character.body).toEqual(before.character.body)
  })
  it.each([{ x: 6, y: 0, rotated: false }, { x: 0, y: 4, rotated: false }])('illegal explicit placement %j is rejected before S', placement => {
    const h = playerHarness(); begin(h); send(h.player, 'move', '大厅'); send(h.player, 'source', '大厅搜索', {}, 'dark')
    const n = counts(h), d = h.dispatch.mock.calls.length, input = { action: choose(h.player, 'inventory', '拾取'), item: playerItem(h.player, '金属零件', 'ground').selector, placement }
    expect(h.player.preview(input).kind).toBe('unavailable'); expect(h.player.execute(input).kind).toBe('rejected')
    expect(h.dispatch).toHaveBeenCalledTimes(d); expect(counts(h)).toEqual(n)
  })
  it('still-legal sample selection does not survive an external decision/risk change', () => {
    const f = fixture(); let v = f.move(f.value, 'H1').snapshot
    v = f.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
    v = f.move(v, 'H4').snapshot; v = win(f, v); v = f.move(v, 'H5').snapshot
    const h = fromValue(v, f.deps), selected = { action: choose(h.player, 'task', '提取样本', 'direct'), placement: { x: 0, y: 0, rotated: false } }
    expect(h.player.preview(selected).kind).toBe('available')
    h.owner.dispatch(request(h, 'rest')); const n = counts(h), calls = h.dispatch.mock.calls.length
    expect(h.player.execute(selected).kind).toBe('rejected'); expect(counts(h)).toEqual(n); expect(h.dispatch).toHaveBeenCalledTimes(calls)
    h.synchronize()
    expect(h.player.preview({ ...selected, action: choose(h.player, 'task', '提取样本', 'direct') }).kind).toBe('available')
  })
  it.each(['killed', 'living'] as const)('real %s enemy death is final once, never win or auto-settle', kind => {
    const f = kind === 'killed' ? simultaneous() : livingEnemyDeath('heal'), h = fromValue(f.beforeLast!, f.h.deps)
    const n = counts(h), label = kind === 'killed' ? '金属管攻击' : ready(h.player).combat!.actions.find(a => a.label.startsWith('使用快捷物品'))!.label
    send(h.player, 'combat', label)
    const q = ready(h.player)
    expect(q.point).toBe('dead'); expect(q.terminal.result!.outcome).toBe('death'); expect(q.carried).toEqual([])
    expect(counts(h)).toMatchObject({ reads: n.reads, writes: n.writes + 1, notices: n.notices + 1 })
    const archived = h.owner.getState().current!.archives.at(-1)!.site
    expect(archived.pending.kind).toBe(kind === 'killed' ? 'none' : 'combat-required')
  })
})
