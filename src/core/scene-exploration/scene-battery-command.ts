import { deepFreeze } from '../config'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { buildSceneBatteryTransitionPlan } from './scene-battery-transition-plan'
import type { SceneBatteryCommandDependencies, SceneBatteryEvaluation, SceneBatteryPreview, SceneBatteryResolution, SceneBatteryTransitionPlan, SceneExplorationSnapshot, UseSceneBatteryCommand } from './scene-exploration-types'

function materialize(snapshot: SceneExplorationSnapshot, plan: SceneBatteryTransitionPlan, dependencies: SceneBatteryCommandDependencies): SceneBatteryEvaluation {
  return deepFreeze({ ...plan.metadata, effects: plan.effects, snapshot: applySceneExplorationEffects(snapshot, plan.effects, dependencies) })
}

export function previewSceneBatteryCommand(snapshot: SceneExplorationSnapshot, command: unknown, dependencies: SceneBatteryCommandDependencies): SceneBatteryPreview {
  try {
    const initial = createSceneExplorationSnapshot(snapshot, dependencies)
    const plan = buildSceneBatteryTransitionPlan(initial, command, dependencies)
    return deepFreeze({ canExecute: true, result: materialize(initial, plan, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) return deepFreeze({ canExecute: false, rejectionCode: error.code })
    throw error
  }
}

export function resolveSceneBatteryCommand(snapshot: SceneExplorationSnapshot, command: unknown, dependencies: SceneBatteryCommandDependencies): SceneBatteryResolution {
  const initial = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = buildSceneBatteryTransitionPlan(initial, command, dependencies)
  const result = materialize(initial, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
