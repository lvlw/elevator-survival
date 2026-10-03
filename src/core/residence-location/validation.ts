import { z } from 'zod'
import { deepFreeze } from '../config'
import { readCycleContext, type CharacterCycleState, type CycleAuthority } from '../character-cycle'
import { sameResidenceValue } from '../character-cycle/validation'
import { createEnemyPersistentCombatState } from '../combat'
import { calculateBackpackWeightSubtotal, createItemInstance } from '../inventory'
import { createItemStateCollectionSnapshot } from '../item-state'
import { classifyLoad } from '../load'
import { restoreMissionCandidate, type MissionLifecycleValue } from '../mission-lifecycle'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import { countSchema, idSchema, parseResidence, positiveSchema, safeAdd } from '../residence-config/validation'
import { requireCatalog, resourceSchema, unique } from './catalog'
import { locationBindingSchema } from './identity'
import { LocationError, type LocationAuthority, type LocationCommand, type LocationDependencies,
  type ResidenceLocationSnapshot } from './types'

const item = z.strictObject({ instanceId: idSchema, definitionId: idSchema, quantity: positiveSchema })
const placement = z.strictObject({ instanceId: idSchema, x: countSchema, y: countSchema, rotated: z.boolean() })
export const carriedSchema = z.strictObject({
  backpack: z.strictObject({ width: positiveSchema, height: positiveSchema, items: z.array(item), placements: z.array(placement) }),
  equipment: z.strictObject({ weapon: item.nullable(), armor: item.nullable(), utility: item.nullable() }),
  quickSlots: z.strictObject({ slots: z.array(item.nullable()) }),
})
export const itemStatesSchema = z.strictObject({ states: z.array(z.strictObject({
  instanceId: idSchema, definitionId: idSchema, resource: resourceSchema,
})) })
const enemyState = z.strictObject({ enemyInstanceId: idSchema, definitionId: idSchema, currentHealth: countSchema,
  currentIntentActionId: idSchema, nextCycleIndex: countSchema, resolvedActionCount: countSchema,
  hasBeenEncountered: z.boolean(), defeated: z.boolean() })
const siteSchema = z.strictObject({ binding: locationBindingSchema, nodeId: idSchema,
  facts: z.array(z.strictObject({ id: idSchema, value: z.boolean() })),
  sources: z.array(z.strictObject({ id: idSchema, claimed: z.boolean(), drawIndex: countSchema })),
  ground: z.array(z.strictObject({ nodeId: idSchema, items: z.array(item) })),
  enemies: z.array(z.strictObject({ id: idSchema, state: enemyState, riskDrawIndex: countSchema })),
  pending: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('none') }),
    z.strictObject({ kind: z.literal('combat-required'), enemyId: idSchema })]),
  knowledge: z.strictObject({ knownNodeIds: z.array(idSchema), visitedNodeIds: z.array(idSchema), knownEdgeIds: z.array(idSchema),
    routes: z.array(z.strictObject({ edgeId: idSchema, observedFromNodeId: idSchema, passable: z.boolean() })) }),
})
const snapshotSchema = z.strictObject({ character: z.custom<CharacterCycleState>(), site: siteSchema,
  carried: carriedSchema, itemStates: itemStatesSchema })
const authoritySchema = z.strictObject({ cycle: z.custom<CycleAuthority>(), mission: z.custom<MissionLifecycleValue>() })
const commandBase = { binding: locationBindingSchema, expectedRevision: countSchema }
const commandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...commandBase, kind: z.literal('move'), edgeId: idSchema }),
  z.strictObject({ ...commandBase, kind: z.literal('reveal'), sourceId: idSchema }),
  z.strictObject({ ...commandBase, kind: z.literal('pickup'), instanceId: idSchema,
    placement: z.strictObject({ x: countSchema, y: countSchema, rotated: z.boolean() }) }),
  z.strictObject({ ...commandBase, kind: z.literal('drop'), instanceId: idSchema }),
])
export function createLocationCommand(input: unknown): LocationCommand {
  return deepFreeze(parseResidence(commandSchema, input))
}
function sameSet(actual: readonly string[], expected: readonly string[], label: string) {
  unique(actual, label)
  if (!sameResidenceValue([...actual].sort(), [...new Set(expected)].sort())) throw new LocationError('INVALID_INPUT', `Incorrect ${label} set`)
}
export function carriedItems(carried: ResidenceLocationSnapshot['carried']) {
  return [...carried.backpack.items, ...Object.values(carried.equipment).filter((i) => i !== null),
    ...carried.quickSlots.slots.filter((i) => i !== null)]
}
export function readLocationContext(input: unknown, authorityInput: LocationAuthority, dependencies: LocationDependencies) {
  const catalog = requireCatalog(dependencies.catalog)
  const data = catalog.data
  const raw = parseResidence(snapshotSchema, input)
  const supplied = parseResidence(authoritySchema, authorityInput)
  const { state: character, authority: cycle } = readCycleContext(raw.character, supplied.cycle, dependencies.residence)
  const clock = character.clock
  if (clock.kind === 'first-ready') throw new LocationError('NOT_ACTIVE', 'No execution site before departure')
  const fact = clock.kind === 'active' ? clock : clock.source
  const binding = { identity: character.identity, mission: fact.mission, execution: fact.execution,
    catalogId: data.id, catalogVersion: data.version }
  if (!sameResidenceValue(binding, raw.site.binding) || !sameResidenceValue(fact.mission, data.mission)) {
    throw new LocationError('BINDING_MISMATCH', 'Site/catalog/character/mission/execution mismatch')
  }
  const missionBinding = { characterId: character.identity.characterId, mission: fact.mission }
  const expected = clock.kind === 'active'
    ? { binding: missionBinding, status: 'active' as const, execution: fact.execution }
    : { binding: missionBinding, status: 'closed' as const, execution: fact.execution, outcome: clock.source.outcome }
  const mission = restoreMissionCandidate(supplied.mission, expected, dependencies.residence.scope).value
  const site = raw.site
  const node = data.nodes.find((n) => n.id === site.nodeId)
  if (!node) throw new LocationError('INVALID_INPUT', 'Unknown position')
  sameSet(site.facts.map((f) => f.id), data.facts.map((f) => f.id), 'facts')
  sameSet(site.sources.map((s) => s.id), data.sources.map((s) => s.id), 'sources')
  sameSet(site.ground.map((g) => g.nodeId), data.nodes.map((n) => n.id), 'ground nodes')
  sameSet(site.enemies.map((e) => e.id), data.enemies.map((e) => e.id), 'enemies')
  for (const s of site.sources) {
    const definition = data.sources.find((v) => v.id === s.id)!
    if ((!s.claimed || definition.contents.kind === 'fixed') ? s.drawIndex !== 0 : s.drawIndex === 0) {
      throw new LocationError('INVALID_INPUT', 'Source claim/cursor mismatch')
    }
  }
  unique(site.enemies.map((e) => e.state.enemyInstanceId), 'enemy instances')
  for (const e of site.enemies) {
    const definition = data.enemies.find((v) => v.id === e.id)!
    if (e.state.enemyInstanceId !== e.id) throw new LocationError('INVALID_INPUT', 'Enemy stable instance mismatch')
    safeAdd(definition.definition.actionCycle.indexOf(definition.definition.initialIntentActionId), e.state.resolvedActionCount)
    createEnemyPersistentCombatState(e.state, catalog.enemies.get(definition.definition.id))
    if (!e.state.hasBeenEncountered && e.riskDrawIndex !== 0) throw new LocationError('INVALID_INPUT', 'Unencountered enemy risk advanced')
  }
  const pending = site.pending
  const hereEnemy = data.enemies.find((e) => e.nodeId === node.id)
  const liveHere = hereEnemy && site.enemies.find((e) => e.id === hereEnemy.id && !e.state.defeated)
  if (pending.kind === 'combat-required' && (!liveHere || pending.enemyId !== liveHere.id || !liveHere.state.hasBeenEncountered)) {
    throw new LocationError('INVALID_INPUT', 'Pending encounter reference mismatch')
  }
  if (mission.status === 'active' && character.body.condition.currentHealth > 0 && liveHere && pending.kind === 'none') {
    throw new LocationError('COORDINATION_REQUIRED', 'Live encounter cannot be discarded')
  }
  const k = site.knowledge
  unique(k.visitedNodeIds, 'visited nodes')
  if (!k.visitedNodeIds.includes(data.entryNodeId) || !k.visitedNodeIds.includes(site.nodeId) || k.visitedNodeIds.some((id) => !data.nodes.some((n) => n.id === id))) {
    throw new LocationError('INVALID_INPUT', 'Invalid arrival knowledge')
  }
  const visible = data.nodes.filter((n) => k.visitedNodeIds.includes(n.id)).flatMap((n) => n.surfaceEdgeIds)
  sameSet(k.knownEdgeIds, visible, 'known edges')
  sameSet(k.knownNodeIds, [...k.visitedNodeIds, ...data.edges.filter((e) => k.knownEdgeIds.includes(e.id)).flatMap((e) => [e.from, e.to])], 'known nodes')
  sameSet(k.routes.map((r) => r.edgeId), k.knownEdgeIds, 'route observations')
  for (const r of k.routes) {
    if (!k.visitedNodeIds.includes(r.observedFromNodeId) || !data.nodes.find((n) => n.id === r.observedFromNodeId)!.surfaceEdgeIds.includes(r.edgeId)) {
      throw new LocationError('INVALID_INPUT', 'Route observation has no declared surface witness')
    }
  }
  const carried = createCarriedItemContainersSnapshot(raw.carried.backpack, raw.carried.equipment, raw.carried.quickSlots, catalog.containers)
  if (carried.backpack.width !== data.backpack.width || carried.backpack.height !== data.backpack.height ||
    carried.quickSlots.slots.length !== data.backpack.quickSlotCount) throw new LocationError('INVALID_INPUT', 'Container dimensions mismatch')
  if (!classifyLoad(calculateBackpackWeightSubtotal(carried.backpack, catalog.physical), data.backpack).canCarry) {
    throw new LocationError('CANNOT_CARRY', 'Backpack exceeds controlled carry bands')
  }
  const ground = site.ground.map((g) => ({ nodeId: g.nodeId, items: g.items.map((i) => createItemInstance(i, catalog.physical)) }))
  const items = [...carriedItems(carried), ...ground.flatMap((g) => g.items)]
  unique(items.map((i) => i.instanceId), 'item instances across all containers')
  const itemStates = createItemStateCollectionSnapshot(raw.itemStates.states, items, catalog.resources)
  const snapshot: ResidenceLocationSnapshot = deepFreeze({ character, carried, itemStates, site: { ...site, ground } })
  return { snapshot, authority: deepFreeze({ cycle, mission }), catalog }
}
export function requireActionContext(input: unknown, requestInput: unknown, authority: LocationAuthority, deps: LocationDependencies) {
  const command = createLocationCommand(requestInput)
  const ctx = readLocationContext(input, authority, deps)
  if (!sameResidenceValue(command.binding, ctx.snapshot.site.binding)) throw new LocationError('BINDING_MISMATCH', 'Wrong command execution')
  if (command.expectedRevision !== ctx.snapshot.character.revision) throw new LocationError('STALE_PLAN', 'Old command revision')
  requireStableActive(ctx)
  return { ...ctx, command }
}
export function requireStableActive(ctx: ReturnType<typeof readLocationContext>) {
  if (ctx.authority.mission.status !== 'active') throw new LocationError('NOT_ACTIVE', 'Execution is closed')
  if (ctx.snapshot.site.pending.kind !== 'none' || ctx.authority.cycle.stableContext !== 'stable') {
    throw new LocationError('COORDINATION_REQUIRED', 'Pending consequences cannot be bypassed')
  }
  if (ctx.snapshot.character.body.condition.currentHealth === 0) throw new LocationError('COORDINATION_REQUIRED', 'Death needs terminal coordination')
}

export function edgePassable(snapshot: ResidenceLocationSnapshot, edge: LocationDependencies['catalog']['data']['edges'][number]): boolean {
  return edge.requiredFactIds.every((id) => snapshot.site.facts.some((f) => f.id === id && f.value)) &&
    (edge.requiredItemDefinitionId === null || carriedItems(snapshot.carried).some((i) => i.definitionId === edge.requiredItemDefinitionId))
}
