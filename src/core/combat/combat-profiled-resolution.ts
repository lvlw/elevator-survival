import { deepFreeze } from '../config'
import { createCombatPlayerActionCommand } from './combat-validation'
import { createCombatEngineSnapshot } from './combat-snapshot'
import { buildCombatTransitionPlan } from './combat-transition-plan'
import { reduceCombatEffects } from './combat-effect-reducer'
import { requireProfiledCombatDependencies } from './combat-profile-validation'
import { parseResidence } from '../residence-config/validation'
import { z } from 'zod'
import type { ProfiledCombatDependencies } from './combat-profile'
import type { CombatEncounterSnapshot, CombatResolution } from './combat-types'

/** One evaluation. Effects are local to this call, never supplied by the caller. */
export function resolveProfiledCombatAction(input: CombatEncounterSnapshot, request: unknown,
  dependencies: ProfiledCombatDependencies): CombatResolution {
  requireProfiledCombatDependencies(dependencies)
  parseResidence(z.unknown(), input)
  parseResidence(z.unknown(), request)
  const command = createCombatPlayerActionCommand(request)
  const initial = createCombatEngineSnapshot(input, dependencies)
  const plan = buildCombatTransitionPlan(initial, command, dependencies)
  return deepFreeze({ plan, snapshot: reduceCombatEffects(initial, plan.effects, dependencies) })
}
