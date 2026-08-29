import type { FrozenRuleConfig } from '../config'
import type {
  EquipmentProfileCatalog,
  EquipmentSlotKind,
  EquipmentSnapshot,
} from '../equipment'
import type {
  BackpackPlacement,
  BackpackSnapshot,
  ItemCatalog,
  ItemInstance,
} from '../inventory'
import type {
  ItemResourceCatalog,
  ItemStateCollectionSnapshot,
} from '../item-state'
import type {
  QuickSlotProfileCatalog,
  QuickSlotSnapshot,
} from '../quick-slot'
import type {
  ItemReturnLifecycleCatalog,
  RunReturnDependencies,
  RunReturnSnapshot,
  RunTaskStorageSnapshot,
  RunWarehouseSnapshot,
} from '../run-return'

export interface RunLoadoutBackpackRules extends Pick<
  FrozenRuleConfig['backpack'],
  'height' | 'weightBands' | 'width'
> {}

export interface RunLoadoutDependencies {
  readonly physicalCatalog: ItemCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
  readonly quickSlotCatalog: QuickSlotProfileCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly lifecycleCatalog: ItemReturnLifecycleCatalog
  readonly backpackRules: RunLoadoutBackpackRules
}

export interface RunLoadoutSnapshot {
  readonly warehouse: RunWarehouseSnapshot
  readonly taskStorage: RunTaskStorageSnapshot
  readonly backpack: BackpackSnapshot
  readonly equipment: EquipmentSnapshot
  readonly quickSlots: QuickSlotSnapshot
  readonly itemStates: ItemStateCollectionSnapshot
}

export interface RunLoadoutFromReturnInput {
  readonly snapshot: RunReturnSnapshot
  readonly dependencies: RunReturnDependencies
}

export type RunLoadoutContainer =
  | 'warehouse'
  | 'task-storage'
  | 'backpack'
  | 'equipment'
  | 'quick-slots'

export type RunLoadoutCommand =
  | Readonly<{
      kind: 'warehouse-to-backpack'
      instanceId: string
      placement: BackpackPlacement
    }>
  | Readonly<{
      kind: 'backpack-to-warehouse'
      instanceId: string
    }>
  | Readonly<{
      kind: 'move-backpack-item'
      instanceId: string
      placement: BackpackPlacement
    }>
  | Readonly<{
      kind: 'split-backpack-stack'
      sourceInstanceId: string
      quantity: number
      placement: Readonly<{
        x: number
        y: number
        rotated: boolean
      }>
    }>
  | Readonly<{
      kind: 'merge-backpack-stacks'
      sourceInstanceId: string
      targetInstanceId: string
      quantity: number
    }>
  | Readonly<{
      kind: 'equip-from-backpack'
      instanceId: string
      targetSlot: EquipmentSlotKind
    }>
  | Readonly<{
      kind: 'unequip-to-backpack'
      sourceSlot: EquipmentSlotKind
      placement: BackpackPlacement
    }>
  | Readonly<{
      kind: 'swap-backpack-equipped'
      backpackInstanceId: string
      targetSlot: EquipmentSlotKind
      displacedPlacement: BackpackPlacement
    }>
  | Readonly<{
      kind: 'backpack-to-quick-slot'
      instanceId: string
      targetSlotIndex: number
    }>
  | Readonly<{
      kind: 'quick-slot-to-backpack'
      sourceSlotIndex: number
      placement: BackpackPlacement
    }>
  | Readonly<{
      kind: 'move-quick-slot-item'
      sourceSlotIndex: number
      targetSlotIndex: number
    }>
  | Readonly<{
      kind: 'swap-quick-slot-items'
      firstSlotIndex: number
      secondSlotIndex: number
    }>

export interface RunLoadoutOperation {
  readonly commandKind: RunLoadoutCommand['kind']
  readonly source: RunLoadoutContainer
  readonly destination: RunLoadoutContainer
  readonly instanceId: string
  readonly definitionId: string
  readonly quantity: number
  readonly placement: BackpackPlacement | null
  readonly equipmentSlot: EquipmentSlotKind | null
  readonly sourceQuickSlotIndex: number | null
  readonly targetQuickSlotIndex: number | null
  readonly displacedInstanceId: string | null
  readonly splitInstanceId: string | null
  readonly targetInstanceId?: string
  readonly mergeResult?: 'partial' | 'full'
}

export type RunLoadoutEffect =
  | Readonly<{
      kind: 'run-loadout-operation-applied'
      operation: RunLoadoutOperation
    }>
  | Readonly<{
      kind: 'run-loadout-state-committed'
      itemStates: ItemStateCollectionSnapshot
      snapshot: RunLoadoutSnapshot
    }>

export interface RunLoadoutTransitionPlan {
  readonly effects: readonly RunLoadoutEffect[]
  readonly snapshot: RunLoadoutSnapshot
}

export interface RunLoadoutResolution {
  readonly effects: readonly RunLoadoutEffect[]
  readonly snapshot: RunLoadoutSnapshot
}

export interface RunLoadoutEvaluation {
  readonly snapshot: RunLoadoutSnapshot
  readonly operation: RunLoadoutOperation
}

export type RunLoadoutItem = Readonly<ItemInstance>
