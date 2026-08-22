import { deepFreeze } from '../config'
import {
  hasMinorContusions,
} from '../condition'
import { buildMedicalPrimaryPlan, MedicalContentError } from '../medical'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  removeItemFromBackpack,
} from '../inventory'
import { classifyLoad } from '../load'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, SceneGraphError } from '../scene-graph'
import { resolveTimedSceneAction } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { validateSceneMedicalDependencies } from './scene-medical-dependencies'
import { getAvailableSceneMedicalCommandsFromValidatedSnapshot } from './scene-medical-selectors'
import { resolveSceneMedicalSource } from './scene-medical-support'
import { createUseSceneMedicalItemCommand } from './scene-medical-validation'
import type {
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneMedicalCommandDependencies,
  SceneMedicalTransitionPlan,
  UseSceneMedicalItemCommand,
} from './scene-exploration-types'

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function graphFailure(error: unknown): never {
  if (!(error instanceof SceneGraphError)) throw error
  throw new SceneExplorationError(
    error.code === 'NO_RETURN_ROUTE' ? 'NO_RETURN_ROUTE' : 'INVALID_INPUT',
    error.message,
  )
}

function addHealthEffect(
  effects: SceneExplorationEffect[],
  source: 'post-action-bleeding' | 'forced-return-base' | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  if (requestedLoss === 0) return healthBefore
  const actualLoss = Math.min(healthBefore, requestedLoss)
  const healthAfter = healthBefore - actualLoss
  if (actualLoss > 0) {
    effects.push({
      kind: 'health-lost',
      source,
      requestedLoss,
      actualLoss,
      healthBefore,
      healthAfter,
    })
  }
  return healthAfter
}

function consumeFromBackpack(
  snapshot: SceneExplorationSnapshot,
  instanceId: string,
  dependencies: SceneMedicalCommandDependencies,
) {
  const item = snapshot.backpack.items.find((candidate) => candidate.instanceId === instanceId)
  if (!item) {
    throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', '背包医疗物品不存在')
  }
  if (item.quantity === 1) {
    return removeItemFromBackpack(
      snapshot.backpack,
      instanceId,
      dependencies.physicalCatalog,
    ).snapshot
  }
  return createBackpackSnapshot({
    ...snapshot.backpack,
    items: snapshot.backpack.items.map((candidate) =>
      candidate.instanceId === instanceId
        ? { ...candidate, quantity: candidate.quantity - 1 }
        : candidate,
    ),
  }, dependencies.physicalCatalog)
}

export function buildSceneMedicalTransitionPlan(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneMedicalCommandDependencies,
): SceneMedicalTransitionPlan {
  validateSceneMedicalDependencies(dependencies)
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const command = createUseSceneMedicalItemCommand(commandInput)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景当前不允许探索医疗')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能进行探索医疗')
  }
  if (snapshot.remainingTime === 0) {
    throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间耗尽后不能开始探索医疗')
  }
  const available = getAvailableSceneMedicalCommandsFromValidatedSnapshot(
    snapshot,
    dependencies,
  )
  if (!available.some((candidate) => sameValue(candidate, command))) {
    throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', '探索医疗物品、来源或目标不符合当前状态')
  }

  const source = resolveSceneMedicalSource(snapshot, command, dependencies)
  const backpackAfterConsumption = source.sourceContainer === 'backpack'
    ? consumeFromBackpack(snapshot, source.item.instanceId, dependencies)
    : snapshot.backpack
  const effects: SceneExplorationEffect[] = [{
    kind: 'scene-medical-item-consumed',
    command,
    medicalItem: source.medicalItem,
    sourceContainer: source.sourceContainer,
    sourceSlotIndex: source.sourceSlotIndex,
    instanceId: source.item.instanceId,
    definitionId: source.item.definitionId,
    quantityBefore: source.item.quantity,
    quantityConsumed: 1,
    quantityAfter: source.item.quantity - 1,
  }]

  let primary
  try {
    primary = buildMedicalPrimaryPlan(
      snapshot.condition,
      snapshot.dailyMedicalUsage,
      source.medicalItem,
      command.target,
      dependencies.config,
    )
  } catch (error) {
    if (error instanceof MedicalContentError) {
      throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', error.message)
    }
    throw error
  }
  for (const effect of primary.effects) {
    switch (effect.kind) {
      case 'health-restored':
        effects.push({
          kind: 'scene-health-restored',
          source: effect.item === 'bandage' ? 'scene-bandage' : 'scene-first-aid-kit',
          healthBefore: effect.healthBefore,
          requestedRecovery: effect.requestedRecovery,
          actualRecovery: effect.actualRecovery,
          healthAfter: effect.healthAfter,
          unusedRecovery: effect.unusedRecovery,
        })
        break
      case 'bleeding-changed':
        effects.push({
          kind: 'scene-bleeding-changed',
          source: effect.item === 'bandage' ? 'scene-bandage' : 'scene-first-aid-kit',
          before: effect.before,
          after: effect.after,
        })
        break
      case 'open-wound-treated':
        effects.push({
          kind: 'scene-open-wound-treated',
          source: 'scene-bandage',
          woundId: effect.woundId,
          woundKind: effect.woundKind,
          treatmentBefore: 'untreated',
          treatmentAfter: 'treated',
        })
        break
      case 'open-wound-removed':
        effects.push({
          kind: 'scene-open-wound-removed',
          source: 'scene-first-aid-kit',
          woundId: effect.woundId,
          woundKind: effect.woundKind,
        })
        break
      case 'minor-contusion-removed':
        effects.push({
          kind: 'scene-minor-contusion-removed',
          source: 'scene-first-aid-kit',
          countBefore: effect.countBefore,
          removed: effect.removed,
          countAfter: effect.countAfter,
        })
        break
      case 'painkiller-changed':
        effects.push({ kind: 'scene-painkiller-changed', before: effect.before, after: effect.after })
        break
      case 'infection-exposure-reduced':
        effects.push({
          kind: 'scene-infection-exposure-reduced',
          source: 'scene-disinfectant',
          exposuresBefore: effect.exposuresBefore,
          requestedReduction: effect.requestedReduction,
          actualReduction: effect.actualReduction,
          exposuresAfter: effect.exposuresAfter,
          unusedReduction: effect.unusedReduction,
        })
        break
      case 'daily-medical-usage-changed':
        effects.push(effect)
        break
    }
  }
  const condition = primary.condition
  const actionTime = source.medicalItem === 'bandage'
    ? dependencies.config.medical.bandage.sceneTime
    : source.medicalItem === 'painkiller'
      ? dependencies.config.medical.painkiller.sceneTime
      : source.medicalItem === 'disinfectant'
        ? dependencies.config.medical.disinfectant.sceneTime
        : dependencies.config.medical.firstAidKit.sceneTime

  const backpackWeight = calculateBackpackWeightSubtotal(
    backpackAfterConsumption,
    dependencies.physicalCatalog,
  )
  const load = classifyLoad(backpackWeight, dependencies.config.backpack)
  if (!load.canCarry) {
    throw new SceneExplorationError('CANNOT_CARRY', '无法携带状态不能执行探索医疗')
  }
  let returnRoute
  try {
    returnRoute = findReturnRoute({
      graph: dependencies.graph,
      currentNodeId: snapshot.currentNodeId,
      availability: {
        enabledEdgeIds: getEffectiveEnabledEdgeIds(
          { ...snapshot, backpack: backpackAfterConsumption },
          dependencies.edgeAccessCatalog,
        ),
      },
      totalWeight: backpackWeight,
      hasMinorContusion: hasMinorContusions(condition),
      analgesiaActive: condition.painkillerActive,
    }, dependencies.config)
  } catch (error) {
    graphFailure(error)
  }
  const currentIsSafetyNode = dependencies.graph.nodes.some(
    ({ id, isReturnSafetyNode }) => id === snapshot.currentNodeId && isReturnSafetyNode,
  )
  const sceneOutcome = resolveTimedSceneAction(
    { remainingTime: snapshot.remainingTime },
    {
      currentHealth: snapshot.condition.currentHealth,
      maxHealth: dependencies.config.combat.player.maxHealth,
      bleeding: snapshot.condition.bleeding,
    },
    {
      timeCost: actionTime,
      healthAfterPrimaryEffect: condition.currentHealth,
      bleedingAfterPrimaryEffect: condition.bleeding,
      estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime,
      endsExplorationAtSafety: false,
      isAtSafetyAfterAction: currentIsSafetyNode,
    },
    {
      postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage,
      forcedReturn: dependencies.config.forcedReturn,
    },
  )
  effects.push({
    kind: 'scene-time-resolved',
    remainingTimeBefore: snapshot.remainingTime,
    actionTimeCost: actionTime,
    remainingTimeAfter: sceneOutcome.clock.remainingTime,
    overtimeDebt: sceneOutcome.overtimeDebt,
  })
  let effectHealth = condition.currentHealth
  effectHealth = addHealthEffect(effects, 'post-action-bleeding', sceneOutcome.postActionBleedingDamage, effectHealth)
  effectHealth = addHealthEffect(effects, 'forced-return-base', sceneOutcome.forcedReturnBaseDamage, effectHealth)
  addHealthEffect(effects, 'forced-return-bleeding', sceneOutcome.forcedReturnBleedingDamage, effectHealth)

  const status: SceneExplorationStatus =
    sceneOutcome.kind === 'death'
      ? 'dead'
      : sceneOutcome.kind === 'safe-return'
        ? 'safe-returned'
        : sceneOutcome.kind === 'forced-return'
          ? 'forced-returned'
          : 'active'
  if (status === 'forced-returned') {
    effects.push({
      kind: 'scene-node-changed',
      reason: 'forced-return',
      fromNodeId: snapshot.currentNodeId,
      toNodeId: returnRoute.safetyNodeId,
      routeNodeIds: [...returnRoute.nodeIds],
      routeEdgeIds: [...returnRoute.edgeIds],
    })
  }
  if (status !== snapshot.status) {
    effects.push({
      kind: 'scene-status-changed',
      fromStatus: snapshot.status,
      toStatus: status,
      reason: status === 'dead' ? 'death' : status === 'safe-returned' ? 'safe-return' : 'forced-return',
    })
  }
  return deepFreeze({
    command,
    metadata: {
      medicalItem: source.medicalItem,
      sourceContainer: source.sourceContainer,
      sourceInstanceId: source.item.instanceId,
      actionTime,
      returnRoute,
      sceneOutcome,
    },
    effects,
  })
}
