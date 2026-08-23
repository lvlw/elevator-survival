import { deepFreeze } from '../config'

export interface CombatPostPlayerActionBleedingEvaluation {
  readonly healthBefore: number
  readonly requestedLoss: number
  readonly actualLoss: number
  readonly healthAfter: number
}

/** Shared DEC-035 checkpoint used after a completed player action. */
export function evaluateCombatPostPlayerActionBleeding(
  healthBefore: number,
  bleeding: boolean,
  configuredDamage: number,
): CombatPostPlayerActionBleedingEvaluation {
  const requestedLoss = bleeding ? configuredDamage : 0
  const actualLoss = Math.min(healthBefore, requestedLoss)
  return deepFreeze({
    healthBefore,
    requestedLoss,
    actualLoss,
    healthAfter: healthBefore - actualLoss,
  })
}

/** Player completion wins an exact CTB tie, so only a strict earlier enemy acts. */
export function enemyActsBeforePlayerCompletion(
  enemyActionCtb: number,
  playerCompletionCtb: number,
): boolean {
  return enemyActionCtb < playerCompletionCtb
}
