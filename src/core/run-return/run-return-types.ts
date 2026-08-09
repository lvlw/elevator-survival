import type { PlayerConditionSnapshot } from '../condition'
import type { DailyMedicalUsageSnapshot } from '../daily-state'
import type { EquipmentSnapshot } from '../equipment'
import type {
  BackpackSnapshot,
  ItemCatalog,
  ItemInstance,
} from '../inventory'
import type {
  ItemResourceCatalog,
  ItemState,
  ItemStateCollectionSnapshot,
} from '../item-state'
import type { QuickSlotSnapshot } from '../quick-slot'
import type { RunIntelLogSnapshot } from '../run-intel'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from '../scene-exploration'

export type ItemReturnLifecycleKind = 'ordinary' | 'permission' | 'quest'

export interface ItemReturnLifecycleProfile {
  readonly definitionId: string
  readonly kind: ItemReturnLifecycleKind
}

export interface ItemReturnLifecycleCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): Readonly<ItemReturnLifecycleProfile>
}

export interface RunWarehouseSnapshot {
  readonly items: readonly Readonly<ItemInstance>[]
}

export interface RunTaskStorageSnapshot {
  readonly items: readonly Readonly<ItemInstance>[]
}

export interface RunStoredInventorySnapshot {
  readonly warehouse: RunWarehouseSnapshot
  readonly taskStorage: RunTaskStorageSnapshot
  readonly itemStates: ItemStateCollectionSnapshot
}

export interface RunReturnLedgerSnapshot {
  readonly sceneInstanceIds: readonly string[]
}

export interface ReturnedPlayerStateSnapshot {
  readonly backpack: BackpackSnapshot
  readonly equipment: EquipmentSnapshot
  readonly quickSlots: QuickSlotSnapshot
  readonly condition: PlayerConditionSnapshot
}

export interface RunReturnSnapshot {
  readonly player: ReturnedPlayerStateSnapshot
  readonly warehouse: RunWarehouseSnapshot
  readonly taskStorage: RunTaskStorageSnapshot
  readonly itemStates: ItemStateCollectionSnapshot
  readonly runIntelLog: RunIntelLogSnapshot
  readonly dailyMedicalUsage: DailyMedicalUsageSnapshot
  readonly returnLedger: RunReturnLedgerSnapshot
}

export interface RunReturnInput {
  readonly terminalScene: SceneExplorationSnapshot
  readonly storedInventory: RunStoredInventorySnapshot
  readonly returnLedger: RunReturnLedgerSnapshot
}

export interface RunReturnDependencies {
  readonly scene: SceneExplorationDependencies
  readonly lifecycleCatalog: ItemReturnLifecycleCatalog
}

export type RunReturnEffect =
  | Readonly<{
      kind: 'run-item-transferred'
      source: 'backpack'
      destination: 'warehouse' | 'task-storage'
      item: Readonly<ItemInstance>
      itemState: Readonly<ItemState>
    }>
  | Readonly<{
      kind: 'run-backpack-cleared'
      instanceIds: readonly string[]
    }>
  | Readonly<{
      kind: 'run-facts-carried-forward'
      runIntelLog: RunIntelLogSnapshot
      dailyMedicalUsage: DailyMedicalUsageSnapshot
    }>
  | Readonly<{
      kind: 'run-return-recorded'
      sceneInstanceId: string
      returnKind: 'safe' | 'forced'
    }>

export interface RunReturnSummary {
  readonly sceneInstanceId: string
  readonly returnKind: 'safe' | 'forced'
  readonly storedWarehouseInstanceIds: readonly string[]
  readonly storedTaskInstanceIds: readonly string[]
  readonly lostSceneTaskInstanceIds: readonly string[]
  readonly remainingHealth: number
  readonly dailyMedicalUsage: DailyMedicalUsageSnapshot
}

export interface RunReturnTransitionPlan {
  readonly effects: readonly RunReturnEffect[]
  readonly summary: RunReturnSummary
}

export interface RunReturnResult {
  readonly snapshot: RunReturnSnapshot
  readonly effects: readonly RunReturnEffect[]
  readonly summary: RunReturnSummary
}

export interface RunStorageDependencies {
  readonly physicalCatalog: ItemCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly lifecycleCatalog: ItemReturnLifecycleCatalog
}
