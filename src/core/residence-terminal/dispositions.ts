import type { ItemInstance } from '../inventory'
import type { ItemState } from '../item-state'
import type { ResidenceLocationSnapshot } from '../residence-location'
import { carriedItems } from '../residence-location/validation'
import { hasSample, sampleFor } from './queries'
import { ensure } from './validation'
import type { DispositionKind, TerminalDisposition, TerminalOutcome, TerminalPolicy, TerminalSnapshot } from './types'

/** Whole-instance ownership transfer. Never split, refill, repair or create a new ID. */
export function disposeTerminalAssets(before: TerminalSnapshot, result: ResidenceLocationSnapshot,
  outcome: TerminalOutcome, policy: TerminalPolicy) {
  const added: TerminalDisposition[] = []
  const kept: ItemInstance[] = []
  const ground = result.site.ground.flatMap((g) => g.items)
  const groundIds = new Set(ground.map((i) => i.instanceId))
  const atResult = { ...before, ...result }
  const correctSample = hasSample(atResult, policy) ? sampleFor(result.site, policy).instanceId : null
  const sampleDefinition = sampleFor(result.site, policy).grant.definitionId
  const append = (item: ItemInstance, state: ItemState, kind: DispositionKind) => added.push({
    binding: result.site.binding, cycle: before.character.cycle, source: 'terminal', kind, item, state,
  })
  for (const item of carriedItems(result.carried)) {
    const state = result.itemStates.states.find((s) => s.instanceId === item.instanceId)!
    let kind: DispositionKind | null = null
    if (outcome === 'death') kind = 'death-unavailable'
    else if (item.instanceId === correctSample) kind = outcome === 'success' ? 'delivered' : 'partial-delivery'
    else if (policy.permissionDefinitionIds.includes(item.definitionId)) kind = 'revoked-permission'
    else if (policy.specialDefinitionIds.includes(item.definitionId) || item.definitionId === sampleDefinition) kind = 'returned-special'
    else ensure(policy.catalog.data.items.some((d) => d.physical.id === item.definitionId && d.ordinary), 'Unclassified carried task asset')
    if (kind) append(item, state, kind)
    else kept.push(item)
  }
  if (outcome === 'death') for (const item of before.warehouse.items) {
    append(item, before.warehouse.itemStates.states.find((s) => s.instanceId === item.instanceId)!, 'death-unavailable')
  }
  const ids = new Set(kept.map((i) => i.instanceId))
  const carried = { backpack: { ...result.carried.backpack,
    items: result.carried.backpack.items.filter((i) => ids.has(i.instanceId)),
    placements: result.carried.backpack.placements.filter((p) => ids.has(p.instanceId)) },
  equipment: { weapon: result.carried.equipment.weapon && ids.has(result.carried.equipment.weapon.instanceId) ? result.carried.equipment.weapon : null,
    armor: result.carried.equipment.armor && ids.has(result.carried.equipment.armor.instanceId) ? result.carried.equipment.armor : null,
    utility: result.carried.equipment.utility && ids.has(result.carried.equipment.utility.instanceId) ? result.carried.equipment.utility : null },
  quickSlots: { slots: result.carried.quickSlots.slots.map((i) => i && ids.has(i.instanceId) ? i : null) } }
  return { carried, itemStates: { states: result.itemStates.states.filter((s) => ids.has(s.instanceId)) },
    warehouse: outcome === 'death' ? { items: [], itemStates: { states: [] } } : before.warehouse,
    archives: [...before.archives, { site: result.site, itemStates: { states: result.itemStates.states.filter((s) => groundIds.has(s.instanceId)) } }],
    dispositions: [...before.dispositions, ...added], dispositionIds: added.map((d) => d.item.instanceId) }
}
