import { deepFreeze } from '../config'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { buildSceneMoveTransitionPlan } from './scene-move-transition-plan'
import type {
  MoveThroughSceneEdgeCommand,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneMoveEvaluation,
  SceneMovePreview,
  SceneMoveResolution,
  SceneMoveTransitionPlan,
} from './scene-exploration-types'

function materializeEvaluation(
  initialSnapshot: SceneExplorationSnapshot,
  plan: SceneMoveTransitionPlan,
  dependencies: SceneExplorationDependencies,
): SceneMoveEvaluation {
  const snapshot = applySceneExplorationEffects(
    initialSnapshot,
    plan.effects,
    dependencies,
  )
  return deepFreeze({
    ...plan.metadata,
    effects: plan.effects,
    snapshot,
  })
}

export function previewSceneMoveCommand(
  snapshot: SceneExplorationSnapshot,
  command: MoveThroughSceneEdgeCommand,
  dependencies: SceneExplorationDependencies,
): SceneMovePreview {
  try {
    const initialSnapshot = createSceneExplorationSnapshot(snapshot, dependencies)
    const plan = buildSceneMoveTransitionPlan(initialSnapshot, command, dependencies)
    return deepFreeze({
      canExecute: true,
      result: materializeEvaluation(initialSnapshot, plan, dependencies),
    })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}

export function resolveSceneMoveCommand(
  snapshot: SceneExplorationSnapshot,
  command: MoveThroughSceneEdgeCommand,
  dependencies: SceneExplorationDependencies,
): SceneMoveResolution {
  const initialSnapshot = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = buildSceneMoveTransitionPlan(initialSnapshot, command, dependencies)
  const result = materializeEvaluation(initialSnapshot, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
