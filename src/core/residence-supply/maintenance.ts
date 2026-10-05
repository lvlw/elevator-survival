import { z } from 'zod'
import { deepFreeze } from '../config'
import { restoreItemResource } from '../item-state'
import { carriedItems } from '../residence-location/validation'
import { countSchema, positiveSchema, idSchema, parseResidence } from '../residence-config/validation'
import { readAuthorizedSupply, requireSupplyAction } from './authority'
import { ensure, readSupplyValue } from './validation'
import { numberValue, tableFieldValue } from './config'
import { consumeSupplyRecipe } from '../residence-task/plans'
import { materialInputsSchema } from '../residence-task/validation'
import { supplyBodyAction, supplyEnergyQuery, supplyPaidCost } from './cycle-adapter'
import { issueSupplyPlan } from './plans'
import type { SupplyAuthority } from './types'
const schema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('mechanical'), expectedRevision: countSchema, inputs: materialInputsSchema,
    allocations: z.array(z.strictObject({ instanceId: idSchema, amount: positiveSchema })).min(1) }),
  z.strictObject({ kind: z.enum(['coat', 'toolbox', 'recharge']), expectedRevision: countSchema, inputs: materialInputsSchema, instanceId: idSchema }),
])
export function planSupplyMaintenance(input: unknown, request: unknown, authority: SupplyAuthority) {
  const c = parseResidence(schema, request), { value, dependencies: deps } = readAuthorizedSupply(input, authority)
  requireSupplyAction(value, true)
  ensure(c.expectedRevision === value.character.revision, 'Stale maintenance revision', 'STALE_AUTHORITY')
  const mechanical = c.kind === 'mechanical', pool = numberValue(deps.configuration, 'restore.' + (mechanical ? 'metal_pool' : c.kind === 'recharge' ? 'lamp' : c.kind))
  const allocations = c.kind === 'mechanical' ? c.allocations : [{ instanceId: c.instanceId, amount: pool }]
  ensure(new Set(allocations.map(a => a.instanceId)).size === allocations.length &&
    allocations.reduce((n, a) => n + a.amount, 0) <= pool, 'Mechanical total pool exceeded or duplicate target')
  let states = [...value.itemStates.states]
  const actual: { instanceId: string; requested: number; restored: number; unused: number }[] = []
  for (const a of allocations) {
    const item = carriedItems(value.carried).find(i => i.instanceId === a.instanceId)
    ensure(item && (mechanical ? ['weapon_metal_pipe', 'utility_crowbar'] :
      c.kind === 'coat' ? ['armor_heavy_coat'] : c.kind === 'toolbox' ? ['utility_toolkit'] : ['utility_flashlight']).includes(item.definitionId), 'Wrong actual maintenance target', 'NOT_AVAILABLE')
    const state = states.find(s => s.instanceId === item.instanceId)!
    const restored = restoreItemResource(state, a.amount, deps.catalog.resources)
    ensure(restored.restored > 0, 'Resource already full', 'NOT_AVAILABLE')
    states = states.map(s => s.instanceId === state.instanceId ? restored.state : s)
    actual.push({ instanceId: item.instanceId, requested: a.amount, restored: restored.restored, unused: restored.unused })
  }
  const recipe = tableFieldValue(deps.configuration, 'maintenance.inputs', mechanical ?
    (allocations.some(a => value.carried.equipment.weapon?.instanceId === a.instanceId) ? 'pipe' : 'crow') :
    c.kind === 'recharge' ? 'lamp' : c.kind)
  let next = consumeSupplyRecipe(value, c.inputs, recipe, deps)
  next = { ...next, itemStates: { states: states.filter(s => next.itemStates.states.some(n => n.instanceId === s.instanceId)) } }
  const cost = supplyPaidCost(value, numberValue(deps.configuration, c.kind === 'recharge' ? 'recharge' : 'maintenance.' + c.kind), deps)
  ensure(supplyEnergyQuery(value, deps, c.kind === 'recharge' ? 'recharge' : 'repair', cost).canStart, 'Maintenance energy unavailable', 'NOT_AVAILABLE')
  const checked = readSupplyValue(next, deps)
  const body = supplyBodyAction(value, deps, c.kind === 'recharge' ? 'recharge' : 'repair', cost)
  const plan = issueSupplyPlan(value, { ...checked, character: body.snapshot }, deps, 'maintenance', body.steps, body.cost)
  return deepFreeze({ plan, resourceResult: actual, unusedPool: pool - actual.reduce((n, a) => n + a.restored, 0) })
}
