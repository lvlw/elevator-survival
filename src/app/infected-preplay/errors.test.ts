import { describe, expect, it } from 'vitest'
import { playerHarness, counts } from '../../state/residence-session/player-test-fixtures'
import { wrapPlayerSession } from '../../state/residence-session/player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'
import { createPreplayController } from './controller'
import { appChoose, appReady } from './test-fixtures'

describe('F08 projection and programmer failures are not business rejection', () => {
  it('post-commit projection error hides old executable view, preserves current, rethrows and synchronizes without save/replay', () => {
    const h = playerHarness(); let fail = false
    const original = new Error('private-projection-stack-and-identity')
    const ports = wrapPlayerSession(Object.freeze({ ...h.owner, dispatch: h.dispatch }), h.policy, { ...infectedWorldPlayerLabels,
      place: key => { if (fail) throw original; return infectedWorldPlayerLabels.place(key) } })
    const app = createPreplayController(ports)
    app.bootstrap(); app.createFirst(); app.execute({ action: appChoose(app, 'depart', '进入封锁区') })
    const request = { action: appChoose(app, 'move', '大厅') }, n = counts(h), d = h.dispatch.mock.calls.length
    fail = true
    expect(() => app.execute(request)).toThrow(original)
    expect(app.getSnapshot().status).toBe('projection-error'); expect(app.getSnapshot().view).toBeNull()
    expect(app.execute(request).kind).toBe('rejected')
    expect(h.owner.getState().current!.site!.nodeId).toBe('H1')
    expect(h.dispatch).toHaveBeenCalledTimes(d + 1)
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1, notices: n.notices + 1 })
    expect(JSON.stringify(app.getSnapshot())).not.toContain(original.message)
    fail = false; const after = counts(h); app.synchronize()
    expect(appReady(app).location!.name).toBe('大厅'); expect(counts(h)).toEqual(after)
    expect(h.dispatch).toHaveBeenCalledTimes(d + 1)
  })
  it.each(['Error', 'code-shaped', 'AssertionError'])('%s from the actual producer is observable, not swallowed', kind => {
    let error = new Error('private-program-error')
    if (kind === 'AssertionError') { try { expect.fail('private-assertion') } catch (caught) { error = caught as Error } }
    if (kind === 'code-shaped') Object.assign(error, { code: 'NOT_AVAILABLE' })
    const h = playerHarness({ draw: () => { throw error } }), app = createPreplayController(h)
    app.bootstrap(); app.createFirst(); app.execute({ action: appChoose(app, 'depart', '进入封锁区') })
    app.execute({ action: appChoose(app, 'move', '大厅') })
    const before = h.owner.getState().current, n = counts(h)
    expect(() => app.execute({ action: appChoose(app, 'source', '大厅搜索', 'dark') })).toThrow(error)
    expect(h.owner.getState().current).toBe(before); expect(counts(h)).toMatchObject({ writes: n.writes, notices: n.notices, reads: n.reads })
    expect(app.getSnapshot().error!.kind).toBe('execution-uncertain')
    expect(JSON.stringify(app.getSnapshot())).not.toMatch(/private-program|private-assertion|NOT_AVAILABLE/)
  })
})
