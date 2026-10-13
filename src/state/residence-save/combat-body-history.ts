import { ResidenceError } from '../../core/residence-config/types'
import { MissionLifecycleError } from '../../core/mission-lifecycle/types'
import { LocationError } from '../../core/residence-location/types'
import { SupplyError } from '../../core/residence-supply/types'
import { TerminalError } from '../../core/residence-terminal/types'
import { CombatError } from '../../core/combat/combat-errors'
import { InventoryError } from '../../core/inventory/inventory-errors'
import { ItemStateError } from '../../core/item-state/item-state-errors'
import { QuickSlotError } from '../../core/quick-slot/quick-slot-errors'
import { ConditionError } from '../../core/condition/condition-errors'
import { CombatResidenceSaveError } from './combat-types'
import type { CombatValue } from '../../core/residence-combat/types'
import type { HistoryCheck } from './shared-supply-history'
import { same } from '../../core/residence-terminal/validation'

/** Translate only known invalid-data errors. Implementation exceptions stay visible. */
export function combatDataBoundary<T>(code: CombatResidenceSaveError['code'], read: () => T): T {
  try { return read() } catch (error) {
    if (error instanceof CombatResidenceSaveError) throw error
    if (error instanceof ResidenceError || error instanceof MissionLifecycleError || error instanceof LocationError ||
      error instanceof SupplyError || error instanceof TerminalError || error instanceof CombatError ||
      error instanceof InventoryError || error instanceof ItemStateError || error instanceof QuickSlotError || error instanceof ConditionError)
      throw new CombatResidenceSaveError(code, `Invalid v4 data: ${error.message}`)
    throw error
  }
}
export function validateCombatDeathClosure(v: CombatValue, index: number, check: HistoryCheck): void {
  const r = v.receipts[index]
  check(r.source === 'combat-death', 'Expected typed combat closure')
  const death = v.combatDeaths.find(d => d.id === r.combatDeathReceiptId)
  check(death && v.phase === 'dead' && v.site === null && v.battle === null &&
    v.character.body.condition.currentHealth === 0 && r.outcome === 'death' && r.steps.length === 0 &&
    same(r.binding, death.entry.binding) && r.revision === death.revision &&
    death.decision.healthAfter === 0 && death.decision.trace.at(-1)?.healthAfter === 0,
  'Combat death closure/typed checkpoint differs')
  const archive = v.archives[index]
  const enemy = archive.site.enemies.find(e => e.id === death.entry.enemyId)
  check(same(archive.site.binding, death.entry.binding) && archive.site.nodeId === death.entry.to &&
    enemy && enemy.state.enemyInstanceId === death.entry.enemyInstanceId &&
    enemy.state.definitionId === death.entry.definitionId && enemy.state.hasBeenEncountered &&
    enemy.state.currentHealth === death.decision.enemyHealthAfter &&
    enemy.state.defeated === (death.decision.enemyHealthAfter === 0), 'Combat death archive/actual enemy differs')
  // R-F01: pending follows this already-validated decision, not a generic dead flag.
  if (enemy.state.defeated) {
    check(['metal-pipe-basic-attack', 'metal-pipe-charged-strike', 'temporary-attack'].includes(death.decision.command.kind) &&
      death.decision.enemyHealthBefore > 0 && death.decision.trace.at(-1)?.kind === 'post-action-bleeding' &&
      archive.site.pending.kind === 'none', 'Killed enemy death lacks actual primary/bleeding/cleared pending')
  } else check(archive.site.pending.kind === 'combat-required' && archive.site.pending.enemyId === death.entry.enemyId,
    'Living enemy death must preserve its actual pending encounter')
}
