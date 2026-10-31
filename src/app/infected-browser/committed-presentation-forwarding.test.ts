import { afterEach, describe, expect, it, vi } from 'vitest'
import * as controllerModule from '../infected-preplay/controller'
import { browserFixture, setup, choose, send } from './test-fixtures'
import { presentationOf, referenceConsumer, expectClosedPresentation } from '../infected-preplay/committed-presentation-test-fixtures'
import type { PreplayResult } from '../infected-preplay/types'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
function recordForwarded() {
  const original = controllerModule.createPreplayController
  let last: PreplayResult | null = null
  vi.spyOn(controllerModule, 'createPreplayController').mockImplementation(ports => {
    const app = original(ports)
    return Object.freeze({ ...app, execute: input => { last = app.execute(input); return last },
      executeDraft: token => { last = app.executeDraft(token); return last }, confirm: token => { last = app.confirm(token); return last } })
  })
  return () => last
}
async function battle(h: ReturnType<typeof browserFixture>) {
  const controls = await setup(h); send(h.owner, 'depart', '进入封锁区')
  for (const label of ['大厅', '后勤控制间', '岗亭', '登记室', '装卸场']) send(h.owner, 'move', label)
  return controls
}
describe('B1 K13 unchanged BrowserOwner native headless forwarding and ownership', () => {
  it('execute/executeDraft return the very controller object; confirm also forwards unchanged on its real noncombat path', async () => {
    const last = recordForwarded(), h = browserFixture(), c = await battle(h)
    const r = c.execute({ action: choose(h.owner, 'combat', '防御') }), p = presentationOf(r)
    expect(r).toBe(last()); expectClosedPresentation(p); expect(p.token.ordinal).toBe(0)
    const draft = c.beginDraft({ action: choose(h.owner, 'combat', '防御') }), second = c.executeDraft(draft)
    expect(second).toBe(last()); expect(presentationOf(second).token.ordinal).toBe(1)
    expect(h.owner.getSnapshot()).not.toHaveProperty('presentation'); expect(h.owner.getSnapshot().preplay).not.toHaveProperty('presentation')
    expect([...h.disk.values()].join('')).not.toMatch(/committedAction|presentation|"token"/); h.owner.dispose()
    const noncombat = browserFixture(), ctrl = await setup(noncombat); send(noncombat.owner, 'depart', '进入封锁区')
    const ask = ctrl.execute({ action: choose(noncombat.owner, 'terminal', '失败止损返回') })
    expect(ask.kind).toBe('confirmation-required'); const confirmed = ctrl.confirm(ask.confirmation!)
    expect(confirmed).toBe(last()); expect(confirmed.kind).toBe('committed'); expect(confirmed).not.toHaveProperty('presentation'); noncombat.owner.dispose()
  })
  it.each(['suspend', 'dispose', 'lost-lock'] as const)('%s invalidates old controls and late payload, reacquisition is a new scope with ordinal zero', async mode => {
    const h = browserFixture(); let lose: (() => void) | null = null
    if (mode === 'lost-lock') {
      // Simulated platform abort AFTER callback acquisition: the request rejects and platform lock is already gone.
      h.locks.request.mockImplementationOnce((name, options, callback) => {
        void callback({ name, mode: options.mode })
        return new Promise((_, reject) => { lose = () => reject(new Error('TEST acquired platform lock aborted')) })
      })
    }
    const controls = await battle(h), p = presentationOf(controls.execute({ action: choose(h.owner, 'combat', '防御') }))
    const request = { action: choose(h.owner, 'combat', '防御') }, writes = h.setItem.mock.calls.length
    const consumer = referenceConsumer(() => h.owner.controls() === controls); consumer.activate(p.token.scope)
    if (mode === 'suspend') h.owner.suspend()
    else if (mode === 'dispose') h.owner.dispose()
    else lose!()
    for (let n = 0; n < 5; n++) await Promise.resolve()
    expect(h.owner.controls()).toBeNull(); expect(() => controls.execute(request)).toThrow(); expect(consumer.consume(p, 'skip')).toBeNull()
    expect(h.setItem).toHaveBeenCalledTimes(writes)
    const freshOwner = mode === 'dispose' ? h.make() : h.owner
    expect((await freshOwner.acquire()).status).toBe('ready'); expect(freshOwner.getSnapshot().preplay!.feed).toEqual([])
    const fresh = freshOwner.controls()!
    expect(fresh.execute(request).kind).toBe('rejected')
    const next = presentationOf(fresh.execute({ action: choose(freshOwner, 'combat', '防御') }))
    expect(next.token.scope).not.toBe(p.token.scope); expect(next.token.ordinal).toBe(0); freshOwner.dispose()
  })
  it('dispose during post-commit stable notification may leave a direct return, but TEST consumer drops it without rolling back disk', async () => {
    const h = browserFixture(), controls = await battle(h), before = h.setItem.mock.calls.length
    let armed = true
    h.owner.subscribe(() => {
      if (armed && h.owner.getSnapshot().preplay?.status === 'stable') { armed = false; h.owner.dispose() }
    })
    const p = presentationOf(controls.execute({ action: choose(h.owner, 'combat', '防御') }))
    expect(h.owner.getSnapshot().status).toBe('disposed'); expect(h.setItem).toHaveBeenCalledTimes(before + 1)
    const consumer = referenceConsumer(() => h.owner.controls() === controls); consumer.activate(p.token.scope)
    expect(consumer.consume(p)).toBeNull(); expect(() => controls.retrySave()).toThrow()
  })
})
