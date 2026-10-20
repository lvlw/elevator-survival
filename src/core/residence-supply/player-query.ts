import { deepFreeze } from '../config'
import { requireSupplyDomainAction, ensure } from '../residence-supply/shared-validation'
import { supplyPaidCost, supplyEnergyQuery } from '../residence-supply/cycle-adapter'
import { requireSupplyClinicalTarget } from '../residence-supply/medical-qualification'
import { requireSupplySplit, requireSupplyMerge, requireSupplyQuickTarget } from '../residence-supply/inventory-qualification'
import { maintenancePool, requireMaintenanceAllocations, requireMaintenanceTarget, maintenanceRecipe } from '../residence-supply/maintenance-qualification'
import { readSupplySourceSelection, supplySourceCost, checkSupplyExchangePlacement } from '../residence-task/shared-sources'
import { requireTaskSelection, taskMethodCost } from '../residence-task/qualification'
import { requireEquippedSupplyTool, requireSupplyCard, assertSupplyRecipe } from '../residence-task/plans'
import { requireSupplyTaskTransferItem } from '../residence-task/shared-transfer'
import { requireOrdinaryTransferItem } from '../residence-location/items'
import { previewCommittedResourceAction, restoreItemResource } from '../item-state'
import { addItemToBackpack, moveBackpackItem, previewBackpackPlacement, calculateBackpackWeightSubtotal, getOccupiedCells, type ItemInstance } from '../inventory'
import { classifyLoad } from '../load'
import { numberValue } from '../residence-supply/config'
import { playerResidenceKnowledge } from '../residence-location/player-knowledge'
import { playerCombatFacts } from '../residence-combat/player-query'
import { sharedTerminalEligibility } from '../residence-terminal/supply-settlement-shared'
import type { CombatDependencies, CombatValue } from '../residence-combat/types'

import type { SupplyDomain } from './shared-types'
import type { SupplyDependencies } from './types'
import type { PlayerCoreCommand, SafeCommandQualification } from '../residence-combat/player-query-types'

/** Only safe eligibility and costs. No plan, effects, next-state or hidden result. */
export function qualifyPlayerCommand(v: CombatValue, c: PlayerCoreCommand, deps: CombatDependencies): SafeCommandQualification {
  const s = deps.supply
  ensure(c.command.expectedRevision === v.character.revision, 'Stale command', 'STALE_AUTHORITY')
  ensure(v.phase === (c.kind === 'depart' ? 'first-hub' : 'active-world') && (c.kind === 'combat' ? !!v.battle : !v.battle), 'Wrong stop point', 'NOT_AVAILABLE')
  const yes = (cost: number | null = 0): SafeCommandQualification => deepFreeze({ kind: 'available', cost })
  const paid = (base: number, action: 'extraction' | 'search' | 'repair' | 'recharge' | 'npc-handover' = 'search') => {
    const e = supplyEnergyQuery(v, s, action, supplyPaidCost(v, base, s))
    ensure(e.canStart, 'Energy unavailable', 'NOT_AVAILABLE'); return yes(e.cost)
  }
  const tool = (id: string | undefined, def: string, key: string) => {
    const item = requireEquippedSupplyTool(v, id, def), state = v.itemStates.states.find(s => s.instanceId === item.instanceId)!
    ensure(previewCommittedResourceAction(state, numberValue(s.configuration, key)).allowed, 'Tool unavailable', 'NOT_AVAILABLE')
  }
  const placement = (item: { instanceId: string; definitionId: string; quantity: number }, p: { x: number; y: number; rotated: boolean }) => {
    const bag = addItemToBackpack(v.carried.backpack, item, { instanceId: item.instanceId, ...p }, s.catalog.physical)
    ensure(classifyLoad(calculateBackpackWeightSubtotal(bag, s.catalog.physical), s.catalog.data.backpack).canCarry, 'Cannot carry', 'CANNOT_CARRY')
  }
  if (c.kind === 'depart') return yes(0)
  if (c.kind === 'combat') {
    const cmd = c.command
    ensure(cmd.expectedBattleId === v.battle!.entry.id, 'Wrong battle', 'NOT_AVAILABLE')
    const actions = playerCombatFacts(v, deps)!.actions
    ensure(actions.some(a => JSON.stringify(a.command) === JSON.stringify(cmd.command)), 'Unavailable combat command', 'NOT_AVAILABLE')
    return yes(null)
  }
  requireSupplyDomainAction(v)
  if (c.kind === 'move') {
    const cmd = c.command
    const m = playerResidenceKnowledge(v, s).moves.find(m => m.key === cmd.edgeId)
    ensure(m?.canStart, 'Move not available', 'NOT_AVAILABLE'); return yes(m.cost)
  }
  if (c.kind === 'terminal') { ensure(sharedTerminalEligibility(v, s)[c.command.kind], 'Terminal not available', 'NOT_AVAILABLE'); return yes(null) }
  if (c.kind === 'rest') {
    // No body-cycle prediction; the facility is current public content, not a hypothetical day result.
    ensure(s.catalog.data.nodes.find(n => n.id === v.site.nodeId)?.rest && v.character.clock.kind === 'active' &&
      v.character.clock.taskDay < s.residence.configuration.config.limits.days, 'Rest not available', 'NOT_AVAILABLE')
    return yes(null)
  }
  if (c.kind === 'medical') {
    const cmd = c.command
    const item = [...v.carried.backpack.items, ...v.carried.quickSlots.slots.filter(i => i !== null)].find(i => i.instanceId === cmd.instanceId)
    ensure(item, 'No medical item', 'NOT_AVAILABLE')
    const alias = s.tasks.data.items.find(i => i.id === item.definitionId)?.alias
    if (alias === 'disinfect' || alias === 'suppressant') return deepFreeze({ kind: 'unknown', cost: 0 })
    requireSupplyClinicalTarget(v, cmd, s); return yes()
  }
  if (c.kind === 'task') {
    const cmd = c.command
    const a = requireTaskSelection(v, cmd, s), cost = taskMethodCost(v, cmd, s)
    if (cmd.method === 'crow') tool(cmd.toolInstanceId, 'utility_crowbar', 'wear.tool')
    if (cmd.method === 'toolbox') tool(cmd.toolInstanceId, 'utility_toolkit', 'wear.tool')
    if (cmd.method === 'card') requireSupplyCard(v, s, cmd.toolInstanceId)
    if (cmd.inputs) assertSupplyRecipe(v, cmd.inputs, a.consume!, s)
    if (a.grant) {
      ensure(cmd.placement, 'Placement required')
      const definitionId = s.tasks.data.items.find(i => i.alias === a.grant)!.id
      placement({ instanceId: 'player-geometry-probe', definitionId, quantity: numberValue(s.configuration, a.outputQuantity!) }, cmd.placement)
    }
    return paid(cost, 'extraction')
  }
  if (c.kind === 'source') {
    const cmd = c.command
    const { command, source } = readSupplySourceSelection(v, cmd, s)
    if (command.method === 'lit') tool(command.toolInstanceId, 'utility_flashlight', 'wear.lamp')
    else if (command.method === 'crow') tool(command.toolInstanceId, 'utility_crowbar', 'wear.tool')
    else ensure(!command.toolInstanceId, 'Unused tool selection')
    if (command.inputs) assertSupplyRecipe(v, command.inputs, source.inputs!, s)
    // Exchange output placement is deterministic public fixed merchandise, never an unrevealed search choice.
    if (command.placements) {
      const declared = s.configuration.values[source.grants!]
      ensure(declared && !Array.isArray(declared) && typeof declared === 'object', 'No fixed exchange output')
      const entries = Object.entries(declared)
      ensure(entries.length === command.placements.length, 'Each exchange output needs placement')
      const outputs = entries.map(([alias, quantity], n) => {
        ensure(typeof quantity === 'number', 'Invalid declared quantity')
        const item = { instanceId: 'player-exchange-geometry-' + n, definitionId: s.tasks.data.items.find(i => i.alias === alias)!.id, quantity }
        return item
      })
      checkSupplyExchangePlacement(v, command.inputs ?? [], outputs, command.placements, s)
    }
    return paid(supplySourceCost(source.cost, command.method, s), source.id === 'T1-exchange' ? 'npc-handover' : 'search')
  }
  if (c.kind === 'maintenance') {
    const cmd = c.command
    requireSupplyDomainAction(v, true)
    const pool = maintenancePool(cmd.kind, s), allocations = cmd.kind === 'mechanical' ? cmd.allocations : [{ instanceId: cmd.instanceId, amount: pool }]
    requireMaintenanceAllocations(allocations, pool)
    for (const a of allocations) {
      requireMaintenanceTarget(v, a.instanceId, cmd.kind)
      ensure(restoreItemResource(v.itemStates.states.find(i => i.instanceId === a.instanceId)!, a.amount, s.catalog.resources).restored > 0, 'Resource already full', 'NOT_AVAILABLE')
    }
    assertSupplyRecipe(v, cmd.inputs, maintenanceRecipe(v, cmd.kind, allocations, s), s)
    return paid(numberValue(s.configuration, cmd.kind === 'recharge' ? 'recharge' : 'maintenance.' + cmd.kind), cmd.kind === 'recharge' ? 'recharge' : 'repair')
  }
  if (c.kind === 'task-transfer') {
    const cmd = c.command
    const item = requireSupplyTaskTransferItem(v, cmd.instanceId, cmd.kind === 'task-pickup', s)
    if (cmd.kind === 'task-pickup') placement(item, cmd.placement)
    return yes()
  }
  if (c.kind === 'inventory') {
    const cmd = c.command
    if (cmd.kind === 'move') moveBackpackItem(v.carried.backpack, cmd.instanceId, { instanceId: cmd.instanceId, ...cmd.placement }, s.catalog.physical)
    if (cmd.kind === 'split') {
      const item = requireSupplySplit(v, cmd.instanceId, cmd.quantity, s)
      ensure(previewBackpackPlacement(v.carried.backpack, item, { instanceId: item.instanceId, ...cmd.placement }, s.catalog.physical).canPlace, 'No split space', 'NOT_AVAILABLE')
    }
    if (cmd.kind === 'merge') requireSupplyMerge(v, cmd.instanceId, cmd.targetId, cmd.quantity, s)
    if (cmd.kind === 'to-quick') requireSupplyQuickTarget(v, cmd.instanceId, cmd.slot, s)
    if (cmd.kind === 'to-backpack') { const item = v.carried.quickSlots.slots[cmd.slot]; ensure(item, 'No quick item'); placement(item, cmd.placement) }
    if (cmd.kind === 'pickup' || cmd.kind === 'drop') {
      const items = cmd.kind === 'pickup' ? v.site.ground.find(g => g.nodeId === v.site.nodeId)!.items : v.carried.backpack.items
      const item = requireOrdinaryTransferItem(items, cmd.instanceId, s.catalog)
      if (cmd.kind === 'pickup') placement(item, cmd.placement)
    }
    return yes()
  }
  throw new Error('Unimplemented player command qualification')
}

/** Internal keys are identity metadata for the facade, not ordinary output. */
export function playerSupplyFacts(v: SupplyDomain, deps: SupplyDependencies) {
  const c = v.character.body.condition, limits = deps.residence.configuration.config.limits
  const cells = getOccupiedCells(v.carried.backpack, deps.catalog.physical)
  const item = (i: ItemInstance, container: 'backpack' | 'weapon' | 'armor' | 'utility' | 'quick' | 'ground', slot: number | null = null) => {
    const d = deps.catalog.physical.get(i.definitionId), s = v.itemStates.states.find(s => s.instanceId === i.instanceId)!
    const profile = deps.catalog.resources.get(i.definitionId), anchor = v.carried.backpack.placements.find(p => p.instanceId === i.instanceId)
    return { key: i.instanceId, name: d.name, quantity: i.quantity, container, slot, width: d.width, height: d.height,
      unitWeight: d.unitWeight, canRotate: d.canRotate,
      ordinary: deps.catalog.data.items.find(d => d.physical.id === i.definitionId)!.ordinary,
      stackable: d.stacking.kind === 'stackable', quickEligible: deps.catalog.containers.quickSlotCatalog.get(i.definitionId).kind === 'eligible',
      resource: s.resource.kind === 'none' ? { kind: 'none' as const } : { kind: s.resource.kind, current: s.resource.current, maximum: profile.kind === 'none' ? 0 : profile.maximum },
      placement: anchor ? { x: anchor.x, y: anchor.y, rotated: anchor.rotated } : null,
      footprint: cells.filter(cell => cell.instanceId === i.instanceId).map(cell => ({ x: cell.x, y: cell.y })) }
  }
  const carried = [...v.carried.backpack.items.map(i => item(i, 'backpack')),
    ...(['weapon', 'armor', 'utility'] as const).flatMap(slot => { const i = v.carried.equipment[slot]; return i ? [item(i, slot)] : [] }),
    ...v.carried.quickSlots.slots.flatMap((i, n) => i ? [item(i, 'quick', n)] : [])]
  const weight = calculateBackpackWeightSubtotal(v.carried.backpack, deps.catalog.physical)
  return deepFreeze({ carried, ground: v.site?.ground.find(g => g.nodeId === v.site!.nodeId)?.items.map(i => item(i, 'ground')) ?? [],
    backpack: { width: v.carried.backpack.width, height: v.carried.backpack.height, weight,
      load: classifyLoad(weight, deps.catalog.data.backpack).tier },
    body: { hp: { current: c.currentHealth, maximum: limits.hp }, bleeding: c.bleeding, minorContusions: c.minorContusions,
      painkillerActive: c.painkillerActive,
      wounds: c.openWounds.map((w, n) => ({ key: w.id, ordinal: n + 1, kind: w.kind, treatment: w.treatment })),
      energy: { current: v.character.body.energy, maximum: limits.energy }, satiety: { current: v.character.body.satiety, maximum: limits.satiety },
      quotas: { ...v.character.body.quotasRemaining },
      infectionWarning: { kind: 'unknown' as const, reason: 'No approved new-world public infection-stage mapping',
        mechanism: 'Exposure can worsen infection at a body-cycle checkpoint; disinfectant and suppressant have distinct formal targets.' } } })
}
