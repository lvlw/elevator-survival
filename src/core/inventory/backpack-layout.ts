import { deepFreeze } from '../config'
import { InventoryError, type InventoryErrorCode } from './inventory-errors'
import { createItemInstance, getItemDimensions } from './item-catalog'
import type {
  BackpackPlacement,
  BackpackPlacementPreview,
  BackpackSnapshot,
  OccupiedCell,
  PlacementFailureReason,
} from './backpack-types'
import type { ItemCatalog, ItemInstance } from './item-types'

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function assertBackpackDimension(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InventoryError(
      'INVALID_BACKPACK_SIZE',
      `${label}必须是正安全整数`,
    )
  }
}

function assertPlacementCoordinates(placement: BackpackPlacement): void {
  if (
    !Number.isSafeInteger(placement.x) ||
    placement.x < 0 ||
    !Number.isSafeInteger(placement.y) ||
    placement.y < 0
  ) {
    throw new InventoryError(
      'INVALID_PLACEMENT',
      '背包坐标必须是非负安全整数',
    )
  }
}

function cellsForPlacement(
  instanceId: string,
  placement: BackpackPlacement,
  width: number,
  height: number,
): readonly OccupiedCell[] {
  const cells: OccupiedCell[] = []
  for (let y = placement.y; y < placement.y + height; y += 1) {
    for (let x = placement.x; x < placement.x + width; x += 1) {
      cells.push({ x, y, instanceId })
    }
  }
  return cells
}

function previewFailure(
  reason: PlacementFailureReason,
  width: number | null = null,
  height: number | null = null,
): BackpackPlacementPreview {
  return deepFreeze({ canPlace: false, reason, width, height, cells: [] })
}

export function previewBackpackPlacement(
  snapshot: BackpackSnapshot,
  item: ItemInstance,
  placement: BackpackPlacement,
  catalog: ItemCatalog,
  ignoreInstanceId?: string,
): BackpackPlacementPreview {
  if (!catalog.has(item.definitionId)) {
    return previewFailure('UNKNOWN_DEFINITION')
  }
  if (
    !Number.isSafeInteger(placement.x) ||
    placement.x < 0 ||
    !Number.isSafeInteger(placement.y) ||
    placement.y < 0
  ) {
    return previewFailure('INVALID_PLACEMENT')
  }

  let dimensions
  try {
    dimensions = getItemDimensions(
      catalog.get(item.definitionId),
      placement.rotated,
    )
  } catch (error) {
    if (error instanceof InventoryError && error.code === 'ILLEGAL_ROTATION') {
      return previewFailure('ILLEGAL_ROTATION')
    }
    throw error
  }

  if (
    placement.x + dimensions.width > snapshot.width ||
    placement.y + dimensions.height > snapshot.height
  ) {
    return previewFailure(
      'OUT_OF_BOUNDS',
      dimensions.width,
      dimensions.height,
    )
  }

  const cells = cellsForPlacement(
    item.instanceId,
    placement,
    dimensions.width,
    dimensions.height,
  )
  const occupied = new Set(
    getOccupiedCells(snapshot, catalog)
      .filter((cell) => cell.instanceId !== ignoreInstanceId)
      .map((cell) => `${cell.x},${cell.y}`),
  )
  if (cells.some((cell) => occupied.has(`${cell.x},${cell.y}`))) {
    return previewFailure('OVERLAP', dimensions.width, dimensions.height)
  }

  return deepFreeze({
    canPlace: true,
    width: dimensions.width,
    height: dimensions.height,
    cells,
  })
}

function throwPreviewFailure(
  preview: Extract<BackpackPlacementPreview, { readonly canPlace: false }>,
): never {
  const mapping: Record<PlacementFailureReason, InventoryErrorCode> = {
    UNKNOWN_DEFINITION: 'UNKNOWN_DEFINITION',
    ILLEGAL_ROTATION: 'ILLEGAL_ROTATION',
    INVALID_PLACEMENT: 'INVALID_PLACEMENT',
    OUT_OF_BOUNDS: 'OUT_OF_BOUNDS',
    OVERLAP: 'OVERLAP',
  }
  throw new InventoryError(mapping[preview.reason], `物品放置失败：${preview.reason}`)
}

export function createBackpackSnapshot(
  input: BackpackSnapshot,
  catalog: ItemCatalog,
): BackpackSnapshot {
  assertBackpackDimension(input.width, '背包宽度')
  assertBackpackDimension(input.height, '背包高度')
  if (!Number.isSafeInteger(input.width * input.height)) {
    throw new InventoryError('INVALID_BACKPACK_SIZE', '背包总格数超出安全整数范围')
  }

  const instanceIds = new Set<string>()
  const items = input.items.map((item) => {
    const instance = createItemInstance(item, catalog)
    if (instanceIds.has(instance.instanceId)) {
      throw new InventoryError(
        'DUPLICATE_INSTANCE_ID',
        `重复物品实例ID：${instance.instanceId}`,
      )
    }
    instanceIds.add(instance.instanceId)
    return instance
  })

  const placementIds = new Set<string>()
  const placements = input.placements.map((placement) => {
    assertPlacementCoordinates(placement)
    if (!instanceIds.has(placement.instanceId)) {
      throw new InventoryError(
        'UNKNOWN_PLACEMENT_INSTANCE',
        `摆放引用未知实例：${placement.instanceId}`,
      )
    }
    if (placementIds.has(placement.instanceId)) {
      throw new InventoryError(
        'DUPLICATE_PLACEMENT',
        `实例存在多个摆放：${placement.instanceId}`,
      )
    }
    placementIds.add(placement.instanceId)
    return { ...placement }
  })

  for (const instanceId of instanceIds) {
    if (!placementIds.has(instanceId)) {
      throw new InventoryError(
        'MISSING_PLACEMENT',
        `实例缺少摆放：${instanceId}`,
      )
    }
  }

  items.sort((left, right) => compareIds(left.instanceId, right.instanceId))
  placements.sort((left, right) => compareIds(left.instanceId, right.instanceId))
  const emptySnapshot = deepFreeze({
    width: input.width,
    height: input.height,
    items: [],
    placements: [],
  })
  const validatedPlacements: BackpackPlacement[] = []

  for (const item of items) {
    const placement = placements.find(
      (candidate) => candidate.instanceId === item.instanceId,
    )!
    const partialSnapshot = deepFreeze({
      width: input.width,
      height: input.height,
      items: items.filter((candidate) =>
        validatedPlacements.some(
          (validated) => validated.instanceId === candidate.instanceId,
        ),
      ),
      placements: [...validatedPlacements],
    })
    const preview = previewBackpackPlacement(
      validatedPlacements.length === 0 ? emptySnapshot : partialSnapshot,
      item,
      placement,
      catalog,
    )
    if (!preview.canPlace) throwPreviewFailure(preview)
    validatedPlacements.push(placement)
  }

  return deepFreeze({
    width: input.width,
    height: input.height,
    items,
    placements,
  })
}

export function createEmptyBackpack(
  width: number,
  height: number,
  catalog: ItemCatalog,
): BackpackSnapshot {
  return createBackpackSnapshot({ width, height, items: [], placements: [] }, catalog)
}

export function getOccupiedCells(
  snapshot: BackpackSnapshot,
  catalog: ItemCatalog,
): readonly Readonly<OccupiedCell>[] {
  const itemById = new Map(snapshot.items.map((item) => [item.instanceId, item]))
  const cells = snapshot.placements.flatMap((placement) => {
    const item = itemById.get(placement.instanceId)
    if (!item) {
      throw new InventoryError(
        'UNKNOWN_PLACEMENT_INSTANCE',
        `摆放引用未知实例：${placement.instanceId}`,
      )
    }
    const dimensions = getItemDimensions(
      catalog.get(item.definitionId),
      placement.rotated,
    )
    return cellsForPlacement(
      item.instanceId,
      placement,
      dimensions.width,
      dimensions.height,
    )
  })
  cells.sort(
    (left, right) =>
      left.y - right.y ||
      left.x - right.x ||
      compareIds(left.instanceId, right.instanceId),
  )
  return deepFreeze(cells)
}

export function getOccupiedCellCount(
  snapshot: BackpackSnapshot,
  catalog: ItemCatalog,
): number {
  return getOccupiedCells(snapshot, catalog).length
}

export function getRemainingCellCount(
  snapshot: BackpackSnapshot,
  catalog: ItemCatalog,
): number {
  return snapshot.width * snapshot.height - getOccupiedCellCount(snapshot, catalog)
}

export function getOccupyingInstanceId(
  snapshot: BackpackSnapshot,
  x: number,
  y: number,
  catalog: ItemCatalog,
): string | null {
  const cell = getOccupiedCells(snapshot, catalog).find(
    (candidate) => candidate.x === x && candidate.y === y,
  )
  return cell?.instanceId ?? null
}
