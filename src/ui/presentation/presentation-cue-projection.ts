import type { StableRunApplicationCommand, StableRunApplicationExecution } from '../../state/run-application'
import type { StableRunPhase } from '../../state/run-save'
import type { StableRunUiAction } from '../interaction/stable-run-ui-actions'
import type { PresentationAudioCue } from './presentation-audio'
import type { StableRunUiPresentationAssets } from './presentation-assets'

export interface StableRunPresentationCueProjectionInput {
  readonly beforePhase: StableRunPhase
  readonly action: StableRunUiAction
  readonly execution: StableRunApplicationExecution
  readonly assets?: StableRunUiPresentationAssets
}

function sceneOf(phase: StableRunPhase) {
  return phase.kind === 'scene-session' ? phase.payload.scene : null
}

function publicSearchKind(scene: ReturnType<typeof sceneOf>, nodeId: string): string | null {
  const state = scene?.searchState.nodeStates.find((candidate) => candidate.nodeId === nodeId)
  return state?.kind ?? null
}

function sceneCommand(action: StableRunUiAction): StableRunApplicationCommand['command'] | null {
  return action.command.kind === 'scene' ? action.command.command : null
}

function coreSceneCommand(command: StableRunApplicationCommand['command']): unknown {
  return 'command' in command ? command.command : command
}

type PublicCombatCondition = NonNullable<ReturnType<typeof sceneOf>>['condition']

export function didPlayerSustainVisibleCombatHurt(
  before: PublicCombatCondition,
  after: PublicCombatCondition,
): boolean {
  if (after.currentHealth < before.currentHealth) return true
  const previousWounds = new Set(before.openWounds.map(({ id }) => id))
  return after.openWounds.some(({ id }) => !previousWounds.has(id))
}

/** Purely projects committed facts into presentation cues; it never mutates or dispatches. */
export function projectStableRunPresentationCues(
  input: StableRunPresentationCueProjectionInput,
): readonly PresentationAudioCue[] {
  const afterScene = sceneOf(input.execution.phase)
  const beforeScene = sceneOf(input.beforePhase)
  if (!afterScene || !beforeScene || input.execution.kind === undefined) return Object.freeze([])
  const command = sceneCommand(input.action)
  if (!command) return Object.freeze([])
  const coreCommand = coreSceneCommand(command)
  const cues: PresentationAudioCue[] = []
  if (input.action.kind === 'scene-move' && beforeScene.currentNodeId !== afterScene.currentNodeId) {
    cues.push('scene-move')
  }
  if (
    input.action.kind === 'scene-main-search' &&
    publicSearchKind(beforeScene, beforeScene.currentNodeId) !== 'searched' &&
    publicSearchKind(afterScene, afterScene.currentNodeId) === 'searched'
  ) cues.push('scene-search-complete')
  if (
    input.action.kind === 'scene-obstacle' &&
    typeof coreCommand === 'object' && coreCommand !== null &&
    'obstacleId' in coreCommand &&
    'optionId' in coreCommand &&
    input.assets?.isAccessCardObstacleOption?.(String(coreCommand.obstacleId), String(coreCommand.optionId))
  ) cues.push('scene-door-card')
  if (
    input.action.kind === 'scene-combat-action' &&
    typeof coreCommand === 'object' && coreCommand !== null &&
    'kind' in coreCommand &&
    String(coreCommand.kind) === 'metal-pipe-basic-attack'
  ) cues.push('combat-player-basic')
  if (input.action.kind === 'scene-combat-action') {
    if (didPlayerSustainVisibleCombatHurt(beforeScene.condition, afterScene.condition)) {
      cues.push('combat-player-hurt')
    }
  }
  return Object.freeze(cues)
}
