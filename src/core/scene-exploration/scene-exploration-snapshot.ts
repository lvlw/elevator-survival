import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { createDailyMedicalUsageSnapshot } from '../daily-state'
import { createRunIntelLogSnapshot } from '../run-intel'
import {
  createInitialSceneTaskEventState,
  createSceneTaskEventStateSnapshot,
  validateSceneTaskEventDependencies,
} from '../scene-task-event'
import { createItemStateCollectionSnapshot } from '../item-state'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import {
  getSceneEdgeTraversal,
  validateTraversalAvailability,
} from '../scene-graph'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { validateSceneSearchState } from '../scene-search'
import {
  createInitialSceneCombatState,
  createSceneCombatStateSnapshot,
} from '../scene-combat'
import {
  createEmptySceneItemsSnapshot,
  createSceneItemsSnapshot,
} from '../scene-items'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
  SceneExplorationInitialSnapshotInput,
  SceneExplorationSnapshotInput,
  SceneExplorationStatus,
} from './scene-exploration-types'

const STATUSES: readonly SceneExplorationStatus[] = [
  'active',
  'combat',
  'safe-returned',
  'forced-returned',
  'dead',
]

const SNAPSHOT_KEYS = [
  'alertState',
  'backpack',
  'combatState',
  'condition',
  'currentNodeId',
  'enabledEdgeIds',
  'equipment',
  'itemStates',
  'dailyMedicalUsage',
  'quickSlots',
  'remainingTime',
  'runIntelLog',
  'sceneInstanceId',
  'sceneItems',
  'searchState',
  'status',
  'taskEvents',
] as const

function hasExactSnapshotKeys(value: unknown): value is SceneExplorationSnapshotInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...SNAPSHOT_KEYS].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createSceneExplorationSnapshot(
  input: SceneExplorationSnapshotInput,
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  if (!hasExactSnapshotKeys(input)) {
    throw new SceneExplorationError(
      'INVALID_INPUT',
      '正式场景快照必须包含且只包含全部正式字段',
    )
  }
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
  const sceneItems = createSceneItemsSnapshot(
    input.sceneItems,
    sceneItemsDependencies,
  )
  const alertState = input.alertState
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
  let runIntelLog
  try {
    runIntelLog = createRunIntelLogSnapshot(input.runIntelLog)
  } catch {
    throw new SceneExplorationError('INVALID_INPUT', 'Run情报记录无效')
  }
  let taskEvents
  try {
    taskEvents = createSceneTaskEventStateSnapshot(
      input.taskEvents,
      dependencies.taskEventCatalog,
    )
    validateSceneTaskEventDependencies(
      dependencies.taskEventCatalog,
      dependencies.sceneCombat,
      input.sceneInstanceId,
    )
  } catch {
    throw new SceneExplorationError('INVALID_INPUT', '场景任务事件状态无效')
  }
  const knownIntelIds = new Set(runIntelLog.intelIds)
  for (const node of searchState.nodeStates) {
    if (
      node.kind === 'searched' &&
      node.revealedIntelIds.some((intelId) => !knownIntelIds.has(intelId))
    ) {
      throw new SceneExplorationError('INVALID_INPUT', '已揭示的搜索情报必须保留在Run情报记录中')
    }
  }
  if (dependencies.taskEventCatalog) {
    for (const entry of taskEvents.entries) {
      if (
        entry.status === 'completed' &&
        !knownIntelIds.has(dependencies.taskEventCatalog.get(entry.eventId).originIntelId)
      ) {
        throw new SceneExplorationError('INVALID_INPUT', '已完成任务事件的来源情报必须保留在Run情报记录中')
      }
    }
  }
  let dailyMedicalUsage
  try {
    dailyMedicalUsage = createDailyMedicalUsageSnapshot(
      input.dailyMedicalUsage,
      dependencies.config,
    )
  } catch {
    throw new SceneExplorationError('INVALID_INPUT', '每日医疗使用状态无效')
  }
  const combatState = dependencies.sceneCombat
    ? createSceneCombatStateSnapshot(
        input.combatState,
        input.sceneInstanceId,
        dependencies.sceneCombat,
      )
    : deepFreeze({
        encounters: [],
        usage: {
          metalPipeChargedStrikeUses: input.combatState.usage.metalPipeChargedStrikeUses,
        },
      })
  if (
    dependencies.sceneCombat &&
    dependencies.sceneCombat.combat.sceneInstanceId !== input.sceneInstanceId
  ) {
    throw new SceneExplorationError('INVALID_INPUT', '场景与战斗依赖的场景实例ID不一致')
  }
  if (
    !Number.isSafeInteger(combatState.usage.metalPipeChargedStrikeUses) ||
    combatState.usage.metalPipeChargedStrikeUses < 0
  ) {
    throw new SceneExplorationError('INVALID_INPUT', '场景战斗使用次数无效')
  }
  if (!dependencies.sceneCombat && input.combatState.encounters.length > 0) {
    throw new SceneExplorationError('INVALID_INPUT', '缺少遭遇依赖时不能恢复场景战斗状态')
  }
  const activeEncounters = combatState.encounters.filter(({ kind }) => kind === 'active')
  const activeEncounter = activeEncounters[0]
  if (
    activeEncounter?.kind === 'active' &&
    !dependencies.graph.nodes.some(({ id }) => id === activeEncounter.returnNodeId)
  ) {
    throw new SceneExplorationError('INVALID_INPUT', '战斗逃跑返回节点无效')
  }
  if (activeEncounter?.kind === 'active') {
    if (
      activeEncounter.returnNodeId === activeEncounter.nodeId ||
      !dependencies.graph.edges.some(({ id }) => id === activeEncounter.entryEdgeId)
    ) {
      throw new SceneExplorationError('INVALID_INPUT', '战斗进入来源节点或入口边无效')
    }
    const effectiveEnabledEdgeIds = getEffectiveEnabledEdgeIds(
      { enabledEdgeIds: input.enabledEdgeIds, backpack: carried.backpack },
      dependencies.edgeAccessCatalog,
    )
    try {
      const traversal = getSceneEdgeTraversal(
        dependencies.graph,
        activeEncounter.entryEdgeId,
        activeEncounter.returnNodeId,
        { enabledEdgeIds: effectiveEnabledEdgeIds },
      )
      if (traversal.toNodeId !== activeEncounter.nodeId) {
        throw new Error('entry edge target mismatch')
      }
    } catch {
      throw new SceneExplorationError(
        'INVALID_INPUT',
        '活跃战斗入口边不能从来源节点合法通往遭遇节点',
      )
    }
  }
  const mirrorsCombat = activeEncounter?.kind === 'active' &&
    activeEncounter.nodeId === input.currentNodeId &&
    JSON.stringify(activeEncounter.combat.playerCondition) === JSON.stringify(condition) &&
    JSON.stringify(activeEncounter.combat.backpack) === JSON.stringify(carried.backpack) &&
    JSON.stringify(activeEncounter.combat.equipment) === JSON.stringify(carried.equipment) &&
    JSON.stringify(activeEncounter.combat.quickSlots) === JSON.stringify(carried.quickSlots) &&
    JSON.stringify(activeEncounter.combat.itemStates) === JSON.stringify(itemStates) &&
    JSON.stringify(activeEncounter.combat.usage) === JSON.stringify(combatState.usage)
  if (
    (input.status === 'combat' && (activeEncounters.length !== 1 || !mirrorsCombat)) ||
    (input.status !== 'combat' && activeEncounters.length !== 0)
  ) {
    throw new SceneExplorationError('INVALID_INPUT', '场景状态与活跃战斗遭遇不一致')
  }
  if (input.status === 'combat' && input.remainingTime === 0) {
    throw new SceneExplorationError(
      'INVALID_REMAINING_TIME',
      '战斗中的场景必须保有正场景时间',
    )
  }
  if (input.status === 'active' && dependencies.sceneCombat) {
    const definition = dependencies.sceneCombat.encounterCatalog.getByNodeId(
      input.currentNodeId,
    )
    const encounter = definition
      ? combatState.encounters.find(({ encounterId }) => encounterId === definition.id)
      : null
    if (encounter?.kind === 'dormant' && !encounter.enemy.defeated) {
      throw new SceneExplorationError(
        'INVALID_INPUT',
        '普通active状态不能停留在仍有自动遭遇敌人的节点',
      )
    }
  }
  if (
    ((input.status === 'active' || input.status === 'combat') && condition.currentHealth === 0) ||
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
    dailyMedicalUsage,
    runIntelLog,
    taskEvents,
    combatState,
  })
}

export function createInitialSceneExplorationSnapshot(
  input: SceneExplorationInitialSnapshotInput,
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  const sceneItemsDependencies = {
    graph: dependencies.graph,
    itemCatalog: dependencies.physicalCatalog,
    itemResourceCatalog: dependencies.itemResourceCatalog,
  }
  const combatState = input.combatState ?? (
    dependencies.sceneCombat
      ? createInitialSceneCombatState(input.sceneInstanceId, dependencies.sceneCombat)
      : deepFreeze({
          encounters: [],
          usage: { metalPipeChargedStrikeUses: 0 },
        })
  )
  return createSceneExplorationSnapshot(
    {
      ...input,
      status: 'active',
      alertState: input.alertState ?? 'unalerted',
      sceneItems: input.sceneItems ?? createEmptySceneItemsSnapshot(
        sceneItemsDependencies,
      ),
      dailyMedicalUsage: input.dailyMedicalUsage,
      runIntelLog: input.runIntelLog,
      taskEvents: input.taskEvents ?? createInitialSceneTaskEventState(
        dependencies.taskEventCatalog,
      ),
      combatState,
    },
    dependencies,
  )
}
