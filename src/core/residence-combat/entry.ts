import { z } from 'zod'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { ensure } from '../residence-supply/shared-validation'
import { planSharedMove } from '../residence-supply/shared-actions'
import { readAuthorizedCombat } from './authority'
import { captureCombatEntry } from './entry-witness'
import { combatDomainContext } from './stable'
import type { CombatAuthority, CombatValue } from './types'
export function planCombatMove(input: unknown, request: unknown, authority: CombatAuthority) {
  const command = parseResidence(z.strictObject({ kind: z.literal('move'), edgeId: idSchema, expectedRevision: countSchema }), request)
  const { value, dependencies } = readAuthorizedCombat(input, authority)
  ensure(!value.battle, 'Cannot leave unresolved battle', 'NOT_AVAILABLE')
  const context = combatDomainContext(dependencies)
  return planSharedMove(value, command, { ...context, issue: (before, proposed, producer, steps, cost) => {
    // G2 has already marked arrival. First/reentry is captured from the independent original before.
    const entry = captureCombatEntry(before, proposed, command.edgeId, steps, dependencies)
    let next: CombatValue = proposed
    if (entry && proposed.character.body.condition.currentHealth > 0) {
      const p = dependencies.profiles.find(p => p.definitionId === entry.definitionId)!
      next = { ...proposed, battle: { entry, currentCtb: 0,
        playerNext: entry.previouslyEncountered ? p.reentryPlayerCtb : 0,
        enemyNext: entry.previouslyEncountered ? p.reentryEnemyCtb : p.firstEnemyCtb,
        temporaryDefense: null, decision: null } }
    }
    return context.issue(before, next, producer, steps, cost)
  } })
}
