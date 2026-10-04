import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as ordinary from './terminal-index'
import * as controlled from './terminal-controlled'
import * as oldApi from './controlled'
import { firstHarness as oldFirst } from './test-fixtures'
import type { ResidenceDomain } from './types'
import type { TerminalResidenceComposition, TerminalResidenceSession, TerminalResidenceSessionCommand } from './terminal-types'
import { firstHarness, start, launch, request, active, fixture, cold, mutable, observe } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('C01/C11 shared domain and exact interfaces', () => {
  it('ordinary/controlled entrypoints have exactly the specified two values; all nine commands are explicit', () => {
    expect(Object.keys(ordinary).sort()).toEqual(['TerminalResidenceSessionError', 'createTerminalResidenceSessionCommand'])
    expect(Object.keys(controlled).sort()).toEqual(['createResidenceSessionDomain', 'createTerminalResidenceSession'])
    expectTypeOf<TerminalResidenceSessionCommand['kind']>().toEqualTypeOf<'launch' | 'move' | 'reveal' | 'pickup' | 'drop' | 'rest' | 'deliver' | 'withdraw' | 'deadline'>()
    expectTypeOf<TerminalResidenceSession>().not.toHaveProperty('setState')
    expectTypeOf<TerminalResidenceComposition>().not.toHaveProperty('supported')
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst()
    const first = launch(h); h.owner.dispatch(first)
    const commands = [first, request(h, 'move', { edgeId: 'ab' }), request(h, 'reveal', { sourceId: 'fixed' }),
      request(h, 'pickup', { instanceId: 'actual', placement: { x: 0, y: 0, rotated: false } }), request(h, 'drop', { instanceId: 'actual' }),
      ...['rest', 'deliver', 'withdraw', 'deadline'].map((kind) => request(h, kind))]
    for (const c of commands) {
      const parsed = ordinary.createTerminalResidenceSessionCommand(c)
      expect(parsed).toEqual(c); expect(parsed).not.toBe(c); expect(Object.isFrozen(parsed)).toBe(true); expect(Object.isFrozen(c)).toBe(false)
      for (const key of ['snapshot', 'authority', 'outcome', 'plan', 'effects', 'supported', 'business_supported', 'close', 'patch', 'nextState', 'savePolicy']) {
        expect(() => ordinary.createTerminalResidenceSessionCommand({ ...c, [key]: true })).toThrow()
      }
    }
    for (const key of ['setState', 'installCandidate', 'replace', 'loadRaw', 'close', 'grant', 'dispose']) expect(h.owner).not.toHaveProperty(key)
  })
  it.each(['null', 'array', 'class', 'unknown', 'missing', 'getter', 'symbol', 'fraction', 'unsafe'])
  ('command boundary rejects %s before any producer', (mode) => {
    const h = firstHarness(); start(h); const e = observe(h)
    const getter = vi.fn(() => 'move')
    const c = request(h, 'move', { edgeId: 'ab' })
    const raw = mode === 'null' ? null : mode === 'array' ? [] : mode === 'class' ? new (class {})()
      : mode === 'unknown' ? { ...c, kind: 'view' } : mode === 'missing' ? { kind: 'deliver' }
        : mode === 'getter' ? Object.defineProperty({ ...c }, 'kind', { get: getter, enumerable: true })
          : mode === 'symbol' ? { ...c, [Symbol('hidden')]: true }
            : { ...c, expectedRevision: mode === 'fraction' ? 0.5 : Number.MAX_SAFE_INTEGER + 1 }
    expect(() => h.owner.dispatch(raw)).toThrow()
    expect(getter).not.toHaveBeenCalled(); expect(e.spies.move).not.toHaveBeenCalled()
    expect(e.counts().currentReplacements).toBe(0)
  })
  it.each(['v1-first', 'v2-first'])('one issued domain, one writer across %s order', (order) => {
    const v1 = oldFirst(); const v2 = firstHarness()
    expect(oldApi.createResidenceSessionDomain).toBe(controlled.createResidenceSessionDomain)
    if (order === 'v1-first') {
      expect(() => controlled.createTerminalResidenceSession(v1.domain, v2.composition)).toThrowError(expect.objectContaining({ code: 'DOMAIN_CLAIMED' }))
    } else expect(() => oldApi.createResidenceSession(v2.domain, v1.composition)).toThrowError(expect.objectContaining({ code: 'DOMAIN_CLAIMED' }))
    for (const clone of [{}, { ...v2.domain }, structuredClone(v2.domain)]) {
      expect(() => controlled.createTerminalResidenceSession(clone as ResidenceDomain, v2.composition)).toThrowError(expect.objectContaining({ code: 'INVALID_DOMAIN' }))
    }
    expect(v1.storage.port.read).not.toHaveBeenCalled(); expect(v2.storage.port.read).not.toHaveBeenCalled()
  })
  it.each(['v1', 'v2'])('same-type %s construction also refuses a second owner without reading storage', (kind) => {
    if (kind === 'v1') {
      const h = oldFirst()
      expect(() => oldApi.createResidenceSession(h.domain, h.composition)).toThrowError(expect.objectContaining({ code: 'DOMAIN_CLAIMED' }))
      expect(h.storage.port.read).not.toHaveBeenCalled()
    } else {
      const h = firstHarness()
      expect(() => controlled.createTerminalResidenceSession(h.domain, h.composition)).toThrowError(expect.objectContaining({ code: 'DOMAIN_CLAIMED' }))
      expect(h.storage.port.read).not.toHaveBeenCalled()
    }
  })
  it.each(['policy', 'missing-port', 'async-read', 'async-write', 'async-factory', 'async-provider', 'getter', 'extra'])
  ('invalid composition %s does not claim a domain or invoke callbacks', (mode) => {
    const h = firstHarness(); const domain = controlled.createResidenceSessionDomain()
    const input: Record<string, unknown> = { ...h.composition }
    const getter = vi.fn(() => h.policy)
    if (mode === 'policy') input.policy = { ...h.policy }
    if (mode === 'missing-port') input.storage = { read: h.storage.port.read }
    if (mode === 'async-read') input.storage = { read: async () => null, write: h.storage.port.write }
    if (mode === 'async-write') input.storage = { read: h.storage.port.read, write: async () => {} }
    if (mode === 'async-factory') input.createFirst = async () => h.fresh
    if (mode === 'async-provider') input.provideFirstExecution = async () => ({})
    if (mode === 'getter') Object.defineProperty(input, 'policy', { get: getter, enumerable: true })
    if (mode === 'extra') input.supported = true
    expect(() => controlled.createTerminalResidenceSession(domain, input as TerminalResidenceComposition)).toThrow()
    expect(() => controlled.createTerminalResidenceSession(domain, h.composition)).not.toThrow()
    expect(getter).not.toHaveBeenCalled(); expect(h.storage.port.read).not.toHaveBeenCalled()
    expect(h.factory).not.toHaveBeenCalled()
  })
  it('plain Promise-returning read is blocked and write cannot falsely report synchronous success', () => {
    const h = firstHarness()
    // Deliberate runtime contract violations, not production async support.
    h.storage.port.read.mockImplementationOnce((() => Promise.resolve(null)) as unknown as () => null)
    expect(h.owner.bootstrap().status).toBe('blocked')
    expect(() => h.owner.createFirst()).toThrow()
    expect(h.owner.retryRead().status).toBe('no-save')
    h.storage.port.write.mockImplementationOnce((() => Promise.resolve()) as unknown as () => void)
    expect(h.owner.createFirst().persistence).toBe('save-failed')
    expect(h.owner.getState().current?.phase).toBe('fresh-hub')
  })
})

describe('C11 player queries are not headless diagnostic state', () => {
  it('different hidden seed/enemy HP/infection preserve the same safe knowledge and terminal eligibility', () => {
    const a = firstHarness(); const b = firstHarness()
    b.provider.mockImplementation(() => ({ runId: 'different', seed: 'different-secret', rulesVersion: b.policy.rulesVersion }))
    start(a); start(b)
    const s = mutable(b.owner.getState().current!)
    if (s.phase !== 'active-world' || !s.site) throw new Error('fixture')
    s.site.enemies[0].state.currentHealth = 2; s.site.enemies[0].state.hasBeenEncountered = true
    s.character.body.infectionProgress = 29
    const other = cold(s, b.policy)
    expect(a.owner.queryKnowledge()).toEqual(other.owner.queryKnowledge())
    expect(a.owner.queryTerminalEligibility()).toEqual(other.owner.queryTerminalEligibility())
    expect(a.owner.getState().current).not.toEqual(other.owner.getState().current)
    const e = observe(a); const before = a.owner.getState().current
    for (let i = 0; i < 3; i++) {
      const text = JSON.stringify([a.owner.queryKnowledge(), a.owner.queryTerminalEligibility()])
      for (const secret of ['seed', 'runId', 'configurationId', 'infectionProgress', 'riskDrawIndex', 'currentHealth', 'itemStates', 'secret', 'guard']) {
        expect(text).not.toContain(secret)
      }
    }
    expect(a.owner.getState().current).toBe(before); expect(e.spies.draw).not.toHaveBeenCalled()
    expect(e.counts().currentReplacements).toBe(0)
    expect(active(a).character.clock.kind).toBe('active')
  })
  it('pending live input is blocked rather than granting terminal actions', () => {
    const f = fixture(); const s = mutable(f.value); s.site!.pending = { kind: 'combat-required', enemyId: 'guard' }
    const h = firstHarness()
    h.storage.port.read.mockReturnValue(JSON.stringify({ format: 'elevator-survival.residence-headless', formatVersion: 2, state: s }))
    expect(h.owner.bootstrap().status).toBe('blocked')
    expect(h.owner.queryTerminalEligibility()).toEqual({ deliver: false, withdraw: false, deadline: false })
  })
})
