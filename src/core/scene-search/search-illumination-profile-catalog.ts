import { deepFreeze } from '../config'
import { SceneSearchError } from './scene-search-errors'
import type {
  ItemSearchIlluminationProfile,
  SearchIlluminationProfileCatalog,
} from './scene-search-types'

export function createSearchIlluminationProfileCatalog(
  profiles: readonly ItemSearchIlluminationProfile[],
  physicalDefinitionIds: readonly string[],
): SearchIlluminationProfileCatalog {
  const physicalIds = new Set(physicalDefinitionIds)
  if (
    physicalIds.size !== physicalDefinitionIds.length ||
    physicalDefinitionIds.some((id) => id.trim().length === 0)
  ) {
    throw new SceneSearchError(
      'INVALID_ILLUMINATION_PROFILE',
      '物理物品ID必须非空且唯一',
    )
  }

  const byId = new Map<string, ItemSearchIlluminationProfile>()
  for (const input of profiles) {
    if (
      input.definitionId.trim().length === 0 ||
      !physicalIds.has(input.definitionId) ||
      (input.kind !== 'not-provider' &&
        input.kind !== 'low-light-provider')
    ) {
      throw new SceneSearchError(
        'INVALID_ILLUMINATION_PROFILE',
        `搜索照明资格档案无效：${input.definitionId}`,
      )
    }
    if (byId.has(input.definitionId)) {
      throw new SceneSearchError(
        'DUPLICATE_ILLUMINATION_PROFILE',
        `搜索照明资格档案重复：${input.definitionId}`,
      )
    }
    byId.set(input.definitionId, deepFreeze({ ...input }))
  }

  for (const definitionId of physicalIds) {
    if (!byId.has(definitionId)) {
      throw new SceneSearchError(
        'MISSING_ILLUMINATION_PROFILE',
        `物品缺少搜索照明资格档案：${definitionId}`,
      )
    }
  }

  return deepFreeze({
    definitionIds: [...byId.keys()].sort(),
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const profile = byId.get(definitionId)
      if (!profile) {
        throw new SceneSearchError(
          'UNKNOWN_ILLUMINATION_PROFILE',
          `未知搜索照明资格档案：${definitionId}`,
        )
      }
      return profile
    },
  })
}
