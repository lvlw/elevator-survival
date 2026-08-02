import { deepFreeze } from '../config'
import { CombatError } from './combat-errors'
import { applyCombatEffects } from './combat-effect-application'
import { validateCombatDependencies } from './combat-dependencies'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import { buildCombatTransitionPlan } from './combat-transition-plan'
import { createCombatPlayerActionCommand } from './combat-validation'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  CombatPreview,
  CombatResolution,
} from './combat-types'

export { reduceRiskTier, riskTierToPercent } from './combat-risk'
export { selectEnemyHealthPhase } from './combat-selectors'

export function resolveCombatPlayerAction(
  snapshot: CombatEncounterSnapshot,
  commandInput: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatResolution {
  validateCombatDependencies(dependencies)
  const command = createCombatPlayerActionCommand(commandInput)
  const initial = createCombatEncounterSnapshot(snapshot, dependencies)
  const plan = buildCombatTransitionPlan(initial, command, dependencies)
  return deepFreeze({
    plan,
    snapshot: applyCombatEffects(
      initial,
      command,
      plan.effects,
      dependencies,
    ),
  })
}

export function previewCombatPlayerAction(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatPreview {
  try {
    const result = resolveCombatPlayerAction(snapshot, command, dependencies)
    return deepFreeze({ canExecute: true, ...result })
  } catch (error) {
    if (error instanceof CombatError) {
      return deepFreeze({ canExecute: false, errorCode: error.code })
    }
    throw error
  }
}
