import type { SupplyDomain } from './shared-types'
import type { SupplyDependencies } from './types'
import { carriedSupplyItem } from './allocations'
import { ensure } from './shared-validation'

export type ClinicalSelection = Readonly<{ expectedRevision: number; instanceId: string; woundId?: string; target?: 'contusion' | 'wound' }>
/** Eligibility only. Does not heal, consume, issue, or reveal hidden qualification to players. */
export function requireSupplyClinicalTarget(v: SupplyDomain, c: ClinicalSelection, deps: SupplyDependencies) {
  ensure(v.character.body.condition.currentHealth > 0, 'Living medical target required', 'NOT_AVAILABLE')
  ensure(c.expectedRevision === v.character.revision, 'Stale medical revision', 'STALE_AUTHORITY')
  const item = carriedSupplyItem(v, c.instanceId)
  const alias = deps.tasks.data.items.find(i => i.id === item.definitionId)?.alias
  const b = v.character.body, condition = b.condition, cfg = deps.residence.configuration.config
  const untreated = condition.openWounds.filter(w => w.treatment === 'untreated')
  const specific = () => {
    ensure(c.woundId && condition.openWounds.some(w => w.id === c.woundId), 'Specific eligible wound required', 'NOT_AVAILABLE')
    return c.woundId
  }
  if (alias === 'bandage') {
    ensure(!c.target && (condition.currentHealth < cfg.limits.hp || condition.bleeding || untreated.length > 0), 'No bandage target', 'NOT_AVAILABLE')
    if (untreated.length) ensure(untreated.some(w => w.id === specific()), 'Not untreated wound', 'NOT_AVAILABLE')
    else ensure(!c.woundId, 'No wound target')
  } else if (alias === 'firstaid') {
    const injured = condition.openWounds.length > 0 || condition.minorContusions > 0
    ensure(condition.currentHealth < cfg.limits.hp || injured, 'No first aid target', 'NOT_AVAILABLE')
    if (injured) {
      ensure(c.target, 'Explicit first aid injury target required')
      if (c.target === 'contusion') ensure(!c.woundId && condition.minorContusions > 0, 'No contusion target', 'NOT_AVAILABLE')
      else specific()
    } else ensure(!c.target && !c.woundId, 'Extraneous first aid target')
  } else {
    ensure(!c.woundId && !c.target, 'Extraneous medical target')
    if (alias === 'food') ensure(b.satiety < cfg.limits.satiety, 'Satiety full', 'NOT_AVAILABLE')
    else if (alias === 'disinfect') ensure(condition.pendingInfectionExposures > 0 && b.quotasRemaining.disinfectant > 0, 'No disinfect target/quota', 'NOT_AVAILABLE')
    else if (alias === 'suppressant') ensure((b.infectionProgress > 0 || condition.pendingInfectionExposures > 0) && b.quotasRemaining.suppressant > 0, 'No suppressant target/quota', 'NOT_AVAILABLE')
    else if (alias === 'painkiller') ensure(!condition.painkillerActive && (condition.minorContusions > 0 || untreated.length > 0), 'No painkiller target', 'NOT_AVAILABLE')
    else ensure(false, 'Not a medical/food item', 'NOT_AVAILABLE')
  }
  return { item, alias }
}
