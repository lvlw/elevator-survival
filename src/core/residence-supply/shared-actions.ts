import { z } from 'zod'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { planResidenceBoundMove } from '../residence-location/movement'
import { planResidenceLocationRest } from '../residence-location/controlled'
import { knownSupplyEdges } from '../residence-location/supply-knowledge'
import { requireSupplyDomainAction } from './shared-validation'
import { cycleContext, ensure } from './validation'
import { supplyPaidCost } from './cycle-adapter'
import type { SupplyDomain, SupplyDomainContext } from './shared-types'
export function planSharedMove<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const c = parseResidence(z.strictObject({ kind: z.literal('move'), expectedRevision: countSchema, edgeId: idSchema }), request)
  requireSupplyDomainAction(value, true)
  const result = planResidenceBoundMove({ character: value.character, carried: value.carried, itemStates: value.itemStates, site: value.site },
    { ...c, binding: value.site.binding }, { cycle: cycleContext(value.character, deps, value.site.nodeId), mission: value.missions.find(m => m.status === 'active')! },
    { residence: deps.residence, catalog: deps.catalog }, { knownEdges: () => knownSupplyEdges(value.site, value.witnesses),
      cost: (_snapshot, edge) => { ensure(edge.cost.kind === 'paid', 'Expected declared movement'); return supplyPaidCost(value, edge.cost.base, deps, true) } })
  return context.issue(value, { ...value, ...result.snapshot }, 'move', result.steps, result.energyCost)
}
export function planSharedRest<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const c = parseResidence(z.strictObject({ kind: z.literal('rest'), expectedRevision: countSchema }), request)
  requireSupplyDomainAction(value)
  const result = planResidenceLocationRest({ character: value.character, carried: value.carried, itemStates: value.itemStates, site: value.site },
    { ...c, binding: value.site.binding }, { cycle: cycleContext(value.character, deps, value.site.nodeId), mission: value.missions.find(m => m.status === 'active')! },
    { residence: deps.residence, catalog: deps.catalog })
  return context.issue(value, { ...value, ...result.snapshot }, 'rest', result.steps, result.energyCost)
}
