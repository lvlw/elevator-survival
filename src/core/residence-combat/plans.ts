import { deepFreeze } from '../config'
import { same } from '../residence-terminal/validation'
import { ensure } from '../residence-supply/shared-validation'
import { readAuthorizedCombat } from './authority'
import { readCombatValue } from './validation'
import type { BodyStep } from '../character-cycle'
import type { CombatDependencies, CombatValue, CombatPlan, CombatAuthority } from './types'
const issued = new WeakMap<object, { before: CombatValue; dependencies: CombatDependencies }>()
export function issueCombatPlan(before: CombatValue, proposed: CombatValue, deps: CombatDependencies,
  producer: CombatPlan['producer'], steps: readonly BodyStep[] = [], energyCost = 0): CombatPlan {
  const snapshot = readCombatValue(proposed, deps)
  ensure(snapshot.character.revision === before.character.revision + 1, 'Expected exactly one outer revision')
  const plan = deepFreeze({ kind: 'residence-combat-plan' as const, snapshot, baseRevision: before.character.revision,
    producer, steps, energyCost, outcome: snapshot.phase === 'dead' ? 'death' as const : 'alive' as const })
  issued.set(plan, { before, dependencies: deps }); return plan
}
export function assertCombatPlanCurrent(input: unknown, plan: CombatPlan, authority: CombatAuthority) {
  const ctx = readAuthorizedCombat(input, authority), saved = plan && issued.get(plan)
  ensure(saved && saved.dependencies === ctx.dependencies && same(saved.before, ctx.value), 'Unissued/stale combat plan', 'UNISSUED_PLAN')
}
