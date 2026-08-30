import { deepFreeze } from '../config'
import {
  getPlayerVisibleHubItemSource,
  type PlayerVisibleHubItemSource,
} from '../hub-inventory'
import type { EquipmentSlotKind } from '../equipment'
import type { CurrentDayHubSnapshot } from '../current-day-hub'
import {
  HubMaintenanceError,
  previewHubMaintenance,
  type HubMaintenanceCommand,
  type HubMaintenanceDependencies,
  type HubMaintenanceMaterialKind,
  type HubMaintenanceTarget,
} from './hub-maintenance'

export type PlayerVisibleHubMaintenanceTargetLocation =
  | Readonly<{ container: 'warehouse'; ordinal: number }>
  | Readonly<{ container: 'backpack'; column: number; row: number }>
  | Readonly<{ container: 'equipment'; slot: EquipmentSlotKind }>

export interface PlayerVisibleHubMaintenanceTargetResult {
  readonly definitionId: string
  readonly location: PlayerVisibleHubMaintenanceTargetLocation
  readonly resourceKind: 'durability' | 'integrity' | 'charge'
  readonly before: number
  readonly requested: number
  readonly actual: number
  readonly after: number
  readonly unused: number
}

export interface PlayerVisibleHubMaintenanceMaterialResult {
  readonly definitionId: string
  readonly material: HubMaintenanceMaterialKind
  readonly source: PlayerVisibleHubItemSource
  readonly quantityBefore: number
  readonly quantityConsumed: 1
  readonly quantityAfter: number
}

export interface PlayerVisibleHubMaintenanceResult {
  readonly operation: HubMaintenanceCommand['kind']
  readonly labor: Readonly<{ before: number; used: number; after: number }> | null
  readonly targets: readonly PlayerVisibleHubMaintenanceTargetResult[]
  readonly materials: readonly PlayerVisibleHubMaintenanceMaterialResult[]
  readonly repair: Readonly<{
    family: 'mechanical' | 'textile'
    generated: number
    actual: number
    wasted: number
  }> | null
  readonly hubSceneTime: 0
}

export type PlayerVisibleHubMaintenanceEvaluation =
  | Readonly<{ canExecute: true; result: PlayerVisibleHubMaintenanceResult }>
  | Readonly<{ canExecute: false; rejectionCode: HubMaintenanceError['code'] }>

function targetLocation(
  snapshot: CurrentDayHubSnapshot,
  target: HubMaintenanceTarget,
): PlayerVisibleHubMaintenanceTargetLocation {
  if (target.container === 'warehouse') {
    const ordinal = snapshot.runLoadout.warehouse.items.findIndex(
      ({ instanceId }) => instanceId === target.itemInstanceId,
    ) + 1
    if (ordinal < 1) throw new Error('正式维护目标不在仓库中')
    return deepFreeze({ container: target.container, ordinal })
  }
  if (target.container === 'backpack') {
    const placement = snapshot.runLoadout.backpack.placements.find(
      ({ instanceId }) => instanceId === target.itemInstanceId,
    )
    if (!placement) throw new Error('正式维护目标不在背包中')
    return deepFreeze({
      container: target.container,
      column: placement.x + 1,
      row: placement.y + 1,
    })
  }
  return deepFreeze({ container: target.container, slot: target.equipmentSlot })
}

/**
 * Projects the formal maintenance plan without exposing physical instance IDs,
 * raw Effects, or the resulting Hub snapshot.
 */
export function previewPlayerVisibleHubMaintenance(
  snapshot: CurrentDayHubSnapshot,
  command: HubMaintenanceCommand,
  dependencies: HubMaintenanceDependencies,
): PlayerVisibleHubMaintenanceEvaluation {
  try {
    const plan = previewHubMaintenance(snapshot, command, dependencies)
    const targets: PlayerVisibleHubMaintenanceTargetResult[] = []
    const materials: PlayerVisibleHubMaintenanceMaterialResult[] = []
    let labor: PlayerVisibleHubMaintenanceResult['labor'] = null
    let repair: PlayerVisibleHubMaintenanceResult['repair'] = null
    let hubSceneTime: 0 = 0
    for (const effect of plan.effects) {
      if (effect.kind === 'item-resource-restored') {
        targets.push(deepFreeze({
          definitionId: effect.definitionId,
          location: targetLocation(snapshot, effect.target),
          resourceKind: effect.resourceKind,
          before: effect.resourceBefore,
          requested: effect.requestedRecovery,
          actual: effect.actualRecovery,
          after: effect.resourceAfter,
          unused: effect.unusedRecovery,
        }))
      } else if (effect.kind === 'maintenance-material-consumed') {
        materials.push(deepFreeze({
          definitionId: effect.definitionId,
          material: effect.material,
          source: getPlayerVisibleHubItemSource(snapshot.runLoadout, effect.source),
          quantityBefore: effect.quantityBefore,
          quantityConsumed: effect.quantityConsumed,
          quantityAfter: effect.quantityAfter,
        }))
      } else if (effect.kind === 'maintenance-labor-consumed') {
        labor = deepFreeze({ before: effect.before, used: effect.used, after: effect.after })
      } else if (effect.kind === 'maintenance-repair-waste') {
        repair = deepFreeze({
          family: effect.repairFamily,
          generated: effect.generatedRepair,
          actual: effect.actualRepair,
          wasted: effect.wastedRepair,
        })
      } else if (effect.kind === 'hub-maintenance-zero-time-confirmed') {
        hubSceneTime = effect.hubSceneTime
      }
    }
    return deepFreeze({
      canExecute: true,
      result: {
        operation: plan.command.kind,
        labor,
        targets,
        materials,
        repair,
        hubSceneTime,
      },
    })
  } catch (error) {
    if (error instanceof HubMaintenanceError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}
