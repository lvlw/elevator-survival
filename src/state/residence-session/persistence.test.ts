import { afterEach, describe, expect, it, vi } from 'vitest'
import * as g2 from '../../core/residence-location'
import { deserializeResidenceSave } from '../residence-save'
import { command, currentActive, fixture, harness } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('G3 S09/S10 persistence and reentry', () => {
  it('r -> r+1 write failure -> query -> r+2 -> stale r -> retry-save r+2, never replay/reload', () => {
    const h = harness(); const initialString = h.storage.value(); h.owner.bootstrap()
    const plan = vi.spyOn(g2, 'planResidenceMove'); const old = command(currentActive(h))
    h.storage.writeFailure(true)
    const first = h.owner.dispatch(old)
    expect(first.persistence).toBe('save-failed'); expect(h.storage.value()).toBe(initialString)
    expect(h.owner.queryKnowledge()?.currentNodeId).toBe('b')
    const second = h.owner.dispatch(command(currentActive(h), 'ba'))
    expect(second.current.character.revision).toBe(2); expect(second.persistence).toBe('save-failed')
    expect(() => h.owner.dispatch(old)).toThrowError(expect.objectContaining({ code: 'STALE_COMMAND' }))
    const latest = h.owner.getState().current
    h.storage.writeFailure(false); expect(h.owner.retrySave().persistence).toBe('saved')
    expect(h.owner.getState().current).toBe(latest)
    expect(deserializeResidenceSave(h.storage.value()!, h.f.policy)).toEqual(second.current)
    // Two gameplay commits (observed complete canonical replacements), two real rule plans,
    // one cold read, three write attempts, two notification dispatches.
    expect(first.current).not.toBe(second.current)
    expect(plan).toHaveBeenCalledTimes(2); expect(h.storage.port.read).toHaveBeenCalledTimes(1)
    expect(h.storage.port.write).toHaveBeenCalledTimes(3); expect(h.listener).toHaveBeenCalledTimes(2)
    expect(h.factory).not.toHaveBeenCalled()
  })
  it('failed first save keeps ready/current and cannot recreate; retry is save-only even when it fails', () => {
    const h = harness(fixture(), null); h.owner.bootstrap(); h.storage.writeFailure(true)
    const first = h.owner.createFirst(); expect(first.persistence).toBe('save-failed')
    expect(h.storage.value()).toBeNull(); expect(h.owner.getState().status).toBe('ready')
    expect(() => h.owner.createFirst()).toThrow(); expect(() => h.owner.bootstrap()).toThrow()
    expect(h.owner.retrySave().persistence).toBe('save-failed')
    h.storage.writeFailure(false); expect(h.owner.retrySave().persistence).toBe('saved')
    expect(h.owner.getState().current).toBe(first.current)
    expect(h.factory).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(3)
    expect(h.listener).toHaveBeenCalledTimes(1); expect(h.storage.port.read).toHaveBeenCalledTimes(1)
  })
  it('write/notify reentry is busy; throwing subscriber cannot skip others or expose/freeze raw errors', () => {
    const h = harness(); h.owner.bootstrap()
    const plan = vi.spyOn(g2, 'planResidenceMove'); const rawError = new Error('secret callback error')
    const verify = () => {
      expect(h.owner.getState().current).toMatchObject({ character: { revision: 1 }, site: { nodeId: 'b' } })
      for (const op of [h.owner.bootstrap, h.owner.createFirst, h.owner.retryRead, h.owner.retrySave,
        () => h.owner.dispatch(command(currentActive(h), 'ba'))]) expect(op).toThrowError(expect.objectContaining({ code: 'BUSY' }))
    }
    h.storage.hooks.write = verify
    h.owner.subscribe(() => { verify(); throw rawError })
    const last = vi.fn(() => { expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.owner.getState().persistence).toBe('saved') })
    h.owner.subscribe(last)
    const result = h.owner.dispatch(command(currentActive(h)))
    expect(result.notificationErrors).toEqual([{ code: 'LISTENER_FAILED' }]); expect(last).toHaveBeenCalledTimes(1)
    expect(Object.isFrozen(rawError)).toBe(false); expect(JSON.stringify(result)).not.toContain('secret callback')
    expect(plan).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(1)
    expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('uncaught port reentry becomes save-failed after commit, not a second move', () => {
    const h = harness(); h.owner.bootstrap(); const plan = vi.spyOn(g2, 'planResidenceMove')
    const old = h.storage.value()
    h.storage.hooks.write = () => { h.owner.dispatch(command(currentActive(h), 'ba')) }
    const result = h.owner.dispatch(command(currentActive(h)))
    expect(result.persistence).toBe('save-failed'); expect(h.storage.value()).toBe(old)
    expect(currentActive(h).character.revision).toBe(1); expect(plan).toHaveBeenCalledTimes(1)
    expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
})
