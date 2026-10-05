export { establishSupplyInitial, planSupplyDeparture } from './initial'
export { createSupplyAuthority } from './authority'
export { planSupplyInventory } from './inventory'
export { assertSupplyPlanCurrent } from './plans'
export { readSupplyValue } from './validation'
export { planSupplyMedical } from './medical'
export { planSupplyMaintenance } from './maintenance'

import { z } from 'zod'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { readAuthorizedSupply } from './authority'
import { issueSupplyPlan, legacySupplyDomainContext } from './plans'
import { planSharedMove, planSharedRest } from './shared-actions'
import type { SupplyAuthority } from './types'
export function planSupplyMove(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(z.strictObject({ kind: z.literal('move'), expectedRevision: countSchema, edgeId: idSchema }), request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedMove(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
export function planSupplyRest(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(z.strictObject({ kind: z.literal('rest'), expectedRevision: countSchema }), request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedRest(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
