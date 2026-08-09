import { deepFreeze } from '../config'
import {
  activatePainkiller,
  getUntreatedOpenWounds,
  hasMinorContusions,
  removeOneMinorContusion,
  reducePendingInfectionExposure,
  removeOpenWound,
  restoreHealth,
  setBleeding,
  treatOpenWound,
} from '../condition'
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
  commandInput: UseSceneMedicalItemCommand,
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

  let condition = snapshot.condition
  let actionTime: number
  if (source.medicalItem === 'bandage') {
    const recovery = restoreHealth(
      condition,
      dependencies.config.medical.bandage.healthRecovery,
      dependencies.config.combat.player,
    )
    effects.push({
      kind: 'scene-health-restored',
      source: 'scene-bandage',
      healthBefore: recovery.healthBefore,
      requestedRecovery: recovery.requestedRecovery,
      actualRecovery: recovery.actualRecovery,
      healthAfter: recovery.healthAfter,
      unusedRecovery: recovery.unusedRecovery,
    })
    condition = recovery.state
    if (condition.bleeding && dependencies.config.medical.bandage.stopsBleeding) {
      effects.push({
        kind: 'scene-bleeding-changed',
        source: 'scene-bandage',
        before: true,
        after: false,
      })
      condition = setBleeding(condition, false)
    }
    const target = command.target
    if (target?.kind === 'open-wound') {
      const selected = condition.openWounds.find(
        ({ id }) => id === target.woundId,
      )
      if (!selected) throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', '指定开放伤口不存在')
      effects.push({
        kind: 'scene-open-wound-treated',
        source: 'scene-bandage',
        woundId: selected.id,
        woundKind: selected.kind,
        treatmentBefore: 'untreated',
        treatmentAfter: 'treated',
      })
      condition = treatOpenWound(condition, selected.id)
    }
    actionTime = dependencies.config.medical.bandage.sceneTime
  } else if (source.medicalItem === 'painkiller') {
    effects.push({ kind: 'scene-painkiller-changed', before: false, after: true })
    condition = activatePainkiller(condition)
    actionTime = dependencies.config.medical.painkiller.sceneTime
  } else if (source.medicalItem === 'disinfectant') {
    const reduction = reducePendingInfectionExposure(
      condition,
      dependencies.config.medical.disinfectant.pendingExposureReduction,
    )
    effects.push({
      kind: 'scene-infection-exposure-reduced',
      source: 'scene-disinfectant',
      exposuresBefore: reduction.exposuresBefore,
      requestedReduction: reduction.requestedReduction,
      actualReduction: reduction.actualReduction,
      exposuresAfter: reduction.exposuresAfter,
      unusedReduction: reduction.unusedReduction,
    })
    condition = reduction.state
    effects.push({
      kind: 'daily-medical-usage-changed',
      usage: 'disinfectant',
      usesBefore: snapshot.dailyMedicalUsage.disinfectantUsesToday,
      usesAfter: snapshot.dailyMedicalUsage.disinfectantUsesToday + 1,
    })
    actionTime = dependencies.config.medical.disinfectant.sceneTime
  } else {
    const recovery = restoreHealth(
      condition,
      dependencies.config.medical.firstAidKit.healthRecovery,
      dependencies.config.combat.player,
    )
    effects.push({
      kind: 'scene-health-restored',
      source: 'scene-first-aid-kit',
      healthBefore: recovery.healthBefore,
      requestedRecovery: recovery.requestedRecovery,
      actualRecovery: recovery.actualRecovery,
      healthAfter: recovery.healthAfter,
      unusedRecovery: recovery.unusedRecovery,
    })
    condition = recovery.state
    const target = command.target
    if (target?.kind === 'minor-contusion') {
      effects.push({
        kind: 'scene-minor-contusion-removed',
        source: 'scene-first-aid-kit',
        countBefore: condition.minorContusions,
        removed: 1,
        countAfter: condition.minorContusions - 1,
      })
      condition = removeOneMinorContusion(condition)
    } else if (target?.kind === 'open-wound') {
      const selected = condition.openWounds.find(({ id }) => id === target.woundId)
      if (!selected) throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', '指定轻伤不存在')
      effects.push({
        kind: 'scene-open-wound-removed',
        source: 'scene-first-aid-kit',
        woundId: selected.id,
        woundKind: selected.kind,
      })
      condition = removeOpenWound(condition, selected.id)
      if (
        condition.bleeding &&
        dependencies.config.medical.firstAidKit.stopsBleedingWhenRemovingLastOpenWound &&
        getUntreatedOpenWounds(condition).length === 0
      ) {
        effects.push({
          kind: 'scene-bleeding-changed',
          source: 'scene-first-aid-kit',
          before: true,
          after: false,
        })
        condition = setBleeding(condition, false)
      }
    }
    actionTime = dependencies.config.medical.firstAidKit.sceneTime
  }

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
