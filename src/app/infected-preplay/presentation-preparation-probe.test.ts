import { afterEach, describe, expect, it, vi } from 'vitest'
import { entered, fixture } from '../../state/residence-session/combat-test-fixtures'
import { appFromValue, appChoose, appReady, commit } from './test-fixtures'
import { observe, expectSaveOnly } from '../../state/residence-session/combat-test-observers'
import { counts } from '../../state/residence-session/player-test-fixtures'
import { browserFixture, setup, choose as browserChoose, send as browserSend, cold } from '../infected-browser/test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('B TEST-only controller and BrowserControls source gaps', () => {
  it('committed+save-failed feed is coarse; repeat reads/sync/retry append no result or replay', () => {
    const f = entered(), h = appFromValue(f.value, f.deps), o = observe(h), snapshots: string[] = []
    h.app.subscribe(() => snapshots.push(h.app.getSnapshot().status))
    o.clear(); h.faults.write = true
    const result = commit(h.app, { action: appChoose(h.app, 'combat', '金属管攻击') })
    expect(Object.keys(result).sort()).toEqual(['kind', 'presentation', 'snapshot'])
    expect(result.snapshot.feed).toHaveLength(1)
    expect(Object.keys(result.snapshot.feed[0]).sort()).toEqual(['kind', 'ordinal', 'text'])
    expect(appReady(h.app).persistence.feedback).toBe('save-failed')
    expect(snapshots).toEqual(['busy', 'stable'])
    expect(o.counts()).toMatchObject({ combat: 1, ctb: 1, current: 1, write: 1, batches: 1 })
    const value = h.owner.getState().current, feed = h.app.getSnapshot().feed
    o.clear(); for (let n = 0; n < 4; n++) { h.app.getSnapshot(); h.app.synchronize() }
    expect(Object.values(o.counts()).every(n => n === 0)).toBe(true)
    h.faults.write = false; h.app.retrySave(); expectSaveOnly(o.counts())
    expect(h.owner.getState().current).toBe(value); expect(h.app.getSnapshot().feed).toBe(feed)
    console.log('B-CONTROLLER ' + JSON.stringify({ resultKeys: Object.keys(result), feedKeys: Object.keys(feed[0]), notifications: snapshots, retryCounts: o.counts() }))
  })
  it('cancelled confirmation/draft and stale action produce no commit and no action feed', () => {
    const f = fixture({ hp: 1, bleeding: true }), h = appFromValue(f.value, f.deps), before = counts(h)
    const asked = h.app.execute({ action: appChoose(h.app, 'move', '大厅') })
    expect(asked.kind).toBe('confirmation-required'); h.app.cancel()
    expect(h.app.confirm(asked.confirmation!).kind).toBe('rejected')
    const request = { action: appChoose(h.app, 'medical', '使用药食'), item: appReady(h.app).carried.find(i => i.name === '绷带')!.selector }
    const draft = h.app.beginDraft(request); h.app.cancel(); expect(h.app.executeDraft(draft).kind).toBe('rejected')
    expect(counts(h)).toEqual(before); expect(h.app.getSnapshot().feed).toEqual([])
    commit(h.app, request); const after = counts(h), feed = h.app.getSnapshot().feed
    expect(h.app.execute(request).kind).toBe('rejected'); expect(counts(h)).toEqual(after); expect(h.app.getSnapshot().feed).toBe(feed)
  })
  it('existing BrowserControls forwards coarse results and invalidates after suspend; cold restore has no action feed (headless locks)', async () => {
    const h = browserFixture(), controls = await setup(h)
    browserSend(h.owner, 'depart', '进入封锁区')
    const request = { action: browserChoose(h.owner, 'move', '大厅') }, writes = h.setItem.mock.calls.length
    const result = controls.execute(request)
    expect(result.kind).toBe('committed'); expect(Object.keys(result).sort()).toEqual(['kind', 'snapshot'])
    expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
    const feed = controls.getSnapshot().feed
    controls.synchronize(); controls.retrySave(); expect(controls.getSnapshot().feed).toBe(feed)
    const restored = await cold(h)
    expect(restored.getSnapshot().preplay!.feed).toEqual([])
    expect(() => controls.getSnapshot()).toThrow()
    expect(restored.controls()!.execute(request).kind).toBe('rejected')
    restored.dispose()
  })
})
