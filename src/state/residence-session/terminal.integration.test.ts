import { afterEach, describe, expect, it, vi } from 'vitest'
import { firstHarness, start, launch, request, active, savedEqualsCurrent, observe, harness } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('C02/C03/C07 actual first activation long chain', () => {
  it('read-null -> create -> launch -> reveal -> pickup -> move -> drop -> C rest -> revisit -> pickup -> H0 withdraw -> cold', () => {
    const h = firstHarness(); const e = observe(h)
    h.owner.bootstrap(); h.owner.createFirst()
    const step = (input: unknown) => {
      const before = h.owner.getState().current!
      const writes = h.storage.port.write.mock.calls.length
      h.owner.dispatch(input)
      const next = h.owner.getState().current!
      expect(next).not.toBe(before); expect(next.character.identity).toEqual(before.character.identity)
      expect(next.character.revision).toBe(before.character.revision + 1)
      expect(h.storage.port.write).toHaveBeenCalledTimes(writes + 1)
      expect(h.listener).toHaveBeenCalledTimes(writes + 1)
      savedEqualsCurrent(h)
    }
    step(launch(h)); step(request(h, 'reveal', { sourceId: 'fixed' }))
    const item = active(h).site.ground[0].items[0]
    const state = active(h).itemStates.states.find((s) => s.instanceId === item.instanceId)
    step(request(h, 'pickup', { instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }))
    step(request(h, 'move', { edgeId: 'ab' }))
    step(request(h, 'drop', { instanceId: item.instanceId }))
    const site = active(h).site
    step(request(h, 'rest')); expect(active(h).site).toEqual(site)
    step(request(h, 'move', { edgeId: 'ba' })); step(request(h, 'move', { edgeId: 'ab' }))
    step(request(h, 'pickup', { instanceId: item.instanceId, placement: { x: 2, y: 1, rotated: true } }))
    step(request(h, 'move', { edgeId: 'ba' }))
    step(request(h, 'withdraw'))
    const final = h.owner.getState().current!
    expect(final.phase).toBe('living-hub')
    expect(final.carried.backpack.items).toEqual([item]); expect(final.itemStates.states).toEqual([state])
    expect(final.receipts.at(-1)!.steps).toEqual([])
    expect(final.archives[0].site.sources[0].claimed).toBe(true)
    expect(e.counts()).toEqual({ activate: 1, terminate: 1, cycle: 3, action: 8, establish: 1, move: 4, reveal: 1,
      transfer: 3, rest: 1, terminal: 1, consume: 0, draw: 0, factory: 1, provider: 1, read: 1, write: 12,
      currentReplacements: 12, notificationBatches: 12, listener1: 12, listener2: 12 })
    const plans = e.plans(); const reload = harness(h.policy, h.storage.value())
    expect(reload.owner.bootstrap().current).toEqual(final); expect(e.plans()).toEqual(plans)
    for (const fn of [reload.factory, reload.provider, reload.storage.port.write, reload.listener]) expect(fn).not.toHaveBeenCalled()
  })
  it('six real rests then remote Day7 deadline form one complete ready result; no automatic new commission', () => {
    const h = firstHarness(); start(h)
    for (let i = 0; i < 6; i++) h.owner.dispatch(request(h, 'rest'))
    h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    const before = active(h); expect(before.character.clock).toMatchObject({ taskDay: 7 })
    const r = h.owner.dispatch(request(h, 'deadline'))
    expect(r.current.phase).toBe('living-hub'); expect(r.current.character.clock.kind).toBe('deadline-ready')
    expect(r.current.character.cycle).toBe(8); expect(r.current.missions.every((m) => m.status === 'closed')).toBe(true)
    expect(h.provider).toHaveBeenCalledTimes(1); savedEqualsCurrent(h)
  })
})
