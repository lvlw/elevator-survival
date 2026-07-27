import { deepFreeze } from '../config'
import { InventoryError } from './inventory-errors'
import type {
  ItemCatalog,
  ItemDefinition,
  ItemDimensions,
  ItemInstance,
} from './item-types'

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InventoryError('INVALID_ITEM_SIZE', `${label}必须是正安全整数`)
  }
}

function validateAndCloneDefinition(
  definition: ItemDefinition,
): ItemDefinition {
  if (!isNonEmpty(definition.id)) {
    throw new InventoryError('INVALID_DEFINITION_ID', '物品定义ID不能为空')
  }
  if (!isNonEmpty(definition.name)) {
    throw new InventoryError('INVALID_DEFINITION_NAME', '物品名称不能为空')
  }
  assertPositiveSafeInteger(definition.width, '物品宽度')
  assertPositiveSafeInteger(definition.height, '物品高度')
  if (!Number.isSafeInteger(definition.unitWeight) || definition.unitWeight < 0) {
    throw new InventoryError(
      'INVALID_UNIT_WEIGHT',
      '物品单位重量必须是非负安全整数',
    )
  }
  if (typeof definition.canRotate !== 'boolean') {
    throw new InventoryError('INVALID_ITEM_SIZE', '物品旋转许可必须是布尔值')
  }

  if (
    definition.stacking.kind !== 'none' &&
    definition.stacking.kind !== 'stackable'
  ) {
    throw new InventoryError('INVALID_STACKING', '物品堆叠类型无效')
  }
  if (definition.stacking.kind === 'stackable') {
    if (
      definition.width !== 1 ||
      definition.height !== 1 ||
      !Number.isSafeInteger(definition.stacking.maxQuantity) ||
      definition.stacking.maxQuantity < 2
    ) {
      throw new InventoryError(
        'INVALID_STACKING',
        '只有1×1物品可以堆叠，且最大数量必须至少为2',
      )
    }
  }

  return {
    ...definition,
    stacking: { ...definition.stacking },
  }
}

export function createItemCatalog(
  definitions: readonly ItemDefinition[],
): ItemCatalog {
  const byId = new Map<string, Readonly<ItemDefinition>>()

  for (const input of definitions) {
    const definition = deepFreeze(validateAndCloneDefinition(input))
    if (byId.has(definition.id)) {
      throw new InventoryError(
        'DUPLICATE_DEFINITION_ID',
        `重复物品定义ID：${definition.id}`,
      )
    }
    byId.set(definition.id, definition)
  }

  const definitionIds = [...byId.keys()].sort()
  return deepFreeze({
    definitionIds,
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const definition = byId.get(definitionId)
      if (!definition) {
        throw new InventoryError(
          'UNKNOWN_DEFINITION',
          `未知物品定义：${definitionId}`,
        )
      }
      return definition
    },
  })
}

export function createItemInstance(
  input: ItemInstance,
  catalog: ItemCatalog,
): Readonly<ItemInstance> {
  if (!isNonEmpty(input.instanceId)) {
    throw new InventoryError('INVALID_INSTANCE_ID', '物品实例ID不能为空')
  }
  const definition = catalog.get(input.definitionId)
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw new InventoryError('INVALID_QUANTITY', '物品数量必须是正安全整数')
  }
  if (definition.stacking.kind === 'none' && input.quantity !== 1) {
    throw new InventoryError('INVALID_QUANTITY', '非堆叠物品数量必须为1')
  }
  if (
    definition.stacking.kind === 'stackable' &&
    input.quantity > definition.stacking.maxQuantity
  ) {
    throw new InventoryError('INVALID_QUANTITY', '物品数量超过堆叠上限')
  }

  return deepFreeze({ ...input })
}

export function getItemDimensions(
  definition: Readonly<ItemDefinition>,
  rotated: boolean,
): ItemDimensions {
  if (rotated && !definition.canRotate) {
    throw new InventoryError(
      'ILLEGAL_ROTATION',
      `物品${definition.id}不允许旋转`,
    )
  }
  return deepFreeze(
    rotated
      ? { width: definition.height, height: definition.width }
      : { width: definition.width, height: definition.height },
  )
}
