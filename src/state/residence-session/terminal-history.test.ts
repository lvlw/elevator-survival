import { afterEach, describe, expect, it, vi } from 'vitest'
import * as cycle from '../../core/character-cycle'
import { history, cold, request, active, savedEqualsCurrent, observe, normal, fixture, death, harness, initial } from './terminal-test-fixtures'
import { serializeTerminalResidenceSave } from '../residence-save/terminal-index'
afterEach(() => vi.restoreAllMocks())

describe('C10 two-declaration native history consumption, not a player second launch', () => {
  it.each([
    { complete: false, mode: 'normal' as const }, { complete: true, mode: 'normal' as const },
    { complete: false, mode: 'deadline' as const },
  ].flatMap((prior) => ['move', 'rest', 'withdraw'].map((kind) => ({ ...prior, kind }))))
  ('old complete=$complete $mode -> current second active -> C $kind -> cold preserves old receipts/assets', ({ complete, mode, kind }) => {
    // history() really closes and departs with A/G1/identity/G2 BEFORE any C observer.
    const f = history(complete, mode); const h = cold(f.current, f.policy); const before = active(h)
    const e = observe(h)
    const r = h.owner.dispatch(request(h, kind, kind === 'move' ? { edgeId: 'ab' } : {}))
    expect(r.current.phase).toBe(kind === 'withdraw' ? 'living-hub' : 'dead')
    expect(r.current.receipts.slice(0, -1)).toEqual(before.receipts)
    expect(r.current.dispositions.slice(0, before.dispositions.length)).toEqual(before.dispositions)
    expect(r.current.archives.slice(0, before.archives.length)).toEqual(before.archives)
    expect(r.current.missions[0]).toEqual(before.missions[0])
    expect(r.current.missions[1].status).toBe('closed')
    expect(r.current.character.revision).toBe(before.character.revision + 1)
    expect(e.spies.activate).not.toHaveBeenCalled(); expect(h.provider).not.toHaveBeenCalled()
    expect(e.spies.consume).toHaveBeenCalledTimes(kind === 'withdraw' ? 0 : 1)
    expect(e.spies.cycle).toHaveBeenCalledTimes(kind === 'move' ? 0 : 1)
    savedEqualsCurrent(h)
    const afterPlans = e.plans(); const reload = cold(r.current, h.policy)
    expect(reload.owner.getState().current).toEqual(r.current); expect(e.plans()).toEqual(afterPlans)
  })
  it('old deadline-ready is not reusable authority to skip settlement in the second active rest', () => {
    const f = history(false, 'deadline'); const h = cold(f.current, f.policy)
    expect(f.first.character.clock.kind).toBe('deadline-ready')
    expect(active(h).character.clock.kind).toBe('active')
    const p = vi.spyOn(cycle, 'planCharacterCycle'); h.owner.dispatch(request(h, 'rest'))
    expect(p).toHaveBeenCalledTimes(1); expect(p.mock.calls[0][1]).toMatchObject({ kind: 'rest' })
    expect(p.mock.results[0].value.steps.map((s: { kind: string }) => s.kind)).toEqual(['cycle-bleeding'])
    expect(h.owner.getState().current!.phase).toBe('dead')
  })
})

describe('C07 four complete phases load with no rules, save, provider or notification', () => {
  it.each(['fresh', 'active', 'living', 'dead'] as const)('restores real %s through v2 only, zero hidden activity', (phase) => {
    const i = initial(); const f = fixture()
    const value = phase === 'fresh' ? i.fresh : phase === 'active' ? i.depart().value : phase === 'living' ? normal(f) : death().value
    const policy = phase === 'fresh' || phase === 'active' ? i.policy : f.policy
    const h = harness(policy, serializeTerminalResidenceSave(value, policy))
    const e = observe(h); const before = h.owner.getState().current
    expect(h.owner.bootstrap().current).toEqual(value)
    expect(h.owner.getState().current).not.toBe(before)
    expect(e.counts()).toEqual({ activate: 0, terminate: 0, cycle: 0, action: 0, establish: 0, move: 0, reveal: 0,
      transfer: 0, rest: 0, terminal: 0, consume: 0, draw: 0, factory: 0, provider: 0, read: 1, write: 0,
      currentReplacements: 0, notificationBatches: 0, listener1: 0, listener2: 0 })
    // currentReplacements here counts commit-boundary observations; one cold install was checked independently above.
    if (phase === 'living' || phase === 'dead') {
      expect(() => h.owner.dispatch({ kind: 'launch', identity: value.character.identity, expectedRevision: value.character.revision,
        commissionId: value.missions[0].binding.mission.commissionId })).toThrow()
    }
    expect(h.owner.queryKnowledge() === null).toBe(phase !== 'active')
    expect(h.storage.value()).toBe(serializeTerminalResidenceSave(value, policy))
  })
})
