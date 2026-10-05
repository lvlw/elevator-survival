import { readAuthorizedSupply } from '../residence-supply/authority'
import { legacySupplyDomainContext, issueSupplyPlan } from '../residence-supply/plans'
import type { SupplyAuthority } from '../residence-supply/types'
import { planSharedSourceReveal } from './shared-sources'
import { z } from 'zod'
import { parseResidence, idSchema } from '../residence-config/validation'

export function planSupplySourceReveal(input: unknown, request: unknown, authority: SupplyAuthority) {
  parseResidence(z.object({ sourceId: idSchema }).passthrough(), request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedSourceReveal(value, request, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
