// TEST ONLY: explicit isolated catalogs and native G1/G2/A producers. Never a runtime import.
import { expect } from 'vitest'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as terminal } from '../../content/infected-terminal-core-v0.1/config'
import { planCharacterCycle } from '../../core/character-cycle'
import { activateMission, createMissionScope, establishMissionFact } from '../../core/mission-lifecycle/controlled'
import { createLocationCatalog, establishResidenceLocation, planResidenceLocationRest } from '../../core/residence-location/controlled'
import { planResidenceMove, planResidenceSourceReveal, planResidenceItemTransfer, type LocationAuthority } from '../../core/residence-location'
import { catalogInput, execution } from '../../core/residence-location/test-fixtures'
import { fixture as aFixture, command, mutable } from '../../core/residence-terminal/test-fixtures'
import { createTerminalAuthority, planResidenceTerminal, consumeResidenceLocationDeath } from '../../core/residence-terminal/controlled'
import { locationOf } from '../../core/residence-terminal/authority'
import { readTerminalSnapshot } from '../../core/residence-terminal/validation'
import type { TerminalDependencies, TerminalSnapshot } from '../../core/residence-terminal'
import { createTerminalResidenceSavePolicy } from './terminal-controlled'
import { deserializeTerminalResidenceSave, serializeTerminalResidenceSave, validateTerminalResidenceAggregate,
  type FreshTerminalResidenceHub, type TerminalResidenceAggregate, type TerminalResidenceSavePolicy } from './terminal-index'

export { g1, terminal, mutable, command, locationOf }
export function policyFor(deps: TerminalDependencies) {
  return createTerminalResidenceSavePolicy({ configuration: deps.residence.configuration, terminalConfiguration: deps.configuration,
    rulesVersion: deps.residence.rulesVersion, declarations: deps.residence.scope.declarations, policies: deps.policies })
}
export function fixture(options: Parameters<typeof aFixture>[2] = {}) {
  const f = aFixture(g1, terminal, options)
  return { ...f, policy: policyFor(f.dependencies) }
}
export function roundTrip(value: TerminalResidenceAggregate, policy: TerminalResidenceSavePolicy) {
  const text = serializeTerminalResidenceSave(value, policy)
  expect(typeof text).toBe('string')
  const copy = deserializeTerminalResidenceSave(text, policy)
  expect(copy).toEqual(value)
  expect(copy).not.toBe(value)
  return copy
}
export function initial() {
  const data = catalogInput()
  data.nodes[0].surfaceSourceIds.push('sample')
  data.sources.push({ id: 'sample', nodeId: 'a', cost: { kind: 'paid', base: 1, factors: [] }, requiredFactIds: [],
    contents: { kind: 'fixed', grants: [{ definitionId: 'quest', quantity: 1, resource: { kind: 'none' } }] } })
  const catalog = createLocationCatalog(data)
  const scope = createMissionScope({ characterId: 'genuine-first-character', declarations: [data.mission] }, (v) => v === data.mission.rulesVersion)
  const dependencies: TerminalDependencies = { residence: { configuration: g1, rulesVersion: data.mission.rulesVersion, scope }, configuration: terminal,
    policies: [{ catalog, returnNodeId: 'a', powerFactId: 'road-open', transferFactId: 'installed', sampleSourceId: 'sample', sampleOrdinal: 0,
      specialDefinitionIds: [], permissionDefinitionIds: [] }] }
  const policy = policyFor(dependencies)
  const fresh: FreshTerminalResidenceHub = {
    phase: 'fresh-hub', terminalConfigurationId: terminal.configurationId, balance: terminal.config.initial_balance,
    catalogRef: { catalogId: data.id, catalogVersion: data.version }, site: null, warehouse: { items: [], itemStates: { states: [] } },
    archives: [], receipts: [], dispositions: [],
    character: { identity: { characterId: scope.characterId, rulesVersion: data.mission.rulesVersion, configurationId: g1.configurationId },
      revision: 0, cycle: 1, clock: { kind: 'first-ready' }, body: { energy: g1.config.limits.energy, infectionProgress: 0,
        satiety: g1.config.limits.satiety, suppression: 0, quotasRemaining: g1.config.quota,
        condition: { currentHealth: g1.config.limits.hp, bleeding: false, minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0, openWounds: [] } } },
    missions: [establishMissionFact({ characterId: scope.characterId, mission: data.mission }, scope)],
    carried: { backpack: { width: data.backpack.width, height: data.backpack.height, items: [], placements: [] },
      equipment: { weapon: null, armor: null, utility: null }, quickSlots: { slots: Array(data.backpack.quickSlotCount).fill(null) } }, itemStates: { states: [] },
  }
  const depart = () => {
    const m = fresh.missions[0]
    if (m.status !== 'unaccepted') throw new Error('fresh mission')
    const p = planCharacterCycle(fresh.character, { kind: 'depart', identity: fresh.character.identity, expectedRevision: 0, commissionId: m.binding.mission.commissionId },
      { identity: fresh.character.identity, revision: 0, cycle: 1, lifecycle: { kind: 'first' }, stableContext: 'stable', rest: null,
        normalReturn: null, departure: { mission: m, execution } }, dependencies.residence)
    const active = activateMission(m, { binding: m.binding, execution }, scope)
    if (p.snapshot.clock.kind !== 'active') throw new Error('native departure')
    const authority: LocationAuthority = { mission: active, cycle: { identity: p.snapshot.identity, revision: p.snapshot.revision, cycle: p.snapshot.cycle,
      lifecycle: p.snapshot.clock, stableContext: 'stable', rest: 'A', normalReturn: null, departure: null } }
    const location = establishResidenceLocation({ character: p.snapshot, carried: fresh.carried, itemStates: fresh.itemStates }, authority,
      { residence: dependencies.residence, catalog })
    const value = readTerminalSnapshot({ phase: 'active-world', terminalConfigurationId: terminal.configurationId, balance: fresh.balance,
      ...location, missions: [active], warehouse: fresh.warehouse, archives: [], receipts: [], dispositions: [] }, dependencies)
    return { value, authority, cyclePlan: p }
  }
  return { fresh, depart, dependencies, policy }
}
export function normal(f = fixture(), success = false, value = f.value) {
  return planResidenceTerminal(value, command(value, success ? 'deliver' : 'withdraw'), f.authorize(value)).snapshot
}
export function death(f = fixture({ hp: 1, bleeding: true }), mode: 'move' | 'reveal' | 'rest' = 'move', value = f.value) {
  const s = locationOf(value); const a = f.authorityFor(s); const d = f.locationDependencies
  const base = { binding: s.site.binding, expectedRevision: s.character.revision }
  const original = mode === 'move' ? planResidenceMove(s, { ...base, kind: 'move', edgeId: 'ab' }, a, d)
    : mode === 'reveal' ? planResidenceSourceReveal(s, { ...base, kind: 'reveal', sourceId: 'lottery-a' }, a, d)
      : planResidenceLocationRest(s, { ...base, kind: 'rest' }, a, d)
  return { original, value: consumeResidenceLocationDeath(value, original, f.authorize(value)).snapshot }
}
export function revealFixed(f: ReturnType<typeof fixture>, value = f.value) {
  const s = locationOf(value)
  const reveal = planResidenceSourceReveal(s, { kind: 'reveal', binding: s.site.binding, expectedRevision: s.character.revision,
    sourceId: 'fixed' }, f.authorityFor(s), f.locationDependencies)
  return readTerminalSnapshot({ ...value, ...reveal.snapshot }, f.dependencies)
}
export function pickFixed(f: ReturnType<typeof fixture>, value = revealFixed(f)) {
  let current = value
  for (const [definitionId, x] of [['pipe', 2], ['lamp', 3]] as const) {
    const s = locationOf(current)
    const item = s.site.ground[0].items.find((i) => i.definitionId === definitionId)!
    const plan = planResidenceItemTransfer(s, { kind: 'pickup', binding: s.site.binding, expectedRevision: s.character.revision,
      instanceId: item.instanceId, placement: { x, y: 0, rotated: false } }, f.authorityFor(s), f.locationDependencies)
    current = readTerminalSnapshot({ ...current, ...plan.snapshot }, f.dependencies)
  }
  return current
}
export function history(success: boolean, mode: 'normal' | 'deadline' | 'ground-sample' = 'normal') {
  // One actual reveal bleeds 4 -> 3, normal return does not bleed, departure 3 -> 1.
  const f = fixture(mode === 'deadline' ? { two: true, day: 7, node: 'b', hp: 3, bleeding: true, balance: 47 }
    : { two: true, complete: success, sample: mode === 'ground-sample', hp: 4, bleeding: true, balance: 47 })
  let start = mode === 'deadline' ? f.value : pickFixed(f)
  if (mode === 'ground-sample') {
    // Controlled test task fact: leave the genuine issued case in its original room.
    const ground = mutable(start)
    const sample = ground.carried.backpack.items.find((i) => i.definitionId === 'quest')!
    ground.carried.backpack.items = ground.carried.backpack.items.filter((i) => i !== sample)
    ground.carried.backpack.placements = ground.carried.backpack.placements.filter((p) => p.instanceId !== sample.instanceId)
    ground.site!.ground[0].items.push(sample)
    start = readTerminalSnapshot(ground, f.dependencies)
  }
  const first = mode === 'deadline' ? planResidenceTerminal(start, command(start, 'deadline'), f.authorize(start)).snapshot : normal(f, success, start)
  if ((first.character.clock.kind !== 'return-due' && first.character.clock.kind !== 'deadline-ready') || first.missions[1].status !== 'unaccepted') throw new Error('first native result')
  const nextExecution = { runId: 'real-second-execution', seed: 'seed-with|delimiter', rulesVersion: f.dependencies.residence.rulesVersion }
  const p = planCharacterCycle(first.character, { kind: 'depart', identity: first.character.identity, expectedRevision: first.character.revision,
    commissionId: first.missions[1].binding.mission.commissionId }, { identity: first.character.identity, revision: first.character.revision,
    cycle: first.character.cycle, lifecycle: { kind: 'closed', source: first.character.clock.source }, stableContext: 'stable', rest: null,
    normalReturn: null, departure: { mission: first.missions[1], execution: nextExecution } }, f.dependencies.residence)
  const active = activateMission(first.missions[1], { binding: first.missions[1].binding, execution: nextExecution }, f.dependencies.residence.scope)
  if (p.snapshot.clock.kind !== 'active') throw new Error('second native departure')
  const authority: LocationAuthority = { mission: active, cycle: { identity: p.snapshot.identity, revision: p.snapshot.revision, cycle: p.snapshot.cycle,
    lifecycle: p.snapshot.clock, stableContext: 'stable', rest: 'A', normalReturn: null, departure: null } }
  const d = { residence: f.dependencies.residence, catalog: f.dependencies.policies[1].catalog }
  const site = establishResidenceLocation({ character: p.snapshot, carried: first.carried, itemStates: first.itemStates }, authority, d)
  const current = readTerminalSnapshot({ ...first, ...site, phase: 'active-world', missions: [first.missions[0], active] }, f.dependencies)
  const cap = createTerminalAuthority(current, authority, f.dependencies)
  const move = planResidenceMove(site, { kind: 'move', binding: site.site.binding, expectedRevision: site.character.revision, edgeId: 'ab' }, authority, d)
  const final = consumeResidenceLocationDeath(current, move, cap).snapshot
  return { ...f, first, current, final, source: start }
}
export function accepted(input: unknown, policy: TerminalResidenceSavePolicy) { return validateTerminalResidenceAggregate(input, policy) }
export function assertRejected(input: unknown, policy: TerminalResidenceSavePolicy, code = 'INVALID_STATE') {
  expect(() => accepted(input, policy)).toThrowError(expect.objectContaining({ name: 'TerminalResidenceSaveError', code }))
}
export function withAssets(f: ReturnType<typeof fixture>): TerminalSnapshot {
  const v = mutable(f.value)
  v.carried.equipment.weapon = { instanceId: 'initial-pipe', definitionId: 'pipe', quantity: 1 }
  v.carried.quickSlots.slots[0] = { instanceId: 'quick-unit', definitionId: 'supply', quantity: 1 }
  v.carried.backpack.items.push({ instanceId: 'initial-stack', definitionId: 'supply', quantity: 3 })
  v.carried.backpack.placements.push({ instanceId: 'initial-stack', x: 2, y: 2, rotated: false })
  v.itemStates.states.push({ instanceId: 'initial-pipe', definitionId: 'pipe', resource: { kind: 'durability', current: 1 } },
    { instanceId: 'initial-stack', definitionId: 'supply', resource: { kind: 'none' } },
    { instanceId: 'quick-unit', definitionId: 'supply', resource: { kind: 'none' } })
  v.warehouse.items.push({ instanceId: 'old-warehouse-lamp', definitionId: 'lamp', quantity: 1 })
  v.warehouse.itemStates.states.push({ instanceId: 'old-warehouse-lamp', definitionId: 'lamp', resource: { kind: 'charge', current: 0 } })
  return readTerminalSnapshot(v, f.dependencies)
}
