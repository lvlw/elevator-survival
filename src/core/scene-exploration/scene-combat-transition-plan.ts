import {
  evaluateCombatSceneTime,
  resolveCombatPlayerAction,
} from '../combat'
import { deepFreeze } from '../config'
import { calculateForcedReturnDamage } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { findPlayerKnownReturnRoute } from './scene-navigation-return'
import type {
  SceneExplorationDependencies,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

function addHealthLoss(
  effects: SceneExplorationEffect[],
  source: 'forced-return-base' | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  const actualLoss = Math.min(healthBefore, requestedLoss)
  if (actualLoss > 0) {
    effects.push({
      kind: 'health-lost',
      source,
      requestedLoss,
      actualLoss,
      healthBefore,
      healthAfter: healthBefore - actualLoss,
    })
  }
  return healthBefore - actualLoss
}

export function buildSceneCombatPlayerActionEffects(
  snapshotInput: SceneExplorationSnapshot,
  command: unknown,
  dependencies: SceneExplorationDependencies,
): readonly SceneExplorationEffect[] {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  if (snapshot.status !== 'combat' || !dependencies.sceneCombat) {
    throw new SceneExplorationError('SCENE_NOT_IN_COMBAT', '场景当前不在战斗中')
  }
  const active = snapshot.combatState.encounters.find(({ kind }) => kind === 'active')
  if (!active || active.kind !== 'active') {
    throw new SceneExplorationError('INVALID_COMBAT_STATE', '场景缺少唯一活跃遭遇')
  }
  const resolution = resolveCombatPlayerAction(
    active.combat,
    command,
    dependencies.sceneCombat.combat,
  )
  const effects: SceneExplorationEffect[] = [{
    kind: 'scene-combat-advanced',
    encounterId: active.encounterId,
    command: resolution.plan.command,
    combatPlan: resolution.plan,
  }]
  const terminal = resolution.snapshot
  if (terminal.status === 'awaiting-player') return deepFreeze(effects)

  const outcome = terminal.status
  const rules = dependencies.config.combat.sceneTimeConversion
  const time = evaluateCombatSceneTime(
    terminal.currentCtb,
    snapshot.remainingTime,
    rules,
  )
  const { sceneTimeCost, remainingTimeAfter, overtimeDebt } = time
  effects.push({
    kind: 'scene-combat-time-resolved',
    encounterId: active.encounterId,
    combatOutcome: outcome,
    elapsedCtb: terminal.currentCtb,
    minimumSceneTime: rules.minimumSceneTime,
    ctbPerStep: rules.ctbPerStep,
    sceneTimePerStep: rules.sceneTimePerStep,
    sceneTimeCost,
    remainingTimeBefore: snapshot.remainingTime,
    remainingTimeAfter,
    overtimeDebt,
  })
  effects.push({
    kind: 'scene-combat-ended',
    encounterId: active.encounterId,
    eventId: active.eventId,
    outcome,
    combatNodeId: active.nodeId,
    escapeReturnNodeId: outcome === 'escaped' ? active.returnNodeId : null,
    enemy: terminal.enemy,
    usageBefore: active.combat.usage,
    usageAfter: terminal.usage,
  })

  let finalNodeId = active.nodeId
  if (outcome === 'escaped') {
    effects.push({
      kind: 'scene-node-changed',
      reason: 'combat-escape',
      fromNodeId: active.nodeId,
      toNodeId: active.returnNodeId,
      encounterId: active.encounterId,
    })
    finalNodeId = active.returnNodeId
  }
  if (outcome === 'defeat') {
    effects.push({
      kind: 'scene-status-changed',
      fromStatus: 'combat',
      toStatus: 'dead',
      reason: 'death',
    })
    return deepFreeze(effects)
  }
  effects.push({
    kind: 'scene-status-changed',
    fromStatus: 'combat',
    toStatus: 'active',
    reason: outcome === 'victory' ? 'combat-victory' : 'combat-escaped',
  })
  if (remainingTimeAfter > 0) {
    return deepFreeze(effects)
  }

  const returnRoute = findPlayerKnownReturnRoute(snapshot, dependencies, {
    currentNodeId: finalNodeId,
    backpack: terminal.backpack,
    condition: terminal.playerCondition,
  })
  const forced = calculateForcedReturnDamage(
    overtimeDebt,
    returnRoute.estimatedReturnTime,
    terminal.playerCondition.bleeding,
    dependencies.config.forcedReturn,
  )
  let health = terminal.playerCondition.currentHealth
  health = addHealthLoss(effects, 'forced-return-base', forced.baseDamage, health)
  health = addHealthLoss(effects, 'forced-return-bleeding', forced.bleedingExtraDamage, health)
  if (health === 0) {
    effects.push({
      kind: 'scene-status-changed',
      fromStatus: 'active',
      toStatus: 'dead',
      reason: 'death',
    })
  } else {
    effects.push({
      kind: 'scene-node-changed',
      reason: 'forced-return',
      fromNodeId: finalNodeId,
      toNodeId: returnRoute.safetyNodeId,
      routeNodeIds: returnRoute.nodeIds,
      routeEdgeIds: returnRoute.edgeIds,
    })
    effects.push({
      kind: 'scene-status-changed',
      fromStatus: 'active',
      toStatus: 'forced-returned',
      reason: 'forced-return',
    })
  }
  return deepFreeze(effects)
}
