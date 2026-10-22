import { numberValue, vectorValue } from '../residence-supply/config'
import type { SupplyDomain } from '../residence-supply/shared-types'
import type { SupplyDependencies } from '../residence-supply/types'

/** Internal facts for an already qualified sample method; no plan, draw or payment. */
export function querySampleProtection(value: Pick<SupplyDomain, 'carried' | 'itemStates'>, method: string, deps: SupplyDependencies) {
  const index = method === 'cautious' ? 0 : 1
  const risk = vectorValue(deps.configuration, 'sample.risks', 2)[index]
  const coat = value.carried.equipment.armor, state = coat && value.itemStates.states.find(s => s.instanceId === coat.instanceId)
  const protectedRisk = vectorValue(deps.configuration, 'sample.coat_risks', 2)[index]
  const payment = coat?.definitionId === 'armor_heavy_coat' && state?.resource.kind === 'integrity' && state.resource.current > 0 && protectedRisk < risk
    ? Object.freeze({ instanceId: state.instanceId, requested: numberValue(deps.configuration, 'wear.tool') }) : null
  return Object.freeze({ effectiveRiskPercent: payment ? protectedRisk : risk, payment })
}
