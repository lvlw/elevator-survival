import { afterEach, describe, expect, it, vi } from 'vitest'
import * as g2 from '../../core/residence-location'
import * as terminal from '../../core/residence-terminal/controlled'
import * as codec from '../residence-save/terminal-index'
import { firstHarness, start, launch, request, active, execution, observe } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('C09 guard spans every callback/producer/commit seam', () => {
  it.each(['read', 'factory', 'provider', 'g2', 'terminal', 'encode', 'write', 'listener', 'retry-encode', 'retry-write'])
  ('%s reentry rejects all mutators while allowing immutable queries and unsubscribe', (stage) => {
    const h = firstHarness()
    let visits = 0
    const verify = () => {
      visits++
      const before = h.owner.getState().current
      h.owner.queryKnowledge(); h.owner.queryTerminalEligibility()
      const unused = vi.fn(); h.owner.subscribe(unused)()
      for (const op of [h.owner.bootstrap, h.owner.retryRead, h.owner.createFirst, h.owner.retrySave,
        () => h.owner.dispatch({ kind: 'view' })]) expect(op).toThrowError(expect.objectContaining({ code: 'BUSY' }))
      expect(h.owner.getState().current).toBe(before); expect(unused).not.toHaveBeenCalled()
    }
    if (stage === 'read') h.storage.hooks.read = verify
    if (stage === 'factory') h.factory.mockImplementation(() => { verify(); return h.fresh })
    if (stage === 'provider') h.provider.mockImplementation(() => { verify(); return execution })
    start(h)
    if (stage === 'g2') {
      const original = g2.planResidenceMove
      vi.spyOn(g2, 'planResidenceMove').mockImplementationOnce((...args) => { verify(); return original(...args) })
    }
    if (stage === 'terminal') {
      const original = terminal.planResidenceTerminal
      vi.spyOn(terminal, 'planResidenceTerminal').mockImplementationOnce((...args) => { verify(); return original(...args) })
    }
    if (stage === 'encode' || stage === 'retry-encode') {
      const original = codec.serializeTerminalResidenceSave
      vi.spyOn(codec, 'serializeTerminalResidenceSave').mockImplementationOnce((...args) => { verify(); return original(...args) })
    }
    if (stage === 'write' || stage === 'retry-write') h.storage.hooks.write = verify
    if (stage === 'listener') h.owner.subscribe(verify)
    if (stage.startsWith('retry')) h.owner.retrySave()
    else if (!['read', 'factory', 'provider'].includes(stage)) {
      h.owner.dispatch(request(h, stage === 'terminal' ? 'withdraw' : 'move', stage === 'terminal' ? {} : { edgeId: 'ab' }))
    }
    expect(visits).toBe(1)
    expect(h.storage.port.read).toHaveBeenCalledTimes(1)
    expect(h.factory).toHaveBeenCalledTimes(1); expect(h.provider).toHaveBeenCalledTimes(1)
  })
  it('uncaught write reentry is save-failed after complete death; later observers still see the same dead current', () => {
    const h = firstHarness({ fresh: (s) => { s.character.body.condition.currentHealth = 1; s.character.body.condition.bleeding = true } })
    start(h); const e = observe(h); const old = h.storage.value()
    h.storage.hooks.write = () => { h.owner.retrySave() }
    const last = vi.fn(); h.owner.subscribe(last)
    const result = h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    expect(result.persistence).toBe('save-failed'); expect(result.current.phase).toBe('dead')
    expect(h.storage.value()).toBe(old)
    expect(last).toHaveBeenCalledTimes(1); expect(last.mock.calls[0][0].current).toBe(result.current)
    expect(e.spies.move).toHaveBeenCalledTimes(1); expect(e.spies.consume).toHaveBeenCalledTimes(1)
  })
  it('listener failures are isolated, unsubscribing is allowed, no raw error or mutability leaks', () => {
    const h = firstHarness(); start(h); const raw = new Error('private callback')
    const removed = vi.fn(); const unsubscribe = h.owner.subscribe(removed)
    h.owner.subscribe(() => { unsubscribe(); expect(h.owner.retrySave).toThrowError(expect.objectContaining({ code: 'BUSY' })); throw raw })
    const tail = vi.fn(); h.owner.subscribe(tail)
    const r = h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    expect(r.notificationErrors).toEqual([{ code: 'LISTENER_FAILED' }])
    expect(tail.mock.calls[0][0].current).toBe(r.current); expect(removed).toHaveBeenCalledTimes(1)
    expect(Object.isFrozen(raw)).toBe(false); expect(JSON.stringify(r)).not.toContain('private callback')
    h.owner.dispatch(request(h, 'move', { edgeId: 'ba' }))
    expect(removed).toHaveBeenCalledTimes(1); expect(tail).toHaveBeenCalledTimes(2)
  })
  it('uncaught provider reentry cannot create execution/current or poison the guard for the next valid launch', () => {
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst()
    const before = h.owner.getState().current
    h.provider.mockImplementationOnce(() => { h.owner.dispatch(launch(h)); return execution })
    expect(() => h.owner.dispatch(launch(h))).toThrowError(expect.objectContaining({ code: 'EXECUTION_PROVIDER_FAILED' }))
    expect(h.owner.getState().current).toBe(before)
    h.owner.dispatch(launch(h)); expect(active(h).site.nodeId).toBe('a')
    expect(h.storage.port.write).toHaveBeenCalledTimes(2)
  })
})
