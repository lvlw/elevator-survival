import type { BackpackSnapshot, ItemCatalog, ItemInstance } from '../inventory'

export type EquipmentSlotKind = 'weapon' | 'armor' | 'utility'

export type ItemEquipmentProfile =
  | Readonly<{ definitionId: string; kind: 'not-equippable' }>
  | Readonly<{
      definitionId: string
      kind: 'equippable'
      eligibleSlots: readonly EquipmentSlotKind[]
    }>

export interface EquipmentProfileCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): ItemEquipmentProfile
}

export interface EquipmentSnapshot {
  readonly weapon: Readonly<ItemInstance> | null
  readonly armor: Readonly<ItemInstance> | null
  readonly utility: Readonly<ItemInstance> | null
}

export interface BackpackEquipmentSnapshot {
  readonly backpack: BackpackSnapshot
  readonly equipment: EquipmentSnapshot
}

export interface EquipmentDependencies {
  readonly physicalCatalog: ItemCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
}
