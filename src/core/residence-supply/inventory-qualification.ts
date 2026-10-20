import type { SupplyDomain } from './shared-types'
import type { SupplyDependencies } from './types'
import { ensure } from './shared-validation'
import { areItemStatesStackCompatible } from '../item-state'

export function requireSupplySplit(v: SupplyDomain, id: string, quantity: number, deps: SupplyDependencies) {
  const item = v.carried.backpack.items.find(i => i.instanceId === id)
  ensure(item && deps.catalog.physical.get(item.definitionId).stacking.kind === 'stackable' && quantity < item.quantity &&
    Number.isSafeInteger(quantity) && quantity > 0, 'No legal split', 'NOT_AVAILABLE')
  return item
}
export function requireSupplyMerge(v: SupplyDomain, sourceId: string, targetId: string, quantity: number, deps: SupplyDependencies) {
  const source = v.carried.backpack.items.find(i => i.instanceId === sourceId), target = v.carried.backpack.items.find(i => i.instanceId === targetId)
  ensure(source && target && source.instanceId !== target.instanceId && source.definitionId === target.definitionId &&
    quantity <= source.quantity, 'No compatible merge', 'NOT_AVAILABLE')
  const definition = deps.catalog.physical.get(source.definitionId)
  ensure(definition.stacking.kind === 'stackable' && target.quantity + quantity <= definition.stacking.maxQuantity, 'Stack capacity')
  ensure(areItemStatesStackCompatible(v.itemStates.states.find(s => s.instanceId === source.instanceId)!,
    v.itemStates.states.find(s => s.instanceId === target.instanceId)!), 'Incompatible resource')
  return { source, target }
}
export function requireSupplyQuickTarget(v: SupplyDomain, id: string, slot: number, deps: SupplyDependencies) {
  ensure(slot < v.carried.quickSlots.slots.length && v.carried.quickSlots.slots[slot] === null, 'Target slot not empty')
  const item = v.carried.backpack.items.find(i => i.instanceId === id)
  ensure(item && deps.catalog.containers.quickSlotCatalog.get(item.definitionId).kind === 'eligible', 'Not quick eligible')
  return item
}
