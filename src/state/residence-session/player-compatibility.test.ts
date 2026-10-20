import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixture, bodyBoundary } from './combat-test-fixtures'
import { drawIntInclusive } from '../../core/random'
import { fromValue, ready, choose, playerItem, send, normalize, counts, begin, playerHarness } from './player-test-fixtures'
import * as qualification from '../../core/residence-task/qualification'
import * as contexts from './player-context'
afterEach(() => vi.restoreAllMocks())

describe('Q04 Q06 Q11 qualification compatibility and error boundaries', () => {
  function h2(draw: typeof drawIntInclusive) {
    const f = fixture({ draw }); let v = f.move(f.value, 'H1').snapshot
    v = f.move(v, 'H2').snapshot; v = f.source(v, 'H2-search', { method: 'dark' }).snapshot
    for (const [n, item] of v.site!.ground.find(g => g.nodeId === 'H2')!.items.entries())
      v = f.inventory(v, 'pickup', { instanceId: item.instanceId, placement: { x: n, y: 0, rotated: false } }).snapshot
    return { f, v }
  }
  it('hidden suppressant targets never leak through preview/action eligibility, yet formal execution still rejects no target', () => {
    const { f, v } = h2((c, min, max) => ({ ...drawIntInclusive(c, min, max), value: max }))
    const pair = [0, 40].map(infectionProgress => fromValue(bodyBoundary(v, f.deps, { infectionProgress }), f.deps))
    const requests = pair.map(h => ({ action: choose(h.player, 'medical', '使用药食'), item: playerItem(h.player, '感染抑制剂', 'backpack').selector }))
    expect(normalize(ready(pair[0].player))).toEqual(normalize(ready(pair[1].player)))
    requests.forEach((r, n) => expect(pair[n].player.preview(r)).toEqual({ kind: 'unknown', cost: 0 }))
    const c = counts(pair[0]); expect(pair[0].player.execute(requests[0]).kind).toBe('rejected'); expect(counts(pair[0])).toEqual(c)
    expect(pair[1].player.execute(requests[1]).kind).toBe('committed')
    expect(ready(pair[1].player).body.quotas.suppressant).toBe(0)
  })
  it('real hotel exchange can explicitly place output where its selected materials are consumed', () => {
    const { f, v: start } = h2((c, min, max) => ({ ...drawIntInclusive(c, min, max), value: min }))
    let v = start
    for (const node of ['H1', 'H0', 'T0', 'T1']) v = f.move(v, node).snapshot
    const h = fromValue(v, f.deps), p = h.player
    const r = { action: choose(p, 'source', '酒店交换'), materials: ['绷带', '消毒剂'].map(name => ({ item: playerItem(p, name, 'backpack').selector, quantity: 1 })),
      placements: [{ x: 0, y: 0, rotated: false }] }
    expect(p.preview(r).kind).toBe('available')
    expect(p.execute(r).kind).toBe('committed')
    expect(playerItem(p, '压缩口粮', 'backpack').quantity).toBe(2)
  })
  it('hidden pending exposure does not leak disinfectant qualification before execution', () => {
    const { f, v } = h2((c, min, max) => ({ ...drawIntInclusive(c, min, max), value: min }))
    const pair = [0, 1].map(pendingInfectionExposures => fromValue(bodyBoundary(v, f.deps, {
      condition: { ...v.character.body.condition, pendingInfectionExposures } }), f.deps))
    expect(normalize(ready(pair[0].player))).toEqual(normalize(ready(pair[1].player)))
    const requests = pair.map(h => ({ action: choose(h.player, 'medical', '使用药食'), item: playerItem(h.player, '消毒剂', 'backpack').selector }))
    requests.forEach((r, n) => expect(pair[n].player.preview(r)).toEqual({ kind: 'unknown', cost: 0 }))
    const before = counts(pair[0]), calls = pair[0].dispatch.mock.calls.length
    expect(pair[0].player.execute(requests[0]).kind).toBe('rejected')
    expect(counts(pair[0])).toEqual(before); expect(pair[0].dispatch).toHaveBeenCalledTimes(calls + 1)
    expect(pair[1].player.execute(requests[1]).kind).toBe('committed')
    expect(ready(pair[1].player).body.quotas.disinfectant).toBe(0)
  })
  it('arbitrary program Error with a code is not swallowed as a business rejection', () => {
    const h = playerHarness(); begin(h); send(h.player, 'move', '大厅')
    const action = choose(h.player, 'task', '隔离防火门', 'crow'), item = ready(h.player).carried.find(i => i.container === 'utility')!.selector
    const error = Object.assign(new Error('TEST implementation defect'), { code: 'NOT_AVAILABLE' })
    vi.spyOn(qualification, 'taskMethodCost').mockImplementation(() => { throw error })
    const n = counts(h)
    expect(() => h.player.preview({ action, item })).toThrow(error)
    expect(() => h.player.execute({ action, item })).toThrow(error)
    expect(counts(h)).toEqual(n)
  })
  it('projection creation failure after commit never rolls back or saves twice, and cannot expose the previous executable view', () => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'move', '大厅'), before = h.owner.getState().current, n = counts(h)
    const error = new Error('TEST projection creation failure')
    vi.spyOn(contexts, 'createPlayerContext').mockImplementationOnce(() => { throw error })
    expect(() => h.player.execute({ action })).toThrow(error)
    expect(h.owner.getState().current).not.toBe(before)
    expect(h.player.query()).toMatchObject({ status: 'blocked', reason: 'projection-unavailable' })
    expect(counts(h)).toMatchObject({ writes: n.writes + 1, notices: n.notices + 1, reads: n.reads })
    h.synchronize(); expect(ready(h.player).location!.name).toBe('大厅')
    expect(h.player.execute({ action }).kind).toBe('rejected')
  })
})
