import {
  convertCombatElapsedCtbToSceneTime,
  resolveCombatPlayerAction,
} from '../combat'
import { deepFreeze } from '../config'
import { hasMinorContusions } from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { calculateForcedReturnDamage } from '../scene'
import { findReturnRoute } from '../scene-graph'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
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
  const sceneTimeCost = convertCombatElapsedCtbToSceneTime(terminal.currentCtb, rules)
  const remainingTimeAfter = Math.max(0, snapshot.remainingTime - sceneTimeCost)
  const overtimeDebt = Math.max(0, sceneTimeCost - snapshot.remainingTime)
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

  const backpackWeight = calculateBackpackWeightSubtotal(
    terminal.backpack,
    dependencies.physicalCatalog,
  )
  const returnRoute = findReturnRoute({
    graph: dependencies.graph,
    currentNodeId: finalNodeId,
    availability: {
      enabledEdgeIds: getEffectiveEnabledEdgeIds({
        enabledEdgeIds: snapshot.enabledEdgeIds,
        backpack: terminal.backpack,
      }, dependencies.edgeAccessCatalog),
    },
    totalWeight: backpackWeight,
    hasMinorContusion: hasMinorContusions(terminal.playerCondition),
    analgesiaActive: terminal.playerCondition.painkillerActive,
  }, dependencies.config)
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
