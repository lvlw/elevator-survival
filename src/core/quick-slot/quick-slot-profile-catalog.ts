import { deepFreeze } from '../config'
import { QuickSlotError } from './quick-slot-errors'
import type {
  ItemQuickSlotProfile,
  QuickSlotProfileCatalog,
} from './quick-slot-types'

export function createQuickSlotProfileCatalog(
  profiles: readonly ItemQuickSlotProfile[],
  physicalDefinitionIds: readonly string[],
): QuickSlotProfileCatalog {
  const physicalIds = new Set<string>()
  for (const id of physicalDefinitionIds) {
    if (id.trim().length === 0) {
      throw new QuickSlotError('INVALID_DEFINITION_ID', '物理定义ID不能为空')
    }
    if (physicalIds.has(id)) {
      throw new QuickSlotError(
        'UNKNOWN_PHYSICAL_DEFINITION',
        `物理目录包含重复ID：${id}`,
      )
    }
    physicalIds.add(id)
  }

  const byId = new Map<string, ItemQuickSlotProfile>()
  for (const input of profiles) {
    if (input.definitionId.trim().length === 0) {
      throw new QuickSlotError('INVALID_DEFINITION_ID', '资格档案ID不能为空')
    }
    if (!physicalIds.has(input.definitionId)) {
      throw new QuickSlotError(
        'UNKNOWN_PHYSICAL_DEFINITION',
        `资格档案引用未知物理定义：${input.definitionId}`,
      )
    }
    if (byId.has(input.definitionId)) {
      throw new QuickSlotError(
        'DUPLICATE_PROFILE',
        `重复快捷栏资格档案：${input.definitionId}`,
      )
    }
    if (input.kind !== 'eligible' && input.kind !== 'not-eligible') {
      throw new QuickSlotError('INVALID_PROFILE', '快捷栏资格类型无效')
    }
    byId.set(input.definitionId, deepFreeze({ ...input }))
  }

  for (const id of physicalIds) {
    if (!byId.has(id)) {
      throw new QuickSlotError('MISSING_PROFILE', `物理定义缺少快捷栏资格：${id}`)
    }
  }

  return deepFreeze({
    definitionIds: [...byId.keys()].sort(),
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const profile = byId.get(definitionId)
      if (!profile) {
        throw new QuickSlotError('UNKNOWN_PROFILE', `未知快捷栏资格：${definitionId}`)
      }
      return profile
    },
  })
}
