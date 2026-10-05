import { afterEach, describe, expect, it, vi } from 'vitest'
import * as initial from '../../core/residence-supply/initial'
import * as producer from '../../core/residence-supply/controlled'
import * as validator from '../residence-save/supply-validation'
import * as codec from '../residence-save/supply-codec'
import { harness, start, current, request, fixture, expectation } from './supply-test-fixtures'
import type { SupplySession } from './supply-types'
afterEach(() => vi.restoreAllMocks())
function probe(owner: SupplySession) {
  const v = owner.getState().current
  for (const operation of [owner.bootstrap, owner.retryRead, owner.createFirst, owner.retrySave, () => owner.dispatch({})])
    expect(operation).toThrowError(expect.objectContaining({ code: 'BUSY' }))
  expect(owner.getState().current).toBe(v)
  owner.queryKnowledge()
}
describe('S09 busy covers every synchronous boundary', () => {
  it('non-string storage result is not absence and a later null never grants first-create', () => {
    const h = harness()
    h.storage.read.mockImplementationOnce(() => Promise.resolve(null) as never)
    expect(h.owner.bootstrap().status).toBe('read-error')
    expect(h.owner.retryRead().status).toBe('blocked')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.factory).not.toHaveBeenCalled()
  })
  it.each(['read', 'materials', 'initial', 'producer', 'validation', 'encoding', 'write', 'listener', 'retry-write', 'retry-read'] as const)
  ('%s callback rejects all five recursive writers and exposes only stable reads', point => {
    const h = harness(), called = vi.fn(() => probe(h.owner))
    if (point === 'read') h.hooks.read = called
    if (point === 'materials') h.factory.mockImplementation(() => { called(); return h.materials })
    if (point === 'initial') {
      const real = initial.establishSupplyInitial
      vi.spyOn(initial, 'establishSupplyInitial').mockImplementation((...args) => { called(); return real(...args) })
    }
    if (point === 'producer') {
      const real = producer.planSupplyMove
      vi.spyOn(producer, 'planSupplyMove').mockImplementation((...args) => { called(); return real(...args) })
    }
    if (point === 'validation') {
      const real = validator.validateSupplyResidenceAggregate
      vi.spyOn(validator, 'validateSupplyResidenceAggregate').mockImplementation((...args) => { called(); return real(...args) })
    }
    if (point === 'encoding') {
      const real = codec.serializeSupplyResidenceSave
      vi.spyOn(codec, 'serializeSupplyResidenceSave').mockImplementation((...args) => { called(); return real(...args) })
    }
    if (point === 'write') h.hooks.write = called
    if (point === 'listener') h.owner.subscribe(called)
    if (point === 'retry-read') {
      h.faults.read = true; expect(h.owner.bootstrap().status).toBe('read-error'); h.faults.read = false; h.hooks.read = called
      expect(h.owner.retryRead().status).toBe('no-save'); h.owner.createFirst()
    } else {
      start(h); h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    }
    if (point === 'retry-write') { h.hooks.write = called; h.owner.retrySave() }
    expect(called).toHaveBeenCalled()
    // All boundary probes caught BUSY; no recursive command altered revisions or writer counts.
    expect(h.storage.write).toHaveBeenCalledTimes(point === 'retry-read' ? 1 : point === 'retry-write' ? 4 : 3)
    expect(h.listener).toHaveBeenCalledTimes(point === 'retry-read' ? 1 : 3)
  })
  it('external cold expectation callback receives zero candidate arguments and is busy-protected', () => {
    const f = fixture(), expected = expectation(f.value, f.dependencies)
    const text = codec.serializeSupplyResidenceSave(f.value, expected, f.policy)
    const h = harness({ policy: f.policy, text, expected, startup: 'existing' })
    h.coldProvider.mockImplementation((...args: unknown[]) => { expect(args).toEqual([]); probe(h.owner); return expected })
    expect(h.owner.bootstrap().status).toBe('ready')
    expect(h.coldProvider).toHaveBeenCalledTimes(1); expect(h.storage.write).not.toHaveBeenCalled()
    expect(h.listener).not.toHaveBeenCalled()
  })
  it('listener errors are isolated after one commit and never roll back or prevent other listeners', () => {
    const h = harness(); start(h); h.listener.mockClear(); h.storage.write.mockClear()
    const bad = vi.fn(() => { throw new Error('TEST_LISTENER') }), good = vi.fn()
    h.owner.subscribe(bad); h.owner.subscribe(good)
    const result = h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    expect(result.notificationErrors).toEqual([{ code: 'LISTENER_FAILED' }])
    expect(bad).toHaveBeenCalledTimes(1); expect(good).toHaveBeenCalledTimes(1)
    expect(current(h)).toBe(result.current); expect(h.storage.write).toHaveBeenCalledTimes(1)
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:reverse' }))
    expect(h.storage.write).toHaveBeenCalledTimes(2); expect(good).toHaveBeenCalledTimes(2)
  })
  it('throwing material callback releases busy without a grant, write or notification', () => {
    const h = harness(); h.owner.bootstrap()
    h.factory.mockImplementationOnce(() => { probe(h.owner); throw new Error('TEST_MATERIALS') })
    expect(h.owner.createFirst).toThrow('TEST_MATERIALS')
    expect(h.owner.getState().current).toBeNull(); expect(h.storage.write).not.toHaveBeenCalled()
    h.owner.createFirst(); expect(h.listener).toHaveBeenCalledTimes(1)
  })
})
