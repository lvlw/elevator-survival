// TEST ONLY: explicit isolated content facts, not five-map production or a public initializer.
import type { ResidenceConfig } from '../residence-config'
import { catalogInput, fixture as locationFixture } from '../residence-location/test-fixtures'
import { createLocationCatalog } from '../residence-location/controlled'
import { observeLocationArrival } from '../residence-location/knowledge'
import { planResidenceSourceReveal } from '../residence-location'
import { readLocationContext } from '../residence-location/validation'
import { createMissionScope, establishMissionFact } from '../mission-lifecycle/controlled'
import type { LocationAuthority, ResidenceLocationSnapshot } from '../residence-location'
import type { TerminalConfig, TerminalDependencies, TerminalSnapshot } from './types'
import { createTerminalAuthority } from './authority'
import { readTerminalSnapshot } from './validation'

export type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T
export const mutable = <T>(value: T): Mutable<T> => structuredClone(value) as Mutable<T>
export function fixture(configuration: ResidenceConfig, terminal: TerminalConfig, options: {
  hp?: number; bleeding?: boolean; day?: number; node?: 'a' | 'b'; balance?: number;
  infection?: number; satiety?: number; energy?: number; complete?: boolean; sample?: boolean; two?: boolean
  arrivalDamage?: number; encounterOnArrival?: boolean
} = {}) {
  const data = catalogInput()
  if (options.arrivalDamage !== undefined) data.edges[0].arrival.healthLoss = options.arrivalDamage
  if (options.encounterOnArrival) data.enemies[0].nodeId = 'b'
  data.nodes[0].surfaceSourceIds.push('sample')
  data.sources.push({ id: 'sample', nodeId: 'a', cost: { kind: 'paid', base: 1, factors: [] }, requiredFactIds: [],
    contents: { kind: 'fixed', grants: [{ definitionId: 'quest', quantity: 1, resource: { kind: 'none' } }] } })
  data.items.find((i) => i.physical.id === 'card')!.ordinary = false
  data.items.push({ physical: { id: 'component', name: 'component', width: 1, height: 1, unitWeight: 0, canRotate: false, stacking: { kind: 'none' } },
    resource: { definitionId: 'component', kind: 'none' }, equipment: { definitionId: 'component', kind: 'not-equippable' },
    quickSlot: { definitionId: 'component', kind: 'not-eligible' }, ordinary: false })
  const f = locationFixture(configuration, { hp: options.hp, bleeding: options.bleeding, energy: options.energy, catalog: data })
  const second = { ...data.mission, commissionId: 'second-explicit-test-commission' }
  const scope = createMissionScope({ characterId: f.scope.characterId, declarations: options.two ? [data.mission, second] : [data.mission] },
    (v) => v === data.mission.rulesVersion)
  const policy = { catalog: f.dependencies.catalog, returnNodeId: 'a', powerFactId: 'road-open', transferFactId: 'installed',
    sampleSourceId: 'sample', sampleOrdinal: 0, specialDefinitionIds: ['component'], permissionDefinitionIds: ['card'] }
  const dependencies: TerminalDependencies = { residence: { ...f.dependencies.residence, scope }, configuration: terminal,
    policies: options.two ? [policy, { ...policy, catalog: createLocationCatalog({ ...data, id: 'second-test-catalog', mission: second }) }] : [policy] }
  const missions = options.two ? [f.lifecycle, establishMissionFact({ characterId: scope.characterId, mission: second }, scope)] : [f.lifecycle]
  let state = mutable(f.state)
  // Real G2 source issuance. The controlled test task producer below moves its exact
  // nonordinary instance explicitly; G2 ordinary pickup is NOT used to bypass policy.
  if (options.sample || options.complete) {
    state = mutable(planResidenceSourceReveal(state, { kind: 'reveal', binding: state.site.binding,
      expectedRevision: state.character.revision, sourceId: 'sample' }, f.authorityFor(state), f.dependencies).snapshot)
    const ground = state.site.ground.find((g) => g.nodeId === 'a')!
    const item = ground.items.find((i) => i.definitionId === 'quest')!
    ground.items = ground.items.filter((i) => i !== item)
    state.carried.backpack.items.push(item)
    state.carried.backpack.placements.push({ instanceId: item.instanceId, x: 0, y: 0, rotated: false })
  }
  const day = options.day ?? 1
  state.character.cycle = day
  if (state.character.clock.kind !== 'active') throw new Error('fixture clock')
  state.character.clock.taskDay = day
  state.character.body.condition.currentHealth = options.hp ?? 12
  state.character.body.infectionProgress = options.infection ?? 0
  state.character.body.satiety = options.satiety ?? 6
  if (options.complete) state.site.facts.forEach((f) => { f.value = true })
  if (options.node === 'b') {
    state.site.nodeId = 'b'
    state = mutable(observeLocationArrival(state, f.dependencies))
  }
  const authorityFor = (s: ResidenceLocationSnapshot): LocationAuthority => {
    if (s.character.clock.kind !== 'active') throw new Error('fixture authority requires actual active clock')
    const m = missions.find((m) => m.status === 'active')!
    const p = dependencies.policies.find((p) => p.catalog.data.id === s.site.binding.catalogId)!
    return { mission: m, cycle: { identity: s.character.identity, revision: s.character.revision, cycle: s.character.cycle,
      lifecycle: s.character.clock, rest: p.catalog.data.nodes.find((n) => n.id === s.site.nodeId)!.rest,
      stableContext: 'stable', normalReturn: null, departure: null } }
  }
  const canonical = readLocationContext(state, authorityFor(state), { ...f.dependencies, residence: dependencies.residence }).snapshot
  const value = readTerminalSnapshot({ ...canonical, phase: 'active-world', terminalConfigurationId: terminal.configurationId,
    missions, balance: options.balance ?? 0, warehouse: { items: [], itemStates: { states: [] } }, archives: [], dispositions: [], receipts: [] }, dependencies)
  const authorize = (v: TerminalSnapshot) => {
    if (!v.site) throw new Error('active fixture only')
    return createTerminalAuthority(v, authorityFor({ ...v, site: v.site }), dependencies)
  }
  return { value, dependencies, authority: authorize(value), authorize, authorityFor, locationDependencies: { ...f.dependencies, residence: dependencies.residence } }
}
export function command(value: TerminalSnapshot, kind: 'deliver' | 'withdraw' | 'deadline') {
  if (!value.site) throw new Error('no active site')
  return { kind, binding: value.site.binding, expectedRevision: value.character.revision }
}
