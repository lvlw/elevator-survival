import { z } from 'zod'
import { type BodyStep, type CharacterCycleState } from '../character-cycle'
import { countSchema, parseResidence } from '../residence-config/validation'
import { assertResidenceLocationPlanCurrent, type LocationPlan } from '../residence-location'
import { readAuthorizedSupply, requireSupplyAction } from '../residence-supply/authority'
import { assertSupplyPlanCurrent, issueSupplyPlan, legacySupplyDomainContext } from '../residence-supply/plans'
import { readSupplyValue, ensure, cycleContext } from '../residence-supply/validation'
import { settleSupplyDomain, sharedTerminalEligibility, planSharedTerminal } from './supply-settlement-shared'
import { verifySteps } from './plans'
import type { SupplyAuthority, SupplyDependencies, SupplyValue, SupplyPlan, SupplyReceipt } from '../residence-supply/types'
import type { TerminalOutcome } from './types'
export function supplyTerminalEligibility(value: SupplyValue, deps: SupplyDependencies) {
  return sharedTerminalEligibility(value, deps)
}
function finish(before: SupplyValue, result: SupplyValue, outcome: TerminalOutcome, source: SupplyReceipt['source'],
  steps: readonly BodyStep[], deps: SupplyDependencies): SupplyPlan {
  return issueSupplyPlan(before, settleSupplyDomain(before, result, outcome, source, steps, deps), deps, 'terminal', steps)
}
export function planSupplyTerminal(input: unknown, request: unknown, authority: SupplyAuthority) {
  const command = parseResidence(z.strictObject({ kind: z.enum(['deliver', 'withdraw', 'deadline']), expectedRevision: countSchema }), request)
  const { value, dependencies } = readAuthorizedSupply(input, authority)
  return planSharedTerminal(value, command, legacySupplyDomainContext(dependencies, issueSupplyPlan))
}
export function consumeSupplyDeath(input: unknown, plan: SupplyPlan, authority: SupplyAuthority) {
  const { value, dependencies: deps } = readAuthorizedSupply(input, authority)
  assertSupplyPlanCurrent(value, plan, authority)
  ensure(plan.producer !== 'terminal' && plan.outcome === 'death' && plan.deathCause !== null &&
    plan.snapshot.character.body.condition.currentHealth === 0, 'Actual new producer death required')
  ensure(['task', 'maintenance', 'move', 'rest'].includes(plan.producer) &&
    plan.deathCause === plan.steps.at(-1)?.kind && plan.snapshot.character.cycle === value.character.cycle &&
    JSON.stringify(plan.snapshot.character.clock) === JSON.stringify(value.character.clock), 'Invalid new death checkpoint binding')
  verifySteps(value.character.body, plan.snapshot.character.body, plan.steps, plan.producer === 'rest' ? 'cycle' : 'action',
    plan.snapshot.character.body.energy, deps.residence)
  return finish(value, plan.snapshot, 'death', 'supply-death', plan.steps, deps)
}
export function consumeSupplyLocationDeath(input: unknown, plan: LocationPlan, authority: SupplyAuthority) {
  const { value, dependencies: deps } = readAuthorizedSupply(input, authority)
  requireSupplyAction(value)
  const locationAuthority = { mission: value.missions.find(m => m.status === 'active')!,
    cycle: cycleContext(value.character, deps, value.site.nodeId) }
  assertResidenceLocationPlanCurrent({ character: value.character, carried: value.carried, itemStates: value.itemStates, site: value.site },
    plan, locationAuthority, { residence: deps.residence, catalog: deps.catalog })
  ensure(plan.coordination === 'death-required', 'Actual G2 death required')
  verifySteps(value.character.body, plan.snapshot.character.body, plan.steps, plan.steps[0].kind === 'primary' ? 'action' : 'cycle',
    plan.snapshot.character.body.energy, deps.residence)
  return finish(value, readSupplyValue({ ...value, ...plan.snapshot }, deps), 'death', 'location-death', plan.steps, deps)
}
