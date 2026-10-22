import { describe, expect, it } from 'vitest'
import { publicRoute } from '../../state/residence-session/player-test-routes'
import { begin, ready, playerItem, send } from '../../state/residence-session/player-test-fixtures'
import { applicationRouteHarness } from './test-fixtures'

describe('F09 real read-null -> application controller -> sole S routes', () => {
  it('real tasks/CTB/sample/install and explicit success, no cleared-enemy or completion fixture', () => {
    const h = applicationRouteHarness(), notifications: string[] = []
    h.app.subscribe(() => { notifications.push(h.app.getSnapshot().status) })
    const ledger = publicRoute(h).success(), v = h.owner.getState().current!
    expect(h.storage.read).toHaveBeenCalledTimes(1); expect(h.factory).toHaveBeenCalledTimes(1)
    expect(v.phase).toBe('living-hub'); expect(v.balance).toBe(120); expect(v.receipts.at(-1)!.steps).toEqual([])
    expect(h.dispatch).toHaveBeenCalledTimes(75); expect(h.storage.write).toHaveBeenCalledTimes(76); expect(h.listener).toHaveBeenCalledTimes(76)
    expect(notifications).toHaveLength(155) // 77 busy/ready pairs plus one deliberately invalid recipe feedback
    expect(notifications.filter(s => s === 'busy')).toHaveLength(77)
    expect(notifications.filter(s => s === 'stable')).toHaveLength(78)
    expect(ready(h.player).point).toBe('living-hub'); expect(ledger.length).toBeGreaterThan(50)
    expect(JSON.stringify(h.app.getSnapshot().feed)).not.toMatch(/infectionProgress|pendingInfection|seed|runId|instanceId|roll|ctb/)
    console.log('FOUNDATION-SUCCESS ' + JSON.stringify({ dispatch: h.dispatch.mock.calls.length, write: h.storage.write.mock.calls.length,
      nativeNotice: h.listener.mock.calls.length, presentation: notifications.length, draw: h.draw.mock.calls.length }))
  }, 30_000)
  it('real pre-entry material -> retreat -> immediate repair -> treatment -> rest -> reentry -> explicit failure', () => {
    const h = applicationRouteHarness(), r = publicRoute(h), p = h.player
    begin(h); r.move('大厅'); r.source('大厅搜索', 'dark'); r.pick('金属零件', 4)
    r.task('隔离防火门', 'crow', r.crow); r.move('隔离走廊')
    send(p, 'combat', '金属管攻击'); send(p, 'combat', '退却')
    expect(ready(p).location!.name).toBe('大厅')
    const before = h.owner.getState().current!, weapon = ready(p).carried.find(i => i.container === 'weapon')!, metal = playerItem(p, '金属零件', 'backpack')
    r.sendOne('maintenance', '机械维护', { materials: [{ item: metal.selector, quantity: 1 }], allocations: [{ item: weapon.selector, amount: 15 }] })
    expect(h.owner.getState().current!.character.revision).toBe(before.character.revision + 1)
    r.med('绷带'); r.rest(); r.move('隔离走廊'); expect(ready(p).point).toBe('battle-decision')
    send(p, 'combat', '退却'); r.move('电梯前室'); r.sendOne('terminal', '失败止损返回')
    expect(ready(p).phase).toBe('living-hub'); expect(ready(p).terminal.result!.outcome).toBe('voluntary-failure')
    expect(h.storage.read).toHaveBeenCalledTimes(1); expect(h.factory).toHaveBeenCalledTimes(1)
    expect(h.storage.write.mock.calls.length).toBe(h.dispatch.mock.calls.length + 1)
    expect(h.listener.mock.calls.length).toBe(h.storage.write.mock.calls.length)
    console.log('FOUNDATION-RETREAT ' + JSON.stringify({ dispatch: h.dispatch.mock.calls.length, write: h.storage.write.mock.calls.length,
      nativeNotice: h.listener.mock.calls.length, draw: h.draw.mock.calls.length }))
  }, 30_000)
})
