import type { SupplyDomain, SupplyDomainContext } from './shared-types'
import { requireSupplyDomainAction } from './shared-validation'
import { z } from 'zod'
import { addItemToBackpack, createBackpackSnapshot, moveBackpackItem, removeItemFromBackpack, deriveStableSplitInstanceId } from '../inventory'
import { areItemStatesStackCompatible } from '../item-state'
import { planResidenceItemTransfer } from '../residence-location/items'
import { countSchema, positiveSchema, idSchema, parseResidence } from '../residence-config/validation'
import { cycleContext, ensure } from './shared-validation'
import { supplyBodyAction } from './cycle-adapter'
import { partitionRanges } from './provenance'
import type { SupplyDependencies } from './types'
export const supplyPlacementSchema = z.strictObject({ x: countSchema, y: countSchema, rotated: z.boolean() })
const base = { expectedRevision: countSchema }
export const supplyInventorySchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...base, kind: z.literal('move'), instanceId: idSchema, placement: supplyPlacementSchema }),
  z.strictObject({ ...base, kind: z.literal('split'), instanceId: idSchema, quantity: positiveSchema, placement: supplyPlacementSchema }),
  z.strictObject({ ...base, kind: z.literal('merge'), instanceId: idSchema, targetId: idSchema, quantity: positiveSchema }),
  z.strictObject({ ...base, kind: z.literal('to-quick'), instanceId: idSchema, slot: countSchema }),
  z.strictObject({ ...base, kind: z.literal('to-backpack'), slot: countSchema, placement: supplyPlacementSchema }),
  z.strictObject({ ...base, kind: z.literal('pickup'), instanceId: idSchema, placement: supplyPlacementSchema }),
  z.strictObject({ ...base, kind: z.literal('drop'), instanceId: idSchema }),
])
export function splitSupplyStack<V extends SupplyDomain>(value: V, instanceId: string, amount: number, deps: SupplyDependencies) {
  const item = value.carried.backpack.items.find(i => i.instanceId === instanceId)
  ensure(item && deps.catalog.physical.get(item.definitionId).stacking.kind === 'stackable' && amount < item.quantity &&
    Number.isSafeInteger(amount) && amount > 0, 'No legal split', 'NOT_AVAILABLE')
  const childId = deriveStableSplitInstanceId({ scope: 'supply-v1:' + value.character.revision, sourceInstanceId: instanceId,
    sourceQuantityBeforeSplit: item.quantity, quantity: amount })
  ensure(!value.lineage.some(l => l.instanceId === childId), 'Split identity reused')
  const alloc = value.allocations.find(a => a.instanceId === instanceId)!, parts = partitionRanges(alloc.ranges, amount)
  const state = value.itemStates.states.find(s => s.instanceId === instanceId)!
  const backpack = createBackpackSnapshot({ ...value.carried.backpack,
    items: value.carried.backpack.items.map(i => i.instanceId === instanceId ? { ...i, quantity: i.quantity - amount } : i) }, deps.catalog.physical)
  return { item: { ...item, instanceId: childId, quantity: amount }, value: { ...value, carried: { ...value.carried, backpack },
    allocations: [...value.allocations.map(a => a.instanceId === instanceId ? { ...a, ranges: parts.kept } : a),
      { instanceId: childId, ranges: parts.taken }], itemStates: { states: [...value.itemStates.states, { ...state, instanceId: childId }] },
    unitTransfers: [...value.unitTransfers, { from: instanceId, to: childId, revision: value.character.revision,
      kind: 'split' as const, ranges: parts.taken }],
    lineage: [...value.lineage, { instanceId: childId, originId: null, parentId: instanceId, revision: value.character.revision,
      quantityBefore: item.quantity, quantity: amount }] } }
}
export function planSharedInventory<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const command = parseResidence(supplyInventorySchema, request)
  requireSupplyDomainAction(value)
  ensure(command.expectedRevision === value.character.revision, 'Stale inventory revision', 'STALE_AUTHORITY')
  if (command.kind === 'pickup' || command.kind === 'drop') {
    const active = value.missions.find(m => m.status === 'active')!
    const result = planResidenceItemTransfer({ character: value.character, site: value.site, carried: value.carried, itemStates: value.itemStates },
      { ...command, binding: value.site.binding }, { cycle: cycleContext(value.character, deps, value.site.nodeId), mission: active },
      { residence: deps.residence, catalog: deps.catalog })
    return context.issue(value, { ...value, ...result.snapshot }, 'inventory', result.steps, result.energyCost)
  }
  let next: V = value
  const bp = value.carried.backpack
  if (command.kind === 'move') next = { ...value, carried: { ...value.carried, backpack:
    moveBackpackItem(bp, command.instanceId, { instanceId: command.instanceId, ...command.placement }, deps.catalog.physical) } }
  if (command.kind === 'split') {
    const split = splitSupplyStack(value, command.instanceId, command.quantity, deps)
    next = { ...split.value, carried: { ...split.value.carried, backpack: addItemToBackpack(split.value.carried.backpack,
      split.item, { instanceId: split.item.instanceId, ...command.placement }, deps.catalog.physical) } }
  }
  if (command.kind === 'merge') {
    const source = bp.items.find(i => i.instanceId === command.instanceId), target = bp.items.find(i => i.instanceId === command.targetId)
    ensure(source && target && source.instanceId !== target.instanceId && source.definitionId === target.definitionId &&
      command.quantity <= source.quantity, 'No compatible merge', 'NOT_AVAILABLE')
    const definition = deps.catalog.physical.get(source.definitionId)
    ensure(definition.stacking.kind === 'stackable' && target.quantity + command.quantity <= definition.stacking.maxQuantity, 'Stack capacity')
    ensure(areItemStatesStackCompatible(value.itemStates.states.find(s => s.instanceId === source.instanceId)!,
      value.itemStates.states.find(s => s.instanceId === target.instanceId)!), 'Incompatible resource')
    const allocation = value.allocations.find(a => a.instanceId === source.instanceId)!, parts = partitionRanges(allocation.ranges, command.quantity)
    const remaining = source.quantity - command.quantity
    next = { ...value, unitTransfers: [...value.unitTransfers, { from: source.instanceId, to: target.instanceId,
      revision: value.character.revision, kind: 'merge', ranges: parts.taken }],
      carried: { ...value.carried, backpack: createBackpackSnapshot({ ...bp,
      items: bp.items.flatMap(i => i.instanceId === source.instanceId ? remaining ? [{ ...i, quantity: remaining }] : [] :
        [{ ...i, quantity: i.instanceId === target.instanceId ? i.quantity + command.quantity : i.quantity }]),
      placements: bp.placements.filter(p => remaining || p.instanceId !== source.instanceId) }, deps.catalog.physical) },
      itemStates: { states: value.itemStates.states.filter(s => remaining || s.instanceId !== source.instanceId) },
      allocations: value.allocations.flatMap(a => a.instanceId === source.instanceId ? remaining ? [{ ...a, ranges: parts.kept }] : [] :
        [a.instanceId === target.instanceId ? { ...a, ranges: [...a.ranges, ...parts.taken] } : a]) }
  }
  if (command.kind === 'to-quick') {
    ensure(command.slot < value.carried.quickSlots.slots.length && value.carried.quickSlots.slots[command.slot] === null, 'Target slot not empty')
    const item = bp.items.find(i => i.instanceId === command.instanceId)
    ensure(item && deps.catalog.containers.quickSlotCatalog.get(item.definitionId).kind === 'eligible', 'Not quick eligible')
    let moved = item
    if (item.quantity > 1) {
      const split = splitSupplyStack(value, item.instanceId, 1, deps); next = split.value; moved = split.item
    } else next = { ...value, carried: { ...value.carried, backpack: removeItemFromBackpack(bp, item.instanceId, deps.catalog.physical).snapshot } }
    next = { ...next, carried: { ...next.carried, quickSlots: { slots: next.carried.quickSlots.slots.map((i, n) => n === command.slot ? moved : i) } } }
  }
  if (command.kind === 'to-backpack') {
    const item = value.carried.quickSlots.slots[command.slot]
    ensure(item, 'No quick item')
    next = { ...value, carried: { ...value.carried, backpack: addItemToBackpack(bp, item,
      { instanceId: item.instanceId, ...command.placement }, deps.catalog.physical),
      quickSlots: { slots: value.carried.quickSlots.slots.map((i, n) => n === command.slot ? null : i) } } }
  }
  const checked = context.read(next)
  const body = supplyBodyAction(value, deps, 'organize', { kind: 'free', amount: 0 })
  return context.issue(value, { ...checked, character: body.snapshot }, 'inventory', body.steps)
}
