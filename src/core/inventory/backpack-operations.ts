import { deepFreeze } from '../config'
import { InventoryError } from './inventory-errors'
import {
  createBackpackSnapshot,
  previewBackpackPlacement,
} from './backpack-layout'
import type {
  BackpackPlacement,
  BackpackSnapshot,
  RemoveBackpackItemResult,
} from './backpack-types'
import type { ItemCatalog, ItemInstance } from './item-types'

function assertPreviewCanPlace(
  preview: ReturnType<typeof previewBackpackPlacement>,
): void {
  if (!preview.canPlace) {
    throw new InventoryError(preview.reason, `物品放置失败：${preview.reason}`)
  }
}

export function addItemToBackpack(
  snapshot: BackpackSnapshot,
  item: ItemInstance,
  placement: BackpackPlacement,
  catalog: ItemCatalog,
): BackpackSnapshot {
  if (snapshot.items.some((candidate) => candidate.instanceId === item.instanceId)) {
    throw new InventoryError(
      'DUPLICATE_INSTANCE_ID',
      `背包已存在实例：${item.instanceId}`,
    )
  }
  assertPreviewCanPlace(
    previewBackpackPlacement(snapshot, item, placement, catalog),
  )
  return createBackpackSnapshot(
    {
      width: snapshot.width,
      height: snapshot.height,
      items: [...snapshot.items, item],
      placements: [...snapshot.placements, placement],
    },
    catalog,
  )
}

export function moveBackpackItem(
  snapshot: BackpackSnapshot,
  instanceId: string,
  nextPlacement: BackpackPlacement,
  catalog: ItemCatalog,
): BackpackSnapshot {
  const item = snapshot.items.find((candidate) => candidate.instanceId === instanceId)
  if (!item) {
    throw new InventoryError('UNKNOWN_INSTANCE', `未知背包实例：${instanceId}`)
  }
  if (nextPlacement.instanceId !== instanceId) {
    throw new InventoryError(
      'INVALID_PLACEMENT',
      '移动摆放的实例ID必须与目标实例一致',
    )
  }
  assertPreviewCanPlace(
    previewBackpackPlacement(
      snapshot,
      item,
      nextPlacement,
      catalog,
      instanceId,
    ),
  )
  return createBackpackSnapshot(
    {
      width: snapshot.width,
      height: snapshot.height,
      items: snapshot.items,
      placements: snapshot.placements.map((placement) =>
        placement.instanceId === instanceId ? nextPlacement : placement,
      ),
    },
    catalog,
  )
}

export function removeItemFromBackpack(
  snapshot: BackpackSnapshot,
  instanceId: string,
  catalog: ItemCatalog,
): RemoveBackpackItemResult {
  const item = snapshot.items.find((candidate) => candidate.instanceId === instanceId)
  if (!item) {
    throw new InventoryError('UNKNOWN_INSTANCE', `未知背包实例：${instanceId}`)
  }
  const nextSnapshot = createBackpackSnapshot(
    {
      width: snapshot.width,
      height: snapshot.height,
      items: snapshot.items.filter((candidate) => candidate.instanceId !== instanceId),
      placements: snapshot.placements.filter(
        (placement) => placement.instanceId !== instanceId,
      ),
    },
    catalog,
  )
  return deepFreeze({ snapshot: nextSnapshot, removedItem: { ...item } })
}
