import { establishSharedInitial, planSharedDeparture, supplyDepartureSchema } from './shared-initial'
import { parseResidence } from '../residence-config/validation'
import { readAuthorizedSupply } from './authority'
import { readSupplyValue } from './validation'
import { issueSupplyPlan, legacySupplyDomainContext } from './plans'
import type { SupplyDependencies, SupplyAuthority } from './types'
export function establishSupplyInitial(input: unknown, deps: SupplyDependencies) {
  return establishSharedInitial(input, deps, facts => readSupplyValue({ ...facts, protocol: 'residence-supply-pure-v1' }, deps),
    value => readSupplyValue(value, deps))
}
export function planSupplyDeparture(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(supplyDepartureSchema, request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedDeparture(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
