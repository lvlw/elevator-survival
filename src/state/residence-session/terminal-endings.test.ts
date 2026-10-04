import { afterEach, describe, expect, it, vi } from 'vitest'
import * as g2 from '../../core/residence-location'
import * as terminal from '../../core/residence-terminal/controlled'
import * as codec from '../residence-save/terminal-index'
import { locationOf } from '../../core/residence-terminal/authority'
import { firstHarness, fixture, cold, start, request, active, rejectUnchanged, savedEqualsCurrent, observe, mutable, normal } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('C04 explicit A terminal intents', () => {
  it.each([1, 7].flatMap((day) => [false, true].map((complete) => ({ day, complete }))))('H0 day $day complete=$complete retains actual G1 steps=[]', ({ day, complete }) => {
    const f = fixture({ day, complete, balance: 47, bleeding: true })
    const h = cold(f.value, f.policy); const before = active(h); const e = observe(h)
    expect(h.owner.queryTerminalEligibility()).toEqual({ deliver: complete, withdraw: !complete, deadline: false })
    rejectUnchanged(h, request(h, complete ? 'withdraw' : 'deliver'), 'NOT_AVAILABLE')
    rejectUnchanged(h, request(h, 'deadline'), 'NOT_AVAILABLE')
    const result = h.owner.dispatch(request(h, complete ? 'deliver' : 'withdraw'))
    expect(result.current.phase).toBe('living-hub')
    expect(result.current.character.body).toEqual(before.character.body)
    expect(result.current.character.cycle).toBe(before.character.cycle)
    expect(result.current.character.revision).toBe(before.character.revision + 1)
    expect(result.current.character.clock.kind).toBe('return-due')
    expect(result.current.receipts.at(-1)).toMatchObject({ steps: [], source: 'normal-return', outcome: complete ? 'success' : 'voluntary-failure' })
    expect(result.current.balance).toBe(complete ? 47 + f.dependencies.configuration.config.success_reward : 27)
    expect(e.spies.cycle).toHaveBeenCalledTimes(1); expect(e.spies.terminate).toHaveBeenCalledTimes(1); expect(e.spies.draw).not.toHaveBeenCalled()
    expect(e.counts()).toMatchObject({ currentReplacements: 1, write: 1, notificationBatches: 1, listener1: 1, listener2: 1 })
    expect(h.owner.queryKnowledge()).toBeNull()
    expect(h.owner.queryTerminalEligibility()).toEqual({ deliver: false, withdraw: false, deadline: false })
    savedEqualsCurrent(h)
    const text = h.storage.value()
    for (const kind of ['deliver', 'withdraw', 'deadline', 'rest', 'move']) {
      expect(() => h.owner.dispatch({ kind, binding: before.site.binding, expectedRevision: result.current.character.revision,
        ...(kind === 'move' ? { edgeId: 'ab' } : {}) })).toThrow()
    }
    expect(h.storage.value()).toBe(text)
  })
  it.each(['alive', 'bleeding', 'infection', 'hunger'])('actual Day7 remote deadline %s preserves source and short-circuit order', (cause) => {
    const f = fixture({ day: 7, node: 'b', balance: 47, hp: cause === 'alive' ? 12 : cause === 'bleeding' ? 2 : 1,
      bleeding: cause === 'bleeding', infection: cause === 'infection' ? 60 : 0, satiety: cause === 'hunger' ? 1 : 6 })
    const h = cold(f.value, f.policy); const e = observe(h)
    expect(h.owner.queryTerminalEligibility().deadline).toBe(true)
    const r = h.owner.dispatch(request(h, 'deadline'))
    const alive = cause === 'alive'
    expect(r.current.phase).toBe(alive ? 'living-hub' : 'dead')
    expect(r.current.balance).toBe(alive ? 27 : 0)
    expect(r.current.character.cycle).toBe(alive ? 8 : 7)
    expect(r.current.character.clock.kind).toBe(alive ? 'deadline-ready' : 'active')
    expect(r.current.receipts.at(-1)).toMatchObject({ source: 'deadline', outcome: alive ? 'deadline-failure' : 'death',
      deathCause: alive ? null : cause === 'bleeding' ? 'cycle-bleeding' : cause })
    const kinds = r.current.receipts.at(-1)!.steps.map((s) => s.kind)
    expect(kinds).toEqual(cause === 'bleeding' ? ['cycle-bleeding'] : cause === 'infection' ? ['cycle-bleeding', 'infection']
      : cause === 'hunger' ? ['cycle-bleeding', 'infection', 'hunger'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(e.counts()).toMatchObject({ cycle: 1, terminal: 1, consume: 0, terminate: 1, draw: 0, currentReplacements: 1, write: 1, notificationBatches: 1 })
    savedEqualsCurrent(h)
  })
  it('non-Day7 deadline rejects without a body cycle', () => {
    const f = fixture({ day: 6, node: 'b' }); const h = cold(f.value, f.policy); const e = observe(h)
    rejectUnchanged(h, request(h, 'deadline'), 'NOT_AVAILABLE'); expect(e.spies.cycle).not.toHaveBeenCalled()
  })
})

describe('C05 original native G2 death is fully consumed, never healed or replayed', () => {
  it.each(['move', 'reveal-fixed', 'reveal-random', 'rest-A', 'rest-C', 'infection', 'hunger', 'arrival', 'arrival-pending'])
  ('real first chain closes %s death with exactly one revision and one complete save', (cause) => {
    const rest = ['rest-A', 'rest-C', 'infection', 'hunger'].includes(cause)
    const h = firstHarness({ catalog: (c) => {
      if (cause === 'rest-C') c.entryNodeId = 'b'
      if (cause.startsWith('arrival')) c.edges[0].arrival.healthLoss = 1
      if (cause === 'arrival-pending') c.enemies[0].nodeId = 'b'
    }, fresh: (s) => {
      s.character.body.condition.currentHealth = cause.startsWith('rest') ? 2 : 1
      s.character.body.condition.bleeding = ['move', 'reveal-fixed', 'reveal-random', 'rest-A', 'rest-C'].includes(cause)
      if (cause === 'infection') s.character.body.infectionProgress = 60
      if (cause === 'hunger') s.character.body.satiety = 1
    } })
    start(h); const before = active(h); const e = observe(h)
    const kind = rest ? 'rest' : cause.startsWith('reveal') ? 'reveal' : 'move'
    const r = h.owner.dispatch(request(h, kind, rest ? {} : kind === 'reveal' ? { sourceId: cause === 'reveal-random' ? 'lottery-a' : 'fixed' } : { edgeId: 'ab' }))
    expect(r.current.phase).toBe('dead'); expect(r.current.site).toBeNull()
    expect(r.current.character.body.condition.currentHealth).toBe(0)
    expect(r.current.character.revision).toBe(before.character.revision + 1)
    expect(r.current.character.cycle).toBe(before.character.cycle)
    expect(r.current.character.clock).toEqual(before.character.clock)
    expect(r.current.receipts.at(-1)).toMatchObject({ outcome: 'death', source: 'location-death', penalty: 0, reward: 0 })
    const original = e.spies.consume.mock.calls[0][1]
    expect(original.coordination).toBe('death-required')
    const producer = rest ? e.spies.rest : kind === 'reveal' ? e.spies.reveal : e.spies.move
    expect(original).toBe(producer.mock.results[0].value)
    expect(e.spies.consume.mock.calls[0][0]).toEqual(h.listener.mock.calls[1][0].current)
    expect(r.current.receipts.at(-1)!.steps).toEqual(original.steps)
    if (cause === 'arrival-pending') expect(r.current.archives.at(-1)!.site.pending.kind).toBe('combat-required')
    if (kind === 'reveal') {
      expect(r.current.archives.at(-1)!.site.sources.find((s) => s.id === (cause === 'reveal-random' ? 'lottery-a' : 'fixed'))!.claimed).toBe(true)
      expect(r.current.archives.at(-1)!.site.ground[0].items.length).toBeGreaterThan(0)
    }
    expect(e.counts()).toMatchObject({ cycle: rest ? 1 : 0, action: rest ? 0 : 1, consume: 1, terminal: 0, terminate: 1,
      draw: cause === 'reveal-random' ? 1 : 0, currentReplacements: 1, notificationBatches: 1 })
    expect(producer).toHaveBeenCalledTimes(1); savedEqualsCurrent(h)
    const dead = h.owner.getState().current; const plans = e.plans()
    expect(() => h.owner.dispatch({ kind: 'withdraw', binding: before.site.binding, expectedRevision: dead!.character.revision })).toThrow()
    expect(e.plans()).toEqual(plans)
    expect(h.owner.getState().current).toBe(dead)
  })
})

describe('C06 signed full plans and pre-encoding before sole commit', () => {
  it.each(['copied', 'foreign-base', 'malformed'])('rejects %s G2 proposal without committing any partial state', (mode) => {
    const f = fixture(); const h = cold(f.value, f.policy)
    const other = fixture({ hp: 11 })
    const before = locationOf(active(h))
    const source = mode === 'foreign-base' ? locationOf(other.value) : before
    const plan = g2.planResidenceMove(source, request(h, 'move', { edgeId: 'ab' }),
      mode === 'foreign-base' ? other.authorityFor(source) : f.authorityFor(before), f.locationDependencies)
    vi.spyOn(g2, 'planResidenceMove').mockReturnValueOnce(mode === 'foreign-base' ? plan : mode === 'copied' ? mutable(plan) : { ...plan, steps: [] })
    rejectUnchanged(h, request(h, 'move', { edgeId: 'ab' }), 'STALE_PLAN')
  })
  it('copied A plan is not a capability even with byte-identical result', () => {
    const f = fixture(); const h = cold(f.value, f.policy)
    const p = terminal.planResidenceTerminal(f.value, request(h, 'withdraw'), f.authorize(f.value))
    vi.spyOn(terminal, 'planResidenceTerminal').mockReturnValueOnce(mutable(p))
    rejectUnchanged(h, request(h, 'withdraw'), 'UNISSUED_PLAN')
  })
  it.each(['move', 'withdraw', 'death'])('%s complete output encoding failure has no current/save/notice', (kind) => {
    const f = fixture({ hp: kind === 'death' ? 1 : 12, bleeding: kind === 'death' })
    const h = cold(f.value, f.policy); const old = h.owner.getState().current
    vi.spyOn(codec, 'serializeTerminalResidenceSave').mockImplementationOnce(() => { throw new Error('controlled encoding fault') })
    rejectUnchanged(h, request(h, kind === 'withdraw' ? 'withdraw' : 'move', kind === 'withdraw' ? {} : { edgeId: 'ab' }))
    expect(h.owner.getState().current).toBe(old)
  })
  it('malformed B candidate cannot be installed by an ordinary command', () => {
    const f = fixture(); const h = cold(f.value, f.policy)
    rejectUnchanged(h, normal(f)); rejectUnchanged(h, { kind: 'install', candidate: normal(f) })
    expect(Object.isFrozen(h.owner.getState().current!.character.body)).toBe(true)
  })
})
