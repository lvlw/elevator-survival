import { deepFreeze } from '../config'
import { same } from '../residence-terminal/validation'
import type { BodyStep } from '../character-cycle'
import { readAuthorizedSupply } from './authority'
import { ensure, readSupplyValue } from './validation'
import type { SupplyAuthority, SupplyDependencies, SupplyPlan, SupplyValue } from './types'
import type { SupplyDomainContext } from './shared-types'

export function legacySupplyDomainContext(deps: SupplyDependencies, issue: typeof issueSupplyPlan): SupplyDomainContext<SupplyValue, SupplyPlan> {
  return { dependencies: deps, read: input => readSupplyValue(input, deps),
    issue: (before, after, producer, steps, cost) => issue(before, after, deps, producer, steps, cost) }
}

const issued = new WeakMap<object, { base: SupplyValue; dependencies: SupplyDependencies }>()
export function issueSupplyPlan(before: SupplyValue, proposed: SupplyValue, deps: SupplyDependencies,
  producer: SupplyPlan['producer'], steps: readonly BodyStep[], energyCost = 0): SupplyPlan {
  const snapshot = readSupplyValue(proposed, deps)
  ensure(snapshot.character.revision === before.character.revision + 1, 'Expected exactly one revision')
  const death = snapshot.character.body.condition.currentHealth === 0
  const plan: SupplyPlan = deepFreeze({ kind: 'residence-supply-plan', snapshot, producer, steps, energyCost,
    base: { revision: before.character.revision, configurationId: before.configurationId, contentId: before.contentId },
    outcome: death ? 'death' : 'alive', deathCause: death ? steps.at(-1)?.kind ?? null : null })
  issued.set(plan, { base: before, dependencies: deps })
  return plan
}
export function assertSupplyPlanCurrent(input: unknown, plan: SupplyPlan, authority: SupplyAuthority): void {
  const ctx = readAuthorizedSupply(input, authority), saved = plan && issued.get(plan)
  ensure(saved && saved.dependencies === ctx.dependencies && same(saved.base, ctx.value), 'Unissued or stale plan', 'UNISSUED_PLAN')
}
/** Internal narrow consumer: preserves producer body/trace without rerunning it. */
export function supplyPlanBase(plan: SupplyPlan) {
  const saved = plan && issued.get(plan)
  ensure(saved, 'Unissued producer result', 'UNISSUED_PLAN')
  return saved
}
