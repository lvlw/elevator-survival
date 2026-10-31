import type { CombatSessionCommand } from './combat-commands'
import type { PublicCombatAction } from './player-types'

/** Only the already resolved command; no labels, selectors, outcomes or witnesses. */
export function committedCombatAction(command: CombatSessionCommand): Readonly<{ action: PublicCombatAction }> | null {
  if (command.kind !== 'combat') return null
  const kind = command.command.command.kind
  let action: PublicCombatAction
  switch (kind) {
    case 'metal-pipe-basic-attack': action = 'basic-attack'; break
    case 'metal-pipe-charged-strike': action = 'signature'; break
    case 'temporary-attack': action = 'temporary-attack'; break
    case 'defend': action = 'defend'; break
    case 'escape': action = 'retreat'; break
    case 'use-quick-slot-item': action = 'quick-use'; break
    default: return null
  }
  return Object.freeze({ action })
}
