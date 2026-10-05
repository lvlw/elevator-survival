// MAINLINE REGRESSION SPEC. Native execution NOT RUN in the mainline container.
// Authorized target: src/state/residence-save/supply-review-regression.test.ts
// Use real P/G1/G2/A producers before mutating an untrusted v3 candidate.
import { describe, expect, it } from 'vitest'
import { fixture, expectation, mutable, atNode } from './supply-test-fixtures'
import { validateSupplyResidenceAggregate } from './supply-validation'
import { serializeSupplyResidenceSave, deserializeSupplyResidenceSave } from './supply-codec'
import { restoreSupplyResidenceCandidate } from './supply-expected'
import { SUPPLY_RESIDENCE_FORMAT, SUPPLY_RESIDENCE_FORMAT_VERSION, SupplyResidenceSaveError } from './supply-types'
import { readSupplyValue, cycleContext } from '../../core/residence-supply/validation'
import { planSupplyMove, planSupplyRest } from '../../core/residence-supply/controlled'
import { planResidenceMove } from '../../core/residence-location/movement'
import { planSupplyTerminal, consumeSupplyDeath, consumeSupplyLocationDeath } from '../../core/residence-terminal/supply-terminal'
import type { SupplyValue } from '../../core/residence-supply/types'

function atDay(v: SupplyValue, day: number): SupplyValue {
  if (v.character.clock.kind !== 'active') throw new Error('TEST requires real active clock')
  // Explicit isolated day boundary; this does not claim prior days were played.
  return { ...v, character: { ...v.character, cycle: day, clock: { ...v.character.clock, taskDay: day } } }
}
function makeActionDeath(source: 'supply' | 'location' = 'supply', day = 1) {
  const f = fixture({ hp: 1, bleeding: true }), v = atDay(f.value, day)
  const value = source === 'supply' ? (() => {
    const p = planSupplyMove(v, { kind: 'move', expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' }, f.authorize(v))
    return consumeSupplyDeath(v, p, f.authorize(v)).snapshot
  })() : (() => {
    const p = planResidenceMove({ character: v.character, site: v.site, carried: v.carried, itemStates: v.itemStates },
      { kind: 'move', binding: v.site!.binding, expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' },
      { cycle: cycleContext(v.character, f.dependencies, 'H0'), mission: v.missions.find(m => m.status === 'active')! },
      { residence: f.dependencies.residence, catalog: f.dependencies.catalog })
    return consumeSupplyLocationDeath(v, p, f.authorize(v)).snapshot
  })()
  return { f, value }
}
function makeCycleDeath(day = 7, hp = 1) {
  const f = fixture({ hp, bleeding: true }), v = atDay(atNode(f, f.value, 'H1'), day)
  const value = day === 7 ? planSupplyTerminal(v, { kind: 'deadline', expectedRevision: v.character.revision }, f.authorize(v)).snapshot : (() => {
    const p = planSupplyRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v))
    return consumeSupplyDeath(v, p, f.authorize(v)).snapshot
  })()
  return { f, value }
}
function roundtrip({ f, value }: ReturnType<typeof makeActionDeath>) {
  const e = expectation(value, f.dependencies), before = structuredClone(value)
  const text = serializeSupplyResidenceSave(value, e, f.policy)
  const candidate = deserializeSupplyResidenceSave(text, e, f.policy)
  expect(candidate.value).toEqual(value)
  expect(serializeSupplyResidenceSave(candidate.value, e, f.policy)).toBe(text)
  expect(value).toEqual(before)
  return candidate
}
function observe(run: () => unknown) {
  try { run(); return 'ACCEPTED' }
  catch (e) { return e instanceof SupplyResidenceSaveError ? e.code : 'NON_SEMANTIC_EXCEPTION' }
}
const ids = ['F01_A_action_bleed_HP2', 'F01_B_cycle_bleed_HP3', 'F01_C_Day7_supply_rest', 'F01_D_Day7_location_rest'] as const

describe('E01-R-R1: bind historical checkpoints to actual source constraints', () => {
  it.each(ids)('%s must reject across aggregate, encode and decode without changing expected', id => {
    const { f, value } = id === ids[0] ? makeActionDeath() : makeCycleDeath()
    const e = expectation(value, f.dependencies), bad = mutable(value)
    if (id === ids[0]) {
      const [primary, bleeding] = bad.receipts[0].steps
      primary.healthBefore = primary.healthAfter = bleeding.healthBefore = 2
      bleeding.facts.damage = 2
    } else if (id === ids[1]) {
      bad.receipts[0].steps[0].healthBefore = 3
      bad.receipts[0].steps[0].facts.damage = 3
    } else bad.receipts[0].source = id === ids[2] ? 'supply-death' : 'location-death'
    // P is not changed by this R1; identify the additional unsigned-history seam.
    expect(readSupplyValue(bad, f.dependencies)).toEqual(bad)
    const before = structuredClone(bad)
    const wire = JSON.stringify({ format: SUPPLY_RESIDENCE_FORMAT, formatVersion: SUPPLY_RESIDENCE_FORMAT_VERSION, state: bad })
    const results = [
      observe(() => validateSupplyResidenceAggregate(bad, e, f.policy)),
      observe(() => serializeSupplyResidenceSave(bad, e, f.policy)),
      observe(() => deserializeSupplyResidenceSave(wire, e, f.policy)),
    ]
    expect(bad).toEqual(before)
    expect(results).toEqual(['INVALID_STATE', 'INVALID_STATE', 'INVALID_STATE'])
  })
  it.each([['supply', 1], ['location', 1], ['supply', 7]] as const)('preserves real %s action death on Day%i', (source, day) => {
    const r = makeActionDeath(source, day)
    expect(r.value.receipts[0].steps.map(s => s.kind)).toEqual(['primary', 'action-bleeding'])
    expect(r.value.receipts[0].steps.at(-1)!.facts.damage).toBe(1)
    roundtrip(r)
  })
  it.each([1, 2])('preserves clipped real deadline bleeding at HP%i', hp => {
    const r = makeCycleDeath(7, hp)
    expect(r.value.receipts[0].steps[0].facts.damage).toBe(hp)
    roundtrip(r)
  })
  it('preserves legal Day6 rest death; does not ban all cycle-death receipts', () => {
    const r = makeCycleDeath(6)
    expect(r.value.receipts[0].source).toBe('supply-death')
    expect(r.value.receipts[0].steps[0].kind).toBe('cycle-bleeding')
    roundtrip(r)
  })
  it.each([1, 7])('normal H0 Day%i return still carries actual empty body steps', day => {
    const f = fixture(), v = atDay(f.value, day)
    const value = planSupplyTerminal(v, { kind: 'withdraw', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    expect(value.receipts[0].steps).toEqual([])
    roundtrip({ f, value })
  })
  it('same-progress full committed comparison stays independent', () => {
    const f = fixture(), e = expectation(f.value, f.dependencies), bad = mutable(f.value)
    bad.character.body.energy--
    expect(validateSupplyResidenceAggregate(bad, e, f.policy)).toEqual(bad)
    expect(() => restoreSupplyResidenceCandidate(bad, f.value, e, f.policy))
      .toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
})
