import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { createItemStateCollectionSnapshot } from '../item-state'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import { validateTraversalAvailability } from '../scene-graph'
import { validateSceneSearchState } from '../scene-search'
import {
  createEmptySceneItemsSnapshot,
  createSceneItemsSnapshot,
} from '../scene-items'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneExplorationSnapshotInput,
  SceneExplorationStatus,
} from './scene-exploration-types'

const STATUSES: readonly SceneExplorationStatus[] = [
  'active',
  'safe-returned',
  'forced-returned',
  'dead',
]

export function createSceneExplorationSnapshot(
  input: SceneExplorationSnapshotInput,
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  if (!STATUSES.includes(input.status)) {
    throw new SceneExplorationError('INVALID_STATUS', '场景探索状态无效')
  }
  if (
    input.sceneInstanceId.trim().length === 0 ||
    input.searchState.sceneInstanceId !== input.sceneInstanceId
  ) {
    throw new SceneExplorationError(
      'INVALID_INPUT',
      '场景实例ID与搜索状态不一致',
    )
  }
  const searchState = validateSceneSearchState(
    input.searchState,
    dependencies.graph,
    dependencies.physicalCatalog,
    dependencies.itemResourceCatalog,
  )
  const sceneItemsDependencies = {
    graph: dependencies.graph,
    itemCatalog: dependencies.physicalCatalog,
    itemResourceCatalog: dependencies.itemResourceCatalog,
  }
  const sceneItems = input.sceneItems
    ? createSceneItemsSnapshot(input.sceneItems, sceneItemsDependencies)
    : createEmptySceneItemsSnapshot(sceneItemsDependencies)
  const alertState = input.alertState ?? 'unalerted'
  if (alertState !== 'unalerted' && alertState !== 'alerted') {
    throw new SceneExplorationError('INVALID_INPUT', '场景警觉状态无效')
  }
  if (
    input.currentNodeId.trim().length === 0 ||
    !dependencies.graph.nodes.some((node) => node.id === input.currentNodeId)
  ) {
    throw new SceneExplorationError('INVALID_CURRENT_NODE', '当前节点无效')
  }
  if (!Number.isSafeInteger(input.remainingTime) || input.remainingTime < 0) {
    throw new SceneExplorationError(
      'INVALID_REMAINING_TIME',
      '剩余时间必须是非负安全整数',
    )
  }
  validateTraversalAvailability(dependencies.graph, {
    enabledEdgeIds: input.enabledEdgeIds,
  })
  if (
    input.quickSlots.slots.length !==
    dependencies.config.backpack.quickSlotCount
  ) {
    throw new SceneExplorationError(
      'INVALID_INPUT',
      '快捷栏数量与规则配置不一致',
    )
  }
  const carried = createCarriedItemContainersSnapshot(
    input.backpack,
    input.equipment,
    input.quickSlots,
    {
      physicalCatalog: dependencies.physicalCatalog,
      equipmentCatalog: dependencies.equipmentCatalog,
      quickSlotCatalog: dependencies.quickSlotCatalog,
    },
  )
  if (
    carried.backpack.width !== dependencies.config.backpack.width ||
    carried.backpack.height !== dependencies.config.backpack.height
  ) {
    throw new SceneExplorationError(
      'BACKPACK_CONFIG_MISMATCH',
      '背包尺寸与当前规则配置不一致',
    )
  }
  const carriedItems = [
    ...carried.backpack.items,
    ...Object.values(carried.equipment).filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
    ...carried.quickSlots.slots.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
  ]
  const carriedIds = new Set(carriedItems.map((item) => item.instanceId))
  const allSceneIds = new Set<string>(carriedIds)
  for (const node of searchState.nodeStates) {
    const hiddenItems =
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems
        : []
    for (const entity of hiddenItems) {
      if (allSceneIds.has(entity.item.instanceId)) {
        throw new SceneExplorationError(
          'INVALID_INPUT',
          `隐藏搜索结果与其他容器存在重复物品实例：${entity.item.instanceId}`,
        )
      }
      allSceneIds.add(entity.item.instanceId)
    }
  }
  for (const node of sceneItems.nodeStates) {
    for (const entity of node.items) {
      if (allSceneIds.has(entity.item.instanceId)) {
        throw new SceneExplorationError(
          'INVALID_INPUT',
          `节点地面物品与其他容器存在重复物品实例：${entity.item.instanceId}`,
        )
      }
      allSceneIds.add(entity.item.instanceId)
    }
  }
  const itemStates = createItemStateCollectionSnapshot(
    input.itemStates.states,
    carriedItems,
    dependencies.itemResourceCatalog,
  )
  const condition = createPlayerCondition(
    input.condition,
    dependencies.config.combat.player,
  )
  if (
    (input.status === 'active' && condition.currentHealth === 0) ||
    (input.status === 'dead' && condition.currentHealth !== 0)
  ) {
    throw new SceneExplorationError(
      'STATUS_HEALTH_CONFLICT',
      '场景状态与玩家生命矛盾',
    )
  }
  return deepFreeze({
    status: input.status,
    sceneInstanceId: input.sceneInstanceId,
    searchState,
    sceneItems,
    alertState,
    currentNodeId: input.currentNodeId,
    remainingTime: input.remainingTime,
    enabledEdgeIds: [...input.enabledEdgeIds].sort(),
    backpack: carried.backpack,
    equipment: carried.equipment,
    quickSlots: carried.quickSlots,
    itemStates,
    condition,
  })
}

export function createInitialSceneExplorationSnapshot(
  input: Omit<SceneExplorationSnapshotInput, 'status'>,
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  return createSceneExplorationSnapshot(
    { ...input, status: 'active' },
    dependencies,
  )
}
