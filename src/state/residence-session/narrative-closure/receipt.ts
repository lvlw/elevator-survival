import { deepFreeze } from '../../../core/config'
import type { CombatValue } from '../../../core/residence-combat/types'
import type { CombatSessionCommand } from '../combat-commands'
import type { ClosureReceipt } from './types'

/** Called only with the resolved command and the original dispatch's exact committed current. */
export function closureReceipt(before: CombatValue, after: CombatValue, command: CombatSessionCommand): ClosureReceipt | null {
  const terminal = after.phase === 'dead' || after.phase === 'living-hub'
  const task = command.kind === 'task' && ['method', 'install'].includes(command.command.actionId)
  if (!terminal && !task) return null
  const invalid = () => { throw new Error('Closure projection unavailable') }
  if (command.command.expectedRevision !== before.character.revision || after.character.revision !== before.character.revision + 1 ||
    JSON.stringify(before.character.identity) !== JSON.stringify(after.character.identity)) return invalid()
  const bound = after.site ?? after.archives.at(-1)?.site
  if (!before.site || !bound || JSON.stringify(before.site.binding) !== JSON.stringify(bound.binding)) return invalid()
  if (terminal) {
    const result = after.receipts.at(-1)
    if (!result || after.receipts.length !== before.receipts.length + 1 || result.revision !== after.character.revision ||
      JSON.stringify(result.binding) !== JSON.stringify(before.site.binding)) return invalid()
    return deepFreeze({ kind: 'terminal', story: ({ success: 'HC25', 'voluntary-failure': 'HC26', 'deadline-failure': 'HC28', death: 'HC29' } as const)[result.outcome] })
  }
  if (command.kind !== 'task') return null
  const id = command.command.actionId, fact = id === 'install' ? 'transfer' : 'method', node = id === 'install' ? 'H8' : 'L5'
  if (before.site.nodeId !== node || after.site?.nodeId !== node || after.phase !== 'active-world' || after.battle ||
    before.site.facts.some(f => f.id === fact && f.value) || !after.site.facts.some(f => f.id === fact && f.value)) return invalid()
  return deepFreeze({ kind: id === 'install' ? 'install' : 'method', story: id === 'install' ? 'HC19' : 'HC09' })
}
