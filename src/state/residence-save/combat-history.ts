import type { CombatDependencies, CombatValue } from '../../core/residence-combat/types'
import { validateSharedSupplyHistory, type HistoryCheck } from './shared-supply-history'
import { validateCombatDeathClosure } from './combat-body-history'
import { CombatResidenceSaveError } from './combat-types'
import { same } from '../../core/residence-terminal/validation'

const check: HistoryCheck = (ok, reason) => {
  if (!ok) throw new CombatResidenceSaveError('INVALID_STATE', reason)
}
export function validateCombatResidenceHistory(v: CombatValue, deps: CombatDependencies): void {
  validateSharedSupplyHistory(v, deps.supply, check, (_, i) => validateCombatDeathClosure(v, i, check))
  // These are chronological facts, not action replay. Distinct enemies still share one timeline.
  const entries = [...v.battles.map(b => b.entry), ...v.combatDeaths.map(b => b.entry), ...(v.battle ? [v.battle.entry] : [])]
    .sort((a, b) => a.revision - b.revision)
  for (const [i, e] of entries.entries()) {
    const catalog = deps.supply.catalogs.find(c => c.data.id === e.binding.catalogId)!
    const arrival = catalog.data.edges.find(edge => edge.id === e.edgeId)!.arrival
    const primary = e.steps[0], bleeding = e.steps[1]
    check(same(primary.facts, { healthLoss: Math.min(e.healthBefore, arrival.healthLoss),
      exposuresAdded: arrival.exposuresAdded }) && primary.healthBefore - primary.healthAfter === primary.facts.healthLoss,
    'Entry primary facts differ from actual arrival effects')
    if (bleeding) check(same(bleeding.facts, { damage: Math.min(bleeding.healthBefore,
      deps.supply.residence.configuration.config.health.bleed_action) }) &&
      bleeding.healthBefore - bleeding.healthAfter === bleeding.facts.damage, 'Entry bleeding checkpoint differs')
    const previous = entries[i - 1]
    if (previous) {
      const end = v.battles.find(b => b.entry.id === previous.id)?.exitRevision ??
        v.combatDeaths.find(b => b.entry.id === previous.id)?.revision
      check(end !== undefined && end < e.revision, 'Overlapping or unfinished combat histories')
    }
  }
  for (const b of v.battles) check(b.energyBefore <= deps.supply.residence.configuration.config.limits.energy,
    'Historical exit energy exceeds body capacity')
}
