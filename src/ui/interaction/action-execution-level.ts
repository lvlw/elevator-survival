import type { StableRunUiAction } from './stable-run-ui-actions'

export type ActionExecutionLevel = 'direct' | 'parameterized' | 'protective-confirmation'

function deathCertainty(action: StableRunUiAction): NonNullable<StableRunUiAction['deathCertainty']> {
  return action.deathCertainty ?? 'unknown'
}

function guaranteesDeath(action: StableRunUiAction): boolean {
  return deathCertainty(action) === 'guaranteed'
}

/** Presentation policy only: it never decides an action's formal eligibility. */
export function actionExecutionLevel(
  action: StableRunUiAction,
  availableActions: readonly StableRunUiAction[],
): ActionExecutionLevel {
  if (action.kind === 'scene-withdraw' || action.kind === 'end-day') {
    return 'protective-confirmation'
  }
  if (guaranteesDeath(action)) {
    const hasRescueAlternative = availableActions.some((candidate) =>
      candidate.id !== action.id &&
      candidate.kind !== 'settle-terminal-scene' &&
      deathCertainty(candidate) === 'not-guaranteed',
    )
    if (hasRescueAlternative) return 'protective-confirmation'
  }
  if (
    action.kind === 'scene-obstacle' ||
    action.kind === 'scene-medical' ||
    action.kind === 'scene-battery' ||
    action.kind === 'hub-medical' ||
    action.kind === 'hub-survival' ||
    action.kind === 'scene-task-event' ||
    (action.kind === 'scene-combat-action' && action.command.kind === 'scene' && action.command.command.kind === 'scene-combat-action' && action.command.command.command.kind === 'use-quick-slot-item')
  ) return 'parameterized'
  return 'direct'
}
