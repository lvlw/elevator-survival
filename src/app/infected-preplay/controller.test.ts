import { describe, expect, it, vi } from 'vitest'
import { appHarness, startApp, appChoose, appReady, commit } from './test-fixtures'
import { counts } from '../../state/residence-session/player-test-fixtures'
import { playerHarness } from '../../state/residence-session/player-test-fixtures'
import { createPreplayController } from './controller'

describe('F04 F06 explicit stable application update', () => {
  it('construction and repeated reads/subscriptions do not bootstrap or change cached snapshot', () => {
    const h = appHarness(), before = counts(h), s = h.app.getSnapshot(), listener = vi.fn()
    const off = h.app.subscribe(listener)
    for (let i = 0; i < 8; i++) expect(h.app.getSnapshot()).toBe(s)
    off(); expect(counts(h)).toEqual(before); expect(listener).not.toHaveBeenCalled(); expect(h.factory).not.toHaveBeenCalled()
  })
  it('one execute gives one S dispatch/write/notice, busy then final complete ready; callback reentry rejected', () => {
    const h = appHarness(); startApp(h)
    const request = { action: appChoose(h.app, 'move', '大厅') }, before = counts(h), dispatch = h.dispatch.mock.calls.length
    const phases: string[] = [], attempted: string[] = []
    h.app.subscribe(() => { phases.push(h.app.getSnapshot().status); attempted.push(h.app.execute(request).kind) })
    h.hooks.write = () => { expect(h.player.query().status).toBe('blocked'); attempted.push(h.app.execute(request).kind) }
    expect(h.app.execute(request).kind).toBe('committed')
    expect(phases).toEqual(['busy', 'stable']); expect(attempted.every(k => k === 'rejected')).toBe(true)
    expect(counts(h)).toEqual({ ...before, writes: before.writes + 1, notices: before.notices + 1 })
    expect(h.app.getSnapshot().view?.status).toBe('ready')
    expect(h.dispatch).toHaveBeenCalledTimes(dispatch + 1); expect(appReady(h.app).location!.name).toBe('大厅')
    expect(h.app.getSnapshot().feed).toHaveLength(2)
    expect(h.app.execute(request).kind).toBe('rejected'); expect(h.dispatch).toHaveBeenCalledTimes(dispatch + 1)
  })
  it('one explicit intent calls player.execute exactly once, independently of S stale-command protection', () => {
    const h = playerHarness(), execute = vi.fn(h.player.execute)
    const app = createPreplayController({ ...h, player: Object.freeze({ ...h.player, execute }) })
    app.bootstrap(); app.createFirst(); app.execute({ action: appChoose(app, 'depart', '进入封锁区') })
    execute.mockClear(); h.dispatch.mockClear()
    expect(app.execute({ action: appChoose(app, 'move', '大厅') }).kind).toBe('committed')
    expect(execute).toHaveBeenCalledTimes(1); expect(h.dispatch).toHaveBeenCalledTimes(1)
  })
  it('throwing presentation listener is counted and isolated, never a second settlement', () => {
    const h = appHarness(); startApp(h)
    h.app.subscribe(() => { throw new Error('listener-private-detail') })
    const n = counts(h); commit(h.app, { action: appChoose(h.app, 'move', '大厅') })
    expect(h.app.listenerFailures()).toBe(2)
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1, notices: n.notices + 1 })
    expect(JSON.stringify(h.app.getSnapshot())).not.toContain('listener-private-detail')
  })
})
