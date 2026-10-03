import { z } from 'zod'
import { deepFreeze } from '../config'
import { createEnemyDefinitionCatalog } from '../combat'
import { createEquipmentProfileCatalog } from '../equipment'
import { createItemCatalog, createItemInstance } from '../inventory'
import { createItemResourceCatalog, createItemState } from '../item-state'
import { classifyLoad } from '../load'
import { declarationSchema } from '../mission-lifecycle/validation'
import { createQuickSlotProfileCatalog } from '../quick-slot'
import { calculateResidenceActionCost } from '../residence-energy'
import { countSchema, idSchema, parseResidence, positiveSchema, safeMultiply } from '../residence-config/validation'
import { LocationError, type LocationCatalog } from './types'

export const resourceSchema = z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('none') }),
  z.strictObject({ kind: z.enum(['durability', 'integrity', 'charge']), current: countSchema })])
const paid = z.strictObject({ kind: z.literal('paid'), base: positiveSchema,
  factors: z.array(z.strictObject({ numerator: positiveSchema, denominator: positiveSchema })) })
const band = z.strictObject({ min: countSchema, max: countSchema, timeIncreasePercent: countSchema })
const slot = z.enum(['weapon', 'armor', 'utility'])
const physical = z.strictObject({ id: idSchema, name: idSchema, width: positiveSchema, height: positiveSchema,
  unitWeight: countSchema, canRotate: z.boolean(), stacking: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('none') }), z.strictObject({ kind: z.literal('stackable'), maxQuantity: positiveSchema })]) })
const profile = z.discriminatedUnion('kind', [z.strictObject({ definitionId: idSchema, kind: z.literal('none') }),
  z.strictObject({ definitionId: idSchema, kind: z.enum(['durability', 'integrity', 'charge']), maximum: positiveSchema })])
const equipment = z.discriminatedUnion('kind', [z.strictObject({ definitionId: idSchema, kind: z.literal('not-equippable') }),
  z.strictObject({ definitionId: idSchema, kind: z.literal('equippable'), eligibleSlots: z.array(slot).min(1) })])
const grant = z.strictObject({ definitionId: idSchema, quantity: positiveSchema, resource: resourceSchema })
const enemy = z.strictObject({ id: idSchema, maxHealth: positiveSchema, tags: z.array(idSchema), weaknessTags: z.array(idSchema),
  initialIntentActionId: idSchema, actionCycle: z.array(idSchema).min(1), actions: z.array(z.strictObject({ id: idSchema,
    kind: z.enum(['scratch', 'lunge-bite']), playerVisible: z.strictObject({ category: z.enum(['basic-attack', 'special-attack']),
      relativeSpeed: z.enum(['normal', 'slow']), directDamageSeverity: z.enum(['medium', 'high']),
      mayCauseInjury: z.boolean(), mayCauseInfectionExposure: z.boolean(), mayCauseControl: z.boolean() }) })).min(1) })
const schema = z.strictObject({
  id: idSchema, version: idSchema, mission: declarationSchema, entryNodeId: idSchema,
  nodes: z.array(z.strictObject({ id: idSchema, name: idSchema, placeId: idSchema,
    surfaceEdgeIds: z.array(idSchema), surfaceSourceIds: z.array(idSchema), rest: z.enum(['A', 'C']).nullable() })).min(1),
  edges: z.array(z.strictObject({ id: idSchema, from: idSchema, to: idSchema, cost: paid,
    requiredFactIds: z.array(idSchema), requiredItemDefinitionId: idSchema.nullable(),
    arrival: z.strictObject({ healthLoss: countSchema, exposuresAdded: countSchema }) })),
  facts: z.array(z.strictObject({ id: idSchema, initial: z.boolean() })),
  sources: z.array(z.strictObject({ id: idSchema, nodeId: idSchema, cost: paid, requiredFactIds: z.array(idSchema),
    contents: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('fixed'), grants: z.array(grant).min(1) }),
      z.strictObject({ kind: z.literal('choice'), choices: z.array(z.array(grant).min(1)).min(2) })]) })),
  enemies: z.array(z.strictObject({ id: idSchema, nodeId: idSchema, definition: enemy })),
  items: z.array(z.strictObject({ physical, resource: profile, equipment,
    quickSlot: z.strictObject({ definitionId: idSchema, kind: z.enum(['eligible', 'not-eligible']) }), ordinary: z.boolean() })),
  backpack: z.strictObject({ width: positiveSchema, height: positiveSchema, quickSlotCount: positiveSchema,
    weightBands: z.strictObject({ normal: band, loaded: band, overloaded: band, cannotCarryFrom: positiveSchema }) }),
})
export type LocationCatalogData = z.infer<typeof schema>
const catalogs = new WeakSet<object>()
export function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new LocationError('INVALID_INPUT', `Duplicate ${label}`)
}
export function requireCatalog(catalog: LocationCatalog): LocationCatalog {
  if (!catalog || !catalogs.has(catalog)) throw new LocationError('BINDING_MISMATCH', 'Uncontrolled location catalog')
  return catalog
}
/** Controlled composition only. No five-map production content is registered here. */
export function createLocationCatalog(input: unknown): LocationCatalog {
  const data = parseResidence(schema, input)
  for (const [label, rows] of Object.entries({ nodes: data.nodes, edges: data.edges, facts: data.facts, sources: data.sources, enemies: data.enemies })) {
    unique(rows.map((r) => r.id), label)
  }
  unique(data.enemies.map((e) => e.nodeId), 'enemy node')
  const hasNode = (id: string) => data.nodes.some((n) => n.id === id)
  const facts = (ids: readonly string[]) => { unique(ids, 'required facts');
    if (ids.some((id) => !data.facts.some((f) => f.id === id))) throw new LocationError('INVALID_INPUT', 'Unknown required fact') }
  if (!hasNode(data.entryNodeId)) throw new LocationError('INVALID_INPUT', 'Unknown entry')
  const physical = createItemCatalog(data.items.map((i) => i.physical))
  const resources = createItemResourceCatalog(data.items.map((i) => i.resource), physical.definitionIds)
  const equipmentCatalog = createEquipmentProfileCatalog(data.items.map((i) => i.equipment), physical.definitionIds)
  const quickSlotCatalog = createQuickSlotProfileCatalog(data.items.map((i) => i.quickSlot), physical.definitionIds)
  for (const i of data.items) {
    if ([i.resource, i.equipment, i.quickSlot].some((p) => p.definitionId !== i.physical.id)) throw new LocationError('INVALID_INPUT', 'Item profile identity mismatch')
    if (i.equipment.kind === 'equippable') unique(i.equipment.eligibleSlots, 'equipment slots')
    safeMultiply(i.physical.unitWeight, i.physical.stacking.kind === 'none' ? 1 : i.physical.stacking.maxQuantity)
  }
  safeMultiply(data.backpack.width, data.backpack.height)
  classifyLoad(0, data.backpack)
  for (const e of data.edges) {
    if (!hasNode(e.from) || !hasNode(e.to) || e.from === e.to ||
      (e.requiredItemDefinitionId !== null && !physical.has(e.requiredItemDefinitionId))) throw new LocationError('INVALID_INPUT', 'Invalid edge reference')
    facts(e.requiredFactIds); calculateResidenceActionCost(e.cost)
  }
  for (const s of data.sources) {
    if (!hasNode(s.nodeId)) throw new LocationError('INVALID_INPUT', 'Invalid source node')
    facts(s.requiredFactIds); calculateResidenceActionCost(s.cost)
    for (const grants of s.contents.kind === 'fixed' ? [s.contents.grants] : s.contents.choices) {
      for (const g of grants) {
        createItemInstance({ instanceId: 'catalog-validation', definitionId: g.definitionId, quantity: g.quantity }, physical)
        createItemState({ instanceId: 'catalog-validation', definitionId: g.definitionId, resource: g.resource }, resources)
      }
    }
  }
  for (const n of data.nodes) {
    unique(n.surfaceEdgeIds, 'surface edges'); unique(n.surfaceSourceIds, 'surface sources')
    if (n.surfaceEdgeIds.some((id) => !data.edges.some((e) => e.id === id && (e.from === n.id || e.to === n.id))) ||
      n.surfaceSourceIds.some((id) => !data.sources.some((s) => s.id === id && s.nodeId === n.id))) throw new LocationError('INVALID_INPUT', 'Invalid surface observation')
  }
  if (data.enemies.some((e) => !hasNode(e.nodeId))) throw new LocationError('INVALID_INPUT', 'Invalid enemy node')
  const definitions = new Map<string, typeof data.enemies[number]['definition']>()
  for (const e of data.enemies) {
    const previous = definitions.get(e.definition.id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(e.definition)) throw new LocationError('INVALID_INPUT', 'Conflicting enemy definition')
    definitions.set(e.definition.id, e.definition)
  }
  const enemies = createEnemyDefinitionCatalog([...definitions.values()])
  const result = deepFreeze({ data, physical, resources, enemies, containers: { physicalCatalog: physical, equipmentCatalog, quickSlotCatalog } })
  catalogs.add(result)
  return result
}
