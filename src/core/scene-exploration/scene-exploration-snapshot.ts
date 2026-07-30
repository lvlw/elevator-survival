import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { createItemStateCollectionSnapshot } from '../item-state'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import { validateTraversalAvailability } from '../scene-graph'
import { validateSceneSearchState } from '../scene-search'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
} from './scene-exploration-types'

const STATUSES: readonly SceneExplorationStatus[] = [
  'active',
  'safe-returned',
  'forced-returned',
  'dead',
]

export function createSceneExplorationSnapshot(
  input: SceneExplorationSnapshot,
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
  for (const node of searchState.nodeStates) {
    const sceneItems =
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems
        : node.kind === 'searched'
          ? node.revealedItems
          : []
    for (const entity of sceneItems) {
      if (carriedIds.has(entity.item.instanceId)) {
        throw new SceneExplorationError(
          'INVALID_INPUT',
          `场景节点与随身容器存在重复物品实例：${entity.item.instanceId}`,
        )
      }
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
  input: Omit<SceneExplorationSnapshot, 'status'>,
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  return createSceneExplorationSnapshot(
    { ...input, status: 'active' },
    dependencies,
  )
}
