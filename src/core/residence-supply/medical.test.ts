import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, forcedDraw, searchAt, pickAlias, atNode } from '../residence-task/test-fixtures'
import { planSupplyMedical } from './medical'
import { readSupplyValue } from './validation'
import { planSupplyRest } from './controlled'
import type { SupplyValue } from './types'
const body = (f: ReturnType<typeof fixture>, v: SupplyValue, changes: Partial<SupplyValue['character']['body']>) =>
  readSupplyValue({ ...v, character: { ...v.character, body: { ...v.character.body, ...changes } } }, f.dependencies)
const use = (f: ReturnType<typeof fixture>, v: SupplyValue, id: string, extra = {}) =>
  planSupplyMedical(v, { kind: 'medical', expectedRevision: v.character.revision, instanceId: id, ...extra }, f.authorize(v))
describe('P07 P09 actual six-consumable effects', () => {
  it('survival first bandage totals 2, next totals 1 after real rest; E0 free action has no bleeding', () => {
    const f = fixture({ hp: 5, specialty: 'survival', bleeding: true })
    let v = searchAt(f, f.value, 'H2-search')
    v = pickAlias(f, v, 'bandage', 0)
    v = body(f, v, { energy: 0 })
    const first = use(f, v, v.carried.quickSlots.slots[0]!.instanceId)
    expect(first.energyCost).toBe(0); expect(first.steps).toHaveLength(1)
    expect(first.snapshot.character.body.condition.currentHealth).toBe(v.character.body.condition.currentHealth + 2)
    expect(first.snapshot.carried.quickSlots.slots[0]).toBeNull()
    expect(first.snapshot.choices.firstBandageUsed).toBe(true)
    v = planSupplyRest(first.snapshot, { kind: 'rest', expectedRevision: first.snapshot.character.revision }, f.authorize(first.snapshot)).snapshot
    const p = use(f, v, v.carried.backpack.items[0].instanceId)
    expect(p.snapshot.character.body.condition.currentHealth).toBe(v.character.body.condition.currentHealth + 1)
    expect(() => readSupplyValue({ ...p.snapshot, choices: { ...p.snapshot.choices, firstBandageUsed: false } }, f.dependencies)).toThrow()
  })
  it.each([['disinfect', 1], ['painkiller', 36], ['firstaid', 66], ['suppressant', 86]] as const)('%s consumes one real random output, qualified target and quota', (alias, roll) => {
    const f = forcedDraw(fixture({ hp: 8 }), roll)
    let v = searchAt(f, f.value, 'H2-search'); v = pickAlias(f, v, alias, 0)
    v = body(f, v, { energy: 0, condition: { ...v.character.body.condition, minorContusions: 1, pendingInfectionExposures: 2,
      openWounds: [{ id: 'one', kind: 'laceration', treatment: 'untreated' }, { id: 'two', kind: 'bite', treatment: 'untreated' }], bleeding: true } })
    const item = v.carried.backpack.items[0]
    const p = use(f, v, item.instanceId, alias === 'firstaid' ? { target: 'wound', woundId: 'one' } : {})
    expect(p.snapshot.carried.backpack.items).toHaveLength(0)
    expect(p.steps).toHaveLength(1); expect(p.snapshot.character.body.energy).toBe(0)
    const b = p.snapshot.character.body
    if (alias === 'firstaid') {
      expect(b.condition.currentHealth).toBe(12); expect(b.condition.openWounds.map(w => w.id)).toEqual(['two'])
      expect(b.condition.bleeding).toBe(true)
    } else {
      expect(b.condition.currentHealth).toBe(8)
      expect(b.condition.openWounds).toEqual(v.character.body.condition.openWounds)
    }
    if (alias === 'disinfect') { expect(b.condition.pendingInfectionExposures).toBe(1); expect(b.quotasRemaining.disinfectant).toBe(v.character.body.quotasRemaining.disinfectant - 1) }
    if (alias === 'suppressant') { expect(b.suppression).toBe(15); expect(b.quotasRemaining.suppressant).toBe(v.character.body.quotasRemaining.suppressant - 1) }
    if (alias === 'painkiller') expect(b.condition.painkillerActive).toBe(true)
    expect(() => use(f, v, item.instanceId, { quantity: 2 })).toThrow()
    expect(() => use(f, v, item.instanceId, { woundId: 'foreign' })).toThrow()
  })
  it('food only restores satiety, bandage with full HP treats exactly chosen wound', () => {
    const f = fixture()
    let v = searchAt(f, f.value, 'C4-food'); v = pickAlias(f, v, 'food', 0)
    v = body(f, v, { satiety: 3, energy: 0 })
    const fed = use(f, v, v.carried.backpack.items[0].instanceId).snapshot
    expect(fed.character.body.satiety).toBe(5); expect(fed.character.body.condition.currentHealth).toBe(12)
    v = body(f, atNode(f, fed, 'H0'), { condition: { ...fed.character.body.condition, bleeding: true,
      openWounds: [{ id: 'a', kind: 'bite', treatment: 'untreated' }, { id: 'b', kind: 'bite', treatment: 'untreated' }] } })
    expect(() => use(f, v, v.carried.quickSlots.slots[0]!.instanceId)).toThrow()
    const bandaged = use(f, v, v.carried.quickSlots.slots[0]!.instanceId, { woundId: 'a' }).snapshot
    expect(bandaged.character.body.condition.currentHealth).toBe(12)
    expect(bandaged.character.body.condition.openWounds.map(w => w.treatment)).toEqual(['treated', 'untreated'])
    expect(bandaged.character.body.condition.bleeding).toBe(false)
  })
  it('HP0, healthy full state, fake quantities and exhausted daily quota reject without mutating', () => {
    const f = forcedDraw(fixture(), 1)
    let v = searchAt(f, f.value, 'H2-search'); v = pickAlias(f, v, 'disinfect', 0)
    const item = v.carried.backpack.items[0]
    expect(() => use(f, v, v.carried.quickSlots.slots[0]!.instanceId)).toThrow()
    expect(() => use(f, v, item.instanceId)).toThrow()
    const dead = body(f, v, { condition: { ...v.character.body.condition, currentHealth: 0 } })
    expect(() => use(f, dead, item.instanceId)).toThrow()
    const spent = body(f, v, { quotasRemaining: { ...v.character.body.quotasRemaining, disinfectant: 0 },
      condition: { ...v.character.body.condition, pendingInfectionExposures: 1 } })
    expect(() => use(f, spent, item.instanceId)).toThrow()
    expect(v.carried.backpack.items[0]).toEqual(item)
  })
})
