import type { SupplyDomain } from './shared-types'
import type { SupplyDependencies } from './types'
import { ensure } from './shared-validation'
import { calculateBackpackWeightSubtotal, previewBackpackPlacement } from '../inventory'
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

/** Pure public-capacity calculation shared by qualification and the formal inventory producer. */
export function ordinaryPickupCapacity(v: SupplyDomain, id: string, requested: number | undefined,
  placement: Readonly<{ x: number; y: number; rotated: boolean }> | undefined, deps: SupplyDependencies) {
  const item = v.site!.ground.find(row => row.nodeId === v.site!.nodeId)!.items.find(item => item.instanceId === id)
  ensure(item && deps.catalog.data.items.some(entry => entry.physical.id === item.definitionId && entry.ordinary), 'No ordinary ground item', 'NOT_AVAILABLE')
  const definition = deps.catalog.physical.get(item.definitionId)
  ensure(definition.stacking.kind === 'stackable', 'Stackable ordinary item required')
  const quantity = requested ?? item.quantity
  ensure(Number.isSafeInteger(quantity) && quantity > 0 && quantity <= item.quantity, 'Invalid pickup quantity')
  const bag = v.carried.backpack
  const capacity = deps.catalog.data.backpack.weightBands.cannotCarryFrom - 1 - calculateBackpackWeightSubtotal(bag, deps.catalog.physical)
  const weightAllowed = definition.unitWeight === 0 ? quantity : Math.min(quantity, Math.max(0, Math.floor(capacity / definition.unitWeight)))
  const state = v.itemStates.states.find(state => state.instanceId === id)!
  const targets = [...bag.placements].sort((a, b) => a.y - b.y || a.x - b.x)
  const merges: { instanceId: string; quantity: number }[] = []
  let left = weightAllowed
  for (const position of targets) {
    const target = bag.items.find(candidate => candidate.instanceId === position.instanceId)!
    if (target.definitionId !== item.definitionId || !areItemStatesStackCompatible(state,
      v.itemStates.states.find(state => state.instanceId === target.instanceId)!)) continue
    const moved = Math.min(left, definition.stacking.maxQuantity - target.quantity)
    if (moved > 0) merges.push({ instanceId: target.instanceId, quantity: moved })
    left -= moved
  }
  const position = placement
  const created = left > 0 && position && previewBackpackPlacement(bag, item, { instanceId: id, ...position }, deps.catalog.physical).canPlace ? left : 0
  const merged = merges.reduce((sum, merge) => sum + merge.quantity, 0)
  const picked = merged + created
  const limitedBy: ('weight' | 'space')[] = []
  if (weightAllowed < quantity) limitedBy.push('weight')
  if (picked < weightAllowed) limitedBy.push('space')
  return { item, merges, position: created > 0 ? position! : null,
    public: { requested: quantity, picked, merged, created, remaining: item.quantity - picked,
      placements: created > 0 ? [{ ...position!, quantity: created }] : [], limitedBy } }
}
