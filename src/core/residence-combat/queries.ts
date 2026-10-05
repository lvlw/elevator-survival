import { deepFreeze } from '../config'
import { getAvailableCombatPlayerCommandsFromValidatedSnapshot } from '../combat/combat-selectors'
import { sharedTerminalEligibility } from '../residence-terminal/supply-settlement-shared'
import { readCombatValue } from './validation'
import { projectCombat } from './projection'
import type { CombatDependencies } from './types'
/** Explicit safe allow-list. Internal commands stay separate from eventual E03 ViewModels. */
export function queryResidenceCombat(input: unknown, deps: CombatDependencies) {
  const value = readCombatValue(input, deps)
  if (!value.battle) return null
  const { snapshot, engine } = projectCombat(value, deps)
  const intent = engine.enemyCatalog.get(snapshot.enemy.definitionId).actions.find(a => a.id === snapshot.enemy.currentIntentActionId)!
  return deepFreeze({ actions: getAvailableCombatPlayerCommandsFromValidatedSnapshot(snapshot, engine),
    intent: { ...intent.playerVisible }, health: snapshot.playerCondition.currentHealth,
    bleeding: snapshot.playerCondition.bleeding, chargedStrikesRemaining: value.character.body.quotasRemaining.pipe_signature })
}
export function queryCombatTerminalEligibility(input: unknown, deps: CombatDependencies) {
  const value = readCombatValue(input, deps)
  return value.battle ? deepFreeze({ deliver: false, withdraw: false, deadline: false }) : deepFreeze(sharedTerminalEligibility(value, deps.supply))
}
