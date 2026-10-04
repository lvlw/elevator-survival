import { afterEach, describe, expect, it, vi } from 'vitest'
import { firstHarness, fixture, harness, cold, start, request, active, savedEqualsCurrent, observe, type Harness } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

function recover(h: Harness, e: ReturnType<typeof observe>) {
  const latest = h.owner.getState().current!
  const plans = e.plans(); const notices = h.listener.mock.calls.length
  h.storage.writeFailure(false)
  expect(h.owner.retrySave().persistence).toBe('saved')
  expect(h.owner.getState().current).toBe(latest); expect(h.listener).toHaveBeenCalledTimes(notices)
  expect(e.plans()).toEqual(plans); savedEqualsCurrent(h)
  const reload = harness(h.policy, h.storage.value())
  expect(reload.owner.bootstrap().current).toEqual(latest)
  expect(reload.storage.port.read).toHaveBeenCalledTimes(1)
  for (const spy of [reload.factory, reload.provider, reload.storage.port.write, reload.listener]) expect(spy).not.toHaveBeenCalled()
  expect(e.plans()).toEqual(plans)
}

describe('C08 independent fault chain counters (fixture calls excluded)', () => {
  it.each([false, true])('chain 1 complete=%s: normal terminal write failure -> repeat reject -> retry -> cold', (complete) => {
    const f = fixture({ complete, balance: 47 }); const h = cold(f.value, f.policy); const e = observe(h)
    const c = request(h, complete ? 'deliver' : 'withdraw'); const oldBytes = h.storage.value()
    const oldCurrent = h.owner.getState().current
    h.storage.writeFailure(true)
    const r = h.owner.dispatch(c)
    expect(r.persistence).toBe('save-failed'); expect(r.current.phase).toBe('living-hub')
    expect(h.owner.getState().current).not.toBe(oldCurrent)
    expect(h.storage.value()).toBe(oldBytes)
    expect(() => h.owner.dispatch(c)).toThrowError(expect.objectContaining({ code: 'STALE_COMMAND' }))
    expect(() => h.owner.dispatch({ ...c, expectedRevision: r.current.character.revision })).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    for (const op of [h.owner.bootstrap, h.owner.retryRead, h.owner.createFirst]) expect(op).toThrow()
    recover(h, e)
    expect(e.counts()).toEqual({ activate: 0, terminate: 1, cycle: 1, action: 0, establish: 0, move: 0, reveal: 0,
      transfer: 0, rest: 0, terminal: 1, consume: 0, draw: 0, factory: 0, provider: 0, read: 1, write: 2,
      currentReplacements: 1, notificationBatches: 1, listener1: 1, listener2: 1 })
  })
  it.each([false, true])('chain 2 complete=%s: reveal failure -> pickup -> rest failure -> terminal -> retry newest -> cold', (complete) => {
    // Success qualification is from the existing A/B controlled test content, not an owner grant API.
    const f = fixture({ complete })
    const h = complete ? cold(f.value, f.policy) : firstHarness()
    const e = observe(h)
    if (!complete) start(h)
    const oldBytes = h.storage.value(); h.storage.writeFailure(true)
    expect(h.owner.dispatch(request(h, 'reveal', { sourceId: 'lottery-a' })).persistence).toBe('save-failed')
    expect(h.storage.value()).toBe(oldBytes)
    const item = active(h).site.ground[0].items[0]
    const resource = active(h).itemStates.states.find((s) => s.instanceId === item.instanceId)
    h.storage.writeFailure(false)
    h.owner.dispatch(request(h, 'pickup', { instanceId: item.instanceId, placement: { x: 3, y: 2, rotated: false } }))
    const pickupBytes = h.storage.value()
    h.storage.writeFailure(true); const rest = request(h, 'rest')
    expect(h.owner.dispatch(rest).persistence).toBe('save-failed')
    expect(h.storage.value()).toBe(pickupBytes)
    expect(() => h.owner.dispatch(rest)).toThrowError(expect.objectContaining({ code: 'STALE_COMMAND' }))
    const atRest = active(h)
    expect(atRest.carried.backpack.items).toContainEqual(item)
    expect(atRest.itemStates.states).toContainEqual(resource)
    const terminal = h.owner.dispatch(request(h, complete ? 'deliver' : 'withdraw'))
    expect(terminal.persistence).toBe('save-failed')
    expect(terminal.current.receipts.at(-1)!.outcome).toBe(complete ? 'success' : 'voluntary-failure')
    expect(terminal.current.carried.backpack.items).toContainEqual(item)
    expect(terminal.current.itemStates.states).toContainEqual(resource)
    expect(h.storage.value()).toBe(pickupBytes)
    recover(h, e)
    expect(e.counts()).toEqual({ activate: complete ? 0 : 1, terminate: 1, cycle: complete ? 2 : 3, action: 2,
      establish: complete ? 0 : 1, move: 0, reveal: 1, transfer: 1, rest: 1, terminal: 1, consume: 0, draw: 1,
      factory: complete ? 0 : 1, provider: complete ? 0 : 1, read: 1, write: complete ? 5 : 7,
      currentReplacements: complete ? 4 : 6, notificationBatches: complete ? 4 : 6,
      listener1: complete ? 4 : 6, listener2: complete ? 4 : 6 })
  })
  it.each(['move', 'reveal', 'rest'])('chain 3 %s: death write failure -> dead retained -> all intents reject -> save-only recovery', (kind) => {
    const f = fixture({ hp: kind === 'rest' ? 2 : 1, bleeding: true, balance: 47 })
    const h = cold(f.value, f.policy); const e = observe(h)
    const binding = active(h).site.binding; const saved = h.storage.value()
    h.storage.writeFailure(true)
    const r = h.owner.dispatch(request(h, kind, kind === 'move' ? { edgeId: 'ab' } : kind === 'reveal' ? { sourceId: 'lottery-a' } : {}))
    expect(r.current.phase).toBe('dead'); expect(r.persistence).toBe('save-failed'); expect(h.storage.value()).toBe(saved)
    expect(r.current.balance).toBe(0); expect(r.current.receipts.at(-1)!.forfeited).toBe(47)
    const plans = e.plans()
    for (const action of ['rest', 'withdraw', 'deliver', 'deadline']) {
      expect(() => h.owner.dispatch({ kind: action, binding, expectedRevision: r.current.character.revision })).toThrow()
    }
    expect(e.plans()).toEqual(plans)
    recover(h, e)
    expect(e.counts()).toEqual({ activate: 0, terminate: 1, cycle: kind === 'rest' ? 1 : 0, action: kind === 'rest' ? 0 : 1,
      establish: 0, move: kind === 'move' ? 1 : 0, reveal: kind === 'reveal' ? 1 : 0, transfer: 0, rest: kind === 'rest' ? 1 : 0,
      terminal: 0, consume: 1, draw: kind === 'reveal' ? 1 : 0, factory: 0, provider: 0, read: 1, write: 2,
      currentReplacements: 1, notificationBatches: 1, listener1: 1, listener2: 1 })
  })
  it('repeated failed retrySave never changes current or notifies; next retry saves the same death', () => {
    const f = fixture({ hp: 1, bleeding: true }); const h = cold(f.value, f.policy); const e = observe(h)
    h.storage.writeFailure(true); h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    const plans = e.plans(); const current = h.owner.getState().current
    expect(h.owner.retrySave().persistence).toBe('save-failed')
    expect(h.owner.retrySave().persistence).toBe('save-failed')
    expect(h.owner.getState().current).toBe(current); expect(e.plans()).toEqual(plans)
    recover(h, e)
    expect(h.storage.port.write).toHaveBeenCalledTimes(4); expect(h.listener).toHaveBeenCalledTimes(1)
  })
})
