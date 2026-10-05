import { deepFreeze } from '../config'
import type { ResidenceActionPlan } from '../residence-energy'
import type { ResidenceCost } from '../residence-energy'
import { planResidenceAction } from '../residence-energy'
import type { CyclePlan } from '../character-cycle'
import { sameResidenceValue } from '../character-cycle/validation'
import { LocationError, type LocationAuthority, type LocationDependencies, type LocationPlan, type ResidenceLocationSnapshot } from './types'
import { edgePassable, readLocationContext, requireActionContext } from './validation'
import { observeLocationArrival } from './knowledge'

// Issued-plan provenance and stale-base comparison only; no current-state/install owner.
const bases = new WeakMap<LocationPlan, string>()
export function finishLocationPlan(current: ResidenceLocationSnapshot, proposed: ResidenceLocationSnapshot,
  body: ResidenceActionPlan | CyclePlan, authority: LocationAuthority, deps: LocationDependencies): LocationPlan {
  const character = body.snapshot
  if (character.clock.kind !== 'active') throw new LocationError('COORDINATION_REQUIRED', 'This local composer cannot close or depart a mission')
  const nextAuthority: LocationAuthority = { mission: authority.mission, cycle: { ...authority.cycle,
    identity: character.identity, revision: character.revision, cycle: character.cycle, lifecycle: character.clock } }
  // Constructed output consistency, not an independent cold-restore expectation.
  const { snapshot } = readLocationContext({ ...proposed, character }, nextAuthority, deps)
  const plan: LocationPlan = deepFreeze({ kind: 'residence-location-plan',
    base: { binding: current.site.binding, revision: current.character.revision }, snapshot,
    energyCost: 'cost' in body ? body.cost : 0, steps: body.steps,
    coordination: body.outcome === 'death' ? 'death-required' : snapshot.site.pending.kind === 'combat-required' ? 'combat-required' : 'stable-local-result' })
  bases.set(plan, JSON.stringify(current))
  return plan
}
/** Checks freshness only. Even a valid plan does not authorize Save or lifecycle installation. */
export function assertResidenceLocationPlanCurrent(input: unknown, plan: LocationPlan, authority: LocationAuthority, deps: LocationDependencies): void {
  const { snapshot } = readLocationContext(input, authority, deps)
  if (!bases.has(plan) || plan.base.revision !== snapshot.character.revision ||
    !sameResidenceValue(plan.base.binding, snapshot.site.binding) || bases.get(plan) !== JSON.stringify(snapshot)) {
    throw new LocationError('STALE_PLAN', 'Plan is unissued or belongs to a different canonical base')
  }
}
export function markArrivalEncounter(snapshot: ResidenceLocationSnapshot, deps: LocationDependencies): ResidenceLocationSnapshot {
  const enemy = deps.catalog.data.enemies.find((e) => e.nodeId === snapshot.site.nodeId)
  const live = enemy && snapshot.site.enemies.find((e) => e.id === enemy.id && !e.state.defeated)
  if (!live) return snapshot
  return { ...snapshot, site: { ...snapshot.site, pending: { kind: 'combat-required', enemyId: live.id },
    enemies: snapshot.site.enemies.map((e) => e.id === live.id ? { ...e, state: { ...e.state, hasBeenEncountered: true } } : e) } }
}
export function planResidenceMove(input: unknown, request: unknown, authority: LocationAuthority, deps: LocationDependencies): LocationPlan {
  return planResidenceBoundMove(input, request, authority, deps)
}
/** Internal explicit pure composition seam. Old public entry keeps its exact policy. */
export function planResidenceBoundMove(input: unknown, request: unknown, authority: LocationAuthority, deps: LocationDependencies,
  policy?: { cost: (snapshot: ResidenceLocationSnapshot, edge: LocationDependencies['catalog']['data']['edges'][number]) => ResidenceCost;
    knownEdges: (snapshot: ResidenceLocationSnapshot) => readonly string[] }): LocationPlan {
  const ctx = requireActionContext(input, request, authority, deps)
  const { command, snapshot, catalog } = ctx
  if (command.kind !== 'move') throw new LocationError('INVALID_INPUT', 'Move command required')
  const edge = catalog.data.edges.find((e) => e.id === command.edgeId)
  if (!edge || edge.from !== snapshot.site.nodeId || !(policy?.knownEdges(snapshot) ?? snapshot.site.knowledge.knownEdgeIds).includes(edge.id) || !edgePassable(snapshot, edge)) {
    throw new LocationError('NOT_AVAILABLE', 'Not a known currently traversable outgoing edge')
  }
  const body = planResidenceAction(snapshot.character, { identity: snapshot.character.identity,
    expectedRevision: snapshot.character.revision, action: 'move', cost: policy?.cost(snapshot, edge) ?? edge.cost }, ctx.authority.cycle, deps.residence,
  (completion) => ({ completion, effects: edge.arrival }))
  let proposed: ResidenceLocationSnapshot = { ...snapshot, site: { ...snapshot.site, nodeId: edge.to } }
  proposed = observeLocationArrival(proposed, deps)
  proposed = markArrivalEncounter(proposed, deps)
  return finishLocationPlan(snapshot, proposed, body, ctx.authority, deps)
}
