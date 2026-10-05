import { CombatError } from './combat-errors'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import { buildCombatTransitionPlan } from './combat-transition-plan'
import { createCombatPlayerActionCommand } from './combat-validation'
import { validateCombatDependencies } from './combat-dependencies'
import { reduceCombatEffects } from './combat-effect-reducer'
import type { CombatDependencies, CombatEffect, CombatEncounterSnapshot, CombatPlayerActionCommand } from './combat-types'

/** Legacy uploaded effects still require an exact independently rebuilt formal plan. */
export function applyCombatEffects(initial: CombatEncounterSnapshot, commandInput: CombatPlayerActionCommand,
  effects: readonly CombatEffect[], dependencies: CombatDependencies): CombatEncounterSnapshot {
  validateCombatDependencies(dependencies)
  const command = createCombatPlayerActionCommand(commandInput)
  const start = createCombatEncounterSnapshot(initial, dependencies)
  const expected = buildCombatTransitionPlan(start, command, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) {
    throw new CombatError('INVALID_COMBAT_EFFECTS', 'Combat Effects与唯一正式计划不一致')
  }
  return reduceCombatEffects(start, effects, dependencies)
}
