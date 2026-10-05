import { readAuthorizedSupply } from './authority'
import { legacySupplyDomainContext, issueSupplyPlan } from './plans'
import type { SupplyAuthority } from './types'
import { planSharedMaintenance, supplyMaintenanceSchema } from './shared-maintenance'
import { parseResidence } from '../residence-config/validation'

export function planSupplyMaintenance(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(supplyMaintenanceSchema, request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedMaintenance(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
