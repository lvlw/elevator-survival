import { deepFreeze } from '../config'
import { ConditionError } from './condition-errors'
import { cloneCondition, createPlayerCondition } from './player-condition'
import type {
  HealthLossResult,
  HealthRestoreResult,
  PlayerConditionSnapshot,
  PlayerHealthRules,
} from './condition-types'

function assertPositiveAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ConditionError('INVALID_AMOUNT', '生命变化量必须是正安全整数')
  }
}

export function applyHealthLoss(
  state: PlayerConditionSnapshot,
  requestedAmount: number,
  rules: PlayerHealthRules,
): Readonly<HealthLossResult> {
  assertPositiveAmount(requestedAmount)
  const validated = createPlayerCondition(state, rules)
  const actualLoss = Math.min(validated.currentHealth, requestedAmount)
  const healthAfter = validated.currentHealth - actualLoss
  return deepFreeze({
    state: cloneCondition(validated, { currentHealth: healthAfter }),
    requestedLoss: requestedAmount,
    actualLoss,
    healthBefore: validated.currentHealth,
    healthAfter,
    depleted: healthAfter === 0,
  })
}

export function restoreHealth(
  state: PlayerConditionSnapshot,
  requestedAmount: number,
  rules: PlayerHealthRules,
): Readonly<HealthRestoreResult> {
  assertPositiveAmount(requestedAmount)
  const validated = createPlayerCondition(state, rules)
  const actualRecovery = Math.min(
    requestedAmount,
    rules.maxHealth - validated.currentHealth,
  )
  const healthAfter = validated.currentHealth + actualRecovery
  return deepFreeze({
    state: cloneCondition(validated, { currentHealth: healthAfter }),
    requestedRecovery: requestedAmount,
    actualRecovery,
    unusedRecovery: requestedAmount - actualRecovery,
    healthBefore: validated.currentHealth,
    healthAfter,
    atMaximum: healthAfter === rules.maxHealth,
  })
}
