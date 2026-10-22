import { afterEach, describe, expect, it, vi } from 'vitest'
import * as clinical from '../../core/residence-supply/shared-medical'
import * as context from '../../state/residence-session/player-context'
import { observe } from '../../state/residence-session/combat-test-observers'
import { appHarness, startApp, appChoose } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('F04 F10 independent read/cancel/rejection windows', () => {
  it('snapshot, inspect, draft copy/cancel, subscriptions and rejection never produce, resolve, draw, issue, read/write/notify or recreate context', () => {
    const h = appHarness(); startApp(h)
    const o = observe(h), evaluate = vi.spyOn(clinical, 'evaluateSupplyClinical'), contexts = vi.spyOn(context, 'createPlayerContext')
    const request = { action: appChoose(h.app, 'move', '大厅') }, before = h.owner.getState().current, disk = h.disk()
    const windows = [() => h.app.getSnapshot(), () => h.app.preview(request), () => h.preplay.capture(request),
      () => h.player.resolve(request), () => { h.app.beginDraft(request); h.app.cancel() },
      () => { const off = h.app.subscribe(() => {}); off() }, () => h.app.execute({ action: {} }),
      () => h.app.confirm({ confirmation: 'preplay' })]
    for (const window of windows) {
      o.clear(); evaluate.mockClear(); contexts.mockClear(); h.dispatch.mockClear(); window()
      expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0))
      expect(evaluate).not.toHaveBeenCalled(); expect(contexts).not.toHaveBeenCalled(); expect(h.dispatch).not.toHaveBeenCalled()
      expect(h.owner.getState().current).toBe(before); expect(h.disk()).toBe(disk)
    }
  })
})
