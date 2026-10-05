import { parseResidence } from '../residence-config/validation'
import { ensure, validateSupplyFacts } from '../residence-supply/shared-validation'
import { verifySteps } from '../residence-terminal/plans'
import { settleSupplyDomain, planSharedTerminal } from '../residence-terminal/supply-settlement-shared'
import { planSharedInventory } from '../residence-supply/shared-inventory'
import { planSharedMedical } from '../residence-supply/shared-medical'
import { planSharedMaintenance } from '../residence-supply/shared-maintenance'
import { planSharedRest } from '../residence-supply/shared-actions'
import { planSharedTaskAction } from '../residence-task/shared-actions'
import { planSharedSourceReveal } from '../residence-task/shared-sources'
import { planSharedTaskTransfer } from '../residence-task/shared-transfer'
import { combatValueSchema } from './schema'
import { readAuthorizedCombat } from './authority'
import { readCombatValue } from './validation'
import { issueCombatPlan } from './plans'
import type { SupplyDomainContext } from '../residence-supply/shared-types'
import type { CombatValue, CombatPlan, CombatDependencies, CombatAuthority } from './types'
/** Internal generic domain seam, not an authority conversion or legacy protocol disguise. */
export function combatDomainContext(deps: CombatDependencies): SupplyDomainContext<CombatValue, CombatPlan> {
  return { dependencies: deps.supply, read: input => readCombatValue(input, deps),
    issue: (before, proposed, producer, steps, energyCost = 0) => {
      if (proposed.character.body.condition.currentHealth === 0 && proposed.phase === 'active-world') {
        ensure(['move', 'rest', 'maintenance', 'task'].includes(producer), 'Invalid stable death producer')
        const checked = validateSupplyFacts(parseResidence(combatValueSchema, proposed), deps.supply)
        verifySteps(before.character.body, checked.character.body, steps, producer === 'rest' ? 'cycle' : 'action',
          checked.character.body.energy, deps.supply.residence)
        const closed = settleSupplyDomain(before, checked, 'death', 'supply-death', steps, deps.supply)
        return issueCombatPlan(before, closed, deps, 'terminal', steps, energyCost)
      }
      return issueCombatPlan(before, proposed, deps, producer, steps, energyCost)
    } }
}
function stable(input: unknown, authority: CombatAuthority) {
  const ctx = readAuthorizedCombat(input, authority)
  ensure(!ctx.value.battle, 'Stable action forbidden during battle', 'NOT_AVAILABLE')
  return { ...ctx, domain: combatDomainContext(ctx.dependencies) }
}
export function planCombatInventory(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedInventory(value, request, domain)
}
export function planCombatMedical(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedMedical(value, request, domain)
}
export function planCombatMaintenance(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedMaintenance(value, request, domain)
}
export function planCombatRest(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedRest(value, request, domain)
}
export function planCombatTask(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedTaskAction(value, request, domain)
}
export function planCombatSource(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedSourceReveal(value, request, domain)
}
export function planCombatTransfer(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedTaskTransfer(value, request, domain)
}
export function planCombatTerminal(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, domain } = stable(input, authority); return planSharedTerminal(value, request, domain)
}
