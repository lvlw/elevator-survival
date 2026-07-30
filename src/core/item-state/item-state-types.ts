export type ItemResourceKind = 'none' | 'durability' | 'integrity' | 'charge'

export type ItemResourceProfile =
  | Readonly<{ definitionId: string; kind: 'none' }>
  | Readonly<{
      definitionId: string
      kind: Exclude<ItemResourceKind, 'none'>
      maximum: number
    }>

export interface ItemResourceCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): ItemResourceProfile
}

export type ItemResourceState =
  | Readonly<{ kind: 'none' }>
  | Readonly<{
      kind: Exclude<ItemResourceKind, 'none'>
      current: number
    }>

export interface ItemState {
  readonly instanceId: string
  readonly definitionId: string
  readonly resource: ItemResourceState
}

export interface ItemStateCollectionSnapshot {
  readonly states: readonly Readonly<ItemState>[]
}

export type ResourceActionFailure =
  | 'NO_RESOURCE'
  | 'INSUFFICIENT_RESOURCE'

export type ResourceActionPreview =
  | Readonly<{
      allowed: true
      kind: Exclude<ItemResourceKind, 'none'>
      currentBefore: number
      requestedCost: number
      consumed: number
      currentAfter: number
      depleted: boolean
    }>
  | Readonly<{
      allowed: false
      kind: ItemResourceKind
      currentBefore: number | null
      requestedCost: number
      reason: ResourceActionFailure
    }>

export interface ResourceActionResult {
  readonly state: Readonly<ItemState>
  readonly requestedCost: number
  readonly consumed: number
  readonly currentBefore: number
  readonly currentAfter: number
  readonly depleted: boolean
}

export interface ResourceRestoreResult {
  readonly state: Readonly<ItemState>
  readonly requestedAmount: number
  readonly restored: number
  readonly unused: number
  readonly currentBefore: number
  readonly currentAfter: number
  readonly atMaximum: boolean
}
