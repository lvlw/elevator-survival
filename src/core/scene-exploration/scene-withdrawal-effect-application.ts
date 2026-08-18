import { applyHealthLoss } from '../condition'
import { deepFreeze } from '../config'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { SceneExplorationError } from './scene-exploration-errors'
import { buildSceneWithdrawalTransitionPlan } from './scene-withdrawal-transition-plan'
import { createWithdrawFromSceneCommand } from './scene-withdrawal-command'
import type {
  SceneExplorationDependencies,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** Applies the single audited withdrawal effect through the shared Scene gateway. */
export function applySceneWithdrawalEffects(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  const initial = createSceneExplorationSnapshot(initialSnapshot, dependencies)
  const effect = effects[0]
  if (
    !effect || effect.kind !== 'scene-active-withdrawal-resolved' ||
    effects.length !== 1
  ) {
    throw new SceneExplorationError('EFFECT_WITHDRAWAL_MISMATCH', '主动撤离Effect必须是唯一完整步骤')
  }
  const command = createWithdrawFromSceneCommand(effect.command)
  const expected = buildSceneWithdrawalTransitionPlan(initial, command, dependencies)
  if (!same(effects, expected.effects)) {
    throw new SceneExplorationError('EFFECT_WITHDRAWAL_MISMATCH', '主动撤离Effect与冻结正式计划不一致')
  }
  const resolved = expected.effects[0] as Extract<SceneExplorationEffect, { kind: 'scene-active-withdrawal-resolved' }>
  const totalHealthLoss =
    resolved.postActionBleedingDamage + resolved.forcedReturnTotalDamage
  const condition = totalHealthLoss === 0
    ? initial.condition
    : applyHealthLoss(
      initial.condition,
      totalHealthLoss,
      dependencies.config.combat.player,
    ).state
  if (condition.currentHealth !== resolved.healthAfter) {
    throw new SceneExplorationError('EFFECT_WITHDRAWAL_MISMATCH', '主动撤离生命结果与正式规则不一致')
  }
  return createSceneExplorationSnapshot({
    ...initial,
    currentNodeId: resolved.safetyNodeId,
    remainingTime: resolved.remainingTimeAfter,
    condition,
    status: resolved.statusAfter,
  }, dependencies)
}
