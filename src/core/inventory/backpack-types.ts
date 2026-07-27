import type { ItemInstance } from './item-types'

export interface BackpackPlacement {
  readonly instanceId: string
  readonly x: number
  readonly y: number
  readonly rotated: boolean
}

export interface BackpackSnapshot {
  readonly width: number
  readonly height: number
  readonly items: readonly Readonly<ItemInstance>[]
  readonly placements: readonly Readonly<BackpackPlacement>[]
}

export interface OccupiedCell {
  readonly x: number
  readonly y: number
  readonly instanceId: string
}

export type PlacementFailureReason =
  | 'UNKNOWN_DEFINITION'
  | 'ILLEGAL_ROTATION'
  | 'INVALID_PLACEMENT'
  | 'OUT_OF_BOUNDS'
  | 'OVERLAP'

export type BackpackPlacementPreview =
  | {
      readonly canPlace: true
      readonly width: number
      readonly height: number
      readonly cells: readonly Readonly<OccupiedCell>[]
    }
  | {
      readonly canPlace: false
      readonly reason: PlacementFailureReason
      readonly width: number | null
      readonly height: number | null
      readonly cells: readonly Readonly<OccupiedCell>[]
    }

export interface RemoveBackpackItemResult {
  readonly snapshot: BackpackSnapshot
  readonly removedItem: Readonly<ItemInstance>
}
