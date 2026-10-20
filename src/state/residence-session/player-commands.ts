import { createCombatSessionCommand } from './combat-commands'
import type { CombatDependencies } from '../../core/residence-combat/types'
import type { PlayerContext } from './player-context'
import { PlayerSelectionError } from './player-errors'
import { readPlayerRequest } from './player-validation'

/** Internal only. Never returned by the ordinary player facade. */
export function resolvePlayerCommand(context: PlayerContext, input: unknown, deps: CombatDependencies) {
  const r = readPlayerRequest(input), binding = context.resolve(r.action, 'action')
  if (binding.purpose !== 'action') throw new PlayerSelectionError()
  const a = binding.action, v = context.value
  const allowed: Record<string, readonly string[]> = {
    depart: [], move: [], rest: [], terminal: [], combat: [],
    task: ['item', 'placement', 'materials'], source: ['item', 'materials', 'placements'],
    inventory: a.key === 'move' ? ['item', 'placement'] : a.key === 'split' ? ['item', 'quantity', 'placement'] :
      a.key === 'merge' ? ['item', 'targetItem', 'quantity'] : a.key === 'to-quick' ? ['item', 'slot'] :
        a.key === 'to-backpack' ? ['item', 'placement'] : a.key === 'pickup' ? ['item', 'placement'] : ['item'],
    'task-transfer': a.key === 'task-pickup' ? ['item', 'placement'] : ['item'],
    medical: ['item', 'wound', 'quantity', 'target'], maintenance: ['item', 'materials', 'allocations'],
  }
  if (Object.keys(r).some(key => key !== 'action' && !allowed[a.family]?.includes(key))) throw new PlayerSelectionError()
  const id = (h: typeof r.item, purpose: 'item' | 'wound' = 'item') => {
    if (!h) throw new PlayerSelectionError()
    const b = context.resolve(h, purpose)
    if (b.purpose === 'action') throw new PlayerSelectionError()
    return b.key
  }
  const fields: Record<string, unknown> = { expectedRevision: v.character.revision }
  if (a.family === 'depart') Object.assign(fields, { kind: 'depart', commissionId: deps.supply.catalog.data.mission.commissionId })
  else if (a.family === 'move') Object.assign(fields, { kind: 'move', edgeId: a.key })
  else if (a.family === 'task' || a.family === 'source') {
    Object.assign(fields, { kind: a.family === 'task' ? 'task' : 'reveal', [a.family === 'task' ? 'actionId' : 'sourceId']: a.key })
    if (a.method) fields.method = a.method
    if (r.item) fields.toolInstanceId = id(r.item)
    if (r.placement) fields.placement = r.placement
    if (r.placements) fields.placements = r.placements
    if (r.materials) fields.inputs = r.materials.map(m => ({ instanceId: id(m.item), quantity: m.quantity }))
  } else if (a.family === 'combat') {
    if (!v.battle) throw new PlayerSelectionError()
    const command = a.key === 'use-quick-slot-item' ? { kind: a.key, quickSlotIndex: a.slot,
      ...(a.woundId ? { targetOpenWoundId: a.woundId } : {}) } : { kind: a.key }
    Object.assign(fields, { kind: 'combat-action', expectedBattleId: v.battle.entry.id, command })
    if (a.key === 'use-quick-slot-item') {
      const i = v.carried.quickSlots.slots[a.slot!]; if (!i) throw new PlayerSelectionError()
      fields.instanceId = i.instanceId; fields.quantity = 1
    }
  } else {
    fields.kind = a.key
    if (a.family === 'inventory' && a.key === 'to-backpack') {
      const itemId = id(r.item), slot = v.carried.quickSlots.slots.findIndex(i => i?.instanceId === itemId)
      if (slot < 0) throw new PlayerSelectionError()
      fields.slot = slot
    } else if (r.item) fields.instanceId = id(r.item)
    if (r.targetItem) fields.targetId = id(r.targetItem)
    if (r.wound) fields.woundId = id(r.wound, 'wound')
    for (const key of ['quantity', 'placement', 'slot', 'target'] as const) if (r[key] !== undefined) fields[key] = r[key]
    if (r.materials) fields.inputs = r.materials.map(m => ({ instanceId: id(m.item), quantity: m.quantity }))
    if (r.allocations) fields.allocations = r.allocations.map(m => ({ instanceId: id(m.item), amount: m.amount }))
  }
  return createCombatSessionCommand({ kind: a.family, command: fields }, deps.supply.tasks)
}
