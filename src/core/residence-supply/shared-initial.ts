import { z } from 'zod'
import { readCycleContext, planCharacterCycle } from '../character-cycle'
import { executionSchema, readExecution, readScope, readValue } from '../mission-lifecycle/validation'
import { activateMission } from '../mission-lifecycle/controlled'
import { establishResidenceLocation } from '../residence-location/controlled'
import { countSchema, parseResidence, idSchema } from '../residence-config/validation'
import { queryTerminalRewardCapacity } from '../residence-terminal/config'
import { issueSupplyOrigin } from './allocations'
import { cycleContext, ensure, supplyCharacterSchema } from './validation'
import type { SupplyDependencies } from './types'
import type { SupplyDomain, SupplyDomainContext } from './shared-types'
const schema = z.strictObject({ character: supplyCharacterSchema, mission: z.unknown(), execution: executionSchema,
  tool: z.enum(['crow', 'lamp', 'toolbox']), specialty: z.enum(['scout', 'engineer', 'survival']) })
/** First pure composition, not an additive grant or a lifecycle reset. */
export function establishSharedInitial<V extends SupplyDomain>(input: unknown, deps: SupplyDependencies,
  compose: (facts: SupplyDomain) => V, read: (input: unknown) => V): V {
  const raw = parseResidence(schema, input), scope = readScope(deps.residence.scope)
  const mission = readValue(raw.mission, { characterId: scope.characterId, mission: deps.catalog.data.mission }, scope)
  ensure(mission.status === 'unaccepted', 'Initial grant needs unaccepted mission', 'NOT_AVAILABLE')
  const execution = readExecution(raw.execution, mission.binding)
  const character = readCycleContext(raw.character, { identity: raw.character.identity, revision: 0, cycle: 1,
    lifecycle: { kind: 'first' }, rest: null, stableContext: 'stable', normalReturn: null, departure: null }, deps.residence).state
  ensure(character.clock.kind === 'first-ready', 'Not first-ready')
  let value: SupplyDomain = { configurationId: deps.configuration.configurationId,
    contentId: deps.tasks.contentId, terminalConfigurationId: deps.terminal.configurationId, phase: 'first-hub',
    character, missions: scope.declarations.map(m => m.commissionId === mission.binding.mission.commissionId ? mission :
      readValue({ formatVersion: 1, status: 'unaccepted', binding: { characterId: scope.characterId, mission: m } }, { characterId: scope.characterId, mission: m }, scope)),
    balance: deps.terminal.config.initial_balance, site: null, carried: { backpack: { width: deps.catalog.data.backpack.width,
      height: deps.catalog.data.backpack.height, items: [], placements: [] }, equipment: { weapon: null, armor: null, utility: null },
      quickSlots: { slots: Array.from({ length: deps.catalog.data.backpack.quickSlotCount }, () => null) } }, itemStates: { states: [] },
    warehouse: { items: [], itemStates: { states: [] } }, origins: [], allocations: [], dispositions: [], lineage: [], unitTransfers: [],
    archives: [], witnesses: [], receipts: [], productions: [], choices: { tool: raw.tool, specialty: raw.specialty, firstBandageUsed: false } }
  const binding = { identity: character.identity, mission: mission.binding.mission, execution,
    catalogId: deps.catalog.data.id, catalogVersion: deps.catalog.data.version }
  const gear = { pipe: 'weapon_metal_pipe', coat: 'armor_heavy_coat', crow: 'utility_crowbar',
    lamp: 'utility_flashlight', toolbox: 'utility_toolkit', bandage: deps.tasks.data.items.find(i => i.alias === 'bandage')!.id }
  for (const alias of ['pipe', 'coat', raw.tool, 'bandage'] as const) {
    const produced = issueSupplyOrigin(value, binding, 'initial-hub', 'initial-hub', 'initial:' + alias,
      0, gear[alias], 1, 'initial', 0, deps)
    value = produced.value
    const item = produced.items[0], carried = value.carried
    value = { ...value, carried: alias === 'bandage' ? { ...carried, quickSlots: { slots: carried.quickSlots.slots.map((i, n) => n === 0 ? item : i) } }
      : { ...carried, equipment: { ...carried.equipment, [alias === 'pipe' ? 'weapon' : alias === 'coat' ? 'armor' : 'utility']: item } } }
  }
  return read(compose(value))
}
export const supplyDepartureSchema = z.strictObject({ kind: z.literal('depart'), expectedRevision: countSchema, commissionId: idSchema })
export function planSharedDeparture<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const command = parseResidence(supplyDepartureSchema, request)
  ensure(value.phase === 'first-hub' && command.expectedRevision === value.character.revision, 'Only actual first departure', 'NOT_AVAILABLE')
  ensure(queryTerminalRewardCapacity(value.balance, deps.terminal), 'No full reward capacity', 'NOT_AVAILABLE')
  const m = value.missions.find(m => m.binding.mission.commissionId === command.commissionId)
  ensure(m?.status === 'unaccepted' && m.binding.mission.commissionId === deps.catalog.data.mission.commissionId, 'Not declared departure')
  const execution = value.origins[0].binding.execution
  const ctx = { ...cycleContext(value.character, deps, null), departure: { mission: m, execution } }
  const body = planCharacterCycle(value.character, { kind: 'depart', identity: value.character.identity,
    expectedRevision: command.expectedRevision, commissionId: command.commissionId }, ctx, deps.residence)
  const active = activateMission(m, { binding: m.binding, execution }, deps.residence.scope)
  const site = establishResidenceLocation({ character: body.snapshot, carried: value.carried, itemStates: value.itemStates },
    { cycle: cycleContext(body.snapshot, deps, deps.catalog.data.entryNodeId), mission: active }, { residence: deps.residence, catalog: deps.catalog })
  const next: V = { ...value, ...site, phase: 'active-world', missions: value.missions.map(x => x === m ? active : x) }
  return context.issue(value, next, 'departure', body.steps)
}
