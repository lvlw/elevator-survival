import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as ordinary from './index'
import * as g2 from '../../core/residence-location'
import * as energy from '../../core/residence-energy'
import * as random from '../../core/random'
import { createResidenceSession, createResidenceSessionDomain } from './controlled'
import type { ResidenceDomain, ResidenceSession } from './types'
import { serializeResidenceSave, validateResidenceAggregate } from '../residence-save'
import { command, currentActive, fixture, harness, memoryStorage, mutable } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('G3 S05/S06 sole controlled owner and cold lifecycle', () => {
  it('creates only after actual read-null; one factory, memory commit, write and notification', () => {
    const h = harness(fixture(), null)
    expect(h.owner.getState().status).toBe('unbootstrapped')
    expect(() => h.owner.createFirst()).toThrow(); expect(h.factory).not.toHaveBeenCalled()
    expect(h.owner.bootstrap().status).toBe('no-save')
    expect(h.listener).not.toHaveBeenCalled(); expect(h.storage.port.write).not.toHaveBeenCalled()
    const result = h.owner.createFirst()
    expect(result).toMatchObject({ kind: 'committed', persistence: 'saved', current: { phase: 'fresh-hub', character: { revision: 0 } } })
    expect(h.factory).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
    expect(() => h.owner.createFirst()).toThrow(); expect(() => h.owner.bootstrap()).toThrow(); expect(() => h.owner.retryRead()).toThrow()
    expect(h.storage.port.read).toHaveBeenCalledTimes(1)
    expect(h.owner.queryKnowledge()).toBeNull()
  })
  it.each(['active', 'revision', 'malformed', 'throw'])('failed first factory %s commits/writes/notifies nothing', (mode) => {
    const f = fixture(); const storage = memoryStorage(null)
    const factory = vi.fn(() => { if (mode === 'throw') throw new Error('private factory')
      return mode === 'active' ? f.active() : mode === 'revision' ? { ...f.fresh(), character: { ...f.fresh().character, revision: 1 } } : {} })
    const owner = createResidenceSession(createResidenceSessionDomain(), { policy: f.policy, storage: storage.port, createFirst: factory })
    const listener = vi.fn(); owner.subscribe(listener); owner.bootstrap()
    expect(() => owner.createFirst()).toThrow(); expect(owner.getState()).toMatchObject({ status: 'no-save', current: null })
    expect(factory).toHaveBeenCalledTimes(1); expect(storage.port.write).not.toHaveBeenCalled(); expect(listener).not.toHaveBeenCalled()
  })
  it('loads current once with no save, revision increment or notification; cannot bootstrap replace', () => {
    const h = harness(); const start = h.owner.bootstrap()
    expect(start.current).toEqual(h.f.active()); expect(start.persistence).toBe('not-attempted')
    h.owner.dispatch(command(currentActive(h)))
    const current = h.owner.getState().current
    expect(() => h.owner.bootstrap()).toThrow(); expect(() => h.owner.createFirst()).toThrow(); expect(() => h.owner.retryRead()).toThrow()
    expect(h.storage.port.read).toHaveBeenCalledTimes(1); expect(h.factory).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(current)
    const old = validateResidenceAggregate(h.f.active(), h.f.policy)
    expect(() => h.owner.dispatch(old)).toThrow(); expect(() => h.owner.dispatch(serializeResidenceSave(old, h.f.policy))).toThrow()
    expect(h.owner.getState().current).toBe(current)
  })
  it('same domain cannot create a second writer; plain look-alikes are not domains', () => {
    const h = harness()
    expect(() => createResidenceSession(h.domain, h.composition)).toThrowError(expect.objectContaining({ code: 'DOMAIN_CLAIMED' }))
    expect(() => createResidenceSession({} as ResidenceDomain, h.composition)).toThrowError(expect.objectContaining({ code: 'INVALID_DOMAIN' }))
    expect(h.storage.port.read).not.toHaveBeenCalled()
  })
  it.each(['{', 'null', '{}', '{"saveFormatVersion":2}'])('bad stored %s is blocked, never new', (text) => {
    const h = harness(fixture(), text)
    expect(h.owner.bootstrap()).toMatchObject({ status: 'blocked', current: null })
    expect(() => h.owner.createFirst()).toThrow(); expect(() => h.owner.retryRead()).toThrow()
    expect(h.factory).not.toHaveBeenCalled(); expect(h.storage.value()).toBe(text)
    expect(h.listener).not.toHaveBeenCalled(); expect(h.storage.port.write).not.toHaveBeenCalled()
  })
  it('read-error can only retry an actual read; no implicit no-save permission', () => {
    const h = harness(fixture(), null); h.storage.readFailure(true)
    expect(h.owner.bootstrap()).toMatchObject({ status: 'read-error', diagnostic: 'STORAGE_READ_FAILED', current: null })
    expect(() => h.owner.createFirst()).toThrow(); expect(() => h.owner.bootstrap()).toThrow()
    expect(h.owner.retryRead().status).toBe('read-error')
    h.storage.readFailure(false); expect(h.owner.retryRead().status).toBe('no-save')
    h.owner.createFirst(); expect(h.storage.port.read).toHaveBeenCalledTimes(3)
  })
  it('retry-read installs a real saved active only once without creation or writes', () => {
    const h = harness(); h.storage.readFailure(true); h.owner.bootstrap()
    h.storage.readFailure(false); expect(h.owner.retryRead().current).toEqual(h.f.active())
    expect(() => h.owner.retryRead()).toThrow(); expect(h.storage.port.read).toHaveBeenCalledTimes(2)
    expect(h.factory).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled(); expect(h.storage.port.write).not.toHaveBeenCalled()
  })
  it('busy covers read and factory callbacks before any recursive IO or second creation', () => {
    const h = harness(fixture(), null)
    h.storage.hooks.read = () => {
      for (const op of [h.owner.bootstrap, h.owner.createFirst, h.owner.retryRead, h.owner.retrySave]) {
        expect(op).toThrowError(expect.objectContaining({ code: 'BUSY' }))
      }
      expect(h.owner.getState().current).toBeNull()
    }
    h.owner.bootstrap()
    h.factory.mockImplementation(() => { expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'BUSY' })); return h.f.fresh() })
    h.owner.createFirst()
    expect(h.storage.port.read).toHaveBeenCalledTimes(1); expect(h.factory).toHaveBeenCalledTimes(1)
  })
})

describe('G3 S07/S08/S10 move and query boundary', () => {
  it.each(['null', 'array', 'class', 'missing-edge', 'stale', 'seed', 'identity'])('rejects malformed/bound request %s before rules', (mode) => {
    const h = harness(); h.owner.bootstrap(); const request = mutable(command(currentActive(h)))
    if (mode === 'missing-edge') Reflect.deleteProperty(request, 'edgeId')
    if (mode === 'stale') request.expectedRevision++
    if (mode === 'seed') request.binding.execution.seed = 'wrong'
    if (mode === 'identity') request.binding.identity.characterId = 'wrong'
    const plan = vi.spyOn(g2, 'planResidenceMove')
    const before = h.owner.getState().current
    expect(() => h.owner.dispatch(mode === 'null' ? null : mode === 'array' ? [] : mode === 'class' ? new (class {})() : request)).toThrow()
    expect(plan).not.toHaveBeenCalled(); expect(h.owner.getState().current).toBe(before)
    expect(h.storage.port.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
  })
  it('returned state and copied command are frozen without freezing caller command', () => {
    const h = harness(); h.owner.bootstrap(); const raw = mutable(command(currentActive(h)))
    const parsed = ordinary.createResidenceSessionCommand(raw)
    if (parsed.kind !== 'move') throw new Error('move command expected')
    expect(parsed).not.toBe(raw); expect(Object.isFrozen(parsed.binding.execution)).toBe(true); expect(Object.isFrozen(raw)).toBe(false)
    expect(() => Reflect.set(currentActive(h).character.body, 'energy', 0)).not.toThrow()
    expect(currentActive(h).character.body.energy).toBe(100)
    raw.binding.execution.seed = 'changed'
    h.owner.dispatch(parsed)
    expect(currentActive(h).site.binding.execution.seed).toBe(h.f.state.site.binding.execution.seed)
  })
  it('real G2 move commits one aggregate; complete equality survives string reload', () => {
    const h = harness(); h.owner.bootstrap()
    const plan = vi.spyOn(g2, 'planResidenceMove')
    const result = h.owner.dispatch(command(currentActive(h)))
    expect(result.current).toMatchObject({ phase: 'active-world', character: { revision: 1, body: { energy: 92 } }, site: { nodeId: 'b' } })
    expect(result.current.character.identity).toEqual(h.f.state.character.identity)
    expect(plan).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
    const cold = harness(h.f, h.storage.value()); expect(cold.owner.bootstrap().current).toEqual(result.current)
    expect(cold.storage.port.write).not.toHaveBeenCalled(); expect(cold.listener).not.toHaveBeenCalled()
  })
  it('E1 cost8 commits E0 and one bleed; next edge rejects without new primary effects/save/notify', () => {
    const h = harness(fixture({ energy: 1, bleeding: true })); h.owner.bootstrap()
    const body = vi.spyOn(energy, 'planResidenceAction')
    h.owner.dispatch(command(currentActive(h)))
    expect(currentActive(h).character.body).toMatchObject({ energy: 0, condition: { currentHealth: 11 } })
    const before = h.owner.getState().current
    expect(() => h.owner.dispatch(command(currentActive(h), 'ba'))).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(h.owner.getState().current).toBe(before); expect(body).toHaveBeenCalledTimes(2)
    expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it.each(['unknown', 'secret', 'cb', 'ba'])('core rejects edge %s with zero save/notification', (edgeId) => {
    const h = harness(); h.owner.bootstrap(); const before = h.owner.getState().current
    expect(() => h.owner.dispatch(command(currentActive(h), edgeId))).toThrow()
    expect(h.owner.getState().current).toBe(before); expect(h.storage.port.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
  })
  it.each(['view', 'close', 'combat', 'medical'])('does not dispatch unsupported %s', (kind) => {
    const h = harness(); h.owner.bootstrap(); const plan = vi.spyOn(g2, 'planResidenceMove')
    expect(() => h.owner.dispatch({ ...command(currentActive(h)), kind })).toThrow()
    expect(plan).not.toHaveBeenCalled(); expect(h.storage.port.write).not.toHaveBeenCalled()
  })
  it.each(['snapshot', 'cost', 'effects', 'eligible', 'business_supported', 'nextState', 'edgeIds', 'force'])('rejects request injection %s before plan', (key) => {
    const h = harness(); h.owner.bootstrap(); const plan = vi.spyOn(g2, 'planResidenceMove')
    expect(() => h.owner.dispatch({ ...command(currentActive(h)), [key]: true })).toThrow()
    expect(plan).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
  })
  it('queries/subscriptions are immutable, side-effect free and exclude hidden truth', () => {
    const h = harness(fixture({ energy: 0 })); h.owner.bootstrap()
    const plan = vi.spyOn(g2, 'planResidenceMove'); const draw = vi.spyOn(random, 'drawIntInclusive')
    const before = h.owner.getState().current; const listener = vi.fn(); const cancel = h.owner.subscribe(listener)
    for (let i = 0; i < 3; i++) {
      const query = h.owner.queryKnowledge(); const text = JSON.stringify(query)
      for (const key of ['seed', 'execution', 'riskDrawIndex', 'currentHealth', 'itemStates', 'secret', 'guard']) expect(text).not.toContain(key)
      expect(Object.isFrozen(query?.nodes)).toBe(true)
    }
    cancel(); expect(listener).not.toHaveBeenCalled(); expect(h.owner.getState().current).toBe(before)
    expect(plan).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled(); expect(h.storage.port.write).not.toHaveBeenCalled()
    expectTypeOf<ResidenceSession>().not.toHaveProperty('setState')
    for (const key of ['replace', 'setState', 'loadRaw', 'installCandidate', 'initialState']) expect(h.owner).not.toHaveProperty(key)
    expect(Object.keys(ordinary).sort()).toEqual(['ResidenceSessionError', 'createResidenceSessionCommand'])
  })
})
