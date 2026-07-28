import type {
  BackpackPlacement,
  BackpackSnapshot,
  ItemCatalog,
  ItemInstance,
} from '../inventory'
import type {
  EquipmentProfileCatalog,
  EquipmentSnapshot,
} from '../equipment'

export type ItemQuickSlotProfile = Readonly<{
  definitionId: string
  kind: 'eligible' | 'not-eligible'
}>

export interface QuickSlotProfileCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): ItemQuickSlotProfile
}

export interface QuickSlotSnapshot {
  readonly slots: readonly (Readonly<ItemInstance> | null)[]
}

export interface CarriedItemContainersSnapshot {
  readonly backpack: BackpackSnapshot
  readonly equipment: EquipmentSnapshot
  readonly quickSlots: QuickSlotSnapshot
}

export interface QuickSlotDependencies {
  readonly physicalCatalog: ItemCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
  readonly quickSlotCatalog: QuickSlotProfileCatalog
}

export interface BackpackToQuickSlotInput {
  readonly backpackInstanceId: string
  readonly targetSlotIndex: number
  readonly extractedInstanceId?: string
}

export interface QuickSlotToBackpackInput {
  readonly sourceSlotIndex: number
  readonly placement: BackpackPlacement
}

export interface RemoveQuickSlotItemResult {
  readonly snapshot: CarriedItemContainersSnapshot
  readonly removedItem: Readonly<ItemInstance>
}
