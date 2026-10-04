import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { readCycleContext, type CycleAuthority, type ResidenceDependencies } from '../../core/character-cycle'
import { activeClockSchema, identitySchema, sameResidenceValue } from '../../core/character-cycle/validation'
import { createMissionScope, parseMissionColdCandidate } from '../../core/mission-lifecycle/controlled'
import { bindingSchema, declarationSchema, executionSchema } from '../../core/mission-lifecycle/validation'
import { requireResidenceConfig } from '../../core/residence-config'
import { countSchema, idSchema, parseResidence, positiveSchema } from '../../core/residence-config/validation'
import { requireCatalog, unique } from '../../core/residence-location/catalog'
import { locationBindingSchema, sourceItemId } from '../../core/residence-location/identity'
import { carriedItems, carriedSchema, itemStatesSchema, readLocationContext } from '../../core/residence-location/validation'
import type { LocationAuthority, LocationDependencies, ResidenceLocationSnapshot } from '../../core/residence-location'
import { calculateBackpackWeightSubtotal } from '../../core/inventory'
import { createCarriedItemContainersSnapshot } from '../../core/quick-slot'
import { createItemStateCollectionSnapshot } from '../../core/item-state'
import { classifyLoad } from '../../core/load'
import { ResidenceSaveError, type ResidenceSavePolicy, type ResidenceAggregate,
  type ActiveResidenceWorld, type CatalogReference } from './types'

const policies = new WeakSet<object>()
const catalogRefSchema = z.strictObject({ catalogId: idSchema, catalogVersion: idSchema })
const header = z.strictObject({ identity: identitySchema, revision: countSchema, cycle: positiveSchema,
  body: z.unknown(), clock: z.unknown() })
const common = { character: header, missions: z.array(z.unknown()), carried: carriedSchema, itemStates: itemStatesSchema }
const aggregate = z.discriminatedUnion('phase', [
  z.strictObject({ phase: z.literal('fresh-hub'), ...common, catalogRef: catalogRefSchema }),
  z.strictObject({ phase: z.literal('active-world'), ...common, site: z.unknown() }),
])
// Structural adapter only. G1 retains all closed-clock temporal/identity rules.
const closure = z.strictObject({ mission: declarationSchema, execution: executionSchema, startCycle: positiveSchema,
  endCycle: positiveSchema, taskDay: positiveSchema, outcome: z.enum(['success', 'voluntary-failure', 'deadline-failure']) })
const clockSchema = z.discriminatedUnion('kind', [activeClockSchema,
  z.strictObject({ kind: z.literal('first-ready') }),
  z.strictObject({ kind: z.literal('return-due'), source: closure }),
  z.strictObject({ kind: z.literal('deadline-ready'), source: closure }),
])
function invalid(message: string): never { throw new ResidenceSaveError('INVALID_STATE', message) }
function unsupported(message: string): never { throw new ResidenceSaveError('UNSUPPORTED_STAGE', message) }

/** Controlled composition, not archive-supplied policy. Not exported by the ordinary index. */
export function createResidenceSavePolicy(input: ResidenceSavePolicy): ResidenceSavePolicy {
  const configuration = requireResidenceConfig(input.configuration)
  const rulesVersion = parseResidence(idSchema, input.rulesVersion)
  const declarations = parseResidence(z.array(declarationSchema).min(1), input.declarations)
  unique(declarations.map((d) => d.commissionId), 'controlled declarations')
  if (declarations.some((d) => d.rulesVersion !== rulesVersion)) invalid('Declaration rules differ from policy')
  if (!Array.isArray(input.catalogs) || input.catalogs.length === 0) invalid('Missing controlled catalogs')
  const catalogs = input.catalogs.map(requireCatalog)
  unique(catalogs.map((c) => JSON.stringify([c.data.id, c.data.version])), 'controlled catalog versions')
  if (catalogs.some((c) => !declarations.some((d) => sameResidenceValue(d, c.data.mission)))) invalid('Catalog mission not declared')
  const policy = Object.freeze({ configuration, rulesVersion, declarations: deepFreeze(declarations), catalogs: Object.freeze(catalogs) })
  policies.add(policy)
  return policy
}
export function requireResidenceSavePolicy(policy: ResidenceSavePolicy) {
  if (!policy || !policies.has(policy)) invalid('Uncontrolled restore policy')
  return policy
}
export function residenceCatalog(ref: CatalogReference, policy: ResidenceSavePolicy) {
  const found = policy.catalogs.find((c) => c.data.id === ref.catalogId && c.data.version === ref.catalogVersion)
  if (!found) throw new ResidenceSaveError('UNKNOWN_CATALOG', 'Unsupported catalog version')
  return found
}

/** Explicitly cold: derived consistency authority, NOT proof of a live current or history. */
function readAggregate(input: unknown, policy: ResidenceSavePolicy): ResidenceAggregate {
  const raw = parseResidence(aggregate, input)
  const h = raw.character
  if (h.identity.rulesVersion !== policy.rulesVersion) throw new ResidenceSaveError('UNKNOWN_RULES', 'Unsupported rules version')
  if (h.identity.configurationId !== policy.configuration.configurationId) {
    throw new ResidenceSaveError('UNKNOWN_CONFIGURATION', 'Unsupported configuration')
  }
  const scope = createMissionScope({ characterId: h.identity.characterId, declarations: policy.declarations }, (v) => v === policy.rulesVersion)
  const deps: ResidenceDependencies = { configuration: policy.configuration, rulesVersion: policy.rulesVersion, scope }
  const seen = new Set<string>()
  const missions = raw.missions.map((fact) => {
    const key = parseResidence(z.object({ binding: bindingSchema }), fact).binding.mission.commissionId
    const declaration = policy.declarations.find((d) => d.commissionId === key)
    if (!declaration || seen.has(key)) invalid('Unknown or duplicate commission fact')
    seen.add(key)
    return parseMissionColdCandidate(fact, { characterId: h.identity.characterId, mission: declaration }, scope).value
  })
  if (seen.size !== policy.declarations.length) invalid('Missing declared mission fact')
  const active = missions.filter((m) => m.status === 'active')
  if (active.length > 1) invalid('More than one active execution')
  unique(missions.flatMap((m) => m.status === 'unaccepted' ? [] : [m.execution.runId]), 'execution run IDs')
  const clock = parseResidence(clockSchema, h.clock)
  const lifecycle: CycleAuthority['lifecycle'] = clock.kind === 'active' ? clock : clock.kind === 'first-ready'
    ? { kind: 'first' } : { kind: 'closed', source: clock.source }
  const authority: CycleAuthority = { identity: h.identity, revision: h.revision, cycle: h.cycle,
    lifecycle, stableContext: 'stable', rest: null, normalReturn: null, departure: null }
  const character = readCycleContext(h, authority, deps).state
  if (clock.kind === 'active') {
    if (active.length !== 1 || !sameResidenceValue(active[0].binding.mission, clock.mission) ||
      !sameResidenceValue(active[0].execution, clock.execution)) invalid('Active body/mission execution mismatch')
  } else if (active.length) invalid('Inactive body with active mission')
  if (missions.some((m) => m.status === 'closed') || clock.kind === 'return-due' || clock.kind === 'deadline-ready') {
    unsupported('Closed history requires a future aggregate coordinator')
  }
  if (character.body.condition.currentHealth === 0) unsupported('Death requires terminal coordination')
  // Declaration order is canonical; all entries were checked, none are omitted.
  const ordered = policy.declarations.map((d) => missions.find((m) => m.binding.mission.commissionId === d.commissionId)!)
  if (raw.phase === 'fresh-hub') {
    if (clock.kind !== 'first-ready' || active.length) invalid('Fresh hub cannot contain an execution')
    const catalog = residenceCatalog(raw.catalogRef, policy)
    const carried = createCarriedItemContainersSnapshot(raw.carried.backpack, raw.carried.equipment, raw.carried.quickSlots, catalog.containers)
    if (carried.backpack.width !== catalog.data.backpack.width || carried.backpack.height !== catalog.data.backpack.height ||
      carried.quickSlots.slots.length !== catalog.data.backpack.quickSlotCount) invalid('Container dimensions do not match')
    if (!classifyLoad(calculateBackpackWeightSubtotal(carried.backpack, catalog.physical), catalog.data.backpack).canCarry) invalid('Cannot carry')
    const itemStates = createItemStateCollectionSnapshot(raw.itemStates.states, carriedItems(carried), catalog.resources)
    return deepFreeze({ phase: raw.phase, character, missions: ordered, carried, itemStates, catalogRef: raw.catalogRef })
  }
  if (clock.kind !== 'active' || active.length !== 1) invalid('Active world requires active clock and fact')
  // Read only lookup fields before delegating the entire exact site to G2.
  const siteBinding = parseResidence(z.object({ binding: locationBindingSchema }), raw.site).binding
  const catalog = residenceCatalog(siteBinding, policy)
  const location = readLocationContext({ character, site: raw.site, carried: raw.carried, itemStates: raw.itemStates },
    { cycle: authority, mission: active[0] }, { residence: deps, catalog }).snapshot
  if (clock.startCycle !== 1 || character.cycle !== clock.taskDay) unsupported('Later execution history is not supported')
  if (location.site.pending.kind !== 'none') unsupported('Pending encounter requires combat coordination')
  verifySourceEntities(location, catalog)
  return deepFreeze({ phase: raw.phase, ...location, missions: ordered })
}

function verifySourceEntities(s: ResidenceLocationSnapshot, catalog: ResidenceSavePolicy['catalogs'][number]) {
  const entities = [...carriedItems(s.carried), ...s.site.ground.flatMap((g) => g.items)]
  for (const source of catalog.data.sources) {
    const node = catalog.data.nodes.find((n) => n.id === source.nodeId)!
    const claimed = s.site.sources.find((v) => v.id === source.id)!.claimed
    const choices = source.contents.kind === 'fixed' ? [source.contents.grants] : source.contents.choices
    const ordinals = Math.max(...choices.map((c) => c.length))
    const existing = Array.from({ length: ordinals }, (_, ordinal) => entities.find((i) =>
      i.instanceId === sourceItemId(s.site.binding, node.placeId, node.id, source.id, ordinal)))
    if (!claimed && existing.some(Boolean)) invalid('Unclaimed source already owns output entities')
    if (claimed && !choices.some((grants) => existing.every((item, n) => !item ||
      (grants[n]?.definitionId === item.definitionId && grants[n]?.quantity === item.quantity)))) {
      invalid('Existing source entities contradict every declared output')
    }
  }
}

export function validateResidenceAggregate(input: unknown, policy: ResidenceSavePolicy): ResidenceAggregate {
  requireResidenceSavePolicy(policy)
  try { return readAggregate(input, policy) }
  catch (error) {
    if (error instanceof ResidenceSaveError) throw error
    throw new ResidenceSaveError('INVALID_STATE', 'Aggregate violates a formal core boundary')
  }
}

/** For a verified owner current only; no public install/replace operation consumes this. */
export function residenceActiveContext(current: ActiveResidenceWorld, policy: ResidenceSavePolicy):
  Readonly<{ snapshot: ResidenceLocationSnapshot; authority: LocationAuthority; dependencies: LocationDependencies }> {
  const catalog = residenceCatalog(current.site.binding, policy)
  const scope = createMissionScope({ characterId: current.character.identity.characterId, declarations: policy.declarations }, (v) => v === policy.rulesVersion)
  const clock = current.character.clock
  const mission = current.missions.find((m) => m.status === 'active')
  if (clock.kind !== 'active' || !mission) invalid('No active owner current')
  const snapshot = { character: current.character, site: current.site, carried: current.carried, itemStates: current.itemStates }
  const authority: LocationAuthority = { mission, cycle: { identity: current.character.identity,
    revision: current.character.revision, cycle: current.character.cycle, lifecycle: clock,
    stableContext: 'stable', rest: catalog.data.nodes.find((n) => n.id === current.site.nodeId)!.rest,
    normalReturn: null, departure: null } }
  return { snapshot, authority, dependencies: { catalog, residence: { configuration: policy.configuration, rulesVersion: policy.rulesVersion, scope } } }
}
