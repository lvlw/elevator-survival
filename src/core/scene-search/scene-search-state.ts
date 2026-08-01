import { deepFreeze } from '../config'
import type { ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'
import type { SceneGraph } from '../scene-graph'
import { createSceneItemSnapshot } from './scene-item-snapshot'
import { SceneSearchError } from './scene-search-errors'
import { materializeMainSearchOutcome } from './scene-search-materialization'
import type {
  MainSearchState,
  PreparedMainSearchOutcome,
  SceneItemSnapshot,
  SceneSearchStateCreationInput,
  SceneSearchStateSnapshot,
  SearchRandomTrace,
} from './scene-search-types'

type UnknownRecord = Record<string, unknown>

function invalid(message: string): never {
  throw new SceneSearchError('INVALID_SEARCH_STATE', message)
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(
  value: UnknownRecord,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort()
  const normalizedExpected = [...expected].sort()
  return (
    actual.length === normalizedExpected.length &&
    actual.every((key, index) => key === normalizedExpected[index])
  )
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(`${label}必须是非空字符串`)
  }
  return value
}

function normalizeIntelIds(
  value: unknown,
  nodeId: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    invalid(`节点情报列表必须是数组：${nodeId}`)
  }
  const normalized = value.map((intelId) =>
    nonEmptyString(intelId, `节点情报ID：${nodeId}`),
  )
  if (new Set(normalized).size !== normalized.length) {
    invalid(`节点情报ID不得重复：${nodeId}`)
  }
  return normalized.sort((left, right) => left.localeCompare(right))
}

function normalizeItems(
  value: unknown,
  nodeId: string,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): readonly Readonly<SceneItemSnapshot>[] {
  if (!Array.isArray(value)) {
    invalid(`节点揭示物品必须是数组：${nodeId}`)
  }
  return value.map((input) => {
    if (!isRecord(input) || !hasOnlyKeys(input, ['item', 'state'])) {
      invalid(`节点场景物品结构无效：${nodeId}`)
    }
    try {
      return createSceneItemSnapshot(
        input as unknown as SceneItemSnapshot,
        itemCatalog,
        resourceCatalog,
      )
    } catch (error) {
      if (error instanceof SceneSearchError) throw error
      invalid(`节点场景物品无效：${nodeId}`)
    }
  })
}

function normalizeRandomTrace(
  value: unknown,
  nodeId: string,
  items: readonly Readonly<SceneItemSnapshot>[],
): SearchRandomTrace | null {
  if (value === null) return null
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'algorithmVersion',
      'drawIndex',
      'selectedDefinitionId',
      'streamId',
    ])
  ) {
    invalid(`搜索随机追踪结构无效：${nodeId}`)
  }
  const algorithmVersion = nonEmptyString(
    value.algorithmVersion,
    `随机算法版本：${nodeId}`,
  )
  const streamId = nonEmptyString(value.streamId, `随机子流ID：${nodeId}`)
  if (!Number.isSafeInteger(value.drawIndex) || (value.drawIndex as number) < 0) {
    invalid(`随机抽取序号必须是非负安全整数：${nodeId}`)
  }
  const selectedDefinitionId = nonEmptyString(
    value.selectedDefinitionId,
    `随机命中物品定义ID：${nodeId}`,
  )
  if (
    !items.some(
      ({ item }) => item.definitionId === selectedDefinitionId,
    )
  ) {
    invalid(`随机命中物品不在预定揭示结果中：${nodeId}`)
  }
  return {
    algorithmVersion,
    streamId,
    drawIndex: value.drawIndex as number,
    selectedDefinitionId,
  }
}

function normalizePreparedOutcome(
  value: unknown,
  nodeId: string,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): PreparedMainSearchOutcome {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'nodeId',
      'randomTrace',
      'revealedIntelIds',
      'revealedItems',
      'searchOrdinal',
    ])
  ) {
    invalid(`节点预定搜索结果结构无效：${nodeId}`)
  }
  if (nonEmptyString(value.nodeId, `预定结果节点ID：${nodeId}`) !== nodeId) {
    invalid(`外层节点ID与预定结果节点ID不一致：${nodeId}`)
  }
  if (
    !Number.isSafeInteger(value.searchOrdinal) ||
    (value.searchOrdinal as number) < 0
  ) {
    invalid(`搜索序号必须是非负安全整数：${nodeId}`)
  }
  const revealedItems = normalizeItems(
    value.revealedItems,
    nodeId,
    itemCatalog,
    resourceCatalog,
  )
  return {
    nodeId,
    searchOrdinal: value.searchOrdinal as number,
    revealedItems,
    revealedIntelIds: normalizeIntelIds(value.revealedIntelIds, nodeId),
    randomTrace: normalizeRandomTrace(value.randomTrace, nodeId, revealedItems),
  }
}

function normalizeNodeState(
  value: unknown,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): MainSearchState {
  if (!isRecord(value)) invalid('搜索节点状态必须是非空对象')
  const nodeId = nonEmptyString(value.nodeId, '搜索节点ID')
  const kind = value.kind
  if (kind === 'not-available') {
    if (!hasOnlyKeys(value, ['kind', 'nodeId'])) {
      invalid(`不可搜索节点携带了矛盾状态字段：${nodeId}`)
    }
    return { kind, nodeId }
  }
  if (kind === 'unsearched') {
    if (!hasOnlyKeys(value, ['kind', 'nodeId', 'preparedOutcome'])) {
      invalid(`未搜索节点状态字段无效：${nodeId}`)
    }
    return {
      kind,
      nodeId,
      preparedOutcome: normalizePreparedOutcome(
        value.preparedOutcome,
        nodeId,
        itemCatalog,
        resourceCatalog,
      ),
    }
  }
  if (kind === 'searched') {
    if (
      !hasOnlyKeys(value, [
        'kind',
        'nodeId',
        'revealedIntelIds',
      ])
    ) {
      invalid(`已搜索节点状态字段无效：${nodeId}`)
    }
    return {
      kind,
      nodeId,
      revealedIntelIds: normalizeIntelIds(value.revealedIntelIds, nodeId),
    }
  }
  invalid(`未知搜索节点状态判别值：${String(kind)}`)
}

export function validateSceneSearchState(
  state: SceneSearchStateSnapshot,
  graph: SceneGraph,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): SceneSearchStateSnapshot {
  if (
    !isRecord(state) ||
    !hasOnlyKeys(state, ['nodeStates', 'sceneInstanceId'])
  ) {
    invalid('场景搜索状态结构无效')
  }
  const sceneInstanceId = nonEmptyString(
    state.sceneInstanceId,
    '场景实例ID',
  )
  if (!Array.isArray(state.nodeStates)) {
    invalid('搜索节点状态集合必须是数组')
  }
  const nodeStates = state.nodeStates.map((node) =>
    normalizeNodeState(node, itemCatalog, resourceCatalog),
  )
  const expected = graph.nodes.map((node) => node.id).sort()
  const actual = nodeStates.map((node) => node.nodeId).sort()
  if (
    new Set(actual).size !== actual.length ||
    actual.length !== expected.length ||
    actual.some((nodeId, index) => nodeId !== expected[index])
  ) {
    invalid('搜索状态节点集合与场景图不一致')
  }
  const instanceIds = new Set<string>()
  for (const node of nodeStates) {
    const nodeItems =
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems
        : []
    for (const entity of nodeItems) {
      if (instanceIds.has(entity.item.instanceId)) {
        throw new SceneSearchError(
          'DUPLICATE_INSTANCE_ID',
          `搜索实例ID重复：${entity.item.instanceId}`,
        )
      }
      instanceIds.add(entity.item.instanceId)
    }
  }
  return deepFreeze({
    sceneInstanceId,
    nodeStates: nodeStates.sort((left, right) =>
      left.nodeId.localeCompare(right.nodeId),
    ),
  })
}

export function createSceneSearchState(
  input: SceneSearchStateCreationInput,
): SceneSearchStateSnapshot {
  if (input.sceneInstanceId.trim().length === 0) {
    throw new SceneSearchError('INVALID_SCENE_INSTANCE_ID', '场景实例ID不能为空')
  }
  const nodeStates: MainSearchState[] = input.graph.nodes.map((node) =>
    input.searchCatalog.has(node.id)
      ? {
          kind: 'unsearched',
          nodeId: node.id,
          preparedOutcome: materializeMainSearchOutcome(
            input.runSeed,
            input.sceneInstanceId,
            input.searchCatalog.get(node.id),
            input.itemCatalog,
            input.itemResourceCatalog,
          ),
        }
      : { kind: 'not-available', nodeId: node.id },
  )
  return validateSceneSearchState(
    { sceneInstanceId: input.sceneInstanceId, nodeStates },
    input.graph,
    input.itemCatalog,
    input.itemResourceCatalog,
  )
}

export function revealPreparedMainSearchOutcome(
  state: SceneSearchStateSnapshot,
  nodeId: string,
): SceneSearchStateSnapshot {
  const target = state.nodeStates.find((node) => node.nodeId === nodeId)
  if (!target) throw new SceneSearchError('UNKNOWN_NODE', `未知节点：${nodeId}`)
  if (target.kind === 'not-available') {
    throw new SceneSearchError('NODE_NOT_SEARCHABLE', `节点不可搜索：${nodeId}`)
  }
  if (target.kind === 'searched') {
    throw new SceneSearchError('ALREADY_SEARCHED', `节点已完成主要搜索：${nodeId}`)
  }
  return deepFreeze({
    sceneInstanceId: state.sceneInstanceId,
    nodeStates: state.nodeStates.map((node) =>
      node.nodeId === nodeId
        ? {
            kind: 'searched' as const,
            nodeId,
            revealedIntelIds: [...target.preparedOutcome.revealedIntelIds],
          }
        : node,
    ),
  })
}
