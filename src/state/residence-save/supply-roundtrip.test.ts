import { describe, expect, it } from 'vitest'
import { serializeSupplyResidenceSave as encode, deserializeSupplyResidenceSave as decode } from './supply-codec'
import { fixture, states, expectation, mutable, successful, organized, history, atNode } from './supply-test-fixtures'
import { planSupplyTerminal } from '../../core/residence-terminal/supply-terminal'
import type { SupplyValue } from '../../core/residence-supply/types'
import { planResidenceMove } from '../../core/residence-location/movement'
import { cycleContext } from '../../core/residence-supply/validation'
import { consumeSupplyLocationDeath } from '../../core/residence-terminal/supply-terminal'

function frozen(v: unknown): boolean {
  return !v || typeof v !== 'object' || Object.isFrozen(v) && Object.values(v).every(frozen)
}
describe('R01 R02 four stable v3 boundaries from real producers', () => {
  it('real G2 death source roundtrip preserves the already settled result and one revision', () => {
    const f = fixture({ hp: 1, bleeding: true }), v = f.value
    const plan = planResidenceMove({ character: v.character, site: v.site, carried: v.carried, itemStates: v.itemStates },
      { kind: 'move', binding: v.site!.binding, expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' },
      { cycle: cycleContext(v.character, f.dependencies, 'H0'), mission: v.missions.find(m => m.status === 'active')! },
      { residence: f.dependencies.residence, catalog: f.dependencies.catalog })
    const dead = consumeSupplyLocationDeath(v, plan, f.authorize(v)).snapshot, e = expectation(dead, f.dependencies)
    expect(dead.receipts[0].source).toBe('location-death')
    expect(dead.character.revision).toBe(v.character.revision + 1)
    expect(decode(encode(dead, e, f.policy), e, f.policy).value).toEqual(dead)
  })
  it.each(['first-hub', 'active-world', 'living-hub', 'dead'] as const)('%s roundtrip is frozen, byte stable and leaves input mutable unchanged', phase => {
    const { f, rows } = states(), value = rows.find(v => v.phase === phase)!, raw = mutable(value)
    const before = structuredClone(raw), expected = expectation(value, f.dependencies)
    const text = encode(raw, expected, f.policy), candidate = decode(text, expected, f.policy)
    expect(candidate).toEqual({ kind: 'supply-residence-candidate', value })
    expect(encode(candidate.value, expected, f.policy)).toBe(text)
    expect(frozen(candidate)).toBe(true); expect(raw).toEqual(before); expect(Object.isFrozen(raw)).toBe(false)
    expect(candidate.value).not.toBe(raw)
  })
  it('installed recipe and delivered real sample survive successful return', () => {
    const f = fixture(), value = successful(f), e = expectation(value, f.dependencies)
    const result = decode(encode(value, e, f.policy), e, f.policy).value
    expect(result).toEqual(value)
    expect(result.dispositions.filter(d => d.kind === 'installed')).toHaveLength(4)
    expect(result.dispositions.filter(d => d.kind === 'delivered')).toHaveLength(1)
    expect(result.receipts[0].steps).toEqual([])
    expect(result.balance).toBe(120)
  })
  it('real split/merge, consumption and retained ground units survive without refilling', () => {
    const { f, value } = organized(), e = expectation(value, f.dependencies)
    expect(value.unitTransfers.map(t => t.kind)).toEqual(['split', 'merge'])
    expect(value.choices.firstBandageUsed).toBe(true)
    expect(value.carried.quickSlots.slots[0]).toBeNull()
    expect(decode(encode(value, e, f.policy), e, f.policy).value).toEqual(value)
  })
  it.each(['success', 'voluntary-failure'] as const)('old %s history survives next TEST execution source and death', outcome => {
    const h = history(outcome)
    for (const v of [h.active, h.dead]) {
      const e = expectation(v, h.f.dependencies)
      expect(decode(encode(v, e, h.policy), e, h.policy).value).toEqual(v)
    }
    expect(h.dead.receipts[0]).toEqual(h.old.receipts[0])
    expect(h.dead.archives[0]).toEqual(h.old.archives[0])
    expect(h.dead.dispositions.slice(0, h.old.dispositions.length)).toEqual(h.old.dispositions)
    expect(h.dead.missions[0]).toEqual(h.old.missions[0])
    expect(h.dead.receipts[1].outcome).toBe('death')
  })
  it.each([false, true])('real Day7 deadline death=%s roundtrips its true checkpoint sequence', death => {
    const f = fixture({ hp: death ? 1 : 12, bleeding: death })
    const here = atNode(f, f.value, 'H1')
    if (here.character.clock.kind !== 'active') throw new Error('Expected native clock')
    const v: SupplyValue = { ...here, character: { ...here.character, cycle: 7,
      clock: { ...here.character.clock, taskDay: 7 } } }
    const result = planSupplyTerminal(v, { kind: 'deadline', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    const e = expectation(result, f.dependencies)
    expect(result.phase).toBe(death ? 'dead' : 'living-hub')
    expect(result.receipts[0].steps.map(s => s.kind)).toEqual(death ? ['cycle-bleeding'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(decode(encode(result, e, f.policy), e, f.policy).value).toEqual(result)
  })
  it.each(['infection', 'hunger'] as const)('real deadline %s death retains the short-circuited body trace', cause => {
    const f = fixture({ hp: 1 }), root = atNode(f, f.value, 'H1')
    if (root.character.clock.kind !== 'active') throw new Error('Expected active clock')
    const config = f.dependencies.residence.configuration.config
    const body = { ...root.character.body, satiety: cause === 'hunger' ? 0 : config.limits.satiety,
      infectionProgress: cause === 'infection' ? config.health.infection_damage.find(row => row.hp > 0)!.min : 0 }
    const before = { ...root, character: { ...root.character, cycle: config.limits.days, body,
      clock: { ...root.character.clock, taskDay: config.limits.days } } }
    const plan = planSupplyTerminal(before, { kind: 'deadline', expectedRevision: before.character.revision }, f.authorize(before))
    const value = plan.snapshot, e = expectation(value, f.dependencies)
    expect(value.phase).toBe('dead'); expect(value.receipts[0].steps.at(-1)?.kind).toBe(cause)
    expect(value.receipts[0].steps.some(s => s.kind === 'end-cycle')).toBe(false)
    expect(value.character.cycle).toBe(before.character.cycle)
    expect(decode(encode(value, e, f.policy), e, f.policy).value).toEqual(value)
  })
})
