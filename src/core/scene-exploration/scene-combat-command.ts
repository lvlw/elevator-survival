import { deepFreeze } from '../config'
import type { CombatPlayerActionCommand } from '../combat'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { buildSceneCombatPlayerActionEffects } from './scene-combat-transition-plan'
import type {
  SceneCombatPlayerActionEvaluation,
  SceneCombatPlayerActionPreview,
  SceneCombatPlayerActionResolution,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

function evaluate(
  snapshot: SceneExplorationSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: SceneExplorationDependencies,
): SceneCombatPlayerActionEvaluation {
  const effects = buildSceneCombatPlayerActionEffects(snapshot, command, dependencies)
  const next = applySceneExplorationEffects(snapshot, effects, dependencies)
  const advanced = effects[0]
  if (advanced.kind !== 'scene-combat-advanced') {
    throw new SceneExplorationError('INVALID_COMBAT_STATE', '战斗计划缺少推进Effect')
  }
  return deepFreeze({
    encounterId: advanced.encounterId,
    command: advanced.command,
    combatPlan: advanced.combatPlan,
    effects,
    snapshot: next,
  })
}

export function previewSceneCombatPlayerAction(
  snapshotInput: SceneExplorationSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: SceneExplorationDependencies,
): SceneCombatPlayerActionPreview {
  try {
    const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
    return deepFreeze({ canExecute: true, result: evaluate(snapshot, command, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    return deepFreeze({ canExecute: false, rejectionCode: 'INVALID_COMBAT_STATE' })
  }
}

export function resolveSceneCombatPlayerAction(
  snapshotInput: SceneExplorationSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: SceneExplorationDependencies,
): SceneCombatPlayerActionResolution {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const result = evaluate(snapshot, command, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}
