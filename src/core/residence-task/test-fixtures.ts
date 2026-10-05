// TEST ONLY: danger-cleared isolated prestate, NOT a CTB producer or a complete playable route.
import { observeLocationArrival } from '../residence-location/knowledge'
import { readSupplyValue } from '../residence-supply/validation'
import { fixture } from '../residence-supply/test-fixtures'
import { planSupplyMove } from '../residence-supply/controlled'
import { planSupplySourceReveal } from './sources'
import { planSupplyInventory } from '../residence-supply/inventory'
import { createSupplyAuthority } from '../residence-supply/authority'
import { cycleContext } from '../residence-supply/validation'
import { drawIntInclusive } from '../random'
import { createMissionScope, establishMissionFact, activateMission } from '../mission-lifecycle/controlled'
import { planCharacterCycle } from '../character-cycle'
import { establishResidenceLocation } from '../residence-location/controlled'
import { createLocationCatalog } from '../residence-location/controlled'
import { establishSupplyInitial, planSupplyDeparture } from '../residence-supply/initial'
import type { SupplyValue } from '../residence-supply/types'
export { fixture }
export function resolvedDanger(f: ReturnType<typeof fixture>, value = f.value): SupplyValue {
  if (!value.site) throw new Error('No test site')
  return readSupplyValue({ ...value, site: { ...value.site,
    pending: { kind: 'none' }, enemies: value.site.enemies.map(e => ({ ...e, state: { ...e.state,
      currentHealth: 0, defeated: true, hasBeenEncountered: true } })),
    facts: value.site.facts.map(f => f.id.startsWith('enemy-') && f.id.endsWith('-cleared') ? { ...f, value: true } : f) } }, f.dependencies)
}
/** Isolated actual position fixture; never sets task progress or removes enemies. */
export function atNode(f: ReturnType<typeof fixture>, value: SupplyValue, nodeId: string) {
  if (!value.site) throw new Error('No site')
  const location = observeLocationArrival({ character: value.character, site: { ...value.site, nodeId, pending: { kind: 'none' } },
    carried: value.carried, itemStates: value.itemStates }, { residence: f.dependencies.residence, catalog: f.dependencies.catalog })
  return readSupplyValue({ ...value, ...location }, f.dependencies)
}
export function realMove(f: ReturnType<typeof fixture>, value: SupplyValue, edgeId: string) {
  return planSupplyMove(value, { kind: 'move', expectedRevision: value.character.revision, edgeId }, f.authorize(value)).snapshot
}
export function forcedDraw(f: ReturnType<typeof fixture>, roll: number) {
  const dependencies = { ...f.dependencies, draw: (cursor: Parameters<typeof drawIntInclusive>[0], min: number, max: number) =>
    ({ ...drawIntInclusive(cursor, min, max), value: roll }) }
  return { ...f, dependencies, authorize: (v: SupplyValue) => createSupplyAuthority(v,
    { cycle: cycleContext(v.character, dependencies, v.site?.nodeId ?? null), missions: v.missions }, dependencies) }
}
export function searchAt(f: ReturnType<typeof fixture>, v: SupplyValue, sourceId: string, extra = {}) {
  const source = f.dependencies.tasks.data.sources.find(s => s.id === sourceId)!
  const here = atNode(f, v, source.node)
  return planSupplySourceReveal(here, { kind: 'reveal', expectedRevision: here.character.revision, sourceId,
    ...(['H1-search', 'H2-search', 'H3-search'].includes(sourceId) ? { method: 'dark' } : sourceId === 'C4-cabinet' ? { method: 'manual' } : {}),
    ...extra }, f.authorize(here)).snapshot
}
export function pickAlias(f: ReturnType<typeof fixture>, v: SupplyValue, alias: string, x: number, y = 0) {
  const def = f.dependencies.tasks.data.items.find(i => i.alias === alias)!.id
  const item = v.site!.ground.find(g => g.nodeId === v.site!.nodeId)!.items.find(i => i.definitionId === def)!
  return planSupplyInventory(v, { kind: 'pickup', expectedRevision: v.character.revision,
    instanceId: item.instanceId, placement: { x, y, rotated: false } }, f.authorize(v)).snapshot
}
/** Two explicit TEST declarations; never registered in production content. */
export function twoDeclarationFixture(base: ReturnType<typeof fixture>) {
  const first = base.dependencies.catalog.data.mission
  const second = { ...first, commissionId: 'TEST-second-commission', templateId: 'TEST-second-template' }
  const secondCatalog = createLocationCatalog({ ...base.dependencies.catalog.data, id: 'TEST-second-catalog', mission: second })
  const scope = createMissionScope({ characterId: base.dependencies.residence.scope.characterId, declarations: [first, second] }, v => v === first.rulesVersion)
  const deps = { ...base.dependencies, residence: { ...base.dependencies.residence, scope }, catalogs: [base.dependencies.catalog, secondCatalog] }
  const authorize = (v: SupplyValue) => createSupplyAuthority(v, { cycle: cycleContext(v.character, deps, v.site?.nodeId ?? null), missions: v.missions }, deps)
  const initial = establishSupplyInitial({ character: base.initial.character,
    mission: establishMissionFact({ characterId: scope.characterId, mission: first }, scope), execution: base.initial.origins[0].binding.execution,
    tool: 'toolbox', specialty: 'engineer' }, deps)
  const departed = planSupplyDeparture(initial, { kind: 'depart', expectedRevision: 0, commissionId: first.commissionId }, authorize(initial))
  const f = { ...base, dependencies: deps, authorize, initial, departed, value: departed.snapshot }
  const next = (v: SupplyValue) => {
    const dependencies = { ...deps, catalog: secondCatalog }
    const mission = v.missions.find(m => m.binding.mission.commissionId === second.commissionId)!
    if (mission.status !== 'unaccepted') throw new Error('Second TEST declaration is not unaccepted')
    const execution = { ...v.origins[0].binding.execution, runId: 'TEST-second-execution', seed: 'TEST-second-seed' }
    const ctx = { ...cycleContext(v.character, dependencies, null), departure: { mission, execution } }
    const cycle = planCharacterCycle(v.character, { kind: 'depart', identity: v.character.identity,
      expectedRevision: v.character.revision, commissionId: second.commissionId }, ctx, dependencies.residence)
    const active = activateMission(mission, { binding: mission.binding, execution }, scope)
    const location = establishResidenceLocation({ character: cycle.snapshot, carried: v.carried, itemStates: v.itemStates },
      { cycle: cycleContext(cycle.snapshot, dependencies, secondCatalog.data.entryNodeId), mission: active }, { residence: dependencies.residence, catalog: secondCatalog })
    const value = readSupplyValue({ ...v, ...location, phase: 'active-world', missions: v.missions.map(m => m === mission ? active : m) }, dependencies)
    return { ...f, dependencies, value, authorize: (v: SupplyValue) => createSupplyAuthority(v,
      { cycle: cycleContext(v.character, dependencies, v.site?.nodeId ?? null), missions: v.missions }, dependencies) }
  }
  return { f, next }
}
