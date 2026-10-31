import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCommittedPresentationIssuer, nextPresentationOrdinal, projectCommittedCombatFacts } from './committed-presentation'
import { createPreplayController } from './controller'
import { appChoose, appFromValue, commit, appReady } from './test-fixtures'
import { committedCase } from '../../state/residence-session/player-committed-presentation-test-fixtures'
import { entered } from '../../state/residence-session/combat-test-fixtures'
import { fromValue, ready } from '../../state/residence-session/player-test-fixtures'
import { observe } from '../../state/residence-session/combat-test-observers'
import { expectClosedPresentation, presentationOf } from './committed-presentation-test-fixtures'
import type { PlayerExecution, PlayerView, PlayerReadyView } from '../../state/residence-session/player-types'

afterEach(() => vi.restoreAllMocks())
describe('B1 single completed player-action record', () => {
  it.each([['basic', 'basic-attack'], ['signature', 'signature'], ['temporary', 'temporary-attack'], ['defend', 'defend'],
    ['retreat', 'retreat'], ['quick', 'quick-use']] as const)('K01 K02 K04 native %s has exactly one returned record', (id, action) => {
    const { h, request } = committedCase(id), app = createPreplayController(h), before = ready(h.player), o = observe(h)
    const statuses: string[] = []; app.subscribe(() => statuses.push(app.getSnapshot().status)); o.clear(); h.dispatch.mockClear()
    const p = presentationOf(commit(app, request))
    expectClosedPresentation(p); expect(p.sequence[0].action).toBe(action); expect(p.token.ordinal).toBe(0)
    expect(p.opponent).toEqual(before.combat!.opponent); expect(p.opponent).not.toBe(before.combat!.opponent)
    expect(p.stageBefore).toBe(before.combat!.enemyStage); expect(p.stageAfter).toBe(ready(h.player).combat?.enemyStage ?? null)
    expect(p.stop).toBe(id === 'retreat' ? 'stable-active' : 'battle-decision')
    expect(h.dispatch).toHaveBeenCalledTimes(1); expect(statuses).toEqual(['busy', 'stable'])
    expect(o.counts()).toMatchObject({ combat: 1, ctb: 1, ctbPlan: 1, current: 1, write: 1, batches: 1 })
    expect(app.getSnapshot()).not.toHaveProperty('presentation'); expect(h.player.query()).not.toHaveProperty('committedAction')
    console.log('B1-NATIVE '+JSON.stringify({ id, action, sequenceLength: p.sequence.length, counts: o.counts() }))
  })
  it('K05 native eight-defend temporary attack has two private responses but one public record', () => {
    const { h, request } = committedCase('two-responses'), app = createPreplayController(h), o = observe(h); o.clear()
    const p = presentationOf(commit(app, request)), decision = h.owner.getState().current!.battle!.decision!
    expect(decision.enemyResponses).toBe(2)
    expect(decision.queue.filter(q => q.reason.startsWith('enemy-action-'))).toHaveLength(2)
    expect(decision.trace.filter(t => t.kind === 'direct-damage').map(t => t.actionId)).toEqual(['technician-basic', 'technician-special'])
    expectClosedPresentation(p); expect(p.sequence).toEqual([{ ordinal: 0, actor: { role: 'player' }, action: 'temporary-attack' }])
    expect(o.counts()).toMatchObject({ combat: 1, ctb: 1, current: 1, write: 1, batches: 1 })
    console.log('B1-TWO-RESPONSES '+JSON.stringify({ responses: decision.enemyResponses, publicRecords: p.sequence.length, counts: o.counts() }))
  })
  it.each(['victory', 'death', 'both-zero'] as const)('K07 %s: null after-stage follows the actual stop, not an inferred win', id => {
    const { h, request } = committedCase(id), app = createPreplayController(h), o = observe(h); o.clear()
    const p = presentationOf(commit(app, request)), value = h.owner.getState().current!
    expectClosedPresentation(p); expect(value.battle).toBeNull(); expect(p.stageAfter).toBeNull()
    expect(p.stop).toBe(id === 'victory' ? 'stable-active' : 'dead')
    if (id === 'victory') expect(value.battles.at(-1)!.outcome).toBe('victory')
    else {
      expect(value.phase).toBe('dead'); expect(value.receipts).toHaveLength(1)
      expect(value.battles).toHaveLength(0); expect(o.counts()).toMatchObject({ death: 1, terminate: 1, settle: 1 })
      const d = value.combatDeaths.at(-1)!.decision
      if (id === 'both-zero') { expect(d.enemyHealthAfter).toBe(0); expect(d.trace.at(-1)!.kind).toBe('post-action-bleeding') }
      else expect(d.enemyHealthAfter).toBeGreaterThan(0)
    }
  })
  it.each(['orderly', 'porter', 'technician'] as const)('K03 K08 %s retreat and real reentry bind fresh A facts, not location guessing', enemy => {
    const f = entered(enemy), h = appFromValue(f.value, f.deps), first = h.owner.getState().current!.battle!.entry
    const p = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '退却') }))
    expect(p.opponent.visualKey).toBe('infected-'+enemy); expect(p.stageAfter).toBeNull()
    const destination = h.deps.supply.catalog.data.nodes.find(n => n.id === first.to)!.name
    expect(commit(h.app, { action: appChoose(h.app, 'move', destination) })).not.toHaveProperty('presentation')
    expect(h.owner.getState().current!.battle!.entry.id).not.toBe(first.id)
    const before = appReady(h.app), q = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '防御') }))
    expect(q.opponent).toEqual(before.combat!.opponent); expect(q.stageBefore).toBe(before.combat!.enemyStage)
    expect(q.token.scope).toBe(p.token.scope); expect(q.token.ordinal).toBe(1)
  })
  it('K03 K16 pure safe projection: unknown opponent, poison extras, unavailable and four stop variants', () => {
    const poison = { get privateSeed() { throw new Error('private seed read') }, get trace() { throw new Error('trace read') } }
    const before = { status: 'ready', point: 'battle-decision', combat: { enemyStage: 'incapacitated',
      opponent: { kind: 'unknown', visualKey: null, name: '当前对手' } } } as unknown as PlayerReadyView
    Object.defineProperties(before.combat!, Object.getOwnPropertyDescriptors(poison))
    Object.defineProperties(before.combat!.opponent, Object.getOwnPropertyDescriptors(poison))
    for (const point of ['battle-decision', 'stable-active', 'living-hub', 'dead', 'first-hub'] as const) {
      const view = { status: 'ready', point, combat: null, persistence: { feedback: 'saved' } } as unknown as PlayerView
      Object.defineProperties(view, Object.getOwnPropertyDescriptors(poison))
      const execution: PlayerExecution = { kind: 'committed', committedAction: { action: 'defend' }, preview: null, view }
      Object.defineProperties(execution, Object.getOwnPropertyDescriptors(poison))
      const p = createCommittedPresentationIssuer()(before, execution)!
      expectClosedPresentation(p); expect(p.opponent).toEqual({ kind: 'unknown', visualKey: null, name: '当前对手' })
      expect(p.stageBefore).toBe('incapacitated'); expect(p.stageAfter).toBeNull(); expect(p.stop).toBe(point === 'first-hub' ? 'unavailable' : point)
    }
    const unavailable: PlayerExecution = { kind: 'committed', committedAction: { action: 'defend' }, preview: null,
      view: { status: 'blocked', reason: 'projection-unavailable', persistence: { feedback: 'save-failed' } } }
    expect(projectCommittedCombatFacts(before, unavailable)).toMatchObject({ stop: 'unavailable', stageAfter: null, persistence: 'save-failed' })
    expect(projectCommittedCombatFacts(null, unavailable)).toBeNull()
    expect(projectCommittedCombatFacts(before, { ...unavailable, kind: 'rejected' })).toBeNull()
    expect(projectCommittedCombatFacts(before, { ...unavailable, committedAction: undefined })).toBeNull()
    expect(projectCommittedCombatFacts(before, { ...unavailable, view: { ...unavailable.view, persistence: { feedback: 'not-attempted' } } })).toBeNull()
  })
  it('K08 pure ordinal boundary terminates instead of wrapping; no gameplay or private diagnostic', () => {
    expect(nextPresentationOrdinal(0)).toBe(1); expect(nextPresentationOrdinal(Number.MAX_SAFE_INTEGER - 1)).toBe(Number.MAX_SAFE_INTEGER)
    for (const n of [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, -1, NaN, Infinity, 1.5]) expect(nextPresentationOrdinal(n)).toBeNull()
  })
  it('K04 zero damage in an executed enemy response is not reachable under approved profiles; no profile is changed', () => {
    const { h, request } = committedCase('defend'), app = createPreplayController(h)
    const p = presentationOf(commit(app, request)), decision = h.owner.getState().current!.battle!.decision!
    expect(decision.trace.some(t => t.kind === 'direct-damage' && t.actual > 0)).toBe(true)
    for (const profile of h.deps.profiles) {
      expect(profile.rules.defend.remainingDamagePercent).toBeGreaterThan(0)
      for (const action of profile.actions) expect(action.damage).toBeGreaterThan(profile.rules.heavyCoat.directDamageReduction)
    }
    expectClosedPresentation(p); expect(p.sequence[0].action).toBe('defend')
  })
  it('K04 native zero-damage action with no due enemy response still has exactly the initiating record', () => {
    const f = entered('porter'), h = appFromValue(f.value, f.deps), hp = appReady(h.app).body.hp.current
    const p = presentationOf(commit(h.app, { action: appChoose(h.app, 'combat', '防御') }))
    const d = h.owner.getState().current!.battle!.decision!
    expect(d.enemyResponses).toBe(0); expect(d.trace.filter(t => t.kind === 'direct-damage')).toEqual([])
    expect(appReady(h.app).body.hp.current).toBe(hp); expectClosedPresentation(p); expect(p.sequence[0].action).toBe('defend')
  })
})
