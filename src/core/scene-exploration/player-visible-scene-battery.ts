import { deepFreeze } from '../config'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { classifyLoad, type CarryableLoadTier } from '../load'
import type { TimedSceneActionOutcome } from '../scene'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type { SceneExplorationErrorCode } from './scene-exploration-errors'
import { previewSceneBatteryCommand } from './scene-battery-command'
import { createUseSceneBatteryCommand } from './scene-battery-validation'
import {
  projectPlayerVisibleTimedSceneAction,
  type PlayerVisibleTimedSceneReturnContinuation,
} from './player-visible-timed-scene-action'
import type {
  SceneBatteryCommandDependencies,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
} from './scene-exploration-types'

export interface PlayerVisibleSceneBatterySource {
  readonly definitionId: string
  readonly container: 'backpack'
  readonly column: number
  readonly row: number
}

export type PlayerVisibleSceneBatteryTarget =
  | PlayerVisibleSceneBatterySource
  | Readonly<{
      definitionId: string
      container: 'equipment'
      equipmentSlot: 'weapon' | 'armor' | 'utility'
    }>

export interface PlayerVisibleSceneBatteryEvaluation {
  readonly source: PlayerVisibleSceneBatterySource
  readonly target: PlayerVisibleSceneBatteryTarget
  readonly quantityBefore: number
  readonly quantityAfter: number
  readonly resourceKind: 'durability' | 'integrity' | 'charge'
  readonly resourceBefore: number
  readonly actualRecovery: number
  readonly resourceAfter: number
  readonly unusedRecovery: number
  readonly actionTime: number
  readonly remainingTimeBefore: number
  readonly remainingTimeAfter: number
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly loadTierAfter: CarryableLoadTier
  readonly postActionBleedingDamage: number
  readonly returnContinuation: PlayerVisibleTimedSceneReturnContinuation
  readonly sceneOutcome: TimedSceneActionOutcome
  readonly finalHealth: number
  readonly finalSceneStatus: SceneExplorationStatus
  readonly completionNodeName: string
}

export type PlayerVisibleSceneBatteryPreview =
  | Readonly<{ canExecute: true; result: PlayerVisibleSceneBatteryEvaluation }>
  | Readonly<{ canExecute: false; rejectionCode: SceneExplorationErrorCode }>

function findEffect<TKind extends SceneExplorationEffect['kind']>(
  effects: readonly SceneExplorationEffect[],
  kind: TKind,
): Extract<SceneExplorationEffect, { readonly kind: TKind }> | undefined {
  return effects.find(
    (effect): effect is Extract<SceneExplorationEffect, { readonly kind: TKind }> =>
      effect.kind === kind,
  )
}

function backpackLocation(
  snapshot: SceneExplorationSnapshot,
  instanceId: string,
): PlayerVisibleSceneBatterySource {
  const backpackItem = snapshot.backpack.items.find(
    (item) => item.instanceId === instanceId,
  )
  const placement = snapshot.backpack.placements.find(
    (candidate) => candidate.instanceId === instanceId,
  )
  if (!backpackItem || !placement) {
    throw new Error('正式场景充能背包物品缺少摆放')
  }
  return deepFreeze({
    definitionId: backpackItem.definitionId,
    container: 'backpack',
    column: placement.x + 1,
    row: placement.y + 1,
  })
}

function targetLocation(
  snapshot: SceneExplorationSnapshot,
  instanceId: string,
): PlayerVisibleSceneBatteryTarget {
  const backpackItem = snapshot.backpack.items.find(
    (item) => item.instanceId === instanceId,
  )
  if (backpackItem) return backpackLocation(snapshot, instanceId)
  const equipmentSlot = (['weapon', 'armor', 'utility'] as const).find(
    (slot) => snapshot.equipment[slot]?.instanceId === instanceId,
  )
  const equipmentItem = equipmentSlot ? snapshot.equipment[equipmentSlot] : null
  if (!equipmentSlot || !equipmentItem) {
    throw new Error('正式场景充能目标不在玩家携带容器中')
  }
  return deepFreeze({
    definitionId: equipmentItem.definitionId,
    container: 'equipment',
    equipmentSlot,
  })
}

/**
 * Confirmation-safe projection of the formal Scene Battery transaction. Raw
 * identities, Effects, plans, and resulting snapshots do not escape.
 */
export function previewPlayerVisibleSceneBatteryCommand(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneBatteryCommandDependencies,
): PlayerVisibleSceneBatteryPreview {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const preview = previewSceneBatteryCommand(snapshot, commandInput, dependencies)
  if (!preview.canExecute) return deepFreeze(preview)

  const command = createUseSceneBatteryCommand(commandInput)
  const { result } = preview
  const consumed = findEffect(result.effects, 'scene-battery-consumed')
  const restored = findEffect(result.effects, 'scene-device-resource-restored')
  const time = findEffect(result.effects, 'scene-time-resolved')
  if (!consumed || !restored || !time) {
    throw new Error('正式场景充能计划缺少消费、恢复或时间事实')
  }
  const timedProjection = projectPlayerVisibleTimedSceneAction(
    snapshot,
    result.snapshot,
    result.returnRoute,
    dependencies,
  )
  const backpackWeightBefore = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const backpackWeightAfter = calculateBackpackWeightSubtotal(
    result.snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const load = classifyLoad(backpackWeightAfter, dependencies.config.backpack)
  if (!load.canCarry) throw new Error('正式场景充能结果产生无法携带状态')

  return deepFreeze({
    canExecute: true,
    result: {
      source: backpackLocation(snapshot, command.batteryInstanceId),
      target: targetLocation(snapshot, command.targetInstanceId),
      quantityBefore: consumed.quantityBefore,
      quantityAfter: consumed.quantityAfter,
      resourceKind: restored.resourceKind,
      resourceBefore: restored.resourceBefore,
      actualRecovery: restored.actualRecovery,
      resourceAfter: restored.resourceAfter,
      unusedRecovery: restored.unusedRecovery,
      actionTime: result.actionTime,
      remainingTimeBefore: time.remainingTimeBefore,
      remainingTimeAfter: time.remainingTimeAfter,
      backpackWeightBefore,
      backpackWeightAfter,
      loadTierAfter: load.tier,
      postActionBleedingDamage: result.sceneOutcome.postActionBleedingDamage,
      returnContinuation: timedProjection.returnContinuation,
      sceneOutcome: result.sceneOutcome,
      finalHealth: result.sceneOutcome.vitals.currentHealth,
      finalSceneStatus: result.snapshot.status,
      completionNodeName: timedProjection.completionNodeName,
    },
  })
}
