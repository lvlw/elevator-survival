import { deepFreeze } from '../config'
import {
  calculateBackpackWeightSubtotal,
  getOccupiedCells,
} from '../inventory'
import { classifyLoad, type CarryableLoadTier } from '../load'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { previewSceneInventoryCommand } from './scene-inventory-command'
import { createWithdrawFromSceneCommand } from './scene-withdrawal-command'
import { previewSceneWithdrawalCommand } from './scene-withdrawal-resolution'
import type { SceneExplorationErrorCode } from './scene-exploration-errors'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneInventoryAudit,
  SceneInventoryCommand,
} from './scene-exploration-types'

export type PlayerVisibleSceneInventoryLocation =
  | Readonly<{
      container: 'backpack'
      column: number
      row: number
    }>
  | Readonly<{
      container: 'quick-slot'
      slotNumber: number
    }>
  | Readonly<{
      container: 'current-node'
      nodeName: string
    }>

export type PlayerVisibleSceneInventoryReturnProjection =
  | Readonly<{ canExecute: false }>
  | Readonly<{
      canExecute: true
      estimatedReturnTime: number
      remainingTimeAfterReturn: number
      resultStatus: 'safe-returned' | 'forced-returned' | 'dead'
    }>

export interface PlayerVisibleSceneInventoryEvaluation {
  readonly operationKind: SceneInventoryCommand['kind']
  readonly definitionId: string
  readonly source: PlayerVisibleSceneInventoryLocation
  readonly target: PlayerVisibleSceneInventoryLocation
  readonly quantityMoved: number
  readonly sourceQuantityBefore: number
  readonly sourceQuantityAfter: number
  readonly targetQuantityBefore: number | null
  readonly targetQuantityAfter: number | null
  readonly rotated: boolean | null
  readonly mergeResult: 'full' | 'partial' | null
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly loadTierBefore: CarryableLoadTier
  readonly loadTierAfter: CarryableLoadTier
  readonly remainingTimeBefore: number
  readonly remainingTimeAfter: number
  readonly healthBefore: number
  readonly healthAfter: number
  readonly bleedingBefore: boolean
  readonly bleedingAfter: boolean
  readonly returnBefore: PlayerVisibleSceneInventoryReturnProjection
  readonly returnAfter: PlayerVisibleSceneInventoryReturnProjection
  readonly candidateCells: readonly Readonly<{ x: number; y: number }>[]
  readonly questDropWarning: boolean
}

export type PlayerVisibleSceneInventoryPreview =
  | Readonly<{ canExecute: true; result: PlayerVisibleSceneInventoryEvaluation }>
  | Readonly<{ canExecute: false; rejectionCode: SceneExplorationErrorCode }>

function backpackLocation(
  placement: Readonly<{ x: number; y: number }>,
): PlayerVisibleSceneInventoryLocation {
  return deepFreeze({
    container: 'backpack',
    column: placement.x + 1,
    row: placement.y + 1,
  })
}

function sourceLocation(audit: SceneInventoryAudit): PlayerVisibleSceneInventoryLocation {
  if (audit.sourcePlacement) return backpackLocation(audit.sourcePlacement)
  if (audit.quickSlotIndex !== null) {
    return deepFreeze({ container: 'quick-slot', slotNumber: audit.quickSlotIndex + 1 })
  }
  throw new Error('正式场景整理审计缺少玩家可见来源位置')
}

function targetLocation(
  audit: SceneInventoryAudit,
  dependencies: SceneExplorationDependencies,
): PlayerVisibleSceneInventoryLocation {
  if (audit.nodeId !== null) {
    const node = dependencies.graph.nodes.find(({ id }) => id === audit.nodeId)
    if (!node) throw new Error('正式场景整理审计引用未知节点')
    return deepFreeze({ container: 'current-node', nodeName: node.name })
  }
  if (
    audit.operationKind === 'scene-backpack-to-quick-slot' &&
    audit.quickSlotIndex !== null
  ) {
    return deepFreeze({ container: 'quick-slot', slotNumber: audit.quickSlotIndex + 1 })
  }
  if (audit.targetPlacement) return backpackLocation(audit.targetPlacement)
  throw new Error('正式场景整理审计缺少玩家可见目标位置')
}

function returnProjection(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
): PlayerVisibleSceneInventoryReturnProjection {
  const preview = previewSceneWithdrawalCommand(
    snapshot,
    createWithdrawFromSceneCommand({ kind: 'withdraw-from-scene' }),
    dependencies,
  )
  if (!preview.canExecute) return deepFreeze({ canExecute: false })
  const status = preview.result.snapshot.status
  if (status !== 'safe-returned' && status !== 'forced-returned' && status !== 'dead') {
    throw new Error('正式主动返程预览未产生终局状态')
  }
  return deepFreeze({
    canExecute: true,
    estimatedReturnTime: preview.result.returnRoute.estimatedReturnTime,
    remainingTimeAfterReturn: preview.result.snapshot.remainingTime,
    resultStatus: status,
  })
}

function carryableTier(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
): CarryableLoadTier {
  const weight = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const load = classifyLoad(weight, dependencies.config.backpack)
  if (!load.canCarry) throw new Error('正式场景整理结果产生无法携带状态')
  return load.tier
}

/**
 * Confirmation-safe allow-list projection of the formal Scene Inventory
 * Preview. Raw commands, audits, Effects, snapshots, and physical identities
 * are consumed internally and never escape this boundary.
 */
export function previewPlayerVisibleSceneInventoryCommand(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneExplorationDependencies,
): PlayerVisibleSceneInventoryPreview {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const preview = previewSceneInventoryCommand(snapshot, commandInput, dependencies)
  if (!preview.canExecute) return deepFreeze(preview)

  const committed = preview.result.effects.find(
    (effect) => effect.kind === 'scene-inventory-committed',
  )
  if (!committed || preview.result.effects.length !== 1) {
    throw new Error('正式场景整理计划缺少唯一提交事实')
  }
  const audit = committed.audit
  const result = preview.result.snapshot
  const backpackWeightBefore = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const backpackWeightAfter = calculateBackpackWeightSubtotal(
    result.backpack,
    dependencies.physicalCatalog,
  )
  const targetCells = audit.targetInstanceId === null
    ? []
    : getOccupiedCells(result.backpack, dependencies.physicalCatalog)
        .filter(({ instanceId }) => instanceId === audit.targetInstanceId)
        .map(({ x, y }) => deepFreeze({ x, y }))

  return deepFreeze({
    canExecute: true,
    result: {
      operationKind: audit.operationKind,
      definitionId: audit.definitionId,
      source: sourceLocation(audit),
      target: targetLocation(audit, dependencies),
      quantityMoved: audit.quantityMoved,
      sourceQuantityBefore: audit.sourceQuantityBefore,
      sourceQuantityAfter: audit.sourceQuantityAfter,
      targetQuantityBefore: audit.targetQuantityBefore,
      targetQuantityAfter: audit.targetQuantityAfter,
      rotated: audit.targetPlacement?.rotated ?? null,
      mergeResult: audit.mergeResult,
      backpackWeightBefore,
      backpackWeightAfter,
      loadTierBefore: carryableTier(snapshot, dependencies),
      loadTierAfter: carryableTier(result, dependencies),
      remainingTimeBefore: snapshot.remainingTime,
      remainingTimeAfter: result.remainingTime,
      healthBefore: snapshot.condition.currentHealth,
      healthAfter: result.condition.currentHealth,
      bleedingBefore: snapshot.condition.bleeding,
      bleedingAfter: result.condition.bleeding,
      returnBefore: returnProjection(snapshot, dependencies),
      returnAfter: returnProjection(result, dependencies),
      candidateCells: targetCells,
      questDropWarning: audit.dropLifecycleKind === 'quest',
    },
  })
}
