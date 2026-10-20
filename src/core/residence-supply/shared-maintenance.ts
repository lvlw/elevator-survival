import type { SupplyDomain, SupplyDomainContext } from './shared-types'
import { requireSupplyDomainAction } from './shared-validation'
import { z } from 'zod'
import { deepFreeze } from '../config'
import { restoreItemResource } from '../item-state'
import { carriedItems } from '../residence-location/validation'
import { countSchema, positiveSchema, idSchema, parseResidence } from '../residence-config/validation'
import { ensure } from './shared-validation'
import { numberValue, tableFieldValue } from './config'
import { consumeSupplyRecipe } from '../residence-task/plans'
import { materialInputsSchema } from '../residence-task/validation'
import { supplyBodyAction, supplyEnergyQuery, supplyPaidCost } from './cycle-adapter'
import { maintenancePool, requireMaintenanceAllocations, requireMaintenanceTarget, maintenanceRecipe } from './maintenance-qualification'
export const supplyMaintenanceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('mechanical'), expectedRevision: countSchema, inputs: materialInputsSchema,
    allocations: z.array(z.strictObject({ instanceId: idSchema, amount: positiveSchema })).min(1) }),
  z.strictObject({ kind: z.enum(['coat', 'toolbox', 'recharge']), expectedRevision: countSchema, inputs: materialInputsSchema, instanceId: idSchema }),
])
export function planSharedMaintenance<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const c = parseResidence(supplyMaintenanceSchema, request)
  requireSupplyDomainAction(value, true)
  ensure(c.expectedRevision === value.character.revision, 'Stale maintenance revision', 'STALE_AUTHORITY')
  const mechanical = c.kind === 'mechanical', pool = maintenancePool(c.kind, deps)
  const allocations = c.kind === 'mechanical' ? c.allocations : [{ instanceId: c.instanceId, amount: pool }]
  requireMaintenanceAllocations(allocations, pool)
  let states = [...value.itemStates.states]
  const actual: { instanceId: string; requested: number; restored: number; unused: number }[] = []
  for (const a of allocations) {
    const item = requireMaintenanceTarget(value, a.instanceId, c.kind)
    const state = states.find(s => s.instanceId === item.instanceId)!
    const restored = restoreItemResource(state, a.amount, deps.catalog.resources)
    ensure(restored.restored > 0, 'Resource already full', 'NOT_AVAILABLE')
    states = states.map(s => s.instanceId === state.instanceId ? restored.state : s)
    actual.push({ instanceId: item.instanceId, requested: a.amount, restored: restored.restored, unused: restored.unused })
  }
  const recipe = maintenanceRecipe(value, c.kind, allocations, deps)
  let next = consumeSupplyRecipe(value, c.inputs, recipe, deps)
  next = { ...next, itemStates: { states: states.filter(s => next.itemStates.states.some(n => n.instanceId === s.instanceId)) } }
  const cost = supplyPaidCost(value, numberValue(deps.configuration, c.kind === 'recharge' ? 'recharge' : 'maintenance.' + c.kind), deps)
  ensure(supplyEnergyQuery(value, deps, c.kind === 'recharge' ? 'recharge' : 'repair', cost).canStart, 'Maintenance energy unavailable', 'NOT_AVAILABLE')
  const body = supplyBodyAction(value, deps, c.kind === 'recharge' ? 'recharge' : 'repair', cost)
  // next is a private primary candidate; the issued boundary validates the complete body result.
  const plan = context.issue(value, { ...next, character: body.snapshot }, 'maintenance', body.steps, body.cost)
  return deepFreeze({ plan, resourceResult: actual, unusedPool: pool - actual.reduce((n, a) => n + a.restored, 0) })
}
