import { deepFreeze } from '../config'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { classifyLoad } from '../load'
import { resolveTimedSceneAction } from '../scene'
import { SceneGraphError } from '../scene-graph'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { createWithdrawFromSceneCommand } from './scene-withdrawal-command'
import { findPlayerKnownReturnRoute } from './scene-navigation-return'
import type {
  SceneExplorationDependencies,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneWithdrawalTransitionPlan,
  WithdrawFromSceneCommand,
} from './scene-exploration-types'

function graphFailure(error: unknown): never {
  if (!(error instanceof SceneGraphError)) throw error
  if (error.code === 'NO_RETURN_ROUTE') {
    throw new SceneExplorationError('ACTION_NOT_AVAILABLE', error.message)
  }
  throw new SceneExplorationError('INVALID_INPUT', error.message)
}

function terminalStatus(outcome: import('../scene').TimedSceneActionOutcome):
  'safe-returned' | 'forced-returned' | 'dead' {
  if (outcome.kind === 'death') return 'dead'
  if (outcome.kind === 'forced-return') return 'forced-returned'
  if (outcome.kind === 'safe-return') return 'safe-returned'
  throw new SceneExplorationError(
    'EFFECT_WITHDRAWAL_MISMATCH',
    '正时间主动撤离必须产生终局场景结果',
  )
}

export function buildSceneWithdrawalTransitionPlan(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: WithdrawFromSceneCommand,
  dependencies: SceneExplorationDependencies,
): SceneWithdrawalTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const command = createWithdrawFromSceneCommand(commandInput)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_WITHDRAWAL_NOT_AVAILABLE', '只有非战斗active场景可以主动撤离')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能主动撤离')
  }

  const backpackWeight = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  if (!classifyLoad(backpackWeight, dependencies.config.backpack).canCarry) {
    throw new SceneExplorationError('CANNOT_CARRY', '无法携带状态不能主动撤离')
  }
  let returnRoute
  try {
    returnRoute = findPlayerKnownReturnRoute(snapshot, dependencies)
  } catch (error) {
    graphFailure(error)
  }

  const sceneOutcome = returnRoute.estimatedReturnTime === 0
    ? null
    : resolveTimedSceneAction(
      { remainingTime: snapshot.remainingTime },
      {
        currentHealth: snapshot.condition.currentHealth,
        maxHealth: dependencies.config.combat.player.maxHealth,
        bleeding: snapshot.condition.bleeding,
      },
      {
        timeCost: returnRoute.estimatedReturnTime,
        healthAfterPrimaryEffect: snapshot.condition.currentHealth,
        bleedingAfterPrimaryEffect: snapshot.condition.bleeding,
        estimatedReturnTimeAfterAction: 0,
        endsExplorationAtSafety: true,
        isAtSafetyAfterAction: true,
      },
      {
        postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage,
        forcedReturn: dependencies.config.forcedReturn,
      },
    )
  const status: SceneExplorationStatus = sceneOutcome
    ? terminalStatus(sceneOutcome)
    : 'safe-returned'
  const effect: SceneExplorationEffect = {
    kind: 'scene-active-withdrawal-resolved',
    command,
    fromNodeId: snapshot.currentNodeId,
    safetyNodeId: returnRoute.safetyNodeId,
    routeNodeIds: [...returnRoute.nodeIds],
    routeEdgeIds: [...returnRoute.edgeIds],
    estimatedReturnTime: returnRoute.estimatedReturnTime,
    remainingTimeBefore: snapshot.remainingTime,
    remainingTimeAfter: sceneOutcome?.clock.remainingTime ?? snapshot.remainingTime,
    overtimeDebt: sceneOutcome?.overtimeDebt ?? 0,
    postActionBleedingDamage: sceneOutcome?.postActionBleedingDamage ?? 0,
    forcedReturnBaseDamage: sceneOutcome?.forcedReturnBaseDamage ?? 0,
    forcedReturnBleedingDamage: sceneOutcome?.forcedReturnBleedingDamage ?? 0,
    forcedReturnTotalDamage: sceneOutcome?.forcedReturnTotalDamage ?? 0,
    healthBefore: snapshot.condition.currentHealth,
    healthAfter: sceneOutcome?.vitals.currentHealth ?? snapshot.condition.currentHealth,
    statusBefore: 'active',
    statusAfter: status as 'safe-returned' | 'forced-returned' | 'dead',
  }
  return deepFreeze({
    command,
    metadata: { returnRoute, sceneOutcome },
    effects: [effect],
  })
}
