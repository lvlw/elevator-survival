export {
  addItemToBackpack,
  moveBackpackItem,
  removeItemFromBackpack,
} from './backpack-operations'
export {
  createBackpackSnapshot,
  createEmptyBackpack,
  getOccupiedCellCount,
  getOccupiedCells,
  getOccupyingInstanceId,
  getRemainingCellCount,
  previewBackpackPlacement,
} from './backpack-layout'
export { calculateBackpackWeightSubtotal } from './backpack-weight'
export {
  createItemCatalog,
  createItemInstance,
  getItemDimensions,
} from './item-catalog'
export {
  InventoryError,
  type InventoryErrorCode,
} from './inventory-errors'
export type {
  BackpackPlacement,
  BackpackPlacementPreview,
  BackpackSnapshot,
  OccupiedCell,
  PlacementFailureReason,
  RemoveBackpackItemResult,
} from './backpack-types'
export type {
  ItemCatalog,
  ItemDefinition,
  ItemDimensions,
  ItemInstance,
  ItemStacking,
} from './item-types'
