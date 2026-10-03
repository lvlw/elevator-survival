import { z } from 'zod'
import { deepFreeze } from '../config'
import { planCharacterCycle, readCycleContext, type CharacterCycleState } from '../character-cycle'
import { sameResidenceValue } from '../character-cycle/validation'
import { countSchema, parseResidence } from '../residence-config/validation'
import { requireCatalog } from './catalog'
import { locationBindingSchema } from './identity'
import { observeLocationArrival } from './knowledge'
import { finishLocationPlan, markArrivalEncounter } from './movement'
import { carriedSchema, itemStatesSchema, readLocationContext, requireStableActive } from './validation'
import { LocationError, type LocationAuthority, type LocationDependencies, type ResidenceLocationSnapshot } from './types'

export { createLocationCatalog } from './catalog'

/** First establishment is controlled composition, never implicitly called by commands. */
export function establishResidenceLocation(input: unknown, authority: LocationAuthority, deps: LocationDependencies): ResidenceLocationSnapshot {
  const raw = parseResidence(z.strictObject({ character: z.custom<CharacterCycleState>(), carried: carriedSchema, itemStates: itemStatesSchema }), input)
  const { state: character } = readCycleContext(raw.character, authority.cycle, deps.residence)
  if (character.clock.kind !== 'active') throw new LocationError('NOT_ACTIVE', 'First site requires an independent active execution')
  const catalog = requireCatalog(deps.catalog)
  const data = catalog.data
  let candidate: ResidenceLocationSnapshot = { character, carried: raw.carried, itemStates: raw.itemStates,
    site: { binding: { identity: character.identity, mission: character.clock.mission, execution: character.clock.execution,
      catalogId: data.id, catalogVersion: data.version }, nodeId: data.entryNodeId,
    facts: data.facts.map((f) => ({ id: f.id, value: f.initial })),
    sources: data.sources.map((s) => ({ id: s.id, claimed: false, drawIndex: 0 })),
    ground: data.nodes.map((n) => ({ nodeId: n.id, items: [] })),
    enemies: data.enemies.map((e) => ({ id: e.id, riskDrawIndex: 0, state: {
      enemyInstanceId: e.id, definitionId: e.definition.id, currentHealth: e.definition.maxHealth,
      currentIntentActionId: e.definition.initialIntentActionId, nextCycleIndex: (e.definition.actionCycle.indexOf(e.definition.initialIntentActionId) + 1) % e.definition.actionCycle.length,
      resolvedActionCount: 0, hasBeenEncountered: false, defeated: false,
    } })), pending: { kind: 'none' }, knowledge: { knownNodeIds: [], visitedNodeIds: [], knownEdgeIds: [], routes: [] } } }
  candidate = observeLocationArrival(candidate, deps)
  candidate = markArrivalEncounter(candidate, deps)
  return readLocationContext(candidate, authority, deps).snapshot
}

/** Controlled rest composition proves position qualification then delegates every body/cycle rule to G1. */
export function planResidenceLocationRest(input: unknown, request: unknown, authority: LocationAuthority, deps: LocationDependencies) {
  const command = parseResidence(z.strictObject({ kind: z.literal('rest'), binding: locationBindingSchema, expectedRevision: countSchema }), request)
  const ctx = readLocationContext(input, authority, deps)
  requireStableActive(ctx)
  const { snapshot } = ctx
  if (!sameResidenceValue(command.binding, snapshot.site.binding)) throw new LocationError('BINDING_MISMATCH', 'Rest belongs to another execution')
  if (command.expectedRevision !== snapshot.character.revision) throw new LocationError('STALE_PLAN', 'Old rest revision')
  const rest = ctx.catalog.data.nodes.find((n) => n.id === snapshot.site.nodeId)!.rest
  if (rest === null || ctx.authority.cycle.rest !== rest) throw new LocationError('NOT_AVAILABLE', 'No matching real rest facility')
  const result = planCharacterCycle(snapshot.character, { identity: snapshot.character.identity,
    expectedRevision: snapshot.character.revision, kind: 'rest', rest }, ctx.authority.cycle, deps.residence)
  return finishLocationPlan(snapshot, snapshot, result, ctx.authority, deps)
}

/** Strict value candidate only. No bootstrap, restoration installation or replacement authority. */
export function restoreResidenceLocationCandidate(input: unknown, authority: LocationAuthority, deps: LocationDependencies) {
  return deepFreeze({ kind: 'residence-location-candidate' as const, value: readLocationContext(input, authority, deps).snapshot })
}
