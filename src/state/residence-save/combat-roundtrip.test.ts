import { describe, expect, it } from 'vitest'
import { entered, fixture, win, roundtrip, h0Return, context, rest, atDay } from './combat-test-fixtures'
import { serializeCombatResidenceSave } from './combat-codec'
import { planCombatTerminal } from '../../core/residence-combat/controlled'
import type { CombatValue } from '../../core/residence-combat/types'

function assertRoundtrip(h: ReturnType<typeof fixture>, v: CombatValue) {
  const original = structuredClone(v), { e, policy, text, candidate } = roundtrip(h, v)
  expect(candidate.value).toEqual(v); expect(v).toEqual(original)
  expect(serializeCombatResidenceSave(candidate.value, e, policy)).toBe(text)
  const frozen = (x: unknown) => {
    if (x && typeof x === 'object') { expect(Object.isFrozen(x)).toBe(true); Object.values(x).forEach(frozen) }
  }
  frozen(candidate)
  expect(Object.keys(JSON.parse(text))).toEqual(['format', 'formatVersion', 'state'])
  expect(candidate).not.toHaveProperty('authority'); expect(candidate).not.toHaveProperty('plan')
}
describe('R02 R03 R04 R06 five real v4 boundaries', () => {
  it('first-hub real initial materialization is byte-stable', () => { const h = fixture(); assertRoundtrip(h, h.initial) })
  it('stable active world real departure', () => { const h = fixture(); assertRoundtrip(h, h.value) })
  it.each(['orderly', 'porter', 'technician'] as const)('%s first and full-action player decision points', enemy => {
    const h = entered(enemy); assertRoundtrip(h, h.value)
    assertRoundtrip(h, h.action(h.value, { kind: 'metal-pipe-basic-attack' }).snapshot)
  })
  it.each(['escaped', 'victory'] as const)('completed stable %s already has one exit fee', outcome => {
    const h = entered(), v = outcome === 'victory' ? win(h, h.value) : h.action(h.value, { kind: 'escape' }).snapshot
    expect(v.battle).toBeNull(); expect(v.battles).toHaveLength(1); assertRoundtrip(h, v)
  })
  it('living-hub H0 actual normal return retains empty steps', () => {
    const h = fixture(), v = h0Return(h); expect(v.receipts[0].steps).toEqual([]); assertRoundtrip(h, v)
  })
  it.each(['orderly', 'porter', 'technician'] as const)('%s actual combat death keeps typed trace and no G1 replay', enemy => {
    const h = entered(enemy, { hp: 1 })
    let v = h.action(h.value, { kind: 'defend' }).snapshot
    if (v.phase !== 'dead') v = h.action(v, { kind: 'defend' }).snapshot
    expect(v.phase).toBe('dead'); expect(v.receipts[0].source).toBe('combat-death')
    expect(v.receipts[0].steps).toEqual([]); expect(v.combatDeaths[0].decision.trace.at(-1)!.healthAfter).toBe(0)
    assertRoundtrip(h, v)
  })
  it('real healing then enemy death is a complete final boundary', () => {
    const h = entered('orderly', { hp: 1 }), v = h.action(h.value,
      { kind: 'use-quick-slot-item', quickSlotIndex: 0 }, { instanceId: h.value.carried.quickSlots.slots[0]!.instanceId }).snapshot
    expect(v.phase).toBe('dead'); expect(v.combatDeaths[0].decision.trace[0].kind).toBe('heal'); assertRoundtrip(h, v)
  })
  it.each([1, 7])('real Day%i action-bleeding death remains accepted', day => {
    const h = fixture({ hp: 1, bleeding: true }), v = atDay(h.value, h, day)
    const end = h.move(v, 'H1').snapshot
    expect(end.phase).toBe('dead'); expect(end.receipts[0].steps.at(-1)!.facts.damage).toBe(1); assertRoundtrip(h, end)
  })
  it.each([6, 7])('real Day%i local rest/deadline death', day => {
    const h = fixture(), arrived = h.move(h.value, 'H1').snapshot
    const v = atDay({ ...arrived, character: { ...arrived.character, body: { ...arrived.character.body,
      condition: { ...arrived.character.body.condition, currentHealth: 1, bleeding: true } } } }, h, day)
    const end = day === 6 ? rest(h, v) : planCombatTerminal(v,
      { kind: 'deadline', expectedRevision: v.character.revision }, h.authorize(v)).snapshot
    expect(end.phase).toBe('dead'); assertRoundtrip(h, end)
  })
  it('caller-owned mutable input and expected are not frozen', () => {
    const h = fixture(), raw = structuredClone(h.value), { e, policy } = context(h, h.value)
    serializeCombatResidenceSave(raw, e, policy)
    expect(Object.isFrozen(raw)).toBe(false); expect(Object.isFrozen(raw.character)).toBe(false)
    expect(Object.isFrozen(e)).toBe(false); expect(Object.isFrozen(e.initial)).toBe(false)
  })
})
