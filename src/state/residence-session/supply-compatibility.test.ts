import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createSupplySession, createResidenceSessionDomain } from './supply-controlled'
import { createResidenceSession } from './controlled'
import { createTerminalResidenceSession } from './terminal-controlled'
import { firstHarness as v1 } from './test-fixtures'
import { firstHarness as v2 } from './terminal-test-fixtures'
import { harness, start } from './supply-test-fixtures'
import type { SupplySessionComposition, SupplySession } from './supply-types'
import type { ResidenceDomain } from './types'
afterEach(() => vi.restoreAllMocks())
describe('S01 shared domain across all versions and controlled composition', () => {
  it.each([1, 2, 3].flatMap(a => [1, 2, 3].map(b => [a, b])))('%i then %i cannot create a second writer', (a, b) => {
    const first = [v1(), v2(), harness()][a - 1], one = v1(), two = v2(), three = harness()
    const create = () => b === 1 ? createResidenceSession(first.domain, one.composition) :
      b === 2 ? createTerminalResidenceSession(first.domain, two.composition) : createSupplySession(first.domain, three.composition)
    expect(create).toThrowError(expect.objectContaining({ code: 'DOMAIN_CLAIMED' }))
    expect(three.storage.read).not.toHaveBeenCalled()
  })
  it('clone domains are invalid and no mutation API is in the public type', () => {
    const h = harness()
    for (const fake of [{}, { ...h.domain }, structuredClone(h.domain)])
      expect(() => createSupplySession(fake as ResidenceDomain, h.composition)).toThrowError(expect.objectContaining({ code: 'INVALID_DOMAIN' }))
    expectTypeOf<SupplySession>().not.toHaveProperty('setState')
    expectTypeOf<SupplySession>().not.toHaveProperty('replace')
    expectTypeOf<SupplySessionComposition>().not.toHaveProperty('nextState')
  })
  it.each(['extra', 'getter', 'policy', 'async-read', 'async-write', 'generator', 'initial', 'cold', 'startup'])
  ('invalid %s composition does not occupy domain or invoke a callback', mode => {
    const h = harness(), domain = createResidenceSessionDomain()
    const c: Record<string, unknown> = { ...h.composition }, getter = vi.fn(() => h.policy)
    if (mode === 'extra') c.supported = true
    if (mode === 'getter') Object.defineProperty(c, 'policy', { enumerable: true, get: getter })
    if (mode === 'policy') c.policy = { ...h.policy }
    if (mode === 'async-read') c.storage = { ...h.storage, read: async () => null }
    if (mode === 'async-write') c.storage = { ...h.storage, write: async () => {} }
    if (mode === 'generator') c.provideInitialMaterials = function* () { yield null }
    if (mode === 'initial') c.provideInitialMaterials = async () => h.materials
    if (mode === 'cold') c.provideColdExpectation = async () => null
    if (mode === 'startup') c.startup = 'guess'
    expect(() => createSupplySession(domain, c as SupplySessionComposition))
      .toThrowError(expect.objectContaining({ code: mode === 'policy' ? 'INVALID_POLICY' : 'INVALID_COMPOSITION' }))
    expect(() => createSupplySession(domain, h.composition)).not.toThrow()
    expect(getter).not.toHaveBeenCalled(); expect(h.factory).not.toHaveBeenCalled()
  })
  it('captures ports without freezing caller shells', () => {
    const h = harness()
    expect(Object.isFrozen(h.composition)).toBe(false); expect(Object.isFrozen(h.storage)).toBe(false)
    h.storage.read = vi.fn(() => { throw new Error('changed external shell') })
    start(h); expect(h.storage.read).not.toHaveBeenCalled()
  })
  it('runtime thenable read is failure, nonvoid write is not saved', () => {
    const h = harness()
    h.storage.read.mockReturnValueOnce(Promise.resolve(null) as unknown as null)
    expect(h.owner.bootstrap().status).toBe('read-error')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.owner.retryRead().status).toBe('blocked')
    const fresh = harness(); fresh.owner.bootstrap()
    fresh.storage.write.mockImplementationOnce((() => ({ then() {} })) as unknown as () => void)
    expect(fresh.owner.createFirst().persistence).toBe('save-failed')
    expect(fresh.owner.getState().current?.phase).toBe('first-hub')
  })
})
