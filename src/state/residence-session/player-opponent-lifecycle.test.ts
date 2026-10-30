import { describe, expect, it } from 'vitest'
import { entered, fixture, coldSaved } from './combat-test-fixtures'
import { fromValue, playerHarness, ready, send, choose, counts } from './player-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'

describe('A current-only lifecycle and v4 persistence', () => {
  it.each(['orderly', 'porter', 'technician'] as const)('%s escape clears presentation and reentry binds a new actual battle', enemy => {
    const f = entered(enemy), h = fromValue(f.value, f.deps), old = choose(h.player, 'combat', '退却'), before = h.owner.getState().current!
    send(h.player, 'combat', '退却')
    expect(ready(h.player).combat).toBeNull()
    const n = counts(h)
    expect(h.player.execute({ action: old }).kind).toBe('rejected'); expect(counts(h)).toEqual(n)
    const destination = h.deps.supply.catalog.data.nodes.find(n => n.id === before.battle!.entry.to)!.name
    send(h.player, 'move', destination)
    expect(h.owner.getState().current!.battle!.entry.id).not.toBe(before.battle!.entry.id)
    expect(ready(h.player).combat!.opponent.visualKey).toBe('infected-' + enemy)
    const cold = coldSaved(h), p = wrapPlayerSession(cold.owner, cold.policy, labels).player
    expect(ready(p).combat!.opponent).toEqual(ready(h.player).combat!.opponent)
    expect(cold.storage.write).not.toHaveBeenCalled(); expect(cold.listener).not.toHaveBeenCalled()
  })
  it('victory, actual death, first-hub, stable world and static living hub contain no opponent', () => {
    const f = entered(), h = fromValue(f.value, f.deps)
    for (const label of ['蓄力打击', '金属管攻击', '金属管攻击']) send(h.player, 'combat', label)
    expect(ready(h.player).combat).toBeNull(); expect(h.owner.getState().current!.battles.at(-1)!.outcome).toBe('victory')
    const d = entered('orderly', { hp: 1 }), dead = fromValue(d.value, d.deps)
    send(dead.player, 'combat', '防御'); expect(ready(dead.player).point).toBe('dead'); expect(ready(dead.player).combat).toBeNull()
    const start = playerHarness(); start.bootstrap(); start.createFirst(); expect(ready(start.player).combat).toBeNull()
    send(start.player, 'depart', '进入封锁区'); expect(ready(start.player).combat).toBeNull()
    send(start.player, 'terminal', '失败止损返回'); expect(ready(start.player).point).toBe('living-hub'); expect(ready(start.player).combat).toBeNull()
    const blocked = playerHarness({ text: '{}' }); expect(blocked.bootstrap().status).toBe('blocked'); expect(blocked.player.query()).not.toHaveProperty('combat')
  })
  it('failed save then continue and retry retains latest memory, preserves handles and never persists presentation', () => {
    const f = entered(), h = fromValue(f.value, f.deps), originalText = h.disk()
    h.faults.write = true; send(h.player, 'combat', '金属管攻击'); send(h.player, 'combat', '防御')
    expect(ready(h.player).persistence.feedback).toBe('save-failed'); expect(h.disk()).toBe(originalText)
    const value = h.owner.getState().current!, action = choose(h.player, 'combat', '退却'), n = counts(h)
    h.faults.write = false; h.player.retrySave()
    expect(h.owner.getState().current).toBe(value); expect(choose(h.player, 'combat', '退却')).toBe(action)
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1 })
    expect(JSON.parse(h.disk()!).formatVersion).toBe(4)
    expect(h.disk()).not.toMatch(/opponent|visualKey|当前对手|感染护工/)
    const cold = coldSaved(h), p = wrapPlayerSession(cold.owner, cold.policy, labels).player
    expect(ready(p).combat!.opponent).toEqual(ready(h.player).combat!.opponent)
    expect(p.execute({ action }).kind).toBe('rejected')
    expect(cold.storage.write).not.toHaveBeenCalled(); expect(cold.draw).not.toHaveBeenCalled()
  })
  it('first-hub cold restoration does not call mapping or write', () => {
    const f = fixture(), h = fromValue(f.initial, f.deps)
    expect(ready(h.player).point).toBe('first-hub'); expect(ready(h.player).combat).toBeNull()
    expect(h.storage.write).not.toHaveBeenCalled()
  })
})
