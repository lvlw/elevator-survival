import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import { publicActionCopy } from './presentation/public-action-copy'
import { mountPresentation } from './committed-presentation-test-fixtures'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren() })

describe('C1 actual React direct-result consumption', () => {
  it.each(['basic', 'signature', 'temporary', 'defend', 'retreat', 'quick'] as const)('%s commits once through actual PlayerSession/controller/BrowserOwner/DOM', async id => {
    const observed = observeBrowser(), h = await mountPresentation({ id })
    try {
      expect(h.cue().textContent).toBe(''); expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      h.notifications.length = 0; observed.clear(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await h.combat()
      const p = h.direct()!; expect(p).toBeDefined(); expect(p.sequence).toHaveLength(1)
      expect(h.cue().textContent).toBe(publicActionCopy[p.sequence[0].action]); expect(h.cue().querySelectorAll('span')).toHaveLength(1)
      expect(h.notifications).toEqual(['busy', 'stable']); expect(h.active()).not.toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
      const committed = observed.owners.at(-1)!.getState().current, checkpoint = h.disk.get(CHECKPOINT_KEY)
      observed.clear(); await h.flush(() => vi.advanceTimersByTime(180))
      expect(h.active()).toBeNull(); expect(h.cue().textContent).toBe(publicActionCopy[p.sequence[0].action])
      expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, notices: 0, encode: 0, draw: 0 })
      expect(observed.owners.at(-1)!.getState().current).toBe(committed); expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
    } finally { await h.unmount() }
  })
  it('next legal same action commits immediately and replaces its span without waiting for the first timer', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await h.d.send('防御')
      const first = h.direct()!, span = h.cue().firstElementChild; observed.clear()
      await h.d.send('防御')
      expect(h.direct()!.token.scope).toBe(first.token.scope); expect(h.direct()!.token.ordinal).toBe(first.token.ordinal + 1)
      expect(h.cue().firstElementChild).not.toBe(span); expect(h.active()).not.toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1 }); expect(h.setItem).toHaveBeenCalledTimes(2)
    } finally { await h.unmount() }
  })
  it('duplicate notifications and React rerenders cannot replay or replace a consumed record', async () => {
    const h = await mountPresentation({ id: 'defend' })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await h.d.send('防御')
      await h.flush(() => vi.advanceTimersByTime(180)); const span = h.cue().firstElementChild, html = h.cue().outerHTML
      const writes = h.setItem.mock.calls.length; await h.flush(h.notifyAgain); await h.render()
      expect(h.active()).toBeNull(); expect(h.cue().outerHTML).toBe(html); expect(h.cue().firstElementChild).toBe(span)
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.results.filter(r => r.presentation)).toHaveLength(1)
    } finally { await h.unmount() }
  })
  it('save-failed is already effective once; retry saves latest memory without replay or stale banner ownership', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      h.faults.checkpoint = true; observed.clear(); await h.d.send('防御')
      const p = h.direct()!; expect(p.persistence).toBe('save-failed'); expect(h.cue().textContent).toBe('防御已执行')
      expect(h.host.textContent).toContain('操作已生效，尚未保存'); expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1 })
      h.faults.checkpoint = false; observed.clear(); await h.d.button('重试保存')
      expect(h.host.textContent).not.toContain('操作已生效，尚未保存'); expect(h.cue().textContent).toBe('')
      expect(p.persistence).toBe('save-failed'); expect(h.results.filter(r => r.presentation)).toHaveLength(1)
      expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, notices: 0, encode: 1, draw: 0 })
      await h.d.send('防御'); expect(h.direct()!.token.ordinal).toBe(p.token.ordinal + 1)
    } finally { await h.unmount() }
  })
  it('real protected combat confirm uses the same consumer and no pending confirmation plays', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'both-zero' })
    try {
      observed.clear(); await h.combat()
      expect(h.originals[0].kind).toBe('confirmation-required'); expect(h.originals[0]).not.toHaveProperty('presentation')
      expect(h.originals.at(-1)!.kind).toBe('committed'); expect(h.cue().textContent).toBe('攻击已执行')
      expect(h.view().point).toBe('dead'); expect(h.host.querySelector('[aria-label="战斗行动"]')).toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1 })
    } finally { await h.unmount() }
  })
})
