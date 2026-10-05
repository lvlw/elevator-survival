export { establishSupplyInitial, planSupplyDeparture } from './initial'
export { createSupplyAuthority } from './authority'
export { planSupplyInventory } from './inventory'
export { assertSupplyPlanCurrent } from './plans'
export { readSupplyValue } from './validation'
export { planSupplyMedical } from './medical'
export { planSupplyMaintenance } from './maintenance'

import { z } from 'zod'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { planResidenceBoundMove } from '../residence-location/movement'
import { planResidenceLocationRest } from '../residence-location/controlled'
import { knownSupplyEdges } from '../residence-location/supply-knowledge'
import { readAuthorizedSupply, requireSupplyAction } from './authority'
import { cycleContext, ensure } from './validation'
import { issueSupplyPlan } from './plans'
import { supplyPaidCost } from './cycle-adapter'
import type { SupplyAuthority } from './types'
export function planSupplyMove(input: unknown, request: unknown, authority: SupplyAuthority) {
  const c = parseResidence(z.strictObject({ kind: z.literal('move'), expectedRevision: countSchema, edgeId: idSchema }), request)
  const { value, dependencies: deps } = readAuthorizedSupply(input, authority)
  requireSupplyAction(value, true)
  const result = planResidenceBoundMove({ character: value.character, carried: value.carried, itemStates: value.itemStates, site: value.site },
    { ...c, binding: value.site.binding }, { cycle: cycleContext(value.character, deps, value.site.nodeId), mission: value.missions.find(m => m.status === 'active')! },
    { residence: deps.residence, catalog: deps.catalog }, { knownEdges: () => knownSupplyEdges(value.site, value.witnesses),
      cost: (_snapshot, edge) => { ensure(edge.cost.kind === 'paid', 'Expected declared movement'); return supplyPaidCost(value, edge.cost.base, deps, true) } })
  return issueSupplyPlan(value, { ...value, ...result.snapshot }, deps, 'move', result.steps, result.energyCost)
}
export function planSupplyRest(input: unknown, request: unknown, authority: SupplyAuthority) {
  const c = parseResidence(z.strictObject({ kind: z.literal('rest'), expectedRevision: countSchema }), request)
  const { value, dependencies: deps } = readAuthorizedSupply(input, authority)
  requireSupplyAction(value)
  const result = planResidenceLocationRest({ character: value.character, carried: value.carried, itemStates: value.itemStates, site: value.site },
    { ...c, binding: value.site.binding }, { cycle: cycleContext(value.character, deps, value.site.nodeId), mission: value.missions.find(m => m.status === 'active')! },
    { residence: deps.residence, catalog: deps.catalog })
  return issueSupplyPlan(value, { ...value, ...result.snapshot }, deps, 'rest', result.steps, result.energyCost)
}
