import { describe, expect, it, vi } from 'vitest'
import { appHarness, appReady, startApp, appChoose } from './test-fixtures'
import { fixture } from '../../state/residence-session/combat-test-fixtures'
import { appFromValue } from './test-fixtures'
import { counts } from '../../state/residence-session/player-test-fixtures'

describe('F07 explicit parameter drafts without a second state', () => {
  it('pure data is copied without freezing the caller; getter rejection never evaluates it', () => {
    const h = appHarness(); startApp(h)
    const request = { action: appChoose(h.app, 'inventory', '移动物品'), placement: { x: 1, y: 1, rotated: false } }
    const n = counts(h), draft = h.app.beginDraft(request)
    request.placement.x = 4
    expect(h.app.getSnapshot().draft!.request.placement!.x).toBe(1)
    expect(Object.isFrozen(request)).toBe(false); expect(Object.isFrozen(request.placement)).toBe(false)
    const getter = vi.fn(() => request.action)
    expect(h.app.execute(Object.defineProperty({}, 'action', { get: getter, enumerable: true })).kind).toBe('rejected')
    expect(getter).not.toHaveBeenCalled(); expect(counts(h)).toEqual(n)
    expect(h.app.executeDraft(draft).kind).toBe('rejected')
    expect(h.app.getSnapshot().draft!.token).toBe(draft)
  })
  it('new current with identical public facts invalidates an old complete draft', () => {
    const h = appHarness(); startApp(h)
    // S retry is deliberately not a current change; free no-op organize IS one.
    const f = fixture(), cold = appFromValue(f.value, f.deps)
    const bandage = appReady(cold.app).carried.find(i => i.name === '绷带')!
    const transfer = { action: appChoose(cold.app, 'inventory', '放入背包'), item: bandage.selector, placement: { x: 0, y: 0, rotated: false } }
    expect(cold.app.execute(transfer).kind).toBe('committed')
    const item = appReady(cold.app).carried.find(i => i.name === '绷带' && i.container === 'backpack')!
    const request = { action: appChoose(cold.app, 'inventory', '移动物品'), item: item.selector, placement: { x: 0, y: 0, rotated: false } }
    const token = cold.app.beginDraft(request), before = appReady(cold.app)
    expect(cold.app.execute(request).kind).toBe('committed')
    expect(appReady(cold.app).body).toEqual(before.body)
    expect(appReady(cold.app).backpack).toEqual(before.backpack)
    const n = counts(cold), d = cold.dispatch.mock.calls.length
    expect(cold.app.executeDraft(token).kind).toBe('rejected'); expect(counts(cold)).toEqual(n); expect(cold.dispatch).toHaveBeenCalledTimes(d)
  })
  it('retrySave preserves scope/draft, cancel deletes only presentation data', () => {
    const h = appHarness(); startApp(h)
    const token = h.app.beginDraft({ action: appChoose(h.app, 'move', '大厅') })
    const scope = h.preplay.scope(), v = h.owner.getState().current
    h.app.retrySave(); expect(h.preplay.scope()).toBe(scope); expect(h.app.getSnapshot().draft!.token).toBe(token)
    const n = counts(h); h.app.cancel(); expect(h.app.getSnapshot().draft).toBeNull(); expect(counts(h)).toEqual(n)
    expect(h.owner.getState().current).toBe(v); expect(h.app.executeDraft(token).kind).toBe('rejected')
  })
})
