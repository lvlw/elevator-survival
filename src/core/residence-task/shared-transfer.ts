import type { SupplyDomain, SupplyDomainContext } from '../residence-supply/shared-types'
import { requireSupplyDomainAction } from '../residence-supply/shared-validation'
import { z } from 'zod'
import { addItemToBackpack, removeItemFromBackpack } from '../inventory'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { ensure } from '../residence-supply/shared-validation'
import { supplyPlacementSchema } from '../residence-supply/inventory'
import { supplyBodyAction } from '../residence-supply/cycle-adapter'
import { originalInstanceId } from '../residence-supply/provenance'
export const supplyTaskTransferSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('task-pickup'), expectedRevision: countSchema, instanceId: idSchema, placement: supplyPlacementSchema }),
  z.strictObject({ kind: z.literal('task-drop'), expectedRevision: countSchema, instanceId: idSchema }),
])
export function planSharedTaskTransfer<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const c = parseResidence(supplyTaskTransferSchema, request)
  requireSupplyDomainAction(value)
  ensure(c.expectedRevision === value.character.revision, 'Stale task transfer', 'STALE_AUTHORITY')
  const pickup = c.kind === 'task-pickup', ground = value.site.ground.find(g => g.nodeId === value.site.nodeId)!
  const item = (pickup ? ground.items : value.carried.backpack.items).find(i => i.instanceId === c.instanceId)
  ensure(item && !deps.catalog.data.items.find(i => i.physical.id === item.definitionId)!.ordinary, 'Task/permission original required', 'NOT_AVAILABLE')
  const alloc = value.allocations.find(a => a.instanceId === item.instanceId)!, origin = value.origins.find(o => o.id === alloc.ranges[0].originId)!
  ensure(origin.binding.execution.runId === value.site.binding.execution.runId && item.instanceId === originalInstanceId(origin) &&
    item.quantity === 1 && alloc.ranges.length === 1, 'Wrong task execution or original', 'INVALID_PROVENANCE')
  const backpack = c.kind === 'task-pickup' ? addItemToBackpack(value.carried.backpack, item, { instanceId: item.instanceId, ...c.placement }, deps.catalog.physical) :
    removeItemFromBackpack(value.carried.backpack, item.instanceId, deps.catalog.physical).snapshot
  const body = supplyBodyAction(value, deps, pickup ? 'revealed-pickup' : 'organize', { kind: 'free', amount: 0 })
  return context.issue(value, { ...value, character: body.snapshot, carried: { ...value.carried, backpack },
    site: { ...value.site, ground: value.site.ground.map(g => g.nodeId !== ground.nodeId ? g :
      { ...g, items: pickup ? g.items.filter(i => i.instanceId !== item.instanceId) : [...g.items, item] }) } }, 'inventory', body.steps)
}
