import { deepFreeze } from '../config'
import { createBackpackSnapshot } from '../inventory'
import { getItemState } from '../item-state'
import {
  createSceneExplorationSnapshot,
} from '../scene-exploration'
import { RunReturnError } from './run-return-errors'
import { assertNoRunStorageScenePhysicalItemConflicts } from './scene-storage-identity'
import {
  restoreRunReturnCarryForwardSnapshot,
  createRunReturnSnapshot,
} from './run-storage'
import type {
  RunReturnDependencies,
  RunReturnEffect,
  RunReturnInput,
  RunReturnResult,
  RunReturnSummary,
  RunReturnTransitionPlan,
  RunStorageDependencies,
} from './run-return-types'

function normalizeInput(
  input: RunReturnInput,
  dependencies: RunReturnDependencies,
) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join(',') !== 'carryForward,terminalScene') {
    throw new RunReturnError('INVALID_INPUT', '返回结算输入结构无效')
  }
  let terminalScene
  try {
    terminalScene = createSceneExplorationSnapshot(input.terminalScene, dependencies.scene)
  } catch (error) {
    throw new RunReturnError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : '终局场景快照无效',
    )
  }
  if (terminalScene.status !== 'safe-returned' && terminalScene.status !== 'forced-returned') {
    throw new RunReturnError('SCENE_NOT_RETURNABLE', '只有生还且已结束探索的场景可以返回结算')
  }
  let carryForward
  try {
    carryForward = restoreRunReturnCarryForwardSnapshot(input.carryForward, dependencies)
  } catch (error) {
    throw new RunReturnError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Run返回连续性无效',
    )
  }
  if (carryForward.continuity.sceneInstanceId !== terminalScene.sceneInstanceId) {
    throw new RunReturnError('INVALID_INPUT', 'Run返回连续性与终局场景实例不一致')
  }
  const storageDependencies: RunStorageDependencies = {
    physicalCatalog: dependencies.scene.physicalCatalog,
    itemResourceCatalog: dependencies.scene.itemResourceCatalog,
    lifecycleCatalog: dependencies.lifecycleCatalog,
  }
  const storedInventory = carryForward.storedInventory
  const returnLedger = carryForward.returnLedger
  if (returnLedger.sceneInstanceIds.includes(terminalScene.sceneInstanceId)) {
    throw new RunReturnError('RETURN_ALREADY_SETTLED', '当前场景已经完成过返回结算')
  }
  assertNoRunStorageScenePhysicalItemConflicts(storedInventory, terminalScene)
  return {
    continuity: carryForward.continuity,
    terminalScene,
    storedInventory,
    returnLedger,
    storageDependencies,
  }
}

function lostSceneTaskInstanceIds(
  terminalScene: ReturnType<typeof createSceneExplorationSnapshot>,
  dependencies: RunReturnDependencies,
): readonly string[] {
  const ids = new Set<string>()
  for (const node of terminalScene.sceneItems.nodeStates) {
    for (const entity of node.items) {
      if (dependencies.lifecycleCatalog.get(entity.item.definitionId).kind === 'quest') {
        ids.add(entity.item.instanceId)
      }
    }
  }
  for (const node of terminalScene.searchState.nodeStates) {
    if (node.kind !== 'unsearched') continue
    for (const entity of node.preparedOutcome.revealedItems) {
      if (dependencies.lifecycleCatalog.get(entity.item.definitionId).kind === 'quest') {
        ids.add(entity.item.instanceId)
      }
    }
  }
  return deepFreeze([...ids].sort())
}

export function buildRunReturnTransitionPlan(
  input: RunReturnInput,
  dependencies: RunReturnDependencies,
): RunReturnTransitionPlan {
  const { continuity, terminalScene } = normalizeInput(input, dependencies)
  const returnKind = terminalScene.status === 'safe-returned' ? 'safe' : 'forced'
  const effects: RunReturnEffect[] = []
  const warehouseIds: string[] = []
  const taskIds: string[] = []
  for (const item of [...terminalScene.backpack.items].sort((left, right) =>
    left.instanceId.localeCompare(right.instanceId),
  )) {
    const destination = dependencies.lifecycleCatalog.get(item.definitionId).kind === 'quest'
      ? 'task-storage'
      : 'warehouse'
    effects.push({
      kind: 'run-item-transferred',
      source: 'backpack',
      destination,
      item,
      itemState: getItemState(terminalScene.itemStates, item.instanceId),
    })
    if (destination === 'warehouse') {
      warehouseIds.push(item.instanceId)
    } else {
      taskIds.push(item.instanceId)
    }
  }
  effects.push({
    kind: 'run-backpack-cleared',
    instanceIds: terminalScene.backpack.items.map(({ instanceId }) => instanceId).sort(),
  })
  effects.push({
    kind: 'run-facts-carried-forward',
    continuity,
    runIntelLog: terminalScene.runIntelLog,
    dailyMedicalUsage: terminalScene.dailyMedicalUsage,
  })
  effects.push({
    kind: 'run-return-recorded',
    sceneInstanceId: terminalScene.sceneInstanceId,
    returnKind,
  })
  const summary: RunReturnSummary = deepFreeze({
    sceneInstanceId: terminalScene.sceneInstanceId,
    returnKind,
    storedWarehouseInstanceIds: warehouseIds,
    storedTaskInstanceIds: taskIds,
    lostSceneTaskInstanceIds: lostSceneTaskInstanceIds(terminalScene, dependencies),
    remainingHealth: terminalScene.condition.currentHealth,
    dailyMedicalUsage: terminalScene.dailyMedicalUsage,
  })
  return deepFreeze({ effects, summary })
}

export function applyRunReturnEffects(
  input: RunReturnInput,
  effects: readonly RunReturnEffect[],
  dependencies: RunReturnDependencies,
): RunReturnResult {
  const expected = buildRunReturnTransitionPlan(input, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) {
    throw new RunReturnError('EFFECT_MISMATCH', '返回结算Effect与冻结正式计划不一致')
  }
  const { continuity, terminalScene, storedInventory, returnLedger } = normalizeInput(input, dependencies)
  const warehouseItems = [...storedInventory.warehouse.items]
  const taskItems = [...storedInventory.taskStorage.items]
  const itemStates = [
    ...storedInventory.itemStates.states,
    ...terminalScene.itemStates.states,
  ]
  for (const effect of effects) {
    if (effect.kind !== 'run-item-transferred') continue
    if (effect.destination === 'warehouse') {
      warehouseItems.push(effect.item)
    } else {
      taskItems.push(effect.item)
    }
  }
  const emptyBackpack = createBackpackSnapshot({
    width: terminalScene.backpack.width,
    height: terminalScene.backpack.height,
    items: [],
    placements: [],
  }, dependencies.scene.physicalCatalog)
  const snapshot = createRunReturnSnapshot({
    continuity,
    player: {
      backpack: emptyBackpack,
      equipment: terminalScene.equipment,
      quickSlots: terminalScene.quickSlots,
      condition: terminalScene.condition,
    },
    warehouse: { items: warehouseItems },
    taskStorage: { items: taskItems },
    itemStates: { states: itemStates },
    runIntelLog: terminalScene.runIntelLog,
    dailyMedicalUsage: terminalScene.dailyMedicalUsage,
    returnLedger: {
      sceneInstanceIds: [...returnLedger.sceneInstanceIds, terminalScene.sceneInstanceId].sort(),
    },
  }, dependencies)
  return deepFreeze({ snapshot, effects: expected.effects, summary: expected.summary })
}

export function resolveRunReturn(
  input: RunReturnInput,
  dependencies: RunReturnDependencies,
): RunReturnResult {
  const plan = buildRunReturnTransitionPlan(input, dependencies)
  return applyRunReturnEffects(input, plan.effects, dependencies)
}
