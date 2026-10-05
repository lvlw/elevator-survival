import { readAuthorizedSupply } from '../residence-supply/authority'
import { legacySupplyDomainContext, issueSupplyPlan } from '../residence-supply/plans'
import type { SupplyAuthority } from '../residence-supply/types'
import { planSharedTaskTransfer, supplyTaskTransferSchema } from './shared-transfer'
import { parseResidence } from '../residence-config/validation'

export function planSupplyTaskTransfer(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(supplyTaskTransferSchema, request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedTaskTransfer(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
