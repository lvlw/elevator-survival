import { planResidenceAction, queryResidenceAction, type ResidenceActionPlan, type ResidenceCost, type ResidenceActionRequest } from '../residence-energy'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { classifyLoad } from '../load'
import type { SupplyDependencies, SupplyValue } from './types'
import { cycleContext, ensure } from './validation'
import { numberValue } from './config'
export function supplyPaidCost(value: SupplyValue, base: number, deps: SupplyDependencies, movement = false): ResidenceCost {
  const factors: { numerator: number; denominator: number }[] = []
  if (movement) {
    const load = classifyLoad(calculateBackpackWeightSubtotal(value.carried.backpack, deps.catalog.physical), deps.catalog.data.backpack)
    ensure(load.canCarry, 'Cannot carry', 'CANNOT_CARRY')
    factors.push({ numerator: 100 + load.timeIncreasePercent, denominator: 100 })
    const c = value.character.body.condition
    if (!c.painkillerActive && c.minorContusions > 0)
      factors.push({ numerator: numberValue(deps.configuration, 'load.contusion_percent'), denominator: 100 })
  }
  return { kind: 'paid', base, factors }
}
export function supplyEnergyQuery(value: SupplyValue, deps: SupplyDependencies, action: ResidenceActionRequest['action'], cost: ResidenceCost) {
  const request = cost.kind === 'free' ? { identity: value.character.identity, expectedRevision: value.character.revision,
    action: action === 'medical' || action === 'food' || action === 'revealed-pickup' ? action : 'organize', cost } :
    { identity: value.character.identity, expectedRevision: value.character.revision,
      action: action === 'repair' || action === 'recharge' || action === 'install' || action === 'move' || action === 'npc-handover' || action === 'extraction' ? action : 'search', cost }
  return queryResidenceAction(value.character, request, cycleContext(value.character, deps, value.site?.nodeId ?? null), deps.residence)
}
export function supplyBodyAction(value: SupplyValue, deps: SupplyDependencies, action: ResidenceActionRequest['action'],
  cost: ResidenceCost, exposuresAdded = 0, healthLoss = 0): ResidenceActionPlan {
  const request = cost.kind === 'free' ? { identity: value.character.identity, expectedRevision: value.character.revision,
    action: action === 'medical' || action === 'food' || action === 'revealed-pickup' ? action : 'organize', cost } :
    { identity: value.character.identity, expectedRevision: value.character.revision,
      action: action === 'repair' || action === 'recharge' || action === 'install' || action === 'move' || action === 'npc-handover' || action === 'extraction' ? action : 'search', cost }
  return planResidenceAction(value.character, request, cycleContext(value.character, deps, value.site?.nodeId ?? null),
    deps.residence, completion => ({ completion, effects: { healthLoss, exposuresAdded } }))
}
