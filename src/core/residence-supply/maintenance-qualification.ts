import type { SupplyDomain } from './shared-types'
import type { SupplyDependencies } from './types'
import { carriedItems } from '../residence-location/validation'
import { ensure } from './shared-validation'
import { numberValue, tableFieldValue } from './config'

export type MaintenanceKind = 'mechanical' | 'coat' | 'toolbox' | 'recharge'
export function maintenancePool(kind: MaintenanceKind, deps: SupplyDependencies) {
  return numberValue(deps.configuration, 'restore.' + (kind === 'mechanical' ? 'metal_pool' : kind === 'recharge' ? 'lamp' : kind))
}
export function requireMaintenanceAllocations(allocations: readonly { instanceId: string; amount: number }[], pool: number) {
  ensure(new Set(allocations.map(a => a.instanceId)).size === allocations.length &&
    allocations.reduce((n, a) => n + a.amount, 0) <= pool, 'Mechanical total pool exceeded or duplicate target')
}
export function requireMaintenanceTarget(v: SupplyDomain, id: string, kind: MaintenanceKind) {
  const item = carriedItems(v.carried).find(i => i.instanceId === id)
  ensure(item && (kind === 'mechanical' ? ['weapon_metal_pipe', 'utility_crowbar'] :
    kind === 'coat' ? ['armor_heavy_coat'] : kind === 'toolbox' ? ['utility_toolkit'] : ['utility_flashlight']).includes(item.definitionId),
  'Wrong actual maintenance target', 'NOT_AVAILABLE')
  return item
}
export function maintenanceRecipe(v: SupplyDomain, kind: MaintenanceKind, allocations: readonly { instanceId: string }[], deps: SupplyDependencies) {
  return tableFieldValue(deps.configuration, 'maintenance.inputs', kind === 'mechanical' ?
    (allocations.some(a => v.carried.equipment.weapon?.instanceId === a.instanceId) ? 'pipe' : 'crow') : kind === 'recharge' ? 'lamp' : kind)
}
