import { afterEach, describe, expect, it, vi } from 'vitest'
import { harness, initialMaterials, current, start, request, depart, coldLatest, observe, recordCounts } from './supply-test-fixtures'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
import { states } from '../residence-save/supply-test-fixtures'
afterEach(() => vi.restoreAllMocks())
describe('S02 actual null-read initial materials and one departure', () => {
  it.each(['active', 'closed', 'nonfirst-clock'] as const)('known %s startup facts permanently prohibit reinitialization', stage => {
    const prepared = states(), materials = initialMaterials(prepared.f.dependencies)
    const input = stage === 'nonfirst-clock' ? { ...materials, character: prepared.f.value.character } :
      { ...materials, mission: prepared.rows[stage === 'active' ? 1 : 2].missions[0] }
    const h = harness({ policy: prepared.f.policy, materials: input }), e = observe(h)
    h.owner.bootstrap()
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.owner.getState().status).toBe('blocked')
    h.factory.mockReturnValue(materials)
    expect(h.owner.retryRead().status).toBe('blocked')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(e.spies.initial).not.toHaveBeenCalled(); expect(h.storage.write).not.toHaveBeenCalled()
  })
  it.each(['crow', 'lamp', 'toolbox'].flatMap(tool => ['scout', 'engineer', 'survival'].map(specialty => [tool, specialty])))
  ('locks actual %s / %s without reissuing supplies', (tool, specialty) => {
    const deps = createInfectedSupplyDependencies('session-test-character')
    const h = harness({ materials: initialMaterials(deps, tool, specialty) }), e = observe(h)
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.owner.bootstrap().status).toBe('no-save')
    const first = h.owner.createFirst()
    expect(first.current.character.revision).toBe(0); expect(first.current.phase).toBe('first-hub')
    expect(first.current.origins).toHaveLength(4); expect(first.current.carried.backpack.items).toEqual([])
    expect(first.current.choices).toEqual({ tool, specialty, firstBandageUsed: false })
    expect(first.current.carried.quickSlots.slots[0]!.quantity).toBe(1)
    const initial = first.current
    depart(h)
    expect(current(h).origins).toEqual(initial.origins); expect(current(h).character.revision).toBe(1)
    expect(current(h).phase).toBe('active-world')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(() => depart(h)).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(e.spies.initial).toHaveBeenCalledTimes(1); expect(e.spies.activate).toHaveBeenCalledTimes(1)
    expect(h.factory).toHaveBeenCalledTimes(1); expect(h.storage.write).toHaveBeenCalledTimes(2)
    expect(h.listener).toHaveBeenCalledTimes(2); coldLatest(h)
  })
  it('first and departure write failures retain one identity; retry and cold do not rerun producers', () => {
    const h = harness(), e = observe(h); h.faults.write = true
    h.owner.bootstrap(); expect(h.owner.createFirst().persistence).toBe('save-failed')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(depart(h).persistence).toBe('save-failed')
    expect(() => depart(h)).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.disk()).toBeNull()
    const next = current(h), counts = e.counts()
    h.faults.write = false; expect(h.owner.retrySave().persistence).toBe('saved')
    expect(current(h)).toBe(next)
    expect(e.counts()).toEqual({ ...counts, encode: counts.encode + 1, write: counts.write + 1 })
    expect(counts).toMatchObject({ initial: 1, depart: 1, activate: 1, origin: 4, plan: 1, read: 1, write: 2, current: 2, batches: 2, materials: 1 })
    recordCounts('first/departure', counts)
    coldLatest(h)
  })
  it('malformed initial body is rejected before initial producer; busy releases', () => {
    const h = harness(), e = observe(h); h.owner.bootstrap()
    h.factory.mockReturnValueOnce({ ...h.materials as object, nextState: {} })
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(e.spies.initial).not.toHaveBeenCalled(); expect(h.owner.getState().current).toBeNull()
    expect(h.storage.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
    h.owner.createFirst(); expect(current(h).phase).toBe('first-hub')
  })
  it('closed and active owners cannot reread, create, or silently start another execution', () => {
    const h = harness(); start(h)
    h.owner.dispatch(request(h, 'terminal', { kind: 'withdraw' }))
    for (const op of [h.owner.bootstrap, h.owner.retryRead, h.owner.createFirst, () => depart(h)])
      expect(op).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.storage.read).toHaveBeenCalledTimes(1)
  })
})
