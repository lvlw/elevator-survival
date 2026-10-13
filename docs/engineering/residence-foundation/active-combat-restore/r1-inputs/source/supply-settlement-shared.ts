import { z } from 'zod'
import { countSchema, parseResidence } from '../residence-config/validation'
import { planCharacterCycle } from '../character-cycle'
import { cycleContext, requireSupplyDomainAction } from '../residence-supply/shared-validation'
import { originalInstanceId } from '../residence-supply/provenance'
import { taskFact } from '../residence-task/plans'
import { verifyCycleResult } from './plans'
import type { SupplyDomainContext } from '../residence-supply/shared-types'
import { terminateMission } from '../mission-lifecycle/controlled'
import { createStreamId } from '../random'
import { carriedItems } from '../residence-location/validation'
import { ensure } from '../residence-supply/shared-validation'
import { settleTerminalBalance } from './settlement-shared'
import type { BodyStep } from '../character-cycle'
import type { SupplyDependencies, SupplyDisposition } from '../residence-supply/types'
import type { SupplyDomain } from '../residence-supply/shared-types'
import type { TerminalOutcome } from './types'
export function settleSupplyDomain<V extends SupplyDomain>(before: V, result: V, outcome: TerminalOutcome,
  source: SupplyDomain['receipts'][number]['source'], steps: readonly BodyStep[], deps: SupplyDependencies,
  combatDeathReceiptId?: string): V {
  ensure(before.site && result.site && before.character.clock.kind === 'active', 'Missing actual terminal site')
  const b = before.character.clock, money = settleTerminalBalance(before.balance, outcome, deps.terminal.config)
  const added: SupplyDisposition[] = [], removeIds = new Set<string>()
  const append = (item: SupplyDisposition['item'], state: SupplyDisposition['state'], kind: SupplyDisposition['kind']) => {
    const alloc = result.allocations.find(a => a.instanceId === item.instanceId)!
    added.push({ binding: result.site!.binding, id: createStreamId('supply-terminal-disposition-v1', result.site!.binding.execution.runId,
      String(result.character.revision), item.instanceId, kind), kind, reason: 'terminal', cycle: before.character.cycle, revision: result.character.revision, item, state, ranges: alloc.ranges })
    removeIds.add(item.instanceId)
  }
  for (const i of carriedItems(result.carried)) {
    const descriptor = deps.tasks.data.items.find(d => d.id === i.definitionId)
    const state = result.itemStates.states.find(s => s.instanceId === i.instanceId)!
    if (outcome === 'death') append(i, state, 'death-unavailable')
    else if (descriptor?.alias === 'sample') append(i, state, outcome === 'success' ? 'delivered' : 'partial-delivery')
    else if (descriptor?.alias === 'card') append(i, state, 'revoked-permission')
    else if (descriptor && !descriptor.ordinary) append(i, state, 'returned-special')
  }
  if (outcome === 'death') for (const i of result.warehouse.items)
    append(i, result.warehouse.itemStates.states.find(s => s.instanceId === i.instanceId)!, 'death-unavailable')
  const carried = { backpack: { ...result.carried.backpack, items: result.carried.backpack.items.filter(i => !removeIds.has(i.instanceId)),
    placements: result.carried.backpack.placements.filter(p => !removeIds.has(p.instanceId)) },
    equipment: { weapon: result.carried.equipment.weapon && !removeIds.has(result.carried.equipment.weapon.instanceId) ? result.carried.equipment.weapon : null,
      armor: result.carried.equipment.armor && !removeIds.has(result.carried.equipment.armor.instanceId) ? result.carried.equipment.armor : null,
      utility: result.carried.equipment.utility && !removeIds.has(result.carried.equipment.utility.instanceId) ? result.carried.equipment.utility : null },
    quickSlots: { slots: result.carried.quickSlots.slots.map(i => i && !removeIds.has(i.instanceId) ? i : null) } }
  const keep = new Set(carriedItems(carried).map(i => i.instanceId)), ground = new Set(result.site.ground.flatMap(g => g.items.map(i => i.instanceId)))
  const active = before.missions.find(m => m.status === 'active')!
  const closed = terminateMission(active, { binding: active.binding, execution: b.execution, outcome }, deps.residence.scope)
  const receipt: SupplyDomain['receipts'][number] = { binding: result.site.binding, outcome, ...(source === 'combat-death' ? { source, combatDeathReceiptId: combatDeathReceiptId! } : { source }), startCycle: b.startCycle,
    endCycle: before.character.cycle, taskDay: b.taskDay, revision: result.character.revision, steps,
    before: money.before, reward: money.reward, penalty: money.penalty, forfeited: money.forfeited,
    dispositionIds: added.map(d => d.id) }
  const snapshot: V = { ...result, phase: outcome === 'death' ? 'dead' : 'living-hub', site: null,
    missions: before.missions.map(m => m === active ? closed : m), carried, balance: money.balance,
    warehouse: outcome === 'death' ? { items: [], itemStates: { states: [] } } : result.warehouse,
    itemStates: { states: result.itemStates.states.filter(s => keep.has(s.instanceId)) },
    allocations: result.allocations.filter(a => !removeIds.has(a.instanceId)), dispositions: [...result.dispositions, ...added],
    archives: [...result.archives, { site: result.site, itemStates: { states: result.itemStates.states.filter(s => ground.has(s.instanceId)) }, witnesses: result.witnesses }],
    witnesses: [], receipts: [...before.receipts, receipt] }
  return snapshot
}
export function sharedTerminalEligibility(v: SupplyDomain, deps: SupplyDependencies) {
  const stable = v.phase === 'active-world' && v.site?.pending.kind === 'none' && v.character.body.condition.currentHealth > 0
  const sample = deps.tasks.data.actions.find(a => a.id === deps.tasks.data.goal.carried)!
  const definition = deps.tasks.data.items.find(i => i.alias === sample.grant)!.id
  const origin = v.site && v.origins.find(o => o.kind === 'task' && o.producerId === sample.id &&
    o.binding.execution.runId === v.site!.binding.execution.runId && o.nodeId === sample.node && o.ordinal === 0)
  const carriedSample = origin && v.carried.backpack.items.find(i => i.instanceId === originalInstanceId(origin) && i.definitionId === definition && i.quantity === 1)
  const complete = deps.tasks.data.goal.facts.every(id => taskFact(v, id)) && !!carriedSample
  const here = v.site?.nodeId === deps.tasks.data.goal.return
  return { deliver: !!stable && here && complete, withdraw: !!stable && here && !complete,
    deadline: !!stable && !here && v.character.clock.kind === 'active' &&
      v.character.clock.taskDay === deps.residence.configuration.config.limits.days }
}
export function planSharedTerminal<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const c = parseResidence(z.strictObject({ kind: z.enum(['deliver', 'withdraw', 'deadline']), expectedRevision: countSchema }), request)
  const deps = context.dependencies
  requireSupplyDomainAction(value)
  ensure(c.expectedRevision === value.character.revision && sharedTerminalEligibility(value, deps)[c.kind], 'Terminal not available', 'NOT_AVAILABLE')
  const outcome = c.kind === 'deliver' ? 'success' : c.kind === 'withdraw' ? 'voluntary-failure' : 'deadline-failure'
  const mode = c.kind === 'deadline' ? 'deadline' : 'normal-return'
  const ctx = { ...cycleContext(value.character, deps, value.site.nodeId), normalReturn: mode === 'normal-return' ? outcome as 'success' | 'voluntary-failure' : null }
  const proposed = planCharacterCycle(value.character, { kind: mode, identity: value.character.identity,
    expectedRevision: value.character.revision }, ctx, deps.residence)
  const body = verifyCycleResult(proposed, value.character, mode, outcome, deps.residence)
  return context.issue(value, settleSupplyDomain(value, { ...value, character: body.snapshot }, body.outcome === 'death' ? 'death' : outcome,
    mode === 'deadline' ? 'deadline' : 'normal-return', body.steps, deps), 'terminal', body.steps)
}
