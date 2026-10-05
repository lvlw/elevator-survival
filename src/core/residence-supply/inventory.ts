import { readAuthorizedSupply } from './authority'
import { legacySupplyDomainContext, issueSupplyPlan } from './plans'
import type { SupplyAuthority } from './types'
import { planSharedInventory, supplyInventorySchema } from './shared-inventory'
import { parseResidence } from '../residence-config/validation'

export function planSupplyInventory(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(supplyInventorySchema, request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedInventory(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
export { supplyPlacementSchema, splitSupplyStack } from './shared-inventory'
