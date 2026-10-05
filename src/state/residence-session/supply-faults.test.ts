import { afterEach, describe, expect, it, vi } from 'vitest'
import * as controlled from '../../core/residence-supply/controlled'
import * as initial from '../../core/residence-supply/initial'
import { createSupplyAuthority } from '../../core/residence-supply/authority'
import { cycleContext } from '../../core/residence-supply/validation'
import { issueSupplyPlan } from '../../core/residence-supply/plans'
import { createSupplyResidencePolicy } from '../residence-save/supply-policy'
import { forcedDraw } from '../../core/residence-task/test-fixtures'
import { harness, start, current, request, reject, observe, cold, fixture, searchAt, pickAlias, atNode, coldLatest } from './supply-test-fixtures'
import type { SupplyValue, SupplyDependencies } from '../../core/residence-supply/types'
afterEach(() => vi.restoreAllMocks())
const authorize = (v: SupplyValue, deps: SupplyDependencies) =>
  createSupplyAuthority(v, { cycle: cycleContext(v.character, deps, v.site?.nodeId ?? null), missions: v.missions }, deps)
describe('S07 issued plans, exact base and adjacent interfaces', () => {
  it.each(['clone', 'json', 'old-revision', 'body', 'inventory', 'dependencies'] as const)
  ('rejects %s plan instead of trusting structural revision alone', fault => {
    const h = harness(); start(h)
    const v = current(h), fields = { kind: 'move', expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' }
    let base = v, deps = h.deps
    if (fault === 'body') base = { ...v, character: { ...v.character, body: { ...v.character.body,
      condition: { ...v.character.body.condition, currentHealth: 11 } } } }
    if (fault === 'inventory') base = { ...v, carried: { ...v.carried, quickSlots: { slots: [null, v.carried.quickSlots.slots[0]] } } }
    if (fault === 'dependencies') deps = { ...h.deps }
    let plan = controlled.planSupplyMove(base, fields, authorize(base, deps))
    if (fault === 'clone') plan = { ...plan }
    if (fault === 'json') plan = JSON.parse(JSON.stringify(plan))
    if (fault === 'old-revision') h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    vi.spyOn(controlled, 'planSupplyMove').mockReturnValueOnce(plan)
    reject(h, request(h, 'move', { edgeId: fault === 'old-revision' ? 'H0-H1:reverse' : 'H0-H1:forward' }), 'UNISSUED_PLAN')
  })
  it('issued wrong producer fails session continuity; P already rejects changed locked specialty', () => {
    const h = harness(); start(h); const v = current(h)
    const real = controlled.planSupplyMove(v, { kind: 'move', expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' }, authorize(v, h.deps))
    const wrong = issueSupplyPlan(v, real.snapshot, h.deps, 'inventory', real.steps)
    vi.spyOn(controlled, 'planSupplyMove').mockReturnValueOnce(wrong)
    reject(h, request(h, 'move', { edgeId: 'H0-H1:forward' }), 'PLAN_MISMATCH')
    expect(() => issueSupplyPlan(v, { ...real.snapshot, choices: { ...real.snapshot.choices, specialty: 'scout' } }, h.deps, 'move', real.steps))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(current(h)).toBe(v)
  })
  it('native producer entropy exception commits nothing; source remains retryable', () => {
    const h = harness(); start(h); h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    const e = observe(h); vi.clearAllMocks(); const before = current(h), disk = h.disk()
    h.draw.mockImplementationOnce(() => { throw new Error('TEST_ENTROPY_FAULT') })
    expect(() => h.owner.dispatch(request(h, 'source', { sourceId: 'H1-search', method: 'dark' }))).toThrow('TEST_ENTROPY_FAULT')
    expect(current(h)).toBe(before); expect(h.disk()).toBe(disk)
    expect(h.storage.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled()
    expect(e.spies.reveal).toHaveBeenCalledTimes(1); expect(h.draw).toHaveBeenCalledTimes(1)
    h.owner.dispatch(request(h, 'source', { sourceId: 'H1-search', method: 'dark' }))
    expect(h.storage.write).toHaveBeenCalledTimes(1)
  })
  it('T1 exchange is actual atomic source consumption, explicit placements and no repeat grant', () => {
    const f = forcedDraw(fixture(), 1)
    let v = pickAlias(f, searchAt(f, f.value, 'H2-search'), 'disinfect', 0)
    v = atNode(f, v, 'T1')
    const h = cold(v, createSupplyResidencePolicy(f.dependencies))
    const inputs = [v.carried.quickSlots.slots[0]!, v.carried.backpack.items[0]].map(i => ({ instanceId: i.instanceId, quantity: 1 }))
    const fields = { sourceId: 'T1-exchange', inputs, placements: [{ x: 1, y: 0, rotated: false }] }
    reject(h, request(h, 'source', { ...fields, placements: [] }), 'INVALID_INPUT')
    h.owner.dispatch(request(h, 'source', fields))
    expect(current(h).carried.quickSlots.slots[0]).toBeNull()
    expect(current(h).carried.backpack.items).toHaveLength(1)
    expect(current(h).carried.backpack.items[0]).toMatchObject({ quantity: 2, definitionId: h.deps.tasks.data.items.find(d => d.alias === 'food')!.id })
    reject(h, request(h, 'source', fields), 'NOT_AVAILABLE')
    expect(h.storage.write).toHaveBeenCalledTimes(1); coldLatest(h)
  })
  it('first material producer is real and malformed produced aggregate cannot be installed', () => {
    const h = harness(); h.owner.bootstrap()
    const real = initial.establishSupplyInitial
    vi.spyOn(initial, 'establishSupplyInitial').mockImplementationOnce((...args) => {
      const v = real(...args)
      return { ...v, origins: v.origins.map(o => ({ ...o, binding: { ...o.binding, execution: { ...o.binding.execution, seed: 'other' } } })) }
    })
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: expect.stringMatching(/INVALID_STATE|EXPECTED_MISMATCH/) }))
    expect(h.owner.getState().current).toBeNull(); expect(h.storage.write).not.toHaveBeenCalled()
  })
})
