import type { CombatValue, CombatDependencies } from '../../core/residence-combat/types'
import { carriedItems } from '../../core/residence-location/validation'
import { playerTaskOpportunities } from '../../core/residence-task/player-query'
import type { PlayerHandle } from './player-types'
import { PlayerSelectionError } from './player-errors'

export type ActionReference = Readonly<{ family: string; key: string; method?: string; slot?: number; woundId?: string }>
type Binding = Readonly<{ purpose: 'item' | 'wound'; key: string }> | Readonly<{ purpose: 'action'; action: ActionReference }>
const actionKey = (a: ActionReference) => JSON.stringify([a.family, a.key, a.method ?? null, a.slot ?? null, a.woundId ?? null])
export function createPlayerContext(value: CombatValue, deps: CombatDependencies) {
  const byHandle = new Map<PlayerHandle, Binding>(), byKey = new Map<string, PlayerHandle>()
  function insert(key: string, binding: Binding) {
    if (byKey.has(key)) return
    const handle: PlayerHandle = Object.freeze({ selection: 'opaque' })
    byKey.set(key, handle); byHandle.set(handle, Object.freeze(binding))
  }
  for (const i of [...carriedItems(value.carried), ...(value.site?.ground.find(g => g.nodeId === value.site!.nodeId)?.items ?? [])])
    insert('item:' + i.instanceId, { purpose: 'item', key: i.instanceId })
  for (const w of value.character.body.condition.openWounds) insert('wound:' + w.id, { purpose: 'wound', key: w.id })
  const actions: ActionReference[] = [{ family: 'depart', key: 'depart' }, { family: 'rest', key: 'rest' },
    ...['deliver', 'withdraw', 'deadline'].map(key => ({ family: 'terminal', key })),
    ...['move', 'split', 'merge', 'to-quick', 'to-backpack', 'pickup', 'drop'].map(key => ({ family: 'inventory', key })),
    ...['task-pickup', 'task-drop'].map(key => ({ family: 'task-transfer', key })),
    { family: 'medical', key: 'medical' },
    ...['mechanical', 'coat', 'toolbox', 'recharge'].map(key => ({ family: 'maintenance', key })),
    ...deps.supply.catalog.data.edges.map(e => ({ family: 'move', key: e.id })),
    ...playerTaskOpportunities(value, deps.supply).map(o => ({ family: o.family, key: o.key, ...(o.method ? { method: o.method } : {}) })),
    ...['metal-pipe-basic-attack', 'metal-pipe-charged-strike', 'defend', 'temporary-attack', 'escape'].map(key => ({ family: 'combat', key }))]
  value.carried.quickSlots.slots.forEach((_i, slot) => {
    actions.push({ family: 'combat', key: 'use-quick-slot-item', slot })
    for (const w of value.character.body.condition.openWounds) actions.push({ family: 'combat', key: 'use-quick-slot-item', slot, woundId: w.id })
  })
  actions.forEach(action => insert('action:' + actionKey(action), { purpose: 'action', action: Object.freeze({ ...action }) }))
  const get = (key: string) => { const h = byKey.get(key); if (!h) throw new PlayerSelectionError(); return h }
  return Object.freeze({ value, scope: Object.freeze({ scope: 'player-context' as const }),
    item: (key: string) => get('item:' + key), wound: (key: string) => get('wound:' + key),
    action: (a: ActionReference) => get('action:' + actionKey(a)),
    resolve: (handle: PlayerHandle, purpose: Binding['purpose']) => {
      const b = byHandle.get(handle)
      if (!b || b.purpose !== purpose) throw new PlayerSelectionError()
      return b
    } })
}
export type PlayerContext = ReturnType<typeof createPlayerContext>
