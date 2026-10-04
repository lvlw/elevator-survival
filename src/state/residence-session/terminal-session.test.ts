import { afterEach, describe, expect, it, vi } from 'vitest'
import * as cycle from '../../core/character-cycle'
import * as lifecycle from '../../core/mission-lifecycle/controlled'
import * as location from '../../core/residence-location/controlled'
import * as terminal from '../../core/residence-terminal'
import * as codec from '../residence-save/terminal-index'
import { createTerminalResidenceSession, createResidenceSessionDomain } from './terminal-controlled'
import { assertTerminalLaunchCapacity } from './terminal-launch'
import { firstHarness, initial, fixture, harness, cold, start, launch, request, active, mutable, savedEqualsCurrent, observe, execution } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('C01/C02 explicit composition and real first creation', () => {
  it('actual read-null -> genuine first -> three native launch producers -> one v2 commit per intent', () => {
    const h = firstHarness({ fresh: (s) => {
      Object.assign(s.character.body, { energy: 0, satiety: 1, infectionProgress: 35, suppression: 15 })
      s.character.body.quotasRemaining.suppressant = 0
      Object.assign(s.character.body.condition, { currentHealth: 3, bleeding: true, pendingInfectionExposures: 2 })
      s.warehouse.items.push({ instanceId: 'old-lamp', definitionId: 'lamp', quantity: 1 })
      s.warehouse.itemStates.states.push({ instanceId: 'old-lamp', definitionId: 'lamp', resource: { kind: 'charge', current: 0 } })
    } })
    const e = observe(h)
    expect(() => h.owner.createFirst()).toThrow()
    h.owner.bootstrap(); expect(h.factory).not.toHaveBeenCalled()
    h.owner.createFirst(); const before = h.owner.getState().current!
    const result = h.owner.dispatch(launch(h)); const s = active(h)
    expect(s.character.body).toEqual(before.character.body)
    expect(s.character).toMatchObject({ revision: 1, cycle: 1, clock: { kind: 'active', taskDay: 1, startCycle: 1, execution } })
    for (const key of ['warehouse', 'balance', 'archives', 'receipts', 'dispositions', 'carried', 'itemStates'] as const) expect(s[key]).toEqual(before[key])
    expect(s.site.sources.every((v) => !v.claimed && v.drawIndex === 0)).toBe(true)
    expect(s.site.knowledge.knownEdgeIds).not.toContain('secret')
    expect(result.current).toBe(h.owner.getState().current)
    expect(e.counts()).toEqual({ activate: 1, terminate: 0, cycle: 1, action: 0, establish: 1, move: 0, reveal: 0,
      transfer: 0, rest: 0, terminal: 0, consume: 0, draw: 0, factory: 1, provider: 1, read: 1, write: 2,
      currentReplacements: 2, notificationBatches: 2, listener1: 2, listener2: 2 })
    savedEqualsCurrent(h)
  })
  it('captures ports, policy, factory and provider without freezing caller-owned composition', () => {
    const h = firstHarness(); const raw = { ...execution }; h.provider.mockImplementation(() => raw)
    h.composition.createFirst = vi.fn(() => { throw new Error('replacement') })
    h.composition.provideFirstExecution = vi.fn(() => { throw new Error('replacement') })
    const write = h.storage.port.write; const read = h.storage.port.read
    h.composition.storage = { read: vi.fn(() => { throw new Error('replacement') }), write: vi.fn() }
    start(h); raw.seed = 'changed'
    expect(active(h).site.binding.execution).toEqual(execution)
    expect(Object.isFrozen(raw)).toBe(false); expect(Object.isFrozen(h.composition)).toBe(false)
    expect(write).toHaveBeenCalledTimes(2); expect(read).toHaveBeenCalledTimes(1)
  })
  it('first factory input remains unchanged and unfrozen while committed current is an independent frozen value', () => {
    const h = firstHarness(); const before = structuredClone(h.fresh)
    h.owner.bootstrap(); h.owner.createFirst()
    expect(h.fresh).toEqual(before)
    expect(Object.isFrozen(h.fresh)).toBe(false)
    expect(Object.isFrozen(h.fresh.character.body.condition)).toBe(false)
    const committed = h.owner.getState().current!
    expect(committed).not.toBe(h.fresh)
    expect(Object.isFrozen(committed.character.body.condition)).toBe(true)
    h.fresh.character.body.energy = 1
    expect(committed.character.body.energy).toBe(before.character.body.energy)
    savedEqualsCurrent(h)
  })
  it('real first entry with a living encounter rejects without installing activation or writing a partial site', () => {
    const h = firstHarness({ catalog: (c) => { c.enemies[0].nodeId = c.entryNodeId } })
    h.owner.bootstrap(); h.owner.createFirst(); const before = h.owner.getState().current
    const saved = h.storage.value(); const e = observe(h)
    expect(() => h.owner.dispatch(launch(h))).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_RESULT' }))
    expect(h.owner.getState().current).toBe(before); expect(h.storage.value()).toBe(saved)
    expect(e.counts()).toMatchObject({ activate: 1, cycle: 1, establish: 1, provider: 1, draw: 0,
      currentReplacements: 0, notificationBatches: 0, write: 1, listener1: 1, listener2: 0 })
    expect(before!.missions.every((m) => m.status === 'unaccepted')).toBe(true)
  })
  it.each(['active', 'revision', 'wallet', 'promise', 'class', 'throw'])('rejects invalid first factory %s before commit', (mode) => {
    const h = firstHarness(); const s = mutable(h.fresh)
    if (mode === 'revision') s.character.revision = 1
    if (mode === 'wallet') s.balance = 1
    const a = fixture()
    h.factory.mockImplementation(() => {
      if (mode === 'throw') throw new Error('private')
      return mode === 'active' ? a.value : mode === 'promise' ? Promise.resolve(s) : mode === 'class' ? new (class {})() : s
    })
    h.owner.bootstrap(); expect(() => h.owner.createFirst()).toThrow()
    expect(h.owner.getState()).toMatchObject({ status: 'no-save', current: null })
    expect(h.provider).not.toHaveBeenCalled(); expect(h.storage.port.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
  })
  it('reward capacity uses A query at the exact bound, and actual launch guard rejects before downstream calls', () => {
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst()
    const c = h.policy.terminalConfiguration; const bound = c.config.balance_max - c.config.success_reward
    expect(terminal.queryTerminalRewardCapacity(bound, c)).toBe(true)
    expect(() => assertTerminalLaunchCapacity(bound, c)).not.toThrow()
    expect(() => assertTerminalLaunchCapacity(bound + 1, c)).toThrowError(expect.objectContaining({ code: 'REWARD_CAPACITY' }))
    const guard = vi.spyOn(terminal, 'queryTerminalRewardCapacity').mockReturnValueOnce(false)
    const depart = vi.spyOn(cycle, 'planCharacterCycle'); const activate = vi.spyOn(lifecycle, 'activateMission')
    const establish = vi.spyOn(location, 'establishResidenceLocation')
    expect(() => h.owner.dispatch(launch(h))).toThrowError(expect.objectContaining({ code: 'REWARD_CAPACITY' }))
    expect(guard).toHaveBeenCalledWith(0, c); expect(h.provider).not.toHaveBeenCalled()
    for (const spy of [depart, activate, establish]) expect(spy).not.toHaveBeenCalled()
    expect(h.storage.port.write).toHaveBeenCalledTimes(1)
    // Fault injection proves the ordering of the real launch guard; NOT a legal rich fresh state.
    const bad = firstHarness({ fresh: (s) => { s.balance = bound + 1 } })
    bad.owner.bootstrap(); expect(() => bad.owner.createFirst()).toThrow()
    expect(bad.storage.port.write).not.toHaveBeenCalled(); expect(bad.provider).not.toHaveBeenCalled()
  })
  it.each(['identity', 'commission', 'stale', 'provider-absent'])('launch rejects %s before obtaining execution', (mode) => {
    const h = firstHarness()
    const owner = mode === 'provider-absent' ? createTerminalResidenceSession(createResidenceSessionDomain(),
      { policy: h.policy, storage: h.storage.port, createFirst: h.factory }) : h.owner
    owner.bootstrap(); owner.createFirst()
    const c = mutable(launch({ owner }))
    if (mode === 'identity') c.identity.characterId = 'other'
    if (mode === 'commission') c.commissionId = 'other'
    if (mode === 'stale') c.expectedRevision++
    expect(() => owner.dispatch(c)).toThrow(); expect(h.provider).not.toHaveBeenCalled()
    expect(h.storage.port.write).toHaveBeenCalledTimes(1)
  })
  it.each(['throw', 'promise', 'missing', 'extra', 'padded', 'version', 'getter'])('execution provider %s cannot install partial launch', (mode) => {
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst(); const before = h.owner.getState().current
    const getter = vi.fn(() => 'secret')
    h.provider.mockImplementation(() => {
      if (mode === 'throw') throw new Error('private')
      return mode === 'promise' ? Promise.resolve(execution) : mode === 'missing' ? {} : mode === 'extra' ? { ...execution, result: {} }
        : mode === 'padded' ? { ...execution, seed: ' padded ' } : mode === 'version' ? { ...execution, rulesVersion: 'wrong' }
          : Object.defineProperty({ ...execution }, 'seed', { enumerable: true, get: getter })
    })
    expect(() => h.owner.dispatch(launch(h))).toThrow(); expect(getter).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(before); expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
})

describe('C07 cold lifecycle and no implicit replacement', () => {
  it.each(['{', '{}', 'null', '{"format":"elevator-survival.residence-headless","formatVersion":1,"state":{}}'])
  ('bad or old string %s is blocked, never new; retryRead can install a corrected v2 string', (text) => {
    const f = initial(); const h = harness(f.policy, text)
    expect(h.owner.bootstrap().status).toBe('blocked'); expect(() => h.owner.createFirst()).toThrow()
    expect(h.owner.retryRead().status).toBe('blocked'); expect(h.factory).not.toHaveBeenCalled()
    const good = codec.serializeTerminalResidenceSave(f.fresh, f.policy)
    h.storage.port.read.mockReturnValue(good)
    expect(h.owner.retryRead().current).toEqual(f.fresh)
    expect(h.storage.port.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
    for (const op of [h.owner.retryRead, h.owner.bootstrap, h.owner.createFirst]) expect(op).toThrow()
  })
  it('read-error is not no-save; explicit reread null grants first creation only once', () => {
    const h = firstHarness(); h.storage.readFailure(true)
    expect(h.owner.bootstrap()).toMatchObject({ status: 'read-error', current: null, diagnostic: 'STORAGE_READ_FAILED' })
    expect(() => h.owner.createFirst()).toThrow()
    expect(h.owner.retryRead().status).toBe('read-error'); h.storage.readFailure(false)
    expect(h.owner.retryRead().status).toBe('no-save')
    h.storage.writeFailure(true); h.owner.createFirst(); const s = h.owner.getState().current
    for (const op of [h.owner.retryRead, h.owner.bootstrap, h.owner.createFirst]) expect(op).toThrow()
    expect(h.owner.getState().current).toBe(s); expect(h.factory).toHaveBeenCalledTimes(1)
    expect(h.owner.retrySave().persistence).toBe('save-failed'); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('cold active uses only current, not original factory or mutable compose properties', () => {
    const f = fixture(); const h = cold(f.value, f.policy)
    h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    expect(active(h).site.nodeId).toBe('b'); expect(h.factory).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled()
    savedEqualsCurrent(h)
  })
})
