import { readAuthorizedSupply } from '../residence-supply/authority'
import { legacySupplyDomainContext, issueSupplyPlan } from '../residence-supply/plans'
import type { SupplyAuthority } from '../residence-supply/types'
import { planSharedTaskAction } from './shared-actions'

export function planSupplyTaskAction(input: unknown, request: unknown, authority: SupplyAuthority) {
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedTaskAction(value, request, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
