import { describe, expect, it } from 'vitest'
import { nativePlayer, publicRoute } from './player-test-routes'
import { begin, ready, playerItem, send } from './player-test-fixtures'

describe('Q09 Q12 native public-view / opaque-selection routes', () => {
  it('real read-null -> initial -> departure -> tasks/combat/sample/install -> success through player selections', () => {
    const h = nativePlayer(), route = publicRoute(h), ledger = route.success(), v = h.owner.getState().current!
    expect(h.storage.read).toHaveBeenCalledTimes(1)
    expect(v.phase).toBe('living-hub'); expect(v.balance).toBe(120)
    expect(v.receipts.at(-1)!.steps).toEqual([])
    expect(v.battles).toHaveLength(2)
    expect(h.dispatch).toHaveBeenCalledTimes(75)
    expect(h.storage.write).toHaveBeenCalledTimes(76)
    expect(h.listener).toHaveBeenCalledTimes(76)
    expect(ready(h.player).tasks.publicObjectives.every(o => o.state === 'completed')).toBe(true)
    expect(ledger.some(l => l.label === '使用药食')).toBe(true)
    expect(h.storage.write.mock.calls.length).toBe(h.dispatch.mock.calls.length + 1)
    expect(h.listener.mock.calls.length).toBe(h.storage.write.mock.calls.length)
    console.log('PLAYER-ROUTE-COUNTS ' + JSON.stringify({ dispatch: h.dispatch.mock.calls.length,
      write: h.storage.write.mock.calls.length, notification: h.listener.mock.calls.length, draws: h.draw.mock.calls.length,
      final: ready(h.player).terminal.result }))
  }, 30_000)
  it('real materials before entry -> retreat -> immediate repair -> rest -> reentry -> explicit failure stop', () => {
    const h = nativePlayer(), r = publicRoute(h), p = h.player
    begin(h); r.move('大厅'); r.source('大厅搜索', 'dark'); r.pick('金属零件', 4)
    r.task('隔离防火门', 'crow', r.crow); r.move('隔离走廊')
    send(p, 'combat', '金属管攻击'); send(p, 'combat', '退却')
    expect(ready(p).location!.name).toBe('大厅')
    const before = h.owner.getState().current!, weapon = ready(p).carried.find(i => i.container === 'weapon')!, metal = playerItem(p, '金属零件', 'backpack')
    r.sendOne('maintenance', '机械维护', { materials: [{ item: metal.selector, quantity: 1 }], allocations: [{ item: weapon.selector, amount: 15 }] })
    expect(h.owner.getState().current!.character.revision).toBe(before.character.revision + 1)
    expect(ready(p).carried.some(i => i.name === '金属零件')).toBe(false)
    r.med('绷带'); r.rest(); r.move('隔离走廊'); expect(ready(p).point).toBe('battle-decision')
    send(p, 'combat', '退却'); r.move('电梯前室'); r.sendOne('terminal', '失败止损返回')
    expect(ready(p).phase).toBe('living-hub'); expect(ready(p).terminal.result!.outcome).toBe('voluntary-failure')
  }, 30_000)
})
