import { deepFreeze } from '../config'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { buildSceneMedicalTransitionPlan } from './scene-medical-transition-plan'
import type {
  SceneExplorationSnapshot,
  SceneMedicalCommandDependencies,
  SceneMedicalEvaluation,
  SceneMedicalPreview,
  SceneMedicalResolution,
  SceneMedicalTransitionPlan,
  UseSceneMedicalItemCommand,
} from './scene-exploration-types'

function materializeEvaluation(
  initialSnapshot: SceneExplorationSnapshot,
  plan: SceneMedicalTransitionPlan,
  dependencies: SceneMedicalCommandDependencies,
): SceneMedicalEvaluation {
  const snapshot = applySceneExplorationEffects(
    initialSnapshot,
    plan.effects,
    dependencies,
  )
  return deepFreeze({ ...plan.metadata, effects: plan.effects, snapshot })
}

export function previewSceneMedicalCommand(
  snapshot: SceneExplorationSnapshot,
  command: unknown,
  dependencies: SceneMedicalCommandDependencies,
): SceneMedicalPreview {
  try {
    const initialSnapshot = createSceneExplorationSnapshot(snapshot, dependencies)
    const plan = buildSceneMedicalTransitionPlan(initialSnapshot, command, dependencies)
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

export function resolveSceneMedicalCommand(
  snapshot: SceneExplorationSnapshot,
  command: unknown,
  dependencies: SceneMedicalCommandDependencies,
): SceneMedicalResolution {
  const initialSnapshot = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = buildSceneMedicalTransitionPlan(initialSnapshot, command, dependencies)
  const result = materializeEvaluation(initialSnapshot, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
