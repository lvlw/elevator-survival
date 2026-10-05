import { afterEach, describe, expect, it, vi } from 'vitest'
import * as ordinary from './supply-index'
import * as controlled from './supply-controlled'
import { harness, start, current, request, reject, observe } from './supply-test-fixtures'
afterEach(() => vi.restoreAllMocks())
describe('S12 explicit safe read and diagnostic contracts', () => {
  it('exact entry exports expose no replace, factory, policy or authority', () => {
    expect(Object.keys(ordinary).sort()).toEqual(['ResidenceSessionError'])
    expect(Object.keys(controlled).sort()).toEqual(['createResidenceSessionDomain', 'createSupplySession'])
    const h = harness(); start(h); const e = observe(h), before = current(h)
    expect(Object.keys(h.owner).sort()).toEqual(['bootstrap', 'createFirst', 'dispatch', 'getState', 'queryKnowledge', 'retryRead', 'retrySave', 'subscribe'])
    const read = h.owner.queryKnowledge()
    expect(read?.position).toBeTruthy(); expect(Object.isFrozen(read)).toBe(true)
    expect(h.owner.queryKnowledge()).toEqual(read); expect(current(h)).toBe(before)
    expect(e.counts()).toMatchObject({ initial: 0, task: 0, action: 0, cycle: 0, origin: 0, plan: 0, current: 0, batches: 0 })
    expect(JSON.stringify(read)).not.toMatch(/seed|infectionProgress|drawIndex|allocations/)
  })
  it.each([null, [], {}, { kind: 'unknown', command: {} }, { kind: 'move', command: {}, nextState: {} },
    { kind: 'move', command: { kind: 'move', expectedRevision: true, edgeId: 'H0-H1:forward' } },
    { kind: 'move', command: { kind: 'move', expectedRevision: 1.5, edgeId: 'H0-H1:forward' } },
    { kind: 'move', command: { kind: 'move', expectedRevision: 1, edgeId: 'H0-H1:forward', authority: {} } }])
  ('strict malformed request %# has no effects', input => {
    const h = harness(); start(h); const e = observe(h)
    reject(h, input, 'INVALID_INPUT'); expect(e.spies.move).not.toHaveBeenCalled()
  })
  it('rejects stale revision before producer and preserves input object', () => {
    const h = harness(); start(h); const e = observe(h)
    const c = request(h, 'move', { edgeId: 'H0-H1:forward' }), original = structuredClone(c)
    h.owner.dispatch(c); expect(c).toEqual(original); expect(Object.isFrozen(c)).toBe(false)
    reject(h, c, 'STALE_COMMAND'); expect(e.spies.move).toHaveBeenCalledTimes(1)
  })
})
