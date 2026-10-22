import { afterEach, describe, expect, it, vi } from 'vitest'
import { appHarness, appReady, startApp, appChoose } from './test-fixtures'
import { observe, expectSaveOnly } from '../../state/residence-session/combat-test-observers'
import { fixture, entered, coldRecord, bodyBoundary } from '../../state/residence-session/combat-test-fixtures'
import { wrapPlayerSession } from '../../state/residence-session/player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'
import { planCombatTerminal } from '../../core/residence-combat/controlled'
import { createPreplayController } from './controller'
import { commit, appFromValue } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('F06 F09 save-failed memory and save-only retry', () => {
  it('random successful source commits once; draft meaning survives save-only retry, without reread/reroll/notice', () => {
    const h = appHarness(); startApp(h); h.app.execute({ action: appChoose(h.app, 'move', '大厅') })
    const request = { action: appChoose(h.app, 'source', '大厅搜索', 'dark') }, o = observe(h)
    o.clear(); h.dispatch.mockClear(); h.faults.write = true
    expect(h.app.execute(request).kind).toBe('committed')
    expect(appReady(h.app).persistence.feedback).toBe('save-failed'); expect(appReady(h.app).ground.length).toBeGreaterThan(0)
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    const n: Record<string, number> = o.counts(); expect(n.source).toBe(1); expect(n.draw).toBe(1); expect(n.current).toBe(1); expect(n.write).toBe(1); expect(n.batches).toBe(1)
    const value = h.owner.getState().current, feed = h.app.getSnapshot().feed
    const draft = h.app.beginDraft({ action: appChoose(h.app, 'move', '电梯前室') }), scope = h.preplay.scope()
    h.faults.write = false; o.clear(); h.dispatch.mockClear()
    expect(h.app.retrySave().kind).toBe('updated')
    expectSaveOnly(o.counts()); expect(h.dispatch).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(value); expect(h.preplay.scope()).toBe(scope)
    expect(h.app.getSnapshot().draft!.token).toBe(draft); expect(h.app.getSnapshot().feed).toBe(feed)
    expect(appReady(h.app).persistence.feedback).toBe('saved')
  })
  it('five strict cold stops use pre-existing expected and do not create stock, replay, write or notify', () => {
    const f = fixture(), combat = entered(), doomed = fixture({ hp: 1, bleeding: true })
    const living = planCombatTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value)).snapshot
    const dead = doomed.move(doomed.value, 'H1').snapshot
    const rows = [[f.initial, f.deps, 'first-hub'], [f.value, f.deps, 'stable-active'], [combat.value, combat.deps, 'battle-decision'],
      [living, f.deps, 'living-hub'], [dead, doomed.deps, 'dead']] as const
    for (const [value, deps, point] of rows) {
      // TEST controlled expected is fixed from the native producer before candidate read.
      const h = coldRecord(value, deps), ports = wrapPlayerSession(h.owner, h.policy, infectedWorldPlayerLabels), app = createPreplayController(ports)
      expect(app.getSnapshot().view?.status).toBe('unbootstrapped')
      app.bootstrap(); expect(appReady(app).point).toBe(point); expect(h.owner.getState().current).toEqual(value)
      expect(h.storage.read).toHaveBeenCalledTimes(1); expect(h.coldProvider).toHaveBeenCalledTimes(1)
      expect(h.storage.write).not.toHaveBeenCalled(); expect(h.factory).not.toHaveBeenCalled(); expect(h.draw).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
      expect(app.getSnapshot().feed).toEqual([])
    }
  })
  it.each(['enemy-alive', 'both-zero'] as const)('%s death installs only the final native dead once, including failed save', kind => {
    const f = fixture(); let value = f.value
    if (kind === 'both-zero') {
      value = f.move(value, 'H1').snapshot
      value = f.task(value, 'fire-door', { method: 'crow', toolInstanceId: value.carried.equipment.utility!.instanceId }).snapshot
      // Explicit TEST pre-entry body boundary; enemies, damage and death stay native.
      value = bodyBoundary(value, f.deps, { condition: { ...value.character.body.condition, currentHealth: 6, bleeding: true } })
      value = f.move(value, 'H4').snapshot
      value = f.action(value, { kind: 'metal-pipe-charged-strike' }).snapshot
      value = f.action(value, { kind: 'metal-pipe-basic-attack' }).snapshot
    } else value = entered('orderly', { hp: 1 }).value
    const h = appFromValue(value, f.deps), o = observe(h), command = kind === 'both-zero' ? '金属管攻击' : '防御'
    const installed: string[] = []
    h.owner.subscribe(v => { if (v.current) installed.push(v.current.phase) })
    h.faults.write = true; o.clear(); h.dispatch.mockClear()
    commit(h.app, { action: appChoose(h.app, 'combat', command) })
    const v = h.owner.getState().current!
    expect(v.phase).toBe('dead'); expect(installed).toEqual(['dead']); expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(appReady(h.app).persistence.feedback).toBe('save-failed')
    expect(v.archives.at(-1)!.site.pending.kind).toBe(kind === 'both-zero' ? 'none' : 'combat-required')
    const n: Record<string, number> = o.counts()
    expect(n.ctb).toBe(1); expect(n.death).toBe(1); expect(n.settle).toBe(1); expect(n.current).toBe(1); expect(n.write).toBe(1); expect(n.batches).toBe(1)
    h.faults.write = false; o.clear(); h.dispatch.mockClear(); h.app.retrySave()
    expectSaveOnly(o.counts()); expect(h.dispatch).not.toHaveBeenCalled(); expect(h.owner.getState().current).toBe(v)
    const cold = coldRecord(v, h.deps), ports = wrapPlayerSession(cold.owner, cold.policy, infectedWorldPlayerLabels), app = createPreplayController(ports)
    app.bootstrap(); expect(appReady(app).point).toBe('dead'); expect(cold.storage.write).not.toHaveBeenCalled(); expect(cold.draw).not.toHaveBeenCalled()
  })
})
