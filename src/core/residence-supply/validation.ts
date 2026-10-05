import { z } from 'zod'
import { deepFreeze } from '../config'
import { readCycleContext, type CharacterCycleState } from '../character-cycle'
import { createItemInstance, calculateBackpackWeightSubtotal } from '../inventory'
import { createItemStateCollectionSnapshot, createItemState, createFullItemState } from '../item-state'
import { classifyLoad } from '../load'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import { readScope, readValue } from '../mission-lifecycle/validation'
import { countSchema, positiveSchema, idSchema, parseResidence } from '../residence-config/validation'
import { carriedSchema, itemStatesSchema, carriedItems, readLocationContext } from '../residence-location/validation'
import { locationBindingSchema } from '../residence-location/identity'
import { requireCatalog } from '../residence-location/catalog'
import { supplySiteSchema, validateResidencePassiveSite } from '../residence-location/supply-location'
import { requireTerminalConfig, queryTerminalRewardCapacity } from '../residence-terminal/config'
import { same, stepSchema, stateSchema, itemSchema } from '../residence-terminal/validation'
import { requireTaskCatalog } from '../residence-task/catalog'
import { requireSupplyConfig, tableValue, numberValue } from './config'
import { verifyOriginConservation } from './provenance'
import { verifySupplyHistory } from './history'
import { SupplyError, type SupplyDependencies, type SupplyValue } from './types'

export function ensure(ok: unknown, message: string, code: SupplyError['code'] = 'INVALID_INPUT'): asserts ok {
  if (!ok) throw new SupplyError(code, message)
}
export const supplyCharacterSchema = z.custom<CharacterCycleState>((v: unknown) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  return 'identity' in v && v.identity !== null && typeof v.identity === 'object' &&
    'clock' in v && v.clock !== null && typeof v.clock === 'object' && 'kind' in v.clock && typeof v.clock.kind === 'string' &&
    'revision' in v && Number.isSafeInteger(v.revision) && 'cycle' in v && Number.isSafeInteger(v.cycle) &&
    'body' in v && v.body !== null && typeof v.body === 'object'
})
export const rangeSchema = z.strictObject({ originId: idSchema, start: countSchema, end: positiveSchema })
const witness = z.strictObject({ nodeId: idSchema, factId: idSchema, edgeIds: z.array(idSchema) })
const origin = z.strictObject({ id: idSchema, binding: locationBindingSchema, placeId: idSchema, nodeId: idSchema,
  producerId: idSchema, ordinal: countSchema, definitionId: idSchema, quantity: positiveSchema, drawIndex: countSchema,
  initialSpecialty: z.enum(['scout', 'engineer', 'survival']).nullable(),
  kind: z.enum(['initial', 'ordinary', 'task']) })
const disposition = z.strictObject({ id: idSchema, kind: z.enum(['consumed', 'installed', 'delivered', 'partial-delivery', 'returned-special', 'revoked-permission', 'death-unavailable']),
  reason: z.enum(['medical', 'recipe', 'terminal']),
  binding: locationBindingSchema, cycle: positiveSchema, revision: countSchema, item: itemSchema, state: stateSchema, ranges: z.array(rangeSchema).min(1) })
const receipt = z.strictObject({ binding: locationBindingSchema, outcome: z.enum(['success', 'voluntary-failure', 'deadline-failure', 'death']),
  source: z.enum(['normal-return', 'deadline', 'supply-death', 'location-death']), startCycle: positiveSchema, endCycle: positiveSchema,
  taskDay: positiveSchema, revision: positiveSchema, steps: z.array(stepSchema), before: countSchema,
  reward: countSchema, penalty: countSchema, forfeited: countSchema, dispositionIds: z.array(idSchema) })
const schema = z.strictObject({ protocol: z.literal('residence-supply-pure-v1'), configurationId: idSchema, contentId: idSchema,
  terminalConfigurationId: idSchema, phase: z.enum(['first-hub', 'active-world', 'living-hub', 'dead']),
  character: supplyCharacterSchema, missions: z.array(z.unknown()), balance: countSchema,
  site: supplySiteSchema.nullable(), carried: carriedSchema, itemStates: itemStatesSchema,
  warehouse: z.strictObject({ items: z.array(itemSchema), itemStates: itemStatesSchema }),
  origins: z.array(origin).max(4096), allocations: z.array(z.strictObject({ instanceId: idSchema, ranges: z.array(rangeSchema).min(1) })).max(4096),
  dispositions: z.array(disposition).max(4096), witnesses: z.array(witness),
  archives: z.array(z.strictObject({ site: supplySiteSchema, itemStates: itemStatesSchema, witnesses: z.array(witness) })),
  choices: z.strictObject({ tool: z.enum(['crow', 'lamp', 'toolbox']), specialty: z.enum(['scout', 'engineer', 'survival']), firstBandageUsed: z.boolean() }),
  receipts: z.array(receipt),
  productions: z.array(z.strictObject({ binding: locationBindingSchema, producerId: idSchema, method: idSchema,
    revision: countSchema, originIds: z.array(idSchema), factId: idSchema.nullable(), drawIndex: countSchema })).max(4096),
  lineage: z.array(z.strictObject({ instanceId: idSchema, originId: idSchema.nullable(), parentId: idSchema.nullable(),
    revision: countSchema, quantityBefore: positiveSchema, quantity: positiveSchema })).max(4096),
  unitTransfers: z.array(z.strictObject({ from: idSchema, to: idSchema, revision: countSchema,
    kind: z.enum(['split', 'merge']), ranges: z.array(rangeSchema).min(1) })).max(4096),
})
export function cycleContext(character: CharacterCycleState, deps: SupplyDependencies, nodeId: string | null) {
  const clock = character.clock
  return { identity: character.identity, revision: character.revision, cycle: character.cycle, stableContext: 'stable' as const,
    lifecycle: clock.kind === 'first-ready' ? { kind: 'first' as const } : clock.kind === 'active' ? clock : { kind: 'closed' as const, source: clock.source },
    rest: clock.kind === 'active' && nodeId ? deps.catalog.data.nodes.find(n => n.id === nodeId)!.rest : null,
    normalReturn: null, departure: null }
}
export function liveSupplyItems(value: SupplyValue) {
  return [...carriedItems(value.carried), ...(value.site?.ground.flatMap(g => g.items) ?? []),
    ...value.warehouse.items, ...value.archives.flatMap(a => a.site.ground.flatMap(g => g.items))]
}
function checkWitnesses(site: SupplyValue['site'], rows: SupplyValue['witnesses'], deps: SupplyDependencies) {
  if (!site) { ensure(rows.length === 0, 'No witness owner'); return }
  ensure(new Set(rows.map(w => w.factId)).size === rows.length, 'Duplicate investigation')
  for (const w of rows) {
    const a = deps.tasks.data.actions.find(a => a.id === w.factId)
    ensure(a && a.node === w.nodeId && site.knowledge.visitedNodeIds.includes(w.nodeId) &&
      site.facts.some(f => f.id === w.factId && f.value), 'No declared investigation witness')
    const edges = deps.tasks.data.edges.filter(e => e.revealBy === w.factId).flatMap(e => [e.id + ':forward', e.id + ':reverse']).sort()
    ensure(same([...w.edgeIds].sort(), edges), 'Incorrect investigated routes')
  }
}
/** Strict pure value check, not independent restore or install authority. */
export function readSupplyValue(input: unknown, deps: SupplyDependencies): SupplyValue {
  requireSupplyConfig(deps.configuration); requireTaskCatalog(deps.tasks); requireCatalog(deps.catalog); requireTerminalConfig(deps.terminal)
  deps.catalogs.forEach(requireCatalog)
  ensure(deps.catalogs.includes(deps.catalog) && new Set(deps.catalogs.map(c => c.data.id)).size === deps.catalogs.length &&
    typeof deps.draw === 'function', 'Invalid controlled dependencies')
  ensure(deps.tasks.configurationId === deps.configuration.configurationId && deps.catalog.data.version === deps.tasks.contentId, 'Dependency version mismatch')
  const raw = parseResidence(schema, input), scope = readScope(deps.residence.scope)
  ensure(raw.configurationId === deps.configuration.configurationId && raw.contentId === deps.tasks.contentId &&
    raw.terminalConfigurationId === deps.terminal.configurationId, 'Version mismatch', 'BINDING_MISMATCH')
  ensure(raw.missions.length === scope.declarations.length, 'Missing mission history')
  const missions = raw.missions.map((m, i) => readValue(m, { characterId: scope.characterId, mission: scope.declarations[i] }, scope))
  const character = readCycleContext(raw.character, cycleContext(raw.character, deps, raw.site?.nodeId ?? null), deps.residence).state
  const active = missions.filter(m => m.status === 'active')
  ensure(raw.balance <= deps.terminal.config.balance_max, 'Balance overflow')
  ensure(raw.phase === 'first-hub' ? character.clock.kind === 'first-ready' && !active.length && !raw.site && !raw.receipts.length :
    raw.phase === 'active-world' ? active.length === 1 && character.clock.kind === 'active' && raw.site !== null :
    !active.length && !raw.site && (raw.phase === 'dead' ? character.body.condition.currentHealth === 0 : character.body.condition.currentHealth > 0), 'Phase disagreement')
  const c = deps.catalog
  const carried = createCarriedItemContainersSnapshot(raw.carried.backpack, raw.carried.equipment, raw.carried.quickSlots, c.containers)
  ensure(carried.backpack.width === c.data.backpack.width && carried.backpack.height === c.data.backpack.height &&
    carried.quickSlots.slots.length === c.data.backpack.quickSlotCount, 'Wrong grid')
  ensure(classifyLoad(calculateBackpackWeightSubtotal(carried.backpack, c.physical), c.data.backpack).canCarry, 'Cannot carry', 'CANNOT_CARRY')
  if (raw.site) {
    readLocationContext({ character, site: raw.site, carried, itemStates: raw.itemStates },
      { cycle: cycleContext(character, deps, raw.site.nodeId), mission: active[0] }, { residence: deps.residence, catalog: c })
    ensure(queryTerminalRewardCapacity(raw.balance, deps.terminal), 'Reward capacity')
  }
  const itemStates = createItemStateCollectionSnapshot(raw.itemStates.states,
    [...carriedItems(carried), ...(raw.site?.ground.flatMap(g => g.items) ?? [])], c.resources)
  createItemStateCollectionSnapshot(raw.warehouse.itemStates.states, raw.warehouse.items, c.resources)
  const value: SupplyValue = deepFreeze({ ...raw, character, missions, carried, itemStates })
  const live = liveSupplyItems(value)
  ensure(new Set(live.map(i => i.instanceId)).size === live.length, 'Multiple item owners')
  live.forEach(i => createItemInstance(i, c.physical))
  for (const a of value.archives) {
    const historical = deps.catalogs.find(c => c.data.id === a.site.binding.catalogId)
    ensure(historical, 'Historical catalog absent')
    validateResidencePassiveSite(a.site, historical, character.identity)
    createItemStateCollectionSnapshot(a.itemStates.states, a.site.ground.flatMap(g => g.items), historical.resources)
    checkWitnesses(a.site, a.witnesses, deps)
  }
  checkWitnesses(value.site, value.witnesses, deps)
  for (const o of value.origins) {
    ensure(same(o.binding.identity, character.identity), 'Origin character differs', 'INVALID_PROVENANCE')
    const m = missions.find(m => same(m.binding.mission, o.binding.mission))
    const catalog = deps.catalogs.find(c => c.data.id === o.binding.catalogId)
    ensure(catalog && catalog.data.version === o.binding.catalogVersion && same(catalog.data.mission, o.binding.mission), 'Origin content binding mismatch')
    ensure(m && (m.status === 'unaccepted' ? o.kind === 'initial' : same(m.execution, o.binding.execution)), 'Origin execution differs', 'INVALID_PROVENANCE')
    if (o.kind === 'initial') {
      ensure(o.placeId === 'initial-hub' && o.nodeId === 'initial-hub' && o.quantity === 1 && o.ordinal === 0 && o.drawIndex === 0 &&
        o.initialSpecialty === value.choices.specialty, 'Bad initial anchor or changed locked specialty')
    } else {
      ensure(o.initialSpecialty === null, 'World origin carries initial selection')
      ensure(deps.tasks.data.nodes.find(n => n.id === o.nodeId)?.map === o.placeId && o.binding.catalogVersion === deps.tasks.contentId, 'Wrong origin place/version')
      if (o.kind === 'task') {
        const a = deps.tasks.data.actions.find(a => a.id === o.producerId && a.grant)
        ensure(a?.node === o.nodeId && deps.tasks.data.items.find(i => i.alias === a.grant)?.id === o.definitionId &&
          o.ordinal === 0 && o.quantity === numberValue(deps.configuration, a.outputQuantity!) && o.drawIndex <= 1, 'Bad task output')
      } else {
        const s = deps.tasks.data.sources.find(s => s.id === o.producerId)
        ensure(s?.node === o.nodeId, 'Source absent')
        const grants = s.grants ? Object.entries(tableValue(deps.configuration, s.grants)) : s.choices!.map(a => [a, numberValue(deps.configuration, 'unit')] as const)
        const expected = grants[o.ordinal]
        ensure(expected && deps.tasks.data.items.find(i => i.alias === expected[0])?.id === o.definitionId &&
          expected[1] === o.quantity && o.drawIndex === (s.choices ? 1 : 0), 'Wrong source output')
      }
    }
  }
  for (const d of value.dispositions) {
    ensure(d.cycle <= character.cycle && d.revision <= character.revision && d.state.instanceId === d.item.instanceId && d.state.definitionId === d.item.definitionId, 'Disposition binding')
    ensure(same(d.binding.identity, character.identity) && missions.some(m => m.status !== 'unaccepted' &&
      same(m.binding.mission, d.binding.mission) && same(m.execution, d.binding.execution)), 'Disposition execution differs')
    createItemInstance(d.item, c.physical); createItemState(d.state, c.resources)
  }
  ensure(new Set(value.dispositions.map(d => d.id)).size === value.dispositions.length, 'Duplicate disposition')
  verifyOriginConservation(value, live)
  verifySupplyHistory(value, deps)
  const initials = value.origins.filter(o => o.kind === 'initial')
  ensure(initials.length === 4 && new Set(initials.map(o => o.producerId)).size === 4 &&
    initials.some(o => o.producerId === 'initial:' + value.choices.tool), 'Repeated/missing initial grant')
  ensure(initials.every(o => same(o.binding, initials[0].binding)), 'Initial roles come from different executions')
  if (value.phase === 'first-hub') {
    ensure(carried.backpack.items.length === 0 && value.warehouse.items.length === 0 &&
      carriedItems(carried).length === 4 && carried.equipment.weapon && carried.equipment.armor && carried.equipment.utility &&
      carried.quickSlots.slots[0] && carried.quickSlots.slots.slice(1).every(s => s === null), 'Initial placement differs')
    for (const item of carriedItems(carried)) ensure(same(value.itemStates.states.find(s => s.instanceId === item.instanceId),
      createFullItemState(item, c.resources)), 'Initial resource is not full')
  }
  if (value.phase === 'dead') ensure(carriedItems(value.carried).length === 0 && !value.warehouse.items.length && value.balance === 0, 'Dead has usable assets')
  return value
}
