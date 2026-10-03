import { describe, expect, it } from 'vitest'
import { planCharacterCycle } from '../character-cycle'
import { terminateMission } from '../mission-lifecycle/controlled'
import { planResidenceLocationRest, restoreResidenceLocationCandidate } from './controlled'
import { assertResidenceLocationPlanCurrent, planResidenceItemTransfer, planResidenceMove, planResidenceSourceReveal,
  queryActiveResidencePosition, queryPlayerResidenceKnowledge } from './index'
import type { LocationAuthority, ResidenceLocationSnapshot } from './types'
import { binding, fixture as createFixture, move, mutable, reveal } from './test-fixtures'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
const fixture = (options: Parameters<typeof createFixture>[1] = {}) => createFixture(infectedResidenceConfig, options)

describe('G2 public composed lifecycle sequences (L07 L08 L11 L12)', () => {
  it('move / reveal / pickup / drop / G1 rest / revisit uses only the preceding complete proposal', () => {
    const f = fixture(); let s: ResidenceLocationSnapshot = f.state
    s = move(f, s, 'ab').snapshot; s = reveal(f, s, 'lottery-b').snapshot
    const item = s.site.ground.find((g) => g.nodeId === 'b')!.items[0]
    const resource = s.itemStates.states.find((i) => i.instanceId === item.instanceId)
    const pickup = { kind: 'pickup' as const, instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }
    s = planResidenceItemTransfer(s, { ...binding(s), ...pickup }, f.authorityFor(s), f.dependencies).snapshot
    s = planResidenceItemTransfer(s, { ...binding(s), kind: 'drop', instanceId: item.instanceId }, f.authorityFor(s), f.dependencies).snapshot
    const oldCommand = { ...binding(s), ...pickup }
    const rest = planResidenceLocationRest(s, { ...binding(s), kind: 'rest' }, f.authorityFor(s), f.dependencies)
    expect(rest.steps.map((v) => v.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(() => assertResidenceLocationPlanCurrent(s, rest, f.authorityFor(s), f.dependencies)).not.toThrow()
    s = rest.snapshot
    expect(s.site.nodeId).toBe('b'); expect(s.character.clock).toMatchObject({ taskDay: 2 })
    s = move(f, s, 'ba').snapshot; s = move(f, s, 'ab').snapshot
    expect(() => planResidenceItemTransfer(s, oldCommand, f.authorityFor(s), f.dependencies)).toThrow()
    s = planResidenceItemTransfer(s, { ...binding(s), ...pickup }, f.authorityFor(s), f.dependencies).snapshot
    expect(s.character.revision).toBe(8)
    expect(s.carried.backpack.items).toEqual([item]); expect(s.itemStates.states.find((i) => i.instanceId === item.instanceId)).toEqual(resource)
    expect(() => reveal(f, s, 'lottery-b')).toThrow()
  })
  it.each(['success', 'voluntary-failure', 'deadline-failure'] as const)('%s actual mission closure removes active position and disables old site actions, not carried assets', (outcome) => {
    const f = fixture(); let s = reveal(f, f.state, 'fixed').snapshot
    const item = s.site.ground[0].items[0]
    s = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: item.instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies).snapshot
    if (outcome === 'deadline-failure') {
      const day7 = mutable(s); day7.character.cycle = 7
      if (day7.character.clock.kind !== 'active') throw new Error('fixture')
      day7.character.clock.taskDay = 7
      s = restoreResidenceLocationCandidate(day7, f.authorityFor(day7), f.dependencies).value
    }
    const cycleAuthority = { ...f.authorityFor(s).cycle, normalReturn: outcome === 'deadline-failure' ? null : outcome }
    const plan = planCharacterCycle(s.character, { identity: s.character.identity, expectedRevision: s.character.revision,
      kind: outcome === 'deadline-failure' ? 'deadline' : 'normal-return' }, cycleAuthority, f.dependencies.residence)
    const clock = plan.snapshot.clock
    if (clock.kind !== 'return-due' && clock.kind !== 'deadline-ready') throw new Error('expected closed-source clock')
    const closed = terminateMission(f.lifecycle, { binding: f.lifecycle.binding, execution: s.site.binding.execution, outcome }, f.scope)
    const authority: LocationAuthority = { mission: closed, cycle: { ...cycleAuthority, revision: plan.snapshot.revision,
      cycle: plan.snapshot.cycle, lifecycle: { kind: 'closed', source: clock.source }, normalReturn: null, rest: null } }
    const candidate = { ...s, character: plan.snapshot }
    const restored = restoreResidenceLocationCandidate(candidate, authority, f.dependencies).value
    expect(queryActiveResidencePosition(restored, authority, f.dependencies)).toBeNull()
    expect(queryPlayerResidenceKnowledge(restored, authority, f.dependencies).ground).toEqual([])
    expect(restored.carried).toEqual(s.carried); expect(restored.itemStates).toEqual(s.itemStates)
    expect(() => planResidenceMove(restored, { ...binding(restored), kind: 'move', edgeId: 'ab' }, authority, f.dependencies)).toThrow()
    expect(() => planResidenceSourceReveal(restored, { ...binding(restored), kind: 'reveal', sourceId: 'lottery-a' }, authority, f.dependencies)).toThrow()
    expect(() => planResidenceItemTransfer(restored, { ...binding(restored), kind: 'pickup', instanceId: s.site.ground[0].items[0].instanceId,
      placement: { x: 2, y: 0, rotated: false } }, authority, f.dependencies)).toThrow()
    expect(() => restoreResidenceLocationCandidate(restored, f.authorityFor(s), f.dependencies)).toThrow()
  })
  it('another execution cannot reuse old same-named nodes, source or ground as its current site', () => {
    const f = fixture(); const old = reveal(f, f.state, 'fixed').snapshot; const next = fixture({ seed: 'different-execution' })
    expect(() => restoreResidenceLocationCandidate({ ...next.state, site: old.site, itemStates: old.itemStates }, next.authorityFor(next.state), next.dependencies)).toThrow()
    const wrong = mutable(old); wrong.site.binding.mission.commissionId = 'different-commission'
    expect(() => restoreResidenceLocationCandidate(wrong, f.authorityFor(old), f.dependencies)).toThrow()
    wrong.site.binding.mission.commissionId = old.site.binding.mission.commissionId; wrong.site.binding.execution.runId = 'fresh-run'
    expect(() => restoreResidenceLocationCandidate(wrong, f.authorityFor(old), f.dependencies)).toThrow()
  })
  it('existing physical outcomes and wounded enemy state are retained across movement and actual G1 rest', () => {
    const f = fixture(); const raw = mutable(f.state)
    raw.site.facts.forEach((v) => { v.value = true })
    Object.assign(raw.site.enemies[0].state, { currentHealth: 3, currentIntentActionId: 'bite', nextCycleIndex: 0,
      resolvedActionCount: 3, hasBeenEncountered: true })
    raw.site.enemies[0].riskDrawIndex = 7
    let s = restoreResidenceLocationCandidate(raw, f.authorityFor(raw), f.dependencies).value
    const enemy = structuredClone(s.site.enemies); const facts = structuredClone(s.site.facts)
    s = move(f, s, 'ab').snapshot; s = planResidenceLocationRest(s, { ...binding(s), kind: 'rest' }, f.authorityFor(s), f.dependencies).snapshot
    s = move(f, s, 'ba').snapshot
    expect(s.site.enemies).toEqual(enemy); expect(s.site.facts).toEqual(facts)
    expect(s.site.enemies[0].riskDrawIndex).not.toBe(s.site.enemies[0].state.resolvedActionCount)
  })
  it('incapacitated enemy is not replaced on arrival; no phantom combat begins', () => {
    const f = fixture(); const raw = mutable(f.state); raw.site.facts[0].value = true
    Object.assign(raw.site.enemies[0].state, { currentHealth: 0, hasBeenEncountered: true, defeated: true })
    const b = move(f, raw, 'ab').snapshot; const c = move(f, b, 'bc')
    expect(c.coordination).toBe('stable-local-result'); expect(c.snapshot.site.pending).toEqual({ kind: 'none' })
    expect(c.snapshot.site.enemies).toEqual(raw.site.enemies)
  })
  it('rest uses real node qualification, cannot invent A at C or bypass G1 Day7', () => {
    const f = fixture(); const b = move(f, f.state, 'ab').snapshot
    const badAuthority = { ...f.authorityFor(b), cycle: { ...f.authorityFor(b).cycle, rest: 'A' as const } }
    expect(() => planResidenceLocationRest(b, { ...binding(b), kind: 'rest' }, badAuthority, f.dependencies)).toThrow()
    const raw = mutable(b); raw.character.cycle = 7
    if (raw.character.clock.kind !== 'active') throw new Error('fixture')
    raw.character.clock.taskDay = 7
    expect(() => planResidenceLocationRest(raw, { ...binding(raw), kind: 'rest' }, f.authorityFor(raw), f.dependencies)).toThrow()
  })
})
