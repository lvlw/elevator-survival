export type ItemStacking =
  | { readonly kind: 'none' }
  | { readonly kind: 'stackable'; readonly maxQuantity: number }

export interface ItemDefinition {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
  readonly unitWeight: number
  readonly canRotate: boolean
  readonly stacking: ItemStacking
}

export interface ItemInstance {
  readonly instanceId: string
  readonly definitionId: string
  readonly quantity: number
}

export interface ItemDimensions {
  readonly width: number
  readonly height: number
}

export interface ItemCatalog {
  readonly definitionIds: readonly string[]
  readonly has: (definitionId: string) => boolean
  readonly get: (definitionId: string) => Readonly<ItemDefinition>
}
