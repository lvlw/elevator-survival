import { deepFreeze } from '../config'
import { CombatError } from './combat-errors'
import { hasExactObjectKeys } from './combat-validation'
import type {
  CombatDependencies,
  EnemyDefinition,
  EnemyPersistentCombatState,
  ExplorationCombatUsageSnapshot,
} from './combat-types'

const ENEMY_STATE_KEYS = [
  'currentHealth',
  'currentIntentActionId',
  'defeated',
  'definitionId',
  'enemyInstanceId',
  'hasBeenEncountered',
  'nextCycleIndex',
  'resolvedActionCount',
] as const

export function createEnemyPersistentCombatState(
  input: EnemyPersistentCombatState,
  definition: EnemyDefinition,
): EnemyPersistentCombatState {
  const initialCycleIndex = definition.actionCycle.indexOf(definition.initialIntentActionId)
  const resolvedActionCount = input?.resolvedActionCount
  const expectedCurrentCycleIndex = Number.isSafeInteger(resolvedActionCount) &&
    initialCycleIndex >= 0
    ? (initialCycleIndex + resolvedActionCount) % definition.actionCycle.length
    : -1
  const expectedCurrentIntentActionId = definition.actionCycle[expectedCurrentCycleIndex]
  const expectedNextCycleIndex = expectedCurrentCycleIndex >= 0
    ? (expectedCurrentCycleIndex + 1) % definition.actionCycle.length
    : -1

  if (
    !hasExactObjectKeys(input, ENEMY_STATE_KEYS) ||
    typeof input.enemyInstanceId !== 'string' || input.enemyInstanceId.trim().length === 0 ||
    input.definitionId !== definition.id ||
    !Number.isSafeInteger(input.currentHealth) || input.currentHealth < 0 ||
    input.currentHealth > definition.maxHealth ||
    !Number.isSafeInteger(input.resolvedActionCount) || input.resolvedActionCount < 0 ||
    input.currentIntentActionId !== expectedCurrentIntentActionId ||
    input.nextCycleIndex !== expectedNextCycleIndex ||
    typeof input.hasBeenEncountered !== 'boolean' ||
    typeof input.defeated !== 'boolean' ||
    input.defeated !== (input.currentHealth === 0) ||
    (input.defeated && !input.hasBeenEncountered) ||
    (!input.hasBeenEncountered && (
      input.currentHealth !== definition.maxHealth ||
      input.currentIntentActionId !== definition.initialIntentActionId ||
      input.resolvedActionCount !== 0 ||
      input.nextCycleIndex !== (initialCycleIndex + 1) % definition.actionCycle.length ||
      input.defeated
    ))
  ) {
    throw new CombatError('INVALID_ENEMY_STATE', '敌人持久战斗状态无效')
  }

  return deepFreeze({
    enemyInstanceId: input.enemyInstanceId,
    definitionId: input.definitionId,
    currentHealth: input.currentHealth,
    currentIntentActionId: input.currentIntentActionId,
    nextCycleIndex: input.nextCycleIndex,
    resolvedActionCount: input.resolvedActionCount,
    hasBeenEncountered: input.hasBeenEncountered,
    defeated: input.defeated,
  })
}

export function createExplorationCombatUsage(
  input: ExplorationCombatUsageSnapshot,
  config: CombatDependencies['config'],
): ExplorationCombatUsageSnapshot {
  if (
    !hasExactObjectKeys(input, ['metalPipeChargedStrikeUses']) ||
    !Number.isSafeInteger(input.metalPipeChargedStrikeUses) ||
    input.metalPipeChargedStrikeUses < 0 ||
    input.metalPipeChargedStrikeUses >
      config.combat.metalPipe.chargedStrike.maxUsesPerExploration
  ) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '探索战斗使用次数无效')
  }
  return deepFreeze({
    metalPipeChargedStrikeUses: input.metalPipeChargedStrikeUses,
  })
}
