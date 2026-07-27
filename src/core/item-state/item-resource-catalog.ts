import { deepFreeze } from '../config'
import { ItemStateError } from './item-state-errors'
import type {
  ItemResourceCatalog,
  ItemResourceProfile,
  ItemResourceKind,
} from './item-state-types'

const RESOURCE_KINDS: readonly ItemResourceKind[] = [
  'none',
  'durability',
  'integrity',
  'charge',
]

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

export function createItemResourceCatalog(
  profiles: readonly ItemResourceProfile[],
  physicalDefinitionIds: readonly string[],
): ItemResourceCatalog {
  const physicalIds = new Set<string>()
  for (const id of physicalDefinitionIds) {
    if (!isNonEmpty(id)) {
      throw new ItemStateError(
        'INVALID_DEFINITION_ID',
        '物品定义ID不能为空',
      )
    }
    if (physicalIds.has(id)) {
      throw new ItemStateError(
        'DUPLICATE_PHYSICAL_DEFINITION',
        `重复物品物理定义ID：${id}`,
      )
    }
    physicalIds.add(id)
  }

  const byId = new Map<string, ItemResourceProfile>()
  for (const input of profiles) {
    if (!isNonEmpty(input.definitionId)) {
      throw new ItemStateError(
        'INVALID_DEFINITION_ID',
        '资源档案的物品定义ID不能为空',
      )
    }
    if (!RESOURCE_KINDS.includes(input.kind)) {
      throw new ItemStateError(
        'RESOURCE_KIND_MISMATCH',
        `无效资源类型：${String(input.kind)}`,
      )
    }
    if (!physicalIds.has(input.definitionId)) {
      throw new ItemStateError(
        'UNKNOWN_PHYSICAL_DEFINITION',
        `资源档案引用未知物理定义：${input.definitionId}`,
      )
    }
    if (byId.has(input.definitionId)) {
      throw new ItemStateError(
        'DUPLICATE_PROFILE',
        `重复资源档案：${input.definitionId}`,
      )
    }
    if (
      input.kind !== 'none' &&
      (!Number.isSafeInteger(input.maximum) || input.maximum <= 0)
    ) {
      throw new ItemStateError(
        'INVALID_MAXIMUM',
        `资源上限必须是正安全整数：${input.definitionId}`,
      )
    }
    if (input.kind === 'none' && 'maximum' in input) {
      throw new ItemStateError(
        'INVALID_MAXIMUM',
        `无资源档案不能设置资源上限：${input.definitionId}`,
      )
    }
    byId.set(input.definitionId, deepFreeze({ ...input }))
  }

  for (const id of physicalIds) {
    if (!byId.has(id)) {
      throw new ItemStateError(
        'MISSING_RESOURCE_PROFILE',
        `物理定义缺少资源档案：${id}`,
      )
    }
  }

  const definitionIds = [...byId.keys()].sort()
  return deepFreeze({
    definitionIds,
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const profile = byId.get(definitionId)
      if (!profile) {
        throw new ItemStateError(
          'UNKNOWN_RESOURCE_PROFILE',
          `未知物品资源档案：${definitionId}`,
        )
      }
      return profile
    },
  })
}
