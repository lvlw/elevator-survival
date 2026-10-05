// MAINLINE REGRESSION SPEC. Native execution NOT RUN in the mainline container.
// Authorized target: src/state/residence-save/supply-review-regression.test.ts
// Use real P/G1/G2/A producers before mutating an untrusted v3 candidate.
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as energy from '../../core/residence-energy'
import * as cycle from '../../core/character-cycle'
import * as body from '../../core/character-cycle/cycle'
import * as movement from '../../core/residence-location/movement'
import * as rest from '../../core/residence-location/controlled'
import * as supply from '../../core/residence-supply/controlled'
import * as terminal from '../../core/residence-terminal/supply-terminal'
import * as oldTerminal from '../../core/residence-terminal/controlled'
import * as lifecycle from '../../core/mission-lifecycle/controlled'
import * as random from '../../core/random'
import { createLocationCatalog, planResidenceLocationRest } from '../../core/residence-location/controlled'
import { fixture as producerFixture } from '../../core/residence-supply/test-fixtures'
import { twoDeclarationFixture } from '../../core/residence-task/test-fixtures'
import { planSupplyMedical } from '../../core/residence-supply/medical'
import { observeLocationArrival } from '../../core/residence-location/knowledge'
import { createSupplyResidencePolicy } from './supply-policy'
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

afterEach(() => vi.restoreAllMocks())

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
function rejectAll({ f, value }: ReturnType<typeof makeActionDeath>, bad: SupplyValue, policy = f.policy) {
  const e = expectation(value, f.dependencies), before = structuredClone({ bad, e })
  const wire = JSON.stringify({ format: SUPPLY_RESIDENCE_FORMAT, formatVersion: SUPPLY_RESIDENCE_FORMAT_VERSION, state: bad })
  expect([
    observe(() => validateSupplyResidenceAggregate(bad, e, policy)),
    observe(() => serializeSupplyResidenceSave(bad, e, policy)),
    observe(() => deserializeSupplyResidenceSave(wire, e, policy)),
  ]).toEqual(['INVALID_STATE', 'INVALID_STATE', 'INVALID_STATE'])
  expect({ bad, e }).toEqual(before)
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
    const before = structuredClone(bad), expectedBefore = structuredClone(e)
    const wire = JSON.stringify({ format: SUPPLY_RESIDENCE_FORMAT, formatVersion: SUPPLY_RESIDENCE_FORMAT_VERSION, state: bad })
    const draw = vi.fn(f.dependencies.draw), policy = createSupplyResidencePolicy({ ...f.dependencies, draw })
    const results = [
      () => validateSupplyResidenceAggregate(bad, e, policy),
      () => serializeSupplyResidenceSave(bad, e, policy),
      () => deserializeSupplyResidenceSave(wire, e, policy),
    ].map(run => {
      // Each rejected public call is measured independently, after all producers finish.
      const calls = [
        vi.spyOn(energy, 'planResidenceAction'), vi.spyOn(cycle, 'planCharacterCycle'),
        vi.spyOn(body, 'planActionBodyConsequences'), vi.spyOn(movement, 'planResidenceMove'),
        vi.spyOn(movement, 'planResidenceBoundMove'), vi.spyOn(rest, 'planResidenceLocationRest'),
        vi.spyOn(supply, 'planSupplyMove'), vi.spyOn(supply, 'planSupplyRest'),
        vi.spyOn(terminal, 'planSupplyTerminal'), vi.spyOn(terminal, 'consumeSupplyDeath'),
        vi.spyOn(terminal, 'consumeSupplyLocationDeath'), vi.spyOn(oldTerminal, 'planResidenceTerminal'),
        vi.spyOn(oldTerminal, 'consumeResidenceLocationDeath'), vi.spyOn(lifecycle, 'terminateMission'),
        vi.spyOn(random, 'drawIntInclusive'), vi.spyOn(Storage.prototype, 'getItem'),
        vi.spyOn(Storage.prototype, 'setItem'), vi.spyOn(EventTarget.prototype, 'dispatchEvent'),
      ]
      draw.mockClear()
      const result = observe(run)
      expect(calls.map(s => s.mock.calls.length)).toEqual(Array(calls.length).fill(0))
      expect(draw).not.toHaveBeenCalled()
      vi.restoreAllMocks()
      return result
    })
    expect(bad).toEqual(before)
    expect(e).toEqual(expectedBefore)
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
  it.each([1, 2])('preserves actual G2 primary loss before death at HP%i', hp => {
    const base = fixture({ hp, bleeding: true })
    // Isolated controlled TEST catalog: exercise G2 primary damage, not new production content.
    const catalog = createLocationCatalog({ ...base.dependencies.catalog.data, edges: base.dependencies.catalog.data.edges.map(e =>
      e.id === 'H0-H1:forward' ? { ...e, arrival: { healthLoss: 1, exposuresAdded: 0 } } : e) })
    const dependencies = { ...base.dependencies, catalog, catalogs: [catalog] }
    const f = { ...producerFixture(dependencies, { hp, bleeding: true }), initialExecution: base.initialExecution,
      policy: createSupplyResidencePolicy(dependencies) }, v = f.value
    const p = planResidenceMove({ character: v.character, site: v.site, carried: v.carried, itemStates: v.itemStates },
      { kind: 'move', binding: v.site!.binding, expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' },
      { cycle: cycleContext(v.character, dependencies, 'H0'), mission: v.missions.find(m => m.status === 'active')! },
      { residence: dependencies.residence, catalog })
    const value = consumeSupplyLocationDeath(v, p, f.authorize(v)).snapshot
    expect(value.receipts[0].steps.map(s => s.kind)).toEqual(hp === 1 ? ['primary'] : ['primary', 'action-bleeding'])
    expect(value.receipts[0].steps[0].facts.healthLoss).toBe(1)
    expect(value.character.body.condition.currentHealth).toBe(0)
    roundtrip({ f, value })
  })
  it('preserves real G2 Day6 local rest death through location-death', () => {
    const f = fixture({ hp: 1, bleeding: true }), v = atDay(atNode(f, f.value, 'H1'), 6)
    const p = planResidenceLocationRest({ character: v.character, site: v.site, carried: v.carried, itemStates: v.itemStates },
      { kind: 'rest', binding: v.site!.binding, expectedRevision: v.character.revision },
      { cycle: cycleContext(v.character, f.dependencies, 'H1'), mission: v.missions.find(m => m.status === 'active')! },
      { residence: f.dependencies.residence, catalog: f.dependencies.catalog })
    const value = consumeSupplyLocationDeath(v, p, f.authorize(v)).snapshot
    expect(value.receipts[0].source).toBe('location-death')
    expect(value.receipts[0].steps[0].facts.damage).toBe(1)
    roundtrip({ f, value })
  })
  it.each(['supply-death', 'location-death'] as const)('rejects %s rest at a historical node whose controlled catalog forbids rest', source => {
    const r = makeCycleDeath(6), bad = mutable(r.value)
    bad.receipts[0].source = source
    // No production catalog change: independent TEST policy disables this node's rest.
    const catalog = createLocationCatalog({ ...r.f.dependencies.catalog.data, nodes: r.f.dependencies.catalog.data.nodes.map(n =>
      n.id === bad.archives[0].site.nodeId ? { ...n, rest: null } : n) })
    const deps = { ...r.f.dependencies, catalog, catalogs: [catalog] }
    expect(readSupplyValue(bad, deps)).toEqual(bad)
    rejectAll(r, bad, createSupplyResidencePolicy(deps))
  })
  it.each(['supply-death', 'location-death'] as const)('rejects %s cycle history with a real pending encounter or its cleared marker', source => {
    const r = makeCycleDeath(6), bad = mutable(r.value), site = bad.archives[0].site
    const enemy = r.f.dependencies.catalog.data.enemies[0]
    site.nodeId = enemy.nodeId
    site.pending = { kind: 'combat-required', enemyId: enemy.id }
    site.enemies.find(e => e.id === enemy.id)!.state.hasBeenEncountered = true
    bad.archives[0].site = mutable(observeLocationArrival({ character: bad.character, site,
      carried: bad.carried, itemStates: bad.archives[0].itemStates }, r.f.dependencies).site)
    bad.receipts[0].source = source
    expect(readSupplyValue(bad, r.f.dependencies)).toEqual(bad)
    rejectAll(r, bad)
    // Clearing only the marker cannot make this historical live encounter restable.
    bad.archives[0].site.pending = { kind: 'none' }
    expect(readSupplyValue(bad, r.f.dependencies)).toEqual(bad)
    rejectAll(r, bad)
  })
  it('rejects understated nonzero cycle bleeding while retaining a real later infection death', () => {
    const f = fixture({ hp: 3, bleeding: true }), root = atDay(atNode(f, f.value, 'H1'), 7)
    const config = f.dependencies.residence.configuration.config
    const v = readSupplyValue({ ...root, character: { ...root.character, body: { ...root.character.body,
      infectionProgress: config.health.infection_damage.find(row => row.hp > 0)!.min } } }, f.dependencies)
    const value = planSupplyTerminal(v, { kind: 'deadline', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    expect(value.receipts[0].steps.map(s => s.kind)).toEqual(['cycle-bleeding', 'infection'])
    roundtrip({ f, value })
    const bad = mutable(value)
    bad.receipts[0].steps[0].healthBefore = 2
    bad.receipts[0].steps[0].facts.damage = 1
    expect(readSupplyValue(bad, f.dependencies)).toEqual(bad)
    rejectAll({ f, value }, bad)
  })
  it('keeps old deadline bleeding independent of a later declaration whose wound was treated', () => {
    const base = fixture({ bleeding: true }), { f, next } = twoDeclarationFixture(base)
    const v = atDay(atNode(f, f.value, 'H1'), 7)
    const old = planSupplyTerminal(v, { kind: 'deadline', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    const second = next(old)
    const value = planSupplyMedical(second.value, { kind: 'medical', expectedRevision: second.value.character.revision,
      instanceId: second.value.carried.quickSlots.slots[0]!.instanceId }, second.authorize(second.value)).snapshot
    expect(old.receipts[0].steps[0].facts.damage).toBe(f.dependencies.residence.configuration.config.health.bleed_night)
    expect(value.character.body.condition.bleeding).toBe(false)
    expect(value.receipts[0]).toEqual(old.receipts[0])
    roundtrip({ f: { ...second, initialExecution: base.initialExecution, policy: createSupplyResidencePolicy(second.dependencies) }, value })
  })
})
