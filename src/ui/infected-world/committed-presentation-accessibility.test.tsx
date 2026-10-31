import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountPresentation } from './committed-presentation-test-fixtures'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren() })
function mediaFixture(reduced: boolean) {
  const listeners = new Set<() => void>(), addEventListener = vi.fn((_event: string, f: () => void) => listeners.add(f))
  const removeEventListener = vi.fn((_event: string, f: () => void) => listeners.delete(f))
  const query = { get matches() { return reduced }, addEventListener, removeEventListener }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return { addEventListener, removeEventListener, size: () => listeners.size, change(value: boolean) { reduced = value; for (const f of [...listeners]) f() } }
}
describe('C1 bounded feedback and reduced motion', () => {
  it('skip and local reduction are keyboard-focusable native controls, without gameplay writes or focus theft', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); const scheduled = vi.spyOn(globalThis, 'setTimeout'), cleared = vi.spyOn(globalThis, 'clearTimeout')
      await h.combat(); const timerIndex = scheduled.mock.calls.findIndex(c => c[1] === 180), cueTimer = scheduled.mock.results[timerIndex].value; observed.clear()
      const skip = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '跳过反馈')!
      await h.flush(() => { skip.focus(); skip.click() }); expect(document.activeElement).toBe(skip)
      expect(h.active()).toBeNull(); expect(h.cue().textContent).toBe('防御已执行')
      const reduce = h.host.querySelector<HTMLInputElement>('.iw-committed-options input')!
      await h.flush(() => { reduce.focus(); reduce.click() }); expect(document.activeElement).toBe(reduce)
      expect(h.host.textContent).toContain('减少动态已生效'); expect(cleared).toHaveBeenCalledWith(cueTimer)
      expect(scheduled.mock.calls.filter(c => c[1] === 180)).toHaveLength(1)
      expect(observed.counts()).toMatchObject({ dispatch: 0, combat: 0, current: 0, notices: 0, encode: 0, draw: 0 })
      await h.combat(); expect(h.active()).toBeNull(); expect(h.cue().textContent).toBe('防御已执行')
      expect(h.cue().getAttribute('aria-live')).toBe('polite'); expect(h.cue().getAttribute('aria-atomic')).toBe('true')
      expect(document.activeElement).toBe(reduce)
    } finally { await h.unmount() }
  })
  it('actual matchMedia contract is respected by default and local unchecked cannot override OS reduction', async () => {
    const media = mediaFixture(true), h = await mountPresentation({ id: 'defend' })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await h.combat()
      expect(h.active()).toBeNull(); expect(h.cue().textContent).toBe('防御已执行'); expect(vi.getTimerCount()).toBe(0)
      const checkbox = h.host.querySelector<HTMLInputElement>('.iw-committed-options input')!
      expect(checkbox.checked).toBe(false); await h.flush(() => checkbox.click()); await h.flush(() => checkbox.click())
      expect(checkbox.checked).toBe(false); expect(h.host.textContent).toContain('减少动态已生效')
      expect(media.size()).toBe(1)
    } finally { await h.unmount() }
    expect(media.size()).toBe(0); expect(media.removeEventListener).toHaveBeenCalledTimes(1)
  })
  it('OS preference change settles an active cue and never replays it when preference changes back', async () => {
    const media = mediaFixture(false), observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await h.combat(); expect(h.active()).not.toBeNull()
      observed.clear(); await h.flush(() => media.change(true)); expect(h.active()).toBeNull(); expect(vi.getTimerCount()).toBe(0)
      const span = h.cue().firstElementChild; await h.flush(() => media.change(false)); expect(h.active()).toBeNull()
      expect(h.cue().firstElementChild).toBe(span); expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0 })
    } finally { await h.unmount() }
    expect(media.size()).toBe(0)
  })
  it('StrictMode starts one actual acquisition and no action; media listener retires with the owner', async () => {
    const media = mediaFixture(false), h = await mountPresentation({ id: 'defend', strict: true })
    try {
      expect(h.locks.request).toHaveBeenCalledTimes(1); expect(h.results).toHaveLength(0); expect(h.cue().textContent).toBe('')
      expect(media.size()).toBe(1); await h.combat(); expect(h.results.filter(r => r.presentation)).toHaveLength(1)
    } finally { await h.unmount() }
    expect(media.size()).toBe(0); expect(h.locks.held()).toBe(false)
  })
})
