import type { StableRunUiAction } from './stable-run-ui-actions'

export type ActionExecutionLevel = 'direct' | 'parameterized' | 'protective-confirmation'

function guaranteesDeath(action: StableRunUiAction): boolean {
  if (action.guaranteedDeath !== undefined) return action.guaranteedDeath
  return action.ghost !== undefined &&
    action.ghost.outcomes.length > 0 &&
    action.ghost.outcomes.every((outcome) => outcome === 'death')
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
      !guaranteesDeath(candidate),
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
