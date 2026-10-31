import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserOwner } from '../../app/infected-browser/types'
import type { CommittedCombatPresentation } from '../../app/infected-preplay/committed-presentation'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountPresentation } from './committed-presentation-test-fixtures'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren() })
describe('C1 command window, loss and stale callbacks', () => {
  it.each(['suspend', 'dispose'] as const)('real post-commit listener %s drops the late result, preserving the one actual commit', async method => {
    const observed = observeBrowser(); let armed = false
    const h = await mountPresentation({ id: 'defend', beforeOwner: owner => owner.subscribe(() => {
      if (armed && owner.getSnapshot().preplay?.status === 'stable') { armed = false; owner[method]() }
    }) })
    try {
      observed.clear(); armed = true; await h.combat()
      expect(h.originals.at(-1)!.kind).toBe('committed'); expect(h.originals.at(-1)!.presentation).toBeDefined()
      expect(h.owner().getSnapshot().status).toBe(method === 'suspend' ? 'suspended' : 'disposed')
      expect(h.host.querySelector('.iw-committed-cue')).toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
    } finally { await h.unmount() }
  })
  it('an old queued timer cannot settle a newer cue or lose its cancellation handle', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); const scheduled = vi.spyOn(globalThis, 'setTimeout')
      await h.combat(); const old = scheduled.mock.calls.find(c => c[1] === 180)![0] as () => void
      await h.combat(); const span = h.cue().firstElementChild; observed.clear()
      await h.flush(old); expect(h.active()).not.toBeNull(); expect(h.cue().firstElementChild).toBe(span)
      expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, notices: 0 })
      await h.flush(() => h.owner().suspend()); expect(vi.getTimerCount()).toBe(0)
      await h.flush(old); expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0 })
    } finally { await h.unmount() }
  })
  it('a timer callback has no gameplay path, and becomes inert after real unmount', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); const scheduled = vi.spyOn(globalThis, 'setTimeout')
    await h.combat(); const callback = scheduled.mock.calls.find(c => c[1] === 180)![0] as () => void
    observed.clear(); await h.flush(() => vi.advanceTimersByTime(180))
    expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, notices: 0, draw: 0, encode: 0 })
    await h.unmount(); expect(vi.getTimerCount()).toBe(0); const writes = h.setItem.mock.calls.length
    await act(async () => callback()); expect(h.setItem).toHaveBeenCalledTimes(writes)
    expect(document.body.textContent).toBe(''); expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0 })
  })
  it('pagehide cancels feedback; a genuine reacquisition uses new controls and scope, not old memory', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      await h.combat(); const old = h.direct()!, oldControls = h.owner().controls()!, oldAction = h.view().combat!.actions[0].selector
      await h.flush(() => h.lifecycle.dispatchEvent(new Event('pagehide')))
      expect(h.host.querySelector('.iw-committed-cue')).toBeNull(); observed.clear()
      expect(() => oldControls.execute({ action: oldAction })).toThrow()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0 })
      await act(async () => { await h.owner().acquire() })
      expect(h.owner().controls()).not.toBe(oldControls); expect(h.cue().textContent).toBe('')
      await h.combat(); expect(h.direct()!.token.scope).not.toBe(old.token.scope); expect(h.direct()!.token.ordinal).toBe(0)
    } finally { await h.unmount() }
  })
  it('an already retired subscription callback cannot clear feedback from genuinely reacquired controls', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      await h.combat(); const previous = h.owner().controls()
      await h.flush(() => h.lifecycle.dispatchEvent(new Event('pagehide')))
      await act(async () => { await h.owner().acquire() })
      expect(h.owner().controls()).not.toBe(previous)
      await h.combat(); const span = h.cue().firstElementChild, writes = h.setItem.mock.calls.length
      observed.clear(); await h.flush(h.notifyRetired)
      expect(h.cue().textContent).toBe('防御已执行'); expect(h.cue().firstElementChild).toBe(span)
      expect(h.setItem).toHaveBeenCalledTimes(writes)
      expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, notices: 0 })
    } finally { await h.unmount() }
  })
  it('a late result incompatible with the latest stable view is discarded without undoing the real action', async () => {
    const observed = observeBrowser(); let previous: ReturnType<BrowserOwner['getSnapshot']>['preplay'] = null
    const h = await mountPresentation({ id: 'defend', transform: r => r.kind === 'committed' && previous ? { ...r, snapshot: previous } : r })
    try {
      previous = h.owner().getSnapshot().preplay; observed.clear(); await h.combat()
      expect(h.originals.at(-1)!.presentation).toBeDefined(); expect(h.cue().textContent).toBe('')
      expect(h.owner().getSnapshot().preplay!.view).not.toBe(previous!.view)
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1 })
    } finally { await h.unmount() }
  })
  it('a copied old token matching a new result view is not revived; later genuine ordinal may skip the gap', async () => {
    let old: CommittedCombatPresentation | null = null
    const h = await mountPresentation({ id: 'defend', transform: r => r.presentation && old ?
      { ...r, presentation: { ...old, token: { ...old.token } } } : r })
    try {
      await h.combat(); old = h.direct()!; await h.d.button('跳过反馈'); await h.combat()
      expect(h.cue().textContent).toBe(''); old = null; await h.combat()
      expect(h.cue().textContent).toBe('防御已执行'); expect(h.direct()!.token.ordinal).toBe(2)
      expect(h.setItem).toHaveBeenCalledTimes(3)
    } finally { await h.unmount() }
  })
  it('an unsolicited new scope under unchanged controls does not reset high-water', async () => {
    let foreign = false
    const h = await mountPresentation({ id: 'defend', transform: r => foreign && r.presentation ?
      { ...r, presentation: { ...r.presentation, token: { scope: Object.freeze({}), ordinal: 99 } } } : r })
    try {
      await h.combat(); const first = h.direct()!; foreign = true; await h.combat(); expect(h.cue().textContent).toBe('')
      foreign = false; await h.combat(); expect(h.direct()!.token.scope).toBe(first.token.scope); expect(h.direct()!.token.ordinal).toBe(2)
    } finally { await h.unmount() }
  })
  it('native external controls and subscriptions update canonical DOM but cannot synthesize feedback', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      observed.clear(); const action = h.view().combat!.actions.find(a => a.label === '防御')!.selector
      await h.flush(() => { h.owner().controls()!.execute({ action }) })
      expect(h.direct()).toBeDefined(); expect(h.cue().textContent).toBe('')
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1 })
      await h.flush(h.notifyAgain); expect(h.cue().textContent).toBe('')
    } finally { await h.unmount() }
  })
  it('timer scheduling failure after consumption stays observable without undoing the committed action', async () => {
    const failure = new Error('TEST cue scheduler failure'), errors: unknown[] = [], observed = observeBrowser()
    const onError = (event: ErrorEvent) => { if (event.error === failure) { errors.push(event.error); event.preventDefault() } }
    window.addEventListener('error', onError)
    const h = await mountPresentation({ id: 'defend' })
    try {
      const schedule = globalThis.setTimeout
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((handler, delay, ...args) => {
        if (delay === 180) throw failure
        return schedule(handler, delay, ...args)
      })
      observed.clear(); await h.combat()
      expect(errors).toEqual([failure]); expect(h.originals.at(-1)!.presentation).toBeDefined()
      expect(h.host.textContent).toContain('操作结果可能已生效'); expect(h.host.querySelector('.iw-committed-cue')).toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
    } finally { await h.unmount(); window.removeEventListener('error', onError) }
  })
  it('post-commit presentation failure stays observable and clears feedback without replaying the action', async () => {
    const failure = new Error('TEST presentation failure'), errors: unknown[] = [], observed = observeBrowser()
    const onError = (event: ErrorEvent) => { if (event.error === failure) { errors.push(event.error); event.preventDefault() } }
    window.addEventListener('error', onError)
    const h = await mountPresentation({ id: 'defend', transform: r => { if (r.presentation) throw failure; return r } })
    try {
      observed.clear(); await h.combat()
      expect(errors).toEqual([failure]); expect(h.host.textContent).toContain('操作结果可能已生效')
      expect(h.host.textContent).not.toContain('TEST presentation failure'); expect(h.originals.at(-1)!.kind).toBe('committed')
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
    } finally { await h.unmount(); window.removeEventListener('error', onError) }
  })
})
