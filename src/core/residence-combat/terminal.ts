import { deepFreeze } from '../config'
import { createStreamId } from '../random'
import { parseResidence } from '../residence-config/validation'
import { same } from '../residence-terminal/validation'
import { ensure, validateSupplyFacts } from '../residence-supply/shared-validation'
import { settleSupplyDomain } from '../residence-terminal/supply-settlement-shared'
import { readAuthorizedCombat } from './authority'
import { issueCombatPlan } from './plans'
import { combatValueSchema } from './schema'
import { verifyCombatBodyTrace } from './trace'
import type { CombatAuthority, CombatDependencies, CombatValue, CombatBodyTrace } from './types'
export type CombatDeathProposal = Readonly<{ kind: 'combat-death-proposal'; battleId: string; revision: number; trace: readonly CombatBodyTrace[] }>
const issued = new WeakMap<object, { before: CombatValue; proposed: CombatValue; deps: CombatDependencies; consumed: boolean }>()
/** Internal producer capability; no installable HP0 snapshot is exposed. */
export function issueCombatDeath(before: CombatValue, input: CombatValue, deps: CombatDependencies): CombatDeathProposal {
  const proposed = validateSupplyFacts(parseResidence(combatValueSchema, input), deps.supply)
  const b = proposed.battle, prior = before.battle
  ensure(b && prior && same(b.entry, prior.entry) && proposed.character.revision === before.character.revision + 1 &&
    proposed.character.body.condition.currentHealth === 0 && b.decision?.battleId === prior.entry.id, 'Not a bound real combat death')
  verifyCombatBodyTrace(b.decision.trace, before.character.body.condition.currentHealth, 0,
    deps.supply.residence.configuration.config.limits.hp, true)
  const token = deepFreeze({ kind: 'combat-death-proposal' as const, battleId: b.entry.id,
    revision: proposed.character.revision, trace: b.decision.trace })
  issued.set(token, { before, proposed, deps, consumed: false }); return token
}
export function consumeCombatDeath(input: unknown, proposal: CombatDeathProposal, authority: CombatAuthority) {
  const { value, dependencies } = readAuthorizedCombat(input, authority), saved = proposal && issued.get(proposal)
  ensure(saved && !saved.consumed && saved.deps === dependencies && same(saved.before, value),
    'Unissued, wrong-base or already consumed death', 'UNISSUED_PLAN')
  const result = saved.proposed, b = result.battle!
  ensure(proposal.battleId === value.battle!.entry.id && proposal.revision === value.character.revision + 1 &&
    b.decision!.healthBefore === value.character.body.condition.currentHealth, 'Death scene/context differs')
  verifyCombatBodyTrace(b.decision!.trace, value.character.body.condition.currentHealth, 0,
    dependencies.supply.residence.configuration.config.limits.hp, true)
  const receipt = { id: createStreamId('residence-combat-death-v1', b.entry.id, String(result.character.revision)),
    entry: b.entry, decision: b.decision!, revision: result.character.revision }
  const closed = settleSupplyDomain(value, { ...result, battle: null, combatDeaths: [...result.combatDeaths, receipt] },
    'death', 'combat-death', [], dependencies.supply, receipt.id)
  const plan = issueCombatPlan(value, closed, dependencies, 'terminal')
  saved.consumed = true
  return plan
}
