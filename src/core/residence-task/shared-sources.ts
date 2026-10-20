import type { SupplyDomain, SupplyDomainContext } from '../residence-supply/shared-types'
import { requireSupplyDomainAction } from '../residence-supply/shared-validation'
import { z } from 'zod'
import { addItemToBackpack, createBackpackSnapshot, calculateBackpackWeightSubtotal, type ItemInstance } from '../inventory'
import { classifyLoad } from '../load'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { ensure } from '../residence-supply/shared-validation'
import { numberValue } from '../residence-supply/config'
import { supplyBodyAction, supplyEnergyQuery, supplyPaidCost } from '../residence-supply/cycle-adapter'
import { supplyPlacementSchema } from '../residence-supply/inventory'
import { materialInputsSchema } from './validation'
import { assertTaskPrerequisites, taskAlreadyProduced, spendEquippedSupplyTool, consumeSupplyRecipe, materializeSupplySource } from './plans'
import type { SupplyDependencies } from '../residence-supply/types'
import { requireTaskOpportunity } from './qualification'
export function planSharedSourceReveal<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const { command, source: s } = readSupplySourceSelection(value, request, deps)
  const selector = s.id
  let next: V = value, cost = supplySourceCost(s.cost, command.method, deps), method = 'fixed'
  if (command.method !== undefined) {
    method = command.method
    if (method === 'lit') next = spendEquippedSupplyTool(value, command.toolInstanceId, 'utility_flashlight', 'wear.lamp', deps)
    else if (method === 'crow') next = spendEquippedSupplyTool(value, command.toolInstanceId, 'utility_crowbar', 'wear.tool', deps)
    else ensure(!command.toolInstanceId, 'Unused tool field')
  }
  const energy = supplyPaidCost(value, cost, deps)
  ensure(supplyEnergyQuery(value, deps, selector === 'T1-exchange' ? 'npc-handover' : 'search', energy).canStart, 'Energy unavailable', 'NOT_AVAILABLE')
  if (command.inputs !== undefined) next = consumeSupplyRecipe(next, command.inputs, s.inputs!, deps)
  next = materializeSupplySource(next, selector, method, deps)
  if (command.placements !== undefined) {
    const newIds = next.origins.filter(o => o.producerId === selector && o.binding.execution.runId === value.site!.binding.execution.runId).map(o => o.id)
    const items = next.site!.ground.find(g => g.nodeId === s.node)!.items.filter(i => next.allocations.find(a => a.instanceId === i.instanceId)!.ranges.some(r => newIds.includes(r.originId)))
    ensure(items.length === command.placements.length, 'Each exchange output needs explicit placement')
    checkSupplyExchangePlacement(value, command.inputs ?? [], items, command.placements, deps)
    let backpack = next.carried.backpack
    const placements = command.placements
    items.forEach((i, n) => { backpack = addItemToBackpack(backpack, i, { instanceId: i.instanceId, ...placements[n] }, deps.catalog.physical) })
    next = { ...next, carried: { ...next.carried, backpack }, site: { ...next.site!, ground: next.site!.ground.map(g => g.nodeId === s.node ?
      { ...g, items: g.items.filter(i => !items.some(n => n.instanceId === i.instanceId)) } : g) } }
  }
  const paired = deps.tasks.data.sources.find(p => p.mode === 'paired-' + s.node + '-search-choice')
  if (paired) next = materializeSupplySource(next, paired.id, method, deps)
  const checked = context.read(next)
  const body = supplyBodyAction(value, deps, selector === 'T1-exchange' ? 'npc-handover' : 'search', energy)
  return context.issue(value, { ...checked, character: body.snapshot }, 'task', body.steps, body.cost)
}
/** Strict selection only. No plan, tool use, random draw or source issuance. */
export function readSupplySourceSelection(value: SupplyDomain, request: unknown, deps: SupplyDependencies) {
  const selector = parseResidence(z.object({ sourceId: idSchema }).passthrough(), request).sourceId
  requireSupplyDomainAction(value, true)
  const s = deps.tasks.data.sources.find(s => s.id === selector)
  ensure(s && s.mode !== 'only-with-first-toolbox-door' && !s.mode.startsWith('paired-'), 'Not a selectable source')
  const base = { kind: z.literal('reveal'), expectedRevision: countSchema, sourceId: z.literal(selector) }
  const methods = supplySourceMethodChoices(selector)
  const command: { kind: 'reveal'; expectedRevision: number; sourceId: string; method?: 'dark' | 'lit' | 'manual' | 'crow';
    toolInstanceId?: string; inputs?: { instanceId: string; quantity: number }[];
    placements?: { x: number; y: number; rotated: boolean }[] } = methods[0] === 'dark'
    ? parseResidence(z.strictObject({ ...base, method: z.enum(['dark', 'lit']), toolInstanceId: idSchema.optional() }), request)
    : methods[0] === 'manual'
      ? parseResidence(z.strictObject({ ...base, method: z.enum(['manual', 'crow']), toolInstanceId: idSchema.optional() }), request)
      : selector === 'T1-exchange'
        ? parseResidence(z.strictObject({ ...base, inputs: materialInputsSchema, placements: z.array(supplyPlacementSchema).min(1) }), request)
        : parseResidence(z.strictObject(base), request)
  requireTaskOpportunity(value, s.id, s.node, s.requires, command.expectedRevision)
  return { command, source: s }
}
export function supplySourceCost(declaredCost: string, method: string | undefined, deps: SupplyDependencies) {
  return numberValue(deps.configuration, method === 'lit' ? 'search.lit' : method === 'crow' ? 'door.crow' : declaredCost)
}
export function supplySourceMethodChoices(id: string): readonly ('dark' | 'lit' | 'manual' | 'crow')[] {
  return ['H1-search', 'H2-search', 'H3-search'].includes(id) ? ['dark', 'lit'] : id === 'C4-cabinet' ? ['manual', 'crow'] : []
}
/** Geometry only, shared by the formal exchange and its safe qualification. No issuance or consumption. */
export function checkSupplyExchangePlacement(value: SupplyDomain, inputs: readonly { instanceId: string; quantity: number }[],
  outputs: readonly ItemInstance[], placements: readonly { x: number; y: number; rotated: boolean }[], deps: SupplyDependencies) {
  const quantities = new Map(inputs.map(i => [i.instanceId, i.quantity]))
  const bp = value.carried.backpack
  const kept = bp.items.flatMap(i => {
    const quantity = i.quantity - (quantities.get(i.instanceId) ?? 0)
    return quantity > 0 ? [{ ...i, quantity }] : []
  })
  let bag = createBackpackSnapshot({ ...bp, items: kept, placements: bp.placements.filter(p => kept.some(i => i.instanceId === p.instanceId)) }, deps.catalog.physical)
  ensure(outputs.length === placements.length, 'Each exchange output needs explicit placement')
  outputs.forEach((item, n) => { bag = addItemToBackpack(bag, item, { instanceId: item.instanceId, ...placements[n] }, deps.catalog.physical) })
  ensure(classifyLoad(calculateBackpackWeightSubtotal(bag, deps.catalog.physical), deps.catalog.data.backpack).canCarry, 'Cannot carry', 'CANNOT_CARRY')
}
