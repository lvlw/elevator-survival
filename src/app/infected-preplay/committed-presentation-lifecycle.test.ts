import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPreplayController } from './controller'
import { createCommittedPresentationIssuer } from './committed-presentation'
import { presentationOf, expectClosedPresentation } from './committed-presentation-test-fixtures'
import { appChoose, appFromValue, appReady, commit } from './test-fixtures'
import { entered, fixture, coldRecord } from '../../state/residence-session/combat-test-fixtures'
import { observe, expectSaveOnly } from '../../state/residence-session/combat-test-observers'
import { fromValue, choose, ready } from '../../state/residence-session/player-test-fixtures'
import { committedCase } from '../../state/residence-session/player-committed-presentation-test-fixtures'
import { wrapPlayerSession } from '../../state/residence-session/player-facade'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'
import { planCombatTerminal } from '../../core/residence-combat/controlled'

afterEach(() => vi.restoreAllMocks())
describe('B1 issuance belongs only to the completed direct return', () => {
  it('K08 K10 save failure, continuation, retry and readonly calls never replay or consume an extra ordinal', () => {
    const f = entered(), h = appFromValue(f.value, f.deps), o = observe(h), selection = h.preplay.scope(), disk = h.disk()
    h.faults.write = true; o.clear()
    const first = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '金属管攻击') }))
    expect(first.persistence).toBe('save-failed'); expect(first.token.ordinal).toBe(0); expect(first.token.scope).not.toBe(selection)
    expect(first.token.scope).not.toBe(h.preplay.scope()); expect(h.preplay.scope()).not.toBe(selection)
    const second = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '防御') }))
    expect(second.token).not.toBe(first.token); expect(second.token.scope).toBe(first.token.scope); expect(second.token.ordinal).toBe(1)
    expect(h.disk()).toBe(disk); const latest = h.owner.getState().current, feed = h.app.getSnapshot().feed
    h.faults.write = false; o.clear(); h.dispatch.mockClear()
    expect(h.app.retrySave()).not.toHaveProperty('presentation'); expectSaveOnly(o.counts())
    expect(h.owner.getState().current).toBe(latest); expect(h.saved()!.value).toBe(latest); expect(first.persistence).toBe('save-failed')
    expect(h.app.getSnapshot().feed).toBe(feed); expect(h.dispatch).not.toHaveBeenCalled()
    expect(h.disk()).not.toMatch(/committedAction|presentation|"token"|"scope"|"sequence"/)
    o.clear(); const request = { action: appChoose(h.app, 'combat', '防御') }
    for (let n = 0; n < 3; n++) {
      h.player.query(); h.app.getSnapshot(); h.app.preview(request); h.app.describeAction(request.action)
      expect(h.app.synchronize()).not.toHaveProperty('presentation')
    }
    const draft = h.app.beginDraft(request); h.app.cancel()
    expect(h.app.executeDraft(draft)).not.toHaveProperty('presentation')
    expect(h.app.execute({ action: {} })).not.toHaveProperty('presentation')
    expect(Object.values(o.counts()).every(n => n === 0)).toBe(true)
    const third = presentationOf(commit(h.app, request)); expect(third.token.scope).toBe(first.token.scope); expect(third.token.ordinal).toBe(2)
  })
  it('K02 K11 doubled subscribers, throwing listeners and reentry preserve busy/stable and one direct payload', () => {
    const f = entered(), h = appFromValue(f.value, f.deps), o = observe(h), request = { action: appChoose(h.app, 'combat', '防御') }
    const statuses: string[] = [], nested: unknown[] = [], snapshots: unknown[] = []
    h.app.subscribe(() => { statuses.push(h.app.getSnapshot().status); snapshots.push(h.app.getSnapshot()); nested.push(h.app.execute(request)) })
    h.app.subscribe(() => { throw new Error('TEST presentation listener') })
    h.owner.subscribe(() => { throw new Error('TEST native listener') })
    o.clear(); h.dispatch.mockClear(); const p = presentationOf(commit(h.app, request))
    expectClosedPresentation(p); expect(p.token.ordinal).toBe(0); expect(statuses).toEqual(['busy', 'stable'])
    expect(h.app.listenerFailures()).toBe(2); expect(nested).toHaveLength(2)
    for (const r of nested) { expect(r).toHaveProperty('kind', 'rejected'); expect(r).not.toHaveProperty('presentation') }
    for (const s of snapshots) expect(s).not.toHaveProperty('presentation')
    expect(h.dispatch).toHaveBeenCalledTimes(1); expect(o.counts()).toMatchObject({ ctb: 1, current: 1, write: 1, batches: 1 })
  })
  it('K09 executeDraft and a real protected combat confirm transport only their actual commit', () => {
    const normal = committedCase('basic'), app = createPreplayController(normal.h)
    const draft = app.beginDraft(normal.request), first = presentationOf(app.executeDraft(draft)); expect(first.token.ordinal).toBe(0)
    expect(app.executeDraft(draft)).not.toHaveProperty('presentation')
    const { h, request } = committedCase('both-zero'), protectedApp = createPreplayController(h), o = observe(h); o.clear()
    const metadata = protectedApp.preview(request)
    expect(metadata.confirmation).toEqual({ kind: 'dynamic', reason: 'certain-death-with-alternative' })
    expect(metadata.hasProvenAlternative).toBe(true)
    const asked = protectedApp.execute(request); expect(asked.kind).toBe('confirmation-required'); expect(asked).not.toHaveProperty('presentation')
    expect(Object.values(o.counts()).every(n => n === 0)).toBe(true)
    const p = presentationOf(protectedApp.confirm(asked.confirmation!)); expect(p.stop).toBe('dead'); expect(p.token.ordinal).toBe(0)
    o.clear(); expect(protectedApp.confirm(asked.confirmation!)).not.toHaveProperty('presentation')
    expect(Object.values(o.counts()).every(n => n === 0)).toBe(true)
  })
  it('K09 cancelled, copied, cross-controller and stale real combat confirmations have no payload', () => {
    const { h, request } = committedCase('both-zero'), app = createPreplayController(h), other = createPreplayController(h)
    const ask = app.execute(request); expect(ask.kind).toBe('confirmation-required'); const current = h.owner.getState().current
    expect(other.confirm(ask.confirmation!)).not.toHaveProperty('presentation')
    expect(app.confirm(JSON.parse(JSON.stringify(ask.confirmation)))).not.toHaveProperty('presentation')
    app.cancel(); expect(app.confirm(ask.confirmation!)).not.toHaveProperty('presentation'); expect(h.owner.getState().current).toBe(current)
    const again = app.execute(request); expect(again.kind).toBe('confirmation-required')
    const healing = ready(h.player).combat!.actions.find(a => a.quickConsumption)!
    expect(h.player.execute({ action: healing.selector }).kind).toBe('committed'); app.synchronize()
    const after = h.owner.getState().current; expect(app.confirm(again.confirmation!)).not.toHaveProperty('presentation')
    expect(h.owner.getState().current).toBe(after)
  })
  it('K12 five real v4 cold stops bootstrap/sync without any action, saved token or stock', () => {
    const f = fixture(), combat = entered(), doomed = fixture({ hp: 1, bleeding: true })
    const living = planCombatTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value)).snapshot
    const dead = doomed.move(doomed.value, 'H1').snapshot
    for (const [value, deps, point] of [[f.initial, f.deps, 'first-hub'], [f.value, f.deps, 'stable-active'], [combat.value, combat.deps, 'battle-decision'],
      [living, f.deps, 'living-hub'], [dead, doomed.deps, 'dead']] as const) {
      const h = coldRecord(value, deps), ports = wrapPlayerSession(h.owner, h.policy, labels), app = createPreplayController(ports)
      expect(app.bootstrap()).not.toHaveProperty('presentation'); expect(appReady(app).point).toBe(point)
      expect(app.synchronize()).not.toHaveProperty('presentation'); expect(app.getSnapshot()).not.toHaveProperty('presentation')
      expect(app.getSnapshot().feed).toEqual([]); expect(h.owner.getState().current).toEqual(value)
      expect(h.storage.read).toHaveBeenCalledTimes(1); expect(h.coldProvider).toHaveBeenCalledTimes(1)
      expect(h.factory).not.toHaveBeenCalled(); expect(h.storage.write).not.toHaveBeenCalled(); expect(h.draw).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
      if (point === 'battle-decision') expect(presentationOf(commit(app, { action: appChoose(app, 'combat', '防御') })).token.ordinal).toBe(0)
    }
  })
  it('K05 K08 missing safe prestate consumes no ordinal; a later supported real return starts at zero', () => {
    const f = entered(), h = fromValue(f.value, f.deps), before = ready(h.player), execute = h.player.execute({ action: choose(h.player, 'combat', '防御') })
    const issue = createCommittedPresentationIssuer()
    expect(issue(null, execute)).toBeUndefined(); expect(issue(before, execute)!.token.ordinal).toBe(0)
  })
  it('K05 program failures before execution and after a real commit throw visibly without token or automatic action retry', () => {
    for (const when of ['before', 'after'] as const) {
      const { h, request } = committedCase('basic'), error = new Error('TEST-'+when), o = observe(h)
      let fail = true
      const player = { ...h.player, query: () => { if (fail && when === 'before') { fail = false; throw error }; return h.player.query() },
        execute: (r: unknown) => { const result = h.player.execute(r); if (fail && when === 'after') { fail = false; throw error }; return result } }
      // Construct normally, then arm the query fault for the synchronous execution window.
      fail = false; const app = createPreplayController({ ...h, player }); fail = true; o.clear(); h.dispatch.mockClear()
      expect(() => app.execute(request)).toThrow(error)
      expect(o.counts()).toMatchObject({ current: 1, write: 1 })
      expect(app.getSnapshot().error?.kind).toBe('execution-uncertain')
      const current = h.owner.getState().current; expect(app.execute(request).kind).toBe('rejected'); expect(h.owner.getState().current).toBe(current)
      const next = presentationOf(commit(app, { action: appChoose(app, 'combat', '防御') })); expect(next.token.ordinal).toBe(0)
    }
  })
  it('K05 captures fresh pure query in the synchronous window rather than stale feed snapshot', () => {
    const f = entered(), h = fromValue(f.value, f.deps)
    // Controlled TEST port suppresses only controller invalidation, making the cache deliberately stale.
    const app = createPreplayController({ ...h, player: { ...h.player, subscribe: () => () => {} } })
    const cached = appReady(app).combat!.enemyStage
    h.player.execute({ action: choose(h.player, 'combat', '蓄力打击') })
    const fresh = ready(h.player).combat!.enemyStage; expect(fresh).not.toBe(cached)
    const p = presentationOf(commit(app, { action: choose(h.player, 'combat', '防御') }))
    expect(p.stageBefore).toBe(fresh)
  })
})
