import { deepFreeze } from '../config'
import { createItemInstance, type ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'
import type { SceneGraph } from '../scene-graph'
import { createSearchItemState } from './scene-item-snapshot'
import { SceneSearchError } from './scene-search-errors'
import type {
  MainSearchDefinition,
  MainSearchDefinitionCatalog,
  SearchItemGrant,
} from './scene-search-types'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

function normalizeGrant(
  grant: SearchItemGrant,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): SearchItemGrant {
  if (grant.definitionId.trim().length === 0) {
    throw new SceneSearchError('INVALID_GRANT', '物品定义ID不能为空')
  }
  try {
    const item = createItemInstance(
      { instanceId: 'search-grant-validation', ...grant },
      itemCatalog,
    )
    createSearchItemState(item, grant.initialState, resourceCatalog)
  } catch (error) {
    if (error instanceof SceneSearchError) throw error
    throw new SceneSearchError('INVALID_GRANT', `搜索物品产出非法：${grant.definitionId}`)
  }
  return {
    definitionId: grant.definitionId,
    quantity: grant.quantity,
    initialState: { ...grant.initialState },
  }
}

export function createMainSearchDefinitionCatalog(
  definitions: readonly MainSearchDefinition[],
  graph: SceneGraph,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): MainSearchDefinitionCatalog {
  const graphNodeIds = new Set(graph.nodes.map((node) => node.id))
  const byNode = new Map<string, MainSearchDefinition>()
  for (const input of definitions) {
    if (input.nodeId.trim().length === 0) {
      throw new SceneSearchError('INVALID_NODE_ID', '搜索节点ID不能为空')
    }
    if (!graphNodeIds.has(input.nodeId)) {
      throw new SceneSearchError('UNKNOWN_NODE', `搜索定义引用未知节点：${input.nodeId}`)
    }
    if (byNode.has(input.nodeId)) {
      throw new SceneSearchError('DUPLICATE_NODE_DEFINITION', `重复搜索定义：${input.nodeId}`)
    }
    if (!Number.isSafeInteger(input.searchOrdinal) || input.searchOrdinal < 0) {
      throw new SceneSearchError('INVALID_NODE_ID', '搜索序号必须是非负安全整数')
    }
    const fixedItemGrants = input.fixedItemGrants
      .map((grant) => normalizeGrant(grant, itemCatalog, resourceCatalog))
      .sort((a, b) => a.definitionId.localeCompare(b.definitionId))
    let weightedItemChoice = null
    if (input.weightedItemChoice) {
      if (input.weightedItemChoice.entries.length < 2) {
        throw new SceneSearchError('INVALID_WEIGHTED_POOL', '加权池至少需要两个候选')
      }
      const ids = new Set<string>()
      let total = 0n
      const entries = input.weightedItemChoice.entries.map((entry) => {
        const grant = normalizeGrant(
          entry.grant,
          itemCatalog,
          resourceCatalog,
        )
        if (!Number.isSafeInteger(entry.weight) || entry.weight <= 0) {
          throw new SceneSearchError('INVALID_WEIGHT', '权重必须是正安全整数')
        }
        if (ids.has(grant.definitionId)) {
          throw new SceneSearchError('DUPLICATE_WEIGHTED_DEFINITION', '加权池物品定义重复')
        }
        ids.add(grant.definitionId)
        total += BigInt(entry.weight)
        if (total > MAX_SAFE) {
          throw new SceneSearchError('WEIGHT_OVERFLOW', '加权池总权重溢出')
        }
        return { grant, weight: entry.weight }
      })
      entries.sort((a, b) => a.grant.definitionId.localeCompare(b.grant.definitionId))
      weightedItemChoice = { entries }
    }
    const intelIds = new Set<string>()
    const fixedIntelIds = input.fixedIntelIds.map((id) => {
      if (id.trim().length === 0) {
        throw new SceneSearchError('INVALID_INTEL_ID', '情报ID不能为空')
      }
      if (intelIds.has(id)) {
        throw new SceneSearchError('DUPLICATE_INTEL_ID', `重复情报ID：${id}`)
      }
      intelIds.add(id)
      return id
    }).sort()
    byNode.set(input.nodeId, deepFreeze({
      nodeId: input.nodeId,
      searchOrdinal: input.searchOrdinal,
      fixedItemGrants,
      weightedItemChoice,
      fixedIntelIds,
    }))
  }
  return deepFreeze({
    nodeIds: [...byNode.keys()].sort(),
    has: (nodeId: string) => byNode.has(nodeId),
    get: (nodeId: string) => {
      const definition = byNode.get(nodeId)
      if (!definition) {
        throw new SceneSearchError('UNKNOWN_SEARCH_DEFINITION', `节点没有主要搜索定义：${nodeId}`)
      }
      return definition
    },
  })
}
