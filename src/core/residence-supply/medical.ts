import { readAuthorizedSupply, requireSupplyAction } from './authority'
import { parseResidence } from '../residence-config/validation'
import { legacySupplyDomainContext, issueSupplyPlan } from './plans'
import { evaluateSupplyClinical, planSharedMedical, supplyMedicalSchema } from './shared-medical'
import type { SupplyValue, SupplyDependencies, SupplyAuthority } from './types'
export function evaluateSupplyMedical(value: SupplyValue, request: unknown, deps: SupplyDependencies) {
  const command = parseResidence(supplyMedicalSchema, request)
  requireSupplyAction(value)
  return evaluateSupplyClinical(value, command, deps)
}
export function planSupplyMedical(input: unknown, request: unknown, authority: SupplyAuthority) {
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedMedical(value, request, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
