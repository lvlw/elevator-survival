import { deepFreeze } from '../config'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { buildSceneWithdrawalTransitionPlan } from './scene-withdrawal-transition-plan'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneWithdrawalEvaluation,
  SceneWithdrawalPreview,
  SceneWithdrawalResolution,
  SceneWithdrawalTransitionPlan,
  WithdrawFromSceneCommand,
} from './scene-exploration-types'

function materialize(
  snapshot: SceneExplorationSnapshot,
  plan: SceneWithdrawalTransitionPlan,
  dependencies: SceneExplorationDependencies,
): SceneWithdrawalEvaluation {
  return deepFreeze({
    ...plan.metadata,
    effects: plan.effects,
    snapshot: applySceneExplorationEffects(snapshot, plan.effects, dependencies),
  })
}

export function previewSceneWithdrawalCommand(
  snapshot: SceneExplorationSnapshot,
  command: WithdrawFromSceneCommand,
  dependencies: SceneExplorationDependencies,
): SceneWithdrawalPreview {
  try {
    const initial = createSceneExplorationSnapshot(snapshot, dependencies)
    const plan = buildSceneWithdrawalTransitionPlan(initial, command, dependencies)
    return deepFreeze({ canExecute: true, result: materialize(initial, plan, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}

export function resolveSceneWithdrawalCommand(
  snapshot: SceneExplorationSnapshot,
  command: WithdrawFromSceneCommand,
  dependencies: SceneExplorationDependencies,
): SceneWithdrawalResolution {
  const initial = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = buildSceneWithdrawalTransitionPlan(initial, command, dependencies)
  const result = materialize(initial, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
