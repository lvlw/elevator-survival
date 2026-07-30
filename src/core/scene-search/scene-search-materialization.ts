import { deepFreeze } from '../config'
import { createItemInstance, type ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { SceneSearchError } from './scene-search-errors'
import {
  createSceneItemSnapshot,
  createSearchItemState,
} from './scene-item-snapshot'
import type {
  MainSearchDefinition,
  PreparedMainSearchOutcome,
  SearchItemGrant,
} from './scene-search-types'

function stableInstanceId(
  sceneInstanceId: string,
  nodeId: string,
  ordinal: number,
  source: 'fixed' | 'weighted',
  sourceOrdinal: number,
): string {
  return ['search', sceneInstanceId, nodeId, String(ordinal), source, String(sourceOrdinal)]
    .map(encodeURIComponent)
    .join(':')
}

export function materializeMainSearchOutcome(
  runSeed: string,
  sceneInstanceId: string,
  definition: MainSearchDefinition,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): PreparedMainSearchOutcome {
  if (runSeed.trim().length === 0 || sceneInstanceId.trim().length === 0) {
    throw new SceneSearchError('INVALID_SCENE_INSTANCE_ID', '种子和场景实例ID不能为空')
  }
  const materializeGrant = (
    grant: SearchItemGrant,
    source: 'fixed' | 'weighted',
    sourceOrdinal: number,
  ) => {
    const item = createItemInstance(
      {
        instanceId: stableInstanceId(
          sceneInstanceId,
          definition.nodeId,
          definition.searchOrdinal,
          source,
          sourceOrdinal,
        ),
        definitionId: grant.definitionId,
        quantity: grant.quantity,
      },
      itemCatalog,
    )
    return createSceneItemSnapshot(
      {
        item,
        state: createSearchItemState(
          item,
          grant.initialState,
          resourceCatalog,
        ),
      },
      itemCatalog,
      resourceCatalog,
    )
  }
  const items = definition.fixedItemGrants.map((grant, index) =>
    materializeGrant(grant, 'fixed', index),
  )
  let randomTrace = null
  if (definition.weightedItemChoice) {
    const streamId = createStreamId(
      'scene-main-search',
      sceneInstanceId,
      definition.nodeId,
      String(definition.searchOrdinal),
      'weighted-loot',
    )
    const cursor = createRandomCursor(runSeed, streamId)
    const totalWeight = definition.weightedItemChoice.entries.reduce(
      (sum, entry) => sum + entry.weight,
      0,
    )
    const draw = drawIntInclusive(cursor, 1, totalWeight)
    let cumulative = 0
    const selected = definition.weightedItemChoice.entries.find((entry) => {
      cumulative += entry.weight
      return draw.value <= cumulative
    })
    if (!selected) throw new SceneSearchError('INVALID_WEIGHTED_POOL', '加权抽取没有命中候选')
    items.push(materializeGrant(selected.grant, 'weighted', 0))
    randomTrace = {
      algorithmVersion: RANDOM_ALGORITHM_VERSION,
      streamId,
      drawIndex: cursor.drawIndex,
      selectedDefinitionId: selected.grant.definitionId,
    }
  }
  return deepFreeze({
    nodeId: definition.nodeId,
    searchOrdinal: definition.searchOrdinal,
    revealedItems: items,
    revealedIntelIds: [...definition.fixedIntelIds],
    randomTrace,
  })
}
