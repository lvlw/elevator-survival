import { deepFreeze } from '../config'
import { getItemState } from '../item-state'
import { validateCombatDependencies } from './combat-dependencies'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
} from './combat-types'

export function getCombatResourceState(
  snapshot: CombatEncounterSnapshot,
  slot: 'weapon' | 'armor',
) {
  const item = snapshot.equipment[slot]
  return item ? getItemState(snapshot.itemStates, item.instanceId) : null
}

export function getAvailableCombatPlayerActionsFromValidatedSnapshot(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand['kind'][] {
  if (snapshot.status !== 'awaiting-player') return deepFreeze([])
  const weapon = snapshot.equipment.weapon
  const state = getCombatResourceState(snapshot, 'weapon')
  const usablePipe =
    weapon?.definitionId === dependencies.bindings.metalPipeDefinitionId &&
    state?.resource.kind === 'durability' &&
    state.resource.current >= 1
  const actions: CombatPlayerActionCommand['kind'][] = ['defend']
  if (usablePipe) {
    actions.push('metal-pipe-basic-attack')
    if (
      snapshot.usage.metalPipeChargedStrikeUses <
      dependencies.config.combat.metalPipe.chargedStrike.maxUsesPerExploration
    ) {
      actions.push('metal-pipe-charged-strike')
    }
  } else {
    actions.push('temporary-attack')
  }
  return deepFreeze(actions.sort())
}

export function getAvailableCombatPlayerActions(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand['kind'][] {
  validateCombatDependencies(dependencies)
  return getAvailableCombatPlayerActionsFromValidatedSnapshot(
    createCombatEncounterSnapshot(snapshot, dependencies),
    dependencies,
  )
}

export function selectEnemyHealthPhase(currentHealth: number, maxHealth: number) {
  if (currentHealth === 0) return 'incapacitated' as const
  const scaled = currentHealth * 14
  if (scaled >= maxHealth * 11) return 'healthy' as const
  if (scaled >= maxHealth * 7) return 'wounded' as const
  if (scaled >= maxHealth * 3) return 'severely-wounded' as const
  if (scaled >= maxHealth) return 'critical' as const
  return 'incapacitated' as const
}
