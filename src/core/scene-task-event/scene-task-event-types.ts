import type { EquipmentSlotKind } from '../equipment'
import type { ItemResourceKind } from '../item-state'

export type SceneTaskEventStatus = 'available' | 'completed'

export interface SceneTaskEventStateEntry {
  readonly eventId: string
  readonly status: SceneTaskEventStatus
}

export interface SceneTaskEventStateSnapshot {
  readonly entries: readonly SceneTaskEventStateEntry[]
}

export type SceneTaskEventOptionDefinition =
  | Readonly<{ id: string; kind: 'extract'; extractionMode: 'direct' | 'cautious' }>
  | Readonly<{ id: string; kind: 'decline' }>

/** Content describes identities and qualifications; core never names a hospital. */
export interface SceneTaskEventDefinition {
  readonly id: string
  readonly nodeId: string
  readonly requiredDefeatedEncounterId: string
  readonly outputDefinitionId: string
  readonly outputIndex: number
  readonly originIntelId: string
  readonly impactProtection: Readonly<{
    equipmentSlot: EquipmentSlotKind
    definitionId: string
    resourceKind: Extract<ItemResourceKind, 'integrity'>
  }>
  readonly options: readonly SceneTaskEventOptionDefinition[]
}

export interface SceneTaskEventCatalog {
  readonly eventIds: readonly string[]
  has(eventId: string): boolean
  get(eventId: string): SceneTaskEventDefinition
}
