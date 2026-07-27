import { deepFreeze } from '../config'
import { EquipmentError } from './equipment-errors'
import type {
  EquipmentProfileCatalog,
  EquipmentSlotKind,
  ItemEquipmentProfile,
} from './equipment-types'

const SLOT_ORDER: readonly EquipmentSlotKind[] = ['weapon', 'armor', 'utility']

export function createEquipmentProfileCatalog(
  profiles: readonly ItemEquipmentProfile[],
  physicalDefinitionIds: readonly string[],
): EquipmentProfileCatalog {
  const physicalIds = new Set<string>()
  for (const id of physicalDefinitionIds) {
    if (id.trim().length === 0) {
      throw new EquipmentError('INVALID_DEFINITION_ID', '物品定义ID不能为空')
    }
    if (physicalIds.has(id)) {
      throw new EquipmentError(
        'UNKNOWN_PHYSICAL_DEFINITION',
        `物理目录包含重复ID：${id}`,
      )
    }
    physicalIds.add(id)
  }

  const byId = new Map<string, ItemEquipmentProfile>()
  for (const input of profiles) {
    if (input.definitionId.trim().length === 0) {
      throw new EquipmentError('INVALID_DEFINITION_ID', '资格档案ID不能为空')
    }
    if (!physicalIds.has(input.definitionId)) {
      throw new EquipmentError(
        'UNKNOWN_PHYSICAL_DEFINITION',
        `资格档案引用未知物理定义：${input.definitionId}`,
      )
    }
    if (byId.has(input.definitionId)) {
      throw new EquipmentError(
        'DUPLICATE_PROFILE',
        `重复装备资格档案：${input.definitionId}`,
      )
    }

    let profile: ItemEquipmentProfile
    if (input.kind === 'not-equippable') {
      if ('eligibleSlots' in input) {
        throw new EquipmentError(
          'INVALID_PROFILE',
          `不可装备档案不能携带槽位：${input.definitionId}`,
        )
      }
      profile = { definitionId: input.definitionId, kind: input.kind }
    } else if (input.kind === 'equippable') {
      if (input.eligibleSlots.length === 0) {
        throw new EquipmentError(
          'INVALID_PROFILE',
          `可装备档案至少需要一个槽位：${input.definitionId}`,
        )
      }
      const slots = [...input.eligibleSlots]
      if (slots.some((slot) => !SLOT_ORDER.includes(slot))) {
        throw new EquipmentError('INVALID_SLOT', '装备槽位无效')
      }
      if (new Set(slots).size !== slots.length) {
        throw new EquipmentError('DUPLICATE_SLOT', '装备槽位重复')
      }
      slots.sort((left, right) => SLOT_ORDER.indexOf(left) - SLOT_ORDER.indexOf(right))
      profile = {
        definitionId: input.definitionId,
        kind: input.kind,
        eligibleSlots: slots,
      }
    } else {
      throw new EquipmentError('INVALID_PROFILE', '装备资格类型无效')
    }
    byId.set(input.definitionId, deepFreeze(profile))
  }

  for (const id of physicalIds) {
    if (!byId.has(id)) {
      throw new EquipmentError(
        'MISSING_EQUIPMENT_PROFILE',
        `物理定义缺少装备资格档案：${id}`,
      )
    }
  }

  return deepFreeze({
    definitionIds: [...byId.keys()].sort(),
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const profile = byId.get(definitionId)
      if (!profile) {
        throw new EquipmentError(
          'UNKNOWN_EQUIPMENT_PROFILE',
          `未知装备资格档案：${definitionId}`,
        )
      }
      return profile
    },
  })
}
