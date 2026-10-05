import { afterEach, describe, expect, it, vi } from 'vitest'
import { serializeSupplyResidenceSave } from '../residence-save/supply-codec'
import { states } from '../residence-save/supply-test-fixtures'
import { harness, fixture, expectation, current, start, request, mutable, atNode, cold, observe } from './supply-test-fixtures'
import { planSupplyMove, planSupplyRest } from '../../core/residence-supply/controlled'
import { consumeSupplyDeath, planSupplyTerminal } from '../../core/residence-terminal/supply-terminal'
afterEach(() => vi.restoreAllMocks())
describe('S03 S10 independent cold startup and S11 F01 preservation', () => {
  it.each([0, 1, 2, 3])('four-state cold row %i reads external expected once and never produces', row => {
    const f = states(), value = f.rows[row], expected = expectation(value, f.f.dependencies)
    const text = serializeSupplyResidenceSave(value, expected, f.f.policy)
    const h = harness({ policy: f.f.policy, text, expected, startup: 'existing' }), e = observe(h)
    expect(h.owner.bootstrap().current).toEqual(value)
    expect(h.coldProvider.mock.calls).toEqual([[]])
    expect(e.counts()).toMatchObject({ read: 1, expected: 1, decode: 1, encode: 0, write: 0,
      initial: 0, action: 0, cycle: 0, origin: 0, terminate: 0, current: 0, batches: 0 })
    expect(h.owner.bootstrap).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.owner.retryRead).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
  })
  it.each(['seed', 'phase', 'revision', 'version', 'missing', 'throws', 'json', 'v1', 'v2'])
  ('%s cannot self-certify a candidate or fall back to first', mode => {
    const f = fixture(), e = mutable(expectation(f.initial, f.dependencies))
    let text = serializeSupplyResidenceSave(f.initial, e, f.policy)
    if (mode === 'seed') e.initial.execution.seed = 'wrong'
    if (mode === 'phase') e.phase = 'active-world'
    if (mode === 'revision') e.revision++
    if (mode === 'version') e.initial.execution.rulesVersion = 'wrong'
    if (mode === 'json') text = '{broken'
    if (mode === 'v1' || mode === 'v2') text = text.replace('"formatVersion":3', '"formatVersion":' + (mode === 'v1' ? 1 : 2))
    const h = harness({ policy: f.policy, text, ...(mode === 'missing' ? {} : { expected: e }) })
    if (mode === 'throws') h.coldProvider.mockImplementation(() => { throw new Error('provider') })
    expect(h.owner.bootstrap().status).toBe('blocked')
    expect(h.owner.getState().current).toBeNull(); expect(h.factory).not.toHaveBeenCalled()
    expect(h.storage.write).not.toHaveBeenCalled()
    h.setDisk(null)
    expect(h.owner.retryRead().status).toBe('blocked')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
  })
  it('explicit existing startup and null storage never grant first eligibility', () => {
    const h = harness({ startup: 'existing' })
    expect(h.owner.bootstrap().status).toBe('blocked')
    expect(h.owner.createFirst).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
  })
  it('write failure current cannot be overwritten by old disk; new owner sees only prior successful bytes', () => {
    const h = harness(); start(h)
    const saved = current(h), savedExpected = expectation(saved, h.deps)
    h.faults.write = true
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    const latest = current(h)
    expect(h.owner.retryRead).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    const other = harness({ policy: h.policy, text: h.disk(), expected: savedExpected, startup: 'existing' })
    expect(other.owner.bootstrap().current).toEqual(saved)
    expect(current(h)).toBe(latest); expect(latest).not.toEqual(saved)
  })
  it.each(['action-amplitude', 'cycle-amplitude', 'fake-supply-rest', 'fake-location-rest'])
  ('F01 %s is blocked by the unchanged native R reader', mode => {
    const f = fixture({ hp: 1, bleeding: true })
    let v = f.value
    let dead
    if (mode === 'action-amplitude') {
      const p = planSupplyMove(v, { kind: 'move', expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' }, f.authorize(v))
      dead = consumeSupplyDeath(v, p, f.authorize(v)).snapshot
    } else {
      v = atNode(f, v, 'H1')
      if (v.character.clock.kind !== 'active') throw new Error('fixture')
      v = { ...v, character: { ...v.character, cycle: 7, clock: { ...v.character.clock, taskDay: 7 } } }
      dead = planSupplyTerminal(v, { kind: 'deadline', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    }
    const expected = expectation(dead, f.dependencies), bad = mutable(dead)
    if (mode === 'action-amplitude') {
      bad.receipts[0].steps[0].healthBefore = bad.receipts[0].steps[0].healthAfter = 2
      bad.receipts[0].steps[1].healthBefore = 2; bad.receipts[0].steps[1].facts.damage = 2
    } else if (mode === 'cycle-amplitude') {
      bad.receipts[0].steps[0].healthBefore = 3; bad.receipts[0].steps[0].facts.damage = 3
    } else bad.receipts[0].source = mode === 'fake-supply-rest' ? 'supply-death' : 'location-death'
    const h = harness({ policy: f.policy, expected, text: JSON.stringify({
      format: 'elevator-survival.residence-headless', formatVersion: 3, state: bad }) }), e = observe(h)
    expect(h.owner.bootstrap()).toMatchObject({ status: 'blocked', diagnostic: 'INVALID_STATE', current: null })
    expect(e.counts()).toMatchObject({ action: 0, cycle: 0, consume: 0, origin: 0, write: 0 })
  })
  it('Day6 real rest death remains cold-loadable', () => {
    const f = fixture({ hp: 1, bleeding: true }), v = atNode(f, f.value, 'H1')
    if (v.character.clock.kind !== 'active') throw new Error('fixture')
    const before = { ...v, character: { ...v.character, cycle: 6, clock: { ...v.character.clock, taskDay: 6 } } }
    const p = planSupplyRest(before, { kind: 'rest', expectedRevision: before.character.revision }, f.authorize(before))
    expect(cold(consumeSupplyDeath(before, p, f.authorize(before)).snapshot, f.policy).owner.getState().current?.phase).toBe('dead')
  })
})
