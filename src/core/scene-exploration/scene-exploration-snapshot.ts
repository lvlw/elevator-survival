import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { createBackpackSnapshot } from '../inventory'
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
    backpack: createBackpackSnapshot(
      input.backpack,
      dependencies.physicalCatalog,
    ),
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
