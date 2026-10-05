import { parseResidence } from '../residence-config/validation'
import { validateSupplyFacts, ensure } from '../residence-supply/shared-validation'
import { same } from '../residence-terminal/validation'
import { combatValueSchema } from './schema'
import { requireCombatDependencies } from './dependencies'
import { verifyCombatHistory } from './history'
import { projectCombat } from './projection'
import type { CombatDependencies, CombatValue } from './types'
/** Strict pure aggregate validation only. No codec, authorization, installation or IO. */
export function readCombatValue(input: unknown, deps: CombatDependencies): CombatValue {
  requireCombatDependencies(deps)
  const parsed = parseResidence(combatValueSchema, input)
  const value = validateSupplyFacts(parsed, deps.supply)
  ensure(value.phase !== 'active-world' || value.character.body.condition.currentHealth > 0,
    'HP0 active proposal is not a stable value')
  if (value.battle) {
    const b = value.battle, site = value.site
    ensure(value.phase === 'active-world' && site && site.pending.kind === 'combat-required' &&
      site.pending.enemyId === b.entry.enemyId && site.nodeId === b.entry.to &&
      same(site.binding, b.entry.binding) && b.currentCtb === b.playerNext && b.playerNext <= b.enemyNext &&
      b.temporaryDefense === null, 'Battle/site/queue disagreement')
    const enemy = site.enemies.find(e => e.id === b.entry.enemyId)!
    const d = b.decision, p = deps.profiles.find(p => p.definitionId === b.entry.definitionId)!
    ensure(enemy.state.enemyInstanceId === b.entry.enemyInstanceId && enemy.state.hasBeenEncountered && !enemy.state.defeated,
      'Battle enemy reference differs')
    if (d) ensure(d.revision === value.character.revision && d.ctbAfter === b.currentCtb &&
      d.playerNext === b.playerNext && d.enemyNext === b.enemyNext &&
      d.enemyHealthAfter === enemy.state.currentHealth && d.actionCountAfter === enemy.state.resolvedActionCount &&
      d.riskAfter === enemy.riskDrawIndex && d.healthAfter === value.character.body.condition.currentHealth &&
      d.quotaAfter === value.character.body.quotasRemaining.pipe_signature, 'Latest decision differs from unique state')
    else ensure(value.character.revision === b.entry.revision && b.currentCtb === 0 &&
      b.enemyNext === (b.entry.previouslyEncountered ? p.reentryEnemyCtb : p.firstEnemyCtb) &&
      b.playerNext === (b.entry.previouslyEncountered ? p.reentryPlayerCtb : 0) &&
      enemy.state.currentHealth === b.entry.enemyHealth && enemy.state.currentIntentActionId === b.entry.intent &&
      enemy.state.resolvedActionCount === b.entry.actionCount && enemy.riskDrawIndex === b.entry.riskIndex &&
      b.entry.healthAfter === value.character.body.condition.currentHealth,
      'Initial encounter state differs')
    projectCombat(value, deps)
  } else ensure(value.site?.pending.kind !== 'combat-required', 'Live encounter discarded')
  verifyCombatHistory(value, deps)
  return value
}
