import { deepFreeze } from '../config'
import type { ItemInstance } from '../inventory'
import { ItemStateError } from './item-state-errors'
import { createItemState } from './item-state'
import type {
  ItemResourceCatalog,
  ItemState,
  ItemStateCollectionSnapshot,
} from './item-state-types'

export function createItemStateCollectionSnapshot(
  states: readonly ItemState[],
  carriedItems: readonly Readonly<ItemInstance>[],
  resourceCatalog: ItemResourceCatalog,
): ItemStateCollectionSnapshot {
  const carriedById = new Map<string, Readonly<ItemInstance>>()
  for (const item of carriedItems) {
    if (carriedById.has(item.instanceId)) {
      throw new ItemStateError(
        'ITEM_STATE_IDENTITY_MISMATCH',
        `随身物品实例重复：${item.instanceId}`,
      )
    }
    carriedById.set(item.instanceId, item)
  }

  const stateById = new Map<string, Readonly<ItemState>>()
  for (const input of states) {
    if (stateById.has(input.instanceId)) {
      throw new ItemStateError(
        'DUPLICATE_ITEM_STATE',
        `物品实例状态重复：${input.instanceId}`,
      )
    }
    const carried = carriedById.get(input.instanceId)
    if (!carried) {
      throw new ItemStateError(
        'EXTRA_ITEM_STATE',
        `物品状态不属于当前随身物品：${input.instanceId}`,
      )
    }
    if (carried.definitionId !== input.definitionId) {
      throw new ItemStateError(
        'ITEM_STATE_IDENTITY_MISMATCH',
        `物品状态定义与随身实例不一致：${input.instanceId}`,
      )
    }
    stateById.set(input.instanceId, createItemState(input, resourceCatalog))
  }

  for (const item of carriedItems) {
    if (!stateById.has(item.instanceId)) {
      throw new ItemStateError(
        'MISSING_ITEM_STATE',
        `随身物品缺少资源状态：${item.instanceId}`,
      )
    }
  }

  return deepFreeze({
    states: [...stateById.values()].sort((left, right) =>
      left.instanceId.localeCompare(right.instanceId),
    ),
  })
}

export function getItemState(
  collection: ItemStateCollectionSnapshot,
  instanceId: string,
): Readonly<ItemState> {
  const state = collection.states.find(
    (candidate) => candidate.instanceId === instanceId,
  )
  if (!state) {
    throw new ItemStateError(
      'UNKNOWN_ITEM_STATE',
      `未知物品实例状态：${instanceId}`,
    )
  }
  return state
}

export function replaceItemState(
  collection: ItemStateCollectionSnapshot,
  replacement: Readonly<ItemState>,
): ItemStateCollectionSnapshot {
  const current = getItemState(collection, replacement.instanceId)
  if (current.definitionId !== replacement.definitionId) {
    throw new ItemStateError(
      'ITEM_STATE_IDENTITY_MISMATCH',
      `替换状态不能改变物品定义：${replacement.instanceId}`,
    )
  }
  return deepFreeze({
    states: collection.states.map((state) =>
      state.instanceId === replacement.instanceId
        ? deepFreeze({
            ...replacement,
            resource: { ...replacement.resource },
          })
        : state,
    ),
  })
}
