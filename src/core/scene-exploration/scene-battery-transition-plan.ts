import { deepFreeze } from '../config'
import { calculateBackpackWeightSubtotal, createBackpackSnapshot, removeItemFromBackpack } from '../inventory'
import { getItemState, restoreItemResource } from '../item-state'
import { classifyLoad } from '../load'
import { SceneGraphError } from '../scene-graph'
import { resolveTimedSceneAction } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { validateSceneBatteryDependencies } from './scene-battery-dependencies'
import { getAvailableSceneBatteryCommandsFromValidatedSnapshot } from './scene-battery-selectors'
import { createUseSceneBatteryCommand } from './scene-battery-validation'
import { findPlayerKnownReturnRoute } from './scene-navigation-return'
import type { SceneBatteryCommandDependencies, SceneBatteryTransitionPlan, SceneExplorationEffect, SceneExplorationSnapshot, SceneExplorationStatus, UseSceneBatteryCommand } from './scene-exploration-types'

function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right) }

function consumeBackpack(snapshot: SceneExplorationSnapshot, instanceId: string, dependencies: SceneBatteryCommandDependencies) {
  const item = snapshot.backpack.items.find((candidate) => candidate.instanceId === instanceId)
  if (!item) throw new SceneExplorationError('SCENE_BATTERY_NOT_AVAILABLE', '电池不在背包中')
  if (item.quantity === 1) return removeItemFromBackpack(snapshot.backpack, instanceId, dependencies.physicalCatalog).snapshot
  return createBackpackSnapshot({ ...snapshot.backpack, items: snapshot.backpack.items.map((candidate) => candidate.instanceId === instanceId ? { ...candidate, quantity: candidate.quantity - 1 } : candidate) }, dependencies.physicalCatalog)
}

function addHealth(effects: SceneExplorationEffect[], source: 'post-action-bleeding' | 'forced-return-base' | 'forced-return-bleeding', requestedLoss: number, healthBefore: number): number {
  const actualLoss = Math.min(requestedLoss, healthBefore)
  if (actualLoss > 0) effects.push({ kind: 'health-lost', source, requestedLoss, actualLoss, healthBefore, healthAfter: healthBefore - actualLoss })
  return healthBefore - actualLoss
}

export function buildSceneBatteryTransitionPlan(snapshotInput: SceneExplorationSnapshot, commandInput: unknown, dependencies: SceneBatteryCommandDependencies): SceneBatteryTransitionPlan {
  validateSceneBatteryDependencies(dependencies)
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const command = createUseSceneBatteryCommand(commandInput)
  if (snapshot.status !== 'active') throw new SceneExplorationError('SCENE_NOT_ACTIVE', '当前场景不能使用电池')
  if (snapshot.condition.currentHealth === 0) throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能使用电池')
  if (snapshot.remainingTime === 0) throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间耗尽后不能开始充能')
  const available = getAvailableSceneBatteryCommandsFromValidatedSnapshot(snapshot, dependencies)
  if (!available.some((candidate) => same(candidate, command))) throw new SceneExplorationError('SCENE_BATTERY_NOT_AVAILABLE', '电池或充能目标不可用')
  const battery = snapshot.backpack.items.find(({ instanceId }) => instanceId === command.batteryInstanceId)!
  const targetInBackpack = snapshot.backpack.items.find(({ instanceId }) => instanceId === command.targetInstanceId)
  const targetEquipment = (['weapon', 'armor', 'utility'] as const).find((slot) => snapshot.equipment[slot]?.instanceId === command.targetInstanceId) ?? null
  const target = targetInBackpack ?? (targetEquipment ? snapshot.equipment[targetEquipment]! : null)
  if (!target) throw new SceneExplorationError('SCENE_BATTERY_NOT_AVAILABLE', '充能目标不在携带容器中')
  const binding = dependencies.deviceRechargeCatalog.get(battery.definitionId, target.definitionId)
  const state = getItemState(snapshot.itemStates, target.instanceId)
  if (!binding || state.resource.kind !== binding.targetResourceKind) throw new SceneExplorationError('SCENE_BATTERY_NOT_AVAILABLE', '电池与目标不兼容')
  const restored = restoreItemResource(state, dependencies.config.maintenance.flashlightCharge.chargeRecovery, dependencies.itemResourceCatalog)
  if (restored.restored <= 0) throw new SceneExplorationError('SCENE_BATTERY_NOT_AVAILABLE', '目标已充满')
  const backpackAfter = consumeBackpack(snapshot, battery.instanceId, dependencies)
  const weight = calculateBackpackWeightSubtotal(backpackAfter, dependencies.physicalCatalog)
  const load = classifyLoad(weight, dependencies.config.backpack)
  if (!load.canCarry) throw new SceneExplorationError('CANNOT_CARRY', '无法携带状态不能使用电池')
  let returnRoute
  try {
    returnRoute = findPlayerKnownReturnRoute(snapshot, dependencies, { backpack: backpackAfter })
  } catch (error) {
    if (error instanceof SceneGraphError) throw new SceneExplorationError(error.code === 'NO_RETURN_ROUTE' ? 'NO_RETURN_ROUTE' : 'INVALID_INPUT', error.message)
    throw error
  }
  const isSafety = dependencies.graph.nodes.some((node) => node.id === snapshot.currentNodeId && node.isReturnSafetyNode)
  const outcome = resolveTimedSceneAction({ remainingTime: snapshot.remainingTime }, { currentHealth: snapshot.condition.currentHealth, maxHealth: dependencies.config.combat.player.maxHealth, bleeding: snapshot.condition.bleeding }, { timeCost: dependencies.config.scene.batteryUseTime, healthAfterPrimaryEffect: snapshot.condition.currentHealth, bleedingAfterPrimaryEffect: snapshot.condition.bleeding, estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime, endsExplorationAtSafety: false, isAtSafetyAfterAction: isSafety }, { postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage, forcedReturn: dependencies.config.forcedReturn })
  const effects: SceneExplorationEffect[] = [
    { kind: 'scene-battery-consumed', command, instanceId: battery.instanceId, definitionId: battery.definitionId, quantityBefore: battery.quantity, quantityConsumed: 1, quantityAfter: battery.quantity - 1 },
    { kind: 'scene-device-resource-restored', targetContainer: targetInBackpack ? 'backpack' : 'equipment', targetEquipmentSlot: targetEquipment, targetInstanceId: target.instanceId, targetDefinitionId: target.definitionId, resourceKind: binding.targetResourceKind, resourceBefore: restored.currentBefore, requestedRecovery: restored.requestedAmount, actualRecovery: restored.restored, resourceAfter: restored.currentAfter, unusedRecovery: restored.unused },
    { kind: 'scene-time-resolved', remainingTimeBefore: snapshot.remainingTime, actionTimeCost: dependencies.config.scene.batteryUseTime, remainingTimeAfter: outcome.clock.remainingTime, overtimeDebt: outcome.overtimeDebt },
  ]
  let health = snapshot.condition.currentHealth
  health = addHealth(effects, 'post-action-bleeding', outcome.postActionBleedingDamage, health)
  health = addHealth(effects, 'forced-return-base', outcome.forcedReturnBaseDamage, health)
  addHealth(effects, 'forced-return-bleeding', outcome.forcedReturnBleedingDamage, health)
  const status: SceneExplorationStatus = outcome.kind === 'death' ? 'dead' : outcome.kind === 'safe-return' ? 'safe-returned' : outcome.kind === 'forced-return' ? 'forced-returned' : 'active'
  if (status === 'forced-returned') effects.push({ kind: 'scene-node-changed', reason: 'forced-return', fromNodeId: snapshot.currentNodeId, toNodeId: returnRoute.safetyNodeId, routeNodeIds: [...returnRoute.nodeIds], routeEdgeIds: [...returnRoute.edgeIds] })
  if (status !== snapshot.status) effects.push({ kind: 'scene-status-changed', fromStatus: snapshot.status, toStatus: status, reason: status === 'dead' ? 'death' : status === 'safe-returned' ? 'safe-return' : 'forced-return' })
  return deepFreeze({ command, metadata: { batteryInstanceId: battery.instanceId, targetInstanceId: target.instanceId, actionTime: dependencies.config.scene.batteryUseTime, returnRoute, sceneOutcome: outcome }, effects })
}
