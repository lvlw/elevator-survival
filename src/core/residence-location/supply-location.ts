import { z } from 'zod'
import { createEnemyPersistentCombatState } from '../combat'
import { deepFreeze } from '../config'
import type { ResidenceIdentity } from '../character-cycle'
import { countSchema, idSchema, parseResidence, positiveSchema } from '../residence-config/validation'
import { locationBindingSchema } from './identity'
import { requireCatalog } from './catalog'
import { LocationError, type LocationCatalog, type ResidenceSite } from './types'
const itemSchema = z.strictObject({ instanceId: idSchema, definitionId: idSchema, quantity: positiveSchema })
export const supplySiteSchema = z.strictObject({ binding: locationBindingSchema, nodeId: idSchema,
  facts: z.array(z.strictObject({ id: idSchema, value: z.boolean() })),
  sources: z.array(z.strictObject({ id: idSchema, claimed: z.boolean(), drawIndex: countSchema })),
  ground: z.array(z.strictObject({ nodeId: idSchema, items: z.array(itemSchema) })),
  enemies: z.array(z.strictObject({ id: idSchema, riskDrawIndex: countSchema, state: z.strictObject({
    enemyInstanceId: idSchema, definitionId: idSchema, currentHealth: countSchema, currentIntentActionId: idSchema,
    nextCycleIndex: countSchema, resolvedActionCount: countSchema, hasBeenEncountered: z.boolean(), defeated: z.boolean(),
  }) })),
  pending: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('none') }),
    z.strictObject({ kind: z.literal('combat-required'), enemyId: idSchema })]),
  knowledge: z.strictObject({ knownNodeIds: z.array(idSchema), visitedNodeIds: z.array(idSchema), knownEdgeIds: z.array(idSchema),
    routes: z.array(z.strictObject({ edgeId: idSchema, observedFromNodeId: idSchema, passable: z.boolean() })) }),
})
const same = (a: readonly string[] | object, b: readonly string[] | object) => JSON.stringify(a) === JSON.stringify(b)
/** Shared passive-site validation, extracted from A unchanged. No fake body/active mission. */
export function validateResidencePassiveSite(input: unknown, catalog: LocationCatalog, identity: ResidenceIdentity,
  reject: (message: string) => never = (message) => { throw new LocationError('INVALID_INPUT', message) }): ResidenceSite {
  requireCatalog(catalog)
  const site = parseResidence(supplySiteSchema, input)
  function ensure(ok: unknown, message: string): asserts ok { if (!ok) reject(message) }
  const unique = (values: readonly string[], label: string) => ensure(new Set(values).size === values.length, 'Duplicate ' + label)
  const c = catalog.data
  ensure(site.binding.catalogId === c.id && site.binding.catalogVersion === c.version &&
    same(site.binding.mission, c.mission), 'Historical catalog binding mismatch')
  ensure(same(site.binding.identity, identity), 'Historical site identity mismatch')
  const sets = (actual: readonly string[], expected: readonly string[]) => {
    unique(actual, 'site members'); ensure(same([...actual].sort(), [...new Set(expected)].sort()), 'Incorrect site member set')
  }
  ensure(c.nodes.some((n) => n.id === site.nodeId), 'Unknown site position')
  sets(site.facts.map((f) => f.id), c.facts.map((f) => f.id))
  sets(site.sources.map((s) => s.id), c.sources.map((s) => s.id))
  sets(site.ground.map((g) => g.nodeId), c.nodes.map((n) => n.id))
  sets(site.enemies.map((e) => e.id), c.enemies.map((e) => e.id))
  for (const s of site.sources) {
    const definition = c.sources.find((d) => d.id === s.id)!
    ensure((!s.claimed || definition.contents.kind === 'fixed') ? s.drawIndex === 0 : s.drawIndex > 0, 'Bad historical source cursor')
  }
  for (const e of site.enemies) {
    const d = c.enemies.find((v) => v.id === e.id)!
    ensure(e.state.enemyInstanceId === e.id && e.state.definitionId === d.definition.id, 'Enemy history binding')
    createEnemyPersistentCombatState(e.state, catalog.enemies.get(d.definition.id))
    ensure(e.state.hasBeenEncountered || e.riskDrawIndex === 0, 'Unencountered risk history')
  }
  if (site.pending.kind === 'combat-required') {
    const id = site.pending.enemyId
    ensure(c.enemies.some((e) => e.id === id && e.nodeId === site.nodeId) &&
      site.enemies.some((e) => e.id === id && e.state.hasBeenEncountered && !e.state.defeated), 'Invalid pending history')
  }
  const k = site.knowledge
  unique(k.visitedNodeIds, 'visited nodes')
  ensure(k.visitedNodeIds.includes(c.entryNodeId) && k.visitedNodeIds.includes(site.nodeId) &&
    k.visitedNodeIds.every((id) => c.nodes.some((n) => n.id === id)), 'Invalid arrival history')
  sets(k.knownEdgeIds, c.nodes.filter((n) => k.visitedNodeIds.includes(n.id)).flatMap((n) => n.surfaceEdgeIds))
  sets(k.knownNodeIds, [...k.visitedNodeIds, ...c.edges.filter((e) => k.knownEdgeIds.includes(e.id)).flatMap((e) => [e.from, e.to])])
  sets(k.routes.map((r) => r.edgeId), k.knownEdgeIds)
  ensure(k.routes.every((r) => k.visitedNodeIds.includes(r.observedFromNodeId) &&
    c.nodes.find((n) => n.id === r.observedFromNodeId)!.surfaceEdgeIds.includes(r.edgeId)), 'Invalid observation history')

  return deepFreeze(site)
}
