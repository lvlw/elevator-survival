import type { CombatValue } from '../../../core/residence-combat/types'
import type { CombatSessionCommand } from '../combat-commands'
import type { ExplorationReceipt } from './types'
import { infectedSupplyTasks } from '../../../content/infected-world-v0.1/catalog'

/** The caller supplies the actual dispatch commit.current, never a UI snapshot. */
export function explorationReceipt(before: CombatValue, after: CombatValue, command: CombatSessionCommand, sources: readonly Readonly<{ id: string; mode: string }>[] = infectedSupplyTasks.data.sources): ExplorationReceipt | null {
  const c = command.command
  const source = command.kind === 'source' ? sources.find(s => s.id === command.command.sourceId) : null
  const supported = command.kind === 'depart' || command.kind === 'move' ||
    command.kind === 'source' && !!source && ['ground-once', 'paired-H1-search-choice', 'paired-H2-search-choice'].includes(source.mode) ||
    command.kind === 'inventory' && c.kind === 'pickup' || command.kind === 'task-transfer' && c.kind === 'task-pickup' ||
    command.kind === 'task' && ['fire-door','workorder'].includes(command.command.actionId)
  if (!supported || after.phase === 'dead' || after.phase === 'living-hub') return null
  const invalid = () => { throw new Error('Exploration projection unavailable') }
  if (command.command.expectedRevision !== before.character.revision || after.character.revision !== before.character.revision + 1 ||
    JSON.stringify(after.character.identity) !== JSON.stringify(before.character.identity)) return invalid()
  if (before.site && (!after.site || JSON.stringify(before.site.binding) !== JSON.stringify(after.site.binding))) return invalid()
  for (const mission of before.missions) if ('execution' in mission) {
    const next = after.missions.find(m => JSON.stringify(m.binding) === JSON.stringify(mission.binding))
    if (!next || !('execution' in next) || JSON.stringify(next.execution) !== JSON.stringify(mission.execution)) return invalid()
  }
  if ('method' in c && ['lit','crow','toolbox'].includes(c.method ?? '') && !('toolInstanceId' in c && c.toolInstanceId)) return invalid()
  let resource: ExplorationReceipt['resource'] = null
  if ('toolInstanceId' in c && c.toolInstanceId) {
    const a = before.itemStates.states.find(s => s.instanceId === c.toolInstanceId)?.resource
    const b = after.itemStates.states.find(s => s.instanceId === c.toolInstanceId)?.resource
    if (!a || !b || b.kind !== a.kind) return invalid()
    if ('method' in c && ['lit','crow','toolbox'].includes(c.method ?? '') && a.kind === 'none') return invalid()
    if (a.kind !== 'none') {
      if (!Number.isSafeInteger(a.current) || a.current < 0) return invalid()
      if (!('current' in b) || !Number.isSafeInteger(b.current) || b.current < 0 || b.current > a.current) return invalid()
      resource = Object.freeze({ kind: a.kind, spent: a.current - b.current })
    }
  }
  const base = { method: 'method' in c ? c.method ?? null : null, resource, revealed: null }
  if (command.kind === 'depart' && before.phase === 'first-hub' && after.site?.nodeId === 'H0')
    return Object.freeze({ ...base, kind: 'departure', story: 'H01' })
  if (command.kind === 'move' && after.site && after.site.nodeId !== before.site?.nodeId)
    return Object.freeze({ ...base, kind: 'move', story: after.site.nodeId === 'H1' ? 'H02' : null })
  if (command.kind === 'source' && after.productions.some(p => p.producerId === command.command.sourceId && p.revision === before.character.revision) &&
    !before.productions.some(p => p.producerId === command.command.sourceId)) {
    const revealed = after.site?.ground.find(g => g.nodeId === after.site?.nodeId)?.items.length ?? 0
    return Object.freeze({ ...base, kind: 'search', story: ['H1-search', 'H2-search'].includes(command.command.sourceId) ? 'H03' : null, revealed })
  }
  if ((command.kind === 'inventory' && c.kind === 'pickup' || command.kind === 'task-transfer' && c.kind === 'task-pickup') && 'instanceId' in c &&
    before.site?.ground.some(g => g.nodeId === before.site?.nodeId && g.items.some(i => i.instanceId === c.instanceId)) &&
    after.carried.backpack.items.some(i => i.instanceId === c.instanceId))
    return Object.freeze({ ...base, kind: 'pickup', story: 'H04' })
  if (command.kind === 'task' && ['fire-door', 'workorder'].includes(command.command.actionId) &&
    !before.site?.facts.some(f => f.id === command.command.actionId && f.value) && after.site?.facts.some(f => f.id === command.command.actionId && f.value))
    return Object.freeze({ ...base, kind: command.command.actionId === 'workorder' ? 'workorder' : 'door', story: command.command.actionId === 'workorder' ? 'H07' : 'H05' })
  return invalid()
}
