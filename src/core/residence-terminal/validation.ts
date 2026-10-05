import { z } from 'zod'
import { validateResidencePassiveSite } from '../residence-location/supply-location'
import { deepFreeze } from '../config'
import { readCycleContext, type CharacterCycleState } from '../character-cycle'
import { createEnemyPersistentCombatState } from '../combat'
import { createItemInstance, calculateBackpackWeightSubtotal } from '../inventory'
import { createItemStateCollectionSnapshot } from '../item-state'
import { classifyLoad } from '../load'
import { readScope, readValue } from '../mission-lifecycle/validation'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import { countSchema, idSchema, parseResidence, positiveSchema, safeAdd } from '../residence-config/validation'
import { requireCatalog, resourceSchema } from '../residence-location/catalog'
import { locationBindingSchema, sourceItemId } from '../residence-location/identity'
import { carriedItems, carriedSchema, itemStatesSchema } from '../residence-location/validation'
import type { LocationBinding, ResidenceSite } from '../residence-location'
import { queryTerminalRewardCapacity, requireTerminalConfig } from './config'
import { TerminalError, type TerminalDependencies, type TerminalPolicy, type TerminalSnapshot } from './types'

/** Structural value equality; object key insertion order is not game state. */
export function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) &&
    a.length === b.length && a.every((v, i) => same(v, b[i]))
  const compare = ([a]: [string, unknown], [b]: [string, unknown]) => a < b ? -1 : a > b ? 1 : 0
  const left = Object.entries(a).sort(compare)
  const right = Object.entries(b).sort(compare)
  return left.length === right.length && left.every(([k, v], i) => k === right[i][0] && same(v, right[i][1]))
}
export function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw new TerminalError('INVALID_INPUT', message)
}
export function unique(values: readonly string[], label: string) {
  ensure(new Set(values).size === values.length, `Duplicate ${label}`)
}
export const itemSchema = z.strictObject({ instanceId: idSchema, definitionId: idSchema, quantity: positiveSchema })
export const stateSchema = z.strictObject({ instanceId: idSchema, definitionId: idSchema, resource: resourceSchema })
export const stepSchema = z.strictObject({ kind: z.enum(['primary', 'action-bleeding', 'cycle-bleeding', 'infection', 'hunger', 'end-cycle']),
  healthBefore: countSchema, healthAfter: countSchema, facts: z.record(z.string(), z.union([countSchema, z.boolean()])),
})
const siteSchema = z.strictObject({ binding: locationBindingSchema, nodeId: idSchema,
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
const receiptSchema = z.strictObject({ binding: locationBindingSchema,
  outcome: z.enum(['success', 'voluntary-failure', 'deadline-failure', 'death']),
  startCycle: positiveSchema, endCycle: positiveSchema, taskDay: positiveSchema, revision: positiveSchema,
  source: z.enum(['normal-return', 'deadline', 'location-death']), deathCause: stepSchema.shape.kind.nullable(),
  steps: z.array(stepSchema), before: countSchema, reward: countSchema, penalty: countSchema, forfeited: countSchema,
  dispositionIds: z.array(idSchema),
})
const snapshotSchema = z.strictObject({ phase: z.enum(['active-world', 'living-hub', 'dead']), terminalConfigurationId: idSchema,
  character: z.custom<CharacterCycleState>(), missions: z.array(z.unknown()), balance: countSchema, site: siteSchema.nullable(),
  carried: carriedSchema, itemStates: itemStatesSchema,
  warehouse: z.strictObject({ items: z.array(itemSchema), itemStates: itemStatesSchema }),
  archives: z.array(z.strictObject({ site: siteSchema, itemStates: itemStatesSchema })),
  dispositions: z.array(z.strictObject({ binding: locationBindingSchema, cycle: positiveSchema, source: z.enum(['prior-effect', 'terminal']),
    kind: z.enum(['delivered', 'partial-delivery', 'returned-special', 'revoked-permission', 'death-unavailable', 'installed', 'consumed', 'destroyed']),
    item: itemSchema, state: stateSchema })), receipts: z.array(receiptSchema),
})

export function policyFor(binding: LocationBinding, deps: TerminalDependencies): TerminalPolicy {
  const p = deps.policies.find((v) => same(v.catalog.data.mission, binding.mission))
  ensure(p && p.catalog.data.id === binding.catalogId && p.catalog.data.version === binding.catalogVersion,
    'Missing exact terminal content policy')
  return p
}

/** Content roles are controlled dependencies, never player command fields. */
export function checkDependencies(deps: TerminalDependencies) {
  const shell = (input: object, keys: readonly string[]) => {
    ensure(input && Object.getPrototypeOf(input) === Object.prototype &&
      same(Reflect.ownKeys(input).sort(), [...keys].sort()) &&
      Object.values(Object.getOwnPropertyDescriptors(input)).every((d) => d.enumerable && 'value' in d), 'Invalid dependency shell')
  }
  shell(deps, ['residence', 'configuration', 'policies'])
  shell(deps.residence, ['configuration', 'rulesVersion', 'scope'])
  ensure(Array.isArray(deps.policies) && Object.getPrototypeOf(deps.policies) === Array.prototype &&
    Reflect.ownKeys(deps.policies).length === deps.policies.length + 1 &&
    Reflect.ownKeys(deps.policies).every((k) => k === 'length' || typeof k === 'string' && /^(0|[1-9][0-9]*)$/.test(k) && Number(k) < deps.policies.length) &&
    Object.entries(Object.getOwnPropertyDescriptors(deps.policies)).every(([k, d]) => k === 'length' || d.enumerable && 'value' in d), 'Invalid policy list')
  requireTerminalConfig(deps.configuration)
  const scope = readScope(deps.residence.scope)
  ensure(deps.policies.length === scope.declarations.length, 'Every declaration needs an explicit terminal policy')
  const profiles = new Map<string, string>()
  for (const p of deps.policies) {
    shell(p, ['catalog', 'returnNodeId', 'powerFactId', 'transferFactId', 'sampleSourceId', 'sampleOrdinal', 'specialDefinitionIds', 'permissionDefinitionIds'])
    const c = requireCatalog(p.catalog).data
    parseResidence(z.strictObject({ returnNodeId: idSchema, powerFactId: idSchema, transferFactId: idSchema,
      sampleSourceId: idSchema, sampleOrdinal: countSchema, specialDefinitionIds: z.array(idSchema), permissionDefinitionIds: z.array(idSchema) }),
    { returnNodeId: p.returnNodeId, powerFactId: p.powerFactId, transferFactId: p.transferFactId, sampleSourceId: p.sampleSourceId,
      sampleOrdinal: p.sampleOrdinal, specialDefinitionIds: p.specialDefinitionIds, permissionDefinitionIds: p.permissionDefinitionIds })
    ensure(scope.declarations.some((d) => same(d, c.mission)), 'Undeclared policy')
    ensure(c.nodes.some((n) => n.id === p.returnNodeId) && p.powerFactId !== p.transferFactId &&
      [p.powerFactId, p.transferFactId].every((id) => c.facts.some((f) => f.id === id)), 'Unknown terminal role')
    const source = c.sources.find((s) => s.id === p.sampleSourceId)
    ensure(source?.contents.kind === 'fixed' && source.contents.grants[p.sampleOrdinal], 'Sample needs a bound fixed source ordinal')
    const grant = source.contents.grants[p.sampleOrdinal]
    ensure(grant.quantity === 1 && c.items.some((i) => i.physical.id === grant.definitionId && !i.ordinary), 'Sample must be a real nonordinary item')
    unique([grant.definitionId, ...p.specialDefinitionIds, ...p.permissionDefinitionIds], 'task asset classes')
    for (const id of [...p.specialDefinitionIds, ...p.permissionDefinitionIds]) {
      ensure(c.items.some((i) => i.physical.id === id && !i.ordinary), 'Task asset class cannot absorb ordinary loot')
    }
    for (const i of c.items) {
      const old = profiles.get(i.physical.id)
      ensure(old === undefined || old === JSON.stringify(i), 'Conflicting item definition across history catalogs')
      profiles.set(i.physical.id, JSON.stringify(i))
    }
  }
  unique(deps.policies.map((p) => p.catalog.data.mission.commissionId), 'policies')
}

export function sampleFor(site: ResidenceSite, policy: TerminalPolicy) {
  const source = policy.catalog.data.sources.find((s) => s.id === policy.sampleSourceId)!
  ensure(source.contents.kind === 'fixed', 'Invalid sample policy')
  const node = policy.catalog.data.nodes.find((n) => n.id === source.nodeId)!
  return { instanceId: sourceItemId(site.binding, node.placeId, node.id, source.id, policy.sampleOrdinal),
    grant: source.contents.grants[policy.sampleOrdinal] }
}

function checkHistorySteps(r: z.infer<typeof receiptSchema>, limits: TerminalDependencies['residence']['configuration']['config']['limits']) {
  if (r.source === 'normal-return') return
  const steps = r.steps
  ensure(steps.length > 0, 'Missing historical body trace')
  const action = steps[0].kind === 'primary'
  ensure(r.source !== 'deadline' || !action, 'Deadline cannot be an action trace')
  ensure(r.source !== 'location-death' || r.outcome === 'death', 'Local terminal must be a death')
  const order = action ? ['primary', 'action-bleeding'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle']
  ensure(steps.length <= order.length, 'Historical trace too long')
  const fields = { primary: ['healthLoss', 'exposuresAdded'], 'action-bleeding': ['damage'], 'cycle-bleeding': ['damage'],
    infection: ['progressBefore', 'progressAfter', 'exposuresConverted', 'suppression', 'damage'],
    hunger: ['satietyBefore', 'satietyAfter', 'damage'], 'end-cycle': ['energyBefore', 'energyAfter'] }
  steps.forEach((s, i) => {
    ensure(s.kind === order[i] && s.healthBefore > 0 && s.healthBefore <= limits.hp && s.healthAfter <= s.healthBefore &&
      (i === 0 || s.healthBefore === steps[i - 1].healthAfter) && (s.healthAfter > 0 || i === steps.length - 1), 'Invalid historical checkpoint sequence')
    ensure(same(Object.keys(s.facts).sort(), [...fields[s.kind]].sort()) && Object.values(s.facts).every((v) => typeof v === 'number'), 'Invalid historical fact fields')
    const loss = s.healthBefore - s.healthAfter
    ensure(s.kind === 'end-cycle' ? loss === 0 : s.facts[s.kind === 'primary' ? 'healthLoss' : 'damage'] === loss, 'Historical damage mismatch')
    if (s.kind === 'infection') ensure(Number(s.facts.progressAfter) >= Number(s.facts.progressBefore), 'Historical infection cannot decrease')
    if (s.kind === 'hunger') ensure(Number(s.facts.satietyAfter) <= Number(s.facts.satietyBefore) && Number(s.facts.satietyBefore) <= limits.satiety,
      'Historical hunger facts are out of bounds')
    if (s.kind === 'end-cycle') ensure(Number(s.facts.energyBefore) <= limits.energy && Number(s.facts.energyAfter) <= limits.energy,
      'Historical energy facts are out of bounds')
  })
  ensure(r.outcome === 'death' ? steps.at(-1)!.healthAfter === 0 && steps.at(-1)!.kind !== 'end-cycle'
    : steps.length === 4 && steps.at(-1)!.healthAfter > 0, 'Historical final checkpoint mismatch')
}

/** Validate a passive site without inventing an active mission or resurrected body. */
function checkSite(site: ResidenceSite, deps: TerminalDependencies, character: CharacterCycleState) {
  const p = policyFor(site.binding, deps)
  validateResidencePassiveSite(site, p.catalog, character.identity, message => { throw new TerminalError('INVALID_INPUT', message) })
  return p
}

export function readTerminalSnapshot(input: unknown, deps: TerminalDependencies): TerminalSnapshot {
  checkDependencies(deps)
  const raw = parseResidence(snapshotSchema, input)
  const scope = deps.residence.scope
  ensure(raw.missions.length === scope.declarations.length, 'Incomplete mission history')
  const missions = raw.missions.map((m, i) => readValue(m, { characterId: scope.characterId, mission: scope.declarations[i] }, scope))
  unique(missions.flatMap((m) => m.status === 'unaccepted' ? [] : [m.execution.runId]), 'execution histories')
  const clock = raw.character?.clock
  ensure(clock && clock.kind !== 'first-ready', 'Terminal contract begins with an actual active execution')
  const character = readCycleContext(raw.character, { identity: raw.character.identity, revision: raw.character.revision,
    cycle: raw.character.cycle, stableContext: 'stable', rest: null, normalReturn: null, departure: null,
    lifecycle: clock.kind === 'active' ? clock : { kind: 'closed', source: clock.source } }, deps.residence).state
  ensure(raw.terminalConfigurationId === deps.configuration.configurationId, 'Terminal configuration identity mismatch')
  const c = deps.configuration.config
  ensure(raw.balance <= c.balance_max, 'Balance out of range')
  const actives = missions.filter((m) => m.status === 'active')
  const living = character.body.condition.currentHealth > 0
  ensure(raw.phase === 'active-world' ? living && clock.kind === 'active' && actives.length === 1 && raw.site !== null
    : actives.length === 0 && raw.site === null && (raw.phase === 'dead' ? !living && clock.kind === 'active' : living && clock.kind !== 'active'),
  'Phase/body/mission/site disagreement')
  if (raw.phase === 'active-world') {
    ensure(queryTerminalRewardCapacity(raw.balance, deps.configuration), 'Insufficient full-reward capacity')
    ensure(actives[0].status === 'active' && clock.kind === 'active' && same(actives[0].execution, clock.execution) &&
      same(actives[0].binding.mission, clock.mission), 'Active mission and body clock disagree')
  }
  const currentFact = clock.kind === 'active' ? clock : clock.source
  const currentPolicy = deps.policies.find((p) => same(p.catalog.data.mission, currentFact.mission))
  ensure(currentPolicy, 'No current policy')
  const catalog = currentPolicy.catalog
  const carried = createCarriedItemContainersSnapshot(raw.carried.backpack, raw.carried.equipment, raw.carried.quickSlots, catalog.containers)
  const sampleSource = catalog.data.sources.find((s) => s.id === currentPolicy.sampleSourceId)!
  ensure(sampleSource.contents.kind === 'fixed', 'Sample source')
  const classified = [sampleSource.contents.grants[currentPolicy.sampleOrdinal].definitionId,
    ...currentPolicy.specialDefinitionIds, ...currentPolicy.permissionDefinitionIds]
  ensure(carriedItems(carried).every((i) => classified.includes(i.definitionId) ||
    catalog.data.items.some((d) => d.physical.id === i.definitionId && d.ordinary)), 'Unclassified task asset in current inventory')
  if (raw.phase === 'living-hub') ensure(carriedItems(carried).every((i) => catalog.data.items.some((d) => d.physical.id === i.definitionId && d.ordinary)), 'Returned task assets cannot remain usable')
  ensure(carried.backpack.width === catalog.data.backpack.width && carried.backpack.height === catalog.data.backpack.height &&
    carried.quickSlots.slots.length === catalog.data.backpack.quickSlotCount, 'Wrong container dimensions')
  ensure(classifyLoad(calculateBackpackWeightSubtotal(carried.backpack, catalog.physical), catalog.data.backpack).canCarry, 'Cannot carry')
  const allIds: string[] = []
  const validateItems = (items: readonly z.infer<typeof itemSchema>[], states: z.infer<typeof itemStatesSchema> | TerminalSnapshot['itemStates'], p: TerminalPolicy) => {
    items.forEach((i) => { createItemInstance(i, p.catalog.physical); allIds.push(i.instanceId) })
    return createItemStateCollectionSnapshot(states.states, items, p.catalog.resources)
  }
  if (raw.site) {
    checkSite(raw.site, deps, character)
    ensure(same(raw.site.binding.mission, currentFact.mission) && same(raw.site.binding.execution, currentFact.execution), 'Current site execution mismatch')
  }
  const itemStates = validateItems([...carriedItems(carried), ...(raw.site?.ground.flatMap((g) => g.items) ?? [])], raw.itemStates, currentPolicy)
  validateItems(raw.warehouse.items, raw.warehouse.itemStates, currentPolicy)
  ensure(raw.warehouse.items.every((i) => catalog.data.items.some((d) => d.physical.id === i.definitionId && d.ordinary)), 'Warehouse holds nonordinary assets')
  for (const archive of raw.archives) {
    const p = checkSite(archive.site, deps, character)
    validateItems(archive.site.ground.flatMap((g) => g.items), archive.itemStates, p)
  }
  for (const d of raw.dispositions) {
    const p = policyFor(d.binding, deps)
    ensure(same(d.binding.identity, character.identity) && d.cycle <= character.cycle, 'Disposition owner/cycle mismatch')
    validateItems([d.item], { states: [d.state] }, p)
    const m = missions.find((m) => same(m.binding.mission, d.binding.mission))
    ensure(m && m.status !== 'unaccepted' && same(m.execution, d.binding.execution), 'Disposition execution mismatch')
    const closedReceipt = raw.receipts.find((r) => same(r.binding, d.binding))
    if (m.status === 'closed') ensure(closedReceipt && d.cycle >= closedReceipt.startCycle && d.cycle <= closedReceipt.endCycle, 'Disposition predates or postdates execution')
    else ensure(clock.kind === 'active' && d.cycle >= clock.startCycle && d.source === 'prior-effect', 'Active disposition has no prior-effect boundary')
    ensure(d.source === 'prior-effect' ? ['installed', 'delivered', 'consumed', 'destroyed'].includes(d.kind)
      : !['installed', 'consumed', 'destroyed'].includes(d.kind), 'Disposition source/kind mismatch')
  }
  unique(allIds, 'item ownership across usable, ground and historical domains')
  unique(raw.archives.map((a) => a.site.binding.execution.runId), 'archived executions')
  unique(raw.receipts.map((r) => r.binding.execution.runId), 'receipts')
  const closed = missions.filter((m) => m.status === 'closed')
  ensure(closed.length === raw.receipts.length && closed.length === raw.archives.length, 'Incomplete closed history')
  for (let i = 0; i < raw.receipts.length; i++) {
    const r = raw.receipts[i]
    const m = closed.find((m) => same(m.binding.mission, r.binding.mission))
    const a = raw.archives.find((a) => same(a.site.binding, r.binding))
    ensure(m && m.status === 'closed' && same(m.execution, r.binding.execution) && m.outcome === r.outcome && a, 'Receipt/closed/archive mismatch')
    const p = policyFor(r.binding, deps)
    const sample = sampleFor(a.site, p)
    const correctSample = (d: TerminalSnapshot['dispositions'][number]) => d.item.instanceId === sample.instanceId &&
      d.item.definitionId === sample.grant.definitionId && d.item.quantity === sample.grant.quantity && same(d.state.resource, sample.grant.resource) &&
      a.site.sources.some((s) => s.id === p.sampleSourceId && s.claimed)
    const terminalDispositions = raw.dispositions.filter((d) => r.dispositionIds.includes(d.item.instanceId))
    for (const d of terminalDispositions) {
      ensure(d.source === 'terminal', 'A receipt cannot reapply an earlier effect')
      ensure(r.outcome === 'death' ? d.kind === 'death-unavailable' :
        (d.kind === 'delivered' ? r.outcome === 'success' && correctSample(d) :
          d.kind === 'partial-delivery' ? r.outcome !== 'success' && correctSample(d) :
            d.kind === 'returned-special' ? p.specialDefinitionIds.includes(d.item.definitionId) || d.item.definitionId === sample.grant.definitionId :
              d.kind === 'revoked-permission' && p.permissionDefinitionIds.includes(d.item.definitionId)), 'Disposition classification contradicts terminal outcome')
    }
    if (r.outcome === 'success') ensure(terminalDispositions.filter((d) => d.kind === 'delivered' && correctSample(d)).length === 1 &&
      [p.powerFactId, p.transferFactId].every((id) => a.site.facts.some((f) => f.id === id && f.value)), 'Success lacks its actual goals and delivered sample')
    if (r.source !== 'location-death') ensure(a.site.pending.kind === 'none', 'Return/deadline archive was not stable')
    if (r.outcome === 'voluntary-failure') ensure(!(terminalDispositions.some((d) => d.kind === 'partial-delivery' && correctSample(d)) &&
      [p.powerFactId, p.transferFactId].every((id) => a.site.facts.some((f) => f.id === id && f.value))), 'Qualified return cannot be recorded as voluntary failure')
    checkHistorySteps(r, deps.residence.configuration.config.limits)
    ensure(r.taskDay <= deps.residence.configuration.config.limits.days && safeAdd(r.startCycle, r.taskDay - 1) === r.endCycle &&
      r.endCycle <= character.cycle && r.revision <= character.revision, 'Receipt chronology mismatch')
    const ending = (v: z.infer<typeof receiptSchema>) => v.before + v.reward - v.penalty - v.forfeited
    if (i > 0) ensure(r.before === ending(raw.receipts[i - 1]) && r.startCycle > raw.receipts[i - 1].endCycle &&
      r.revision > raw.receipts[i - 1].revision && raw.receipts[i - 1].outcome !== 'death', 'Receipt chain cannot be rewritten or survive death')
    ensure(r.before <= c.balance_max - c.success_reward && ending(r) <= c.balance_max, 'Historical wallet bounds')
    const reward = r.outcome === 'success' ? c.success_reward : 0
    const penalty = r.outcome === 'voluntary-failure' || r.outcome === 'deadline-failure' ? Math.min(r.before, c.failure_penalty) : 0
    const forfeited = r.outcome === 'death' ? r.before : 0
    ensure(r.reward === reward && r.penalty === penalty && r.forfeited === forfeited, 'Receipt amount mismatch')
    unique(r.dispositionIds, 'receipt disposition references')
    ensure(r.dispositionIds.every((id) => raw.dispositions.some((d) => d.item.instanceId === id && same(d.binding, r.binding) && d.cycle === r.endCycle)), 'Missing disposition')
    ensure(raw.dispositions.filter((d) => same(d.binding, r.binding) && d.source === 'terminal')
      .every((d) => r.dispositionIds.includes(d.item.instanceId)), 'Unreceipted terminal disposition')
    if (r.source === 'normal-return') ensure(r.steps.length === 0 && r.deathCause === null &&
      ['success', 'voluntary-failure'].includes(r.outcome) && a.site.nodeId === policyFor(r.binding, deps).returnNodeId, 'Normal return history mismatch')
    else ensure(r.steps.length > 0 && (r.outcome === 'death' ? r.steps.at(-1)!.healthAfter === 0 && r.deathCause === r.steps.at(-1)!.kind
      : r.source === 'deadline' && r.outcome === 'deadline-failure' && r.deathCause === null), 'Terminal step history mismatch')
    if (r.source === 'deadline') ensure(r.taskDay === deps.residence.configuration.config.limits.days &&
      a.site.nodeId !== policyFor(r.binding, deps).returnNodeId, 'Deadline history mismatch')
    if (r.source === 'location-death' && r.steps[0].kind === 'cycle-bleeding') ensure(r.taskDay < deps.residence.configuration.config.limits.days &&
      p.catalog.data.nodes.find((n) => n.id === a.site.nodeId)!.rest !== null, 'Rest history lacks an available rest boundary')
  }
  const latest = raw.receipts.at(-1)
  if (latest) ensure(raw.balance === latest.before + latest.reward - latest.penalty - latest.forfeited, 'Current wallet diverges from settlement history')
  if (latest && raw.phase === 'active-world') ensure(latest.outcome !== 'death' && clock.kind === 'active' &&
    clock.startCycle > latest.endCycle && character.revision > latest.revision, 'Cannot reactivate after death or rewind closed history')
  if (raw.phase !== 'active-world') {
    ensure(latest && same(latest.binding.mission, currentFact.mission) && same(latest.binding.execution, currentFact.execution) &&
      latest.revision === character.revision, 'Terminal is not latest closed execution')
    if (latest.steps.length > 0) {
      const body = character.body
      ensure(latest.steps.at(-1)!.healthAfter === body.condition.currentHealth, 'Latest HP differs from the committed trace')
      const infection = latest.steps.find((s) => s.kind === 'infection')
      if (infection) ensure(body.infectionProgress === infection.facts.progressAfter && body.condition.pendingInfectionExposures === 0,
        'Latest infection differs from the committed trace')
      const hunger = latest.steps.find((s) => s.kind === 'hunger')
      if (hunger) ensure(body.satiety === hunger.facts.satietyAfter, 'Latest satiety differs from the committed trace')
      const end = latest.steps.find((s) => s.kind === 'end-cycle')
      if (end) ensure(body.energy === end.facts.energyAfter && body.suppression === 0 && !body.condition.painkillerActive &&
        same(body.quotasRemaining, deps.residence.configuration.config.quota), 'Latest reset differs from the committed trace')
    }
    if (clock.kind !== 'active') ensure(same(clock.source, { mission: latest.binding.mission, execution: latest.binding.execution,
      startCycle: latest.startCycle, endCycle: latest.endCycle, taskDay: latest.taskDay, outcome: latest.outcome }), 'Latest closure source mismatch')
    if (raw.phase === 'dead') ensure(latest.outcome === 'death' && clock.kind === 'active' && clock.startCycle === latest.startCycle &&
      clock.taskDay === latest.taskDay && character.cycle === latest.endCycle && raw.balance === 0 && carriedItems(carried).length === 0 && raw.warehouse.items.length === 0,
      'Dead character retains usable assets')
  }
  return deepFreeze({ ...raw, character, missions, carried, itemStates })
}
