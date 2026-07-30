import { deepFreeze } from '../config'
import {
  createItemInstance,
  type ItemCatalog,
} from '../inventory'
import {
  createItemState,
  type ItemResourceCatalog,
} from '../item-state'
import { SceneSearchError } from './scene-search-errors'
import type {
  SceneItemSnapshot,
  SearchItemInitialState,
} from './scene-search-types'

function hasOnlyKeys(
  value: object,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort()
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index])
  )
}

export function createSceneItemSnapshot(
  input: SceneItemSnapshot,
  itemCatalog: ItemCatalog,
  resourceCatalog: ItemResourceCatalog,
): Readonly<SceneItemSnapshot> {
  const item = createItemInstance(input.item, itemCatalog)
  const state = createItemState(input.state, resourceCatalog)
  if (
    item.instanceId !== state.instanceId ||
    item.definitionId !== state.definitionId
  ) {
    throw new SceneSearchError(
      'ITEM_IDENTITY_MISMATCH',
      `场景物品物理实例与资源状态身份不一致：${item.instanceId}`,
    )
  }
  return deepFreeze({ item, state })
}

export function createSearchItemState(
  identity: Readonly<{ instanceId: string; definitionId: string }>,
  initialState: SearchItemInitialState,
  resourceCatalog: ItemResourceCatalog,
) {
  if (
    !initialState ||
    typeof initialState !== 'object' ||
    (initialState.kind !== 'none' && initialState.kind !== 'explicit')
  ) {
    throw new SceneSearchError(
      'INVALID_INITIAL_STATE',
      `搜索物品必须显式声明初始资源状态：${identity.definitionId}`,
    )
  }
  const profile = resourceCatalog.get(identity.definitionId)
  if (initialState.kind === 'none') {
    if (!hasOnlyKeys(initialState, ['kind']) || profile.kind !== 'none') {
      throw new SceneSearchError(
        'INVALID_INITIAL_STATE',
        `none初始状态只能用于无资源物品：${identity.definitionId}`,
      )
    }
    return createItemState(
      { ...identity, resource: { kind: 'none' } },
      resourceCatalog,
    )
  }
  if (
    !hasOnlyKeys(initialState, ['current', 'kind']) ||
    profile.kind === 'none'
  ) {
    throw new SceneSearchError(
      'INVALID_INITIAL_STATE',
      `explicit初始状态必须用于有资源物品：${identity.definitionId}`,
    )
  }
  try {
    return createItemState(
      {
        ...identity,
        resource: {
          kind: profile.kind,
          current: initialState.current,
        },
      },
      resourceCatalog,
    )
  } catch {
    throw new SceneSearchError(
      'INVALID_INITIAL_STATE',
      `搜索物品初始资源值非法：${identity.definitionId}`,
    )
  }
}
