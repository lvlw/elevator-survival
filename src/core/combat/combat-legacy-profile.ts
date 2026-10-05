import type { CombatEngineDependencies, CombatEnemyActionProfile, CombatRules } from './combat-profile'
import { isProfiledCombat } from './combat-profile'
import type { EnemyActionDefinition } from './combat-types'

/** Legacy adapter reads the original objects; no alternate runtime configuration. */
export function combatRules(d: CombatEngineDependencies): CombatRules {
  if (isProfiledCombat(d)) return d.profile.rules
  const c = d.config
  return { player: c.combat.player, metalPipe: c.combat.metalPipe, heavyCoat: c.combat.heavyCoat,
    defend: c.combat.defend, temporaryAttack: c.combat.temporaryAttack, escape: c.combat.escape,
    riskTiers: c.combat.riskTiers, postPlayerActionBleedingDamage: c.combat.postPlayerActionBleedingDamage,
    bandage: c.medical.bandage, painkiller: c.medical.painkiller, backpack: c.backpack,
    armorMaximum: c.maintenance.itemResourceMaximums.heavyCoatIntegrity }
}
export function enemyActionProfile(d: CombatEngineDependencies, action: EnemyActionDefinition): CombatEnemyActionProfile {
  if (isProfiledCombat(d)) {
    const found = d.profile.actions.find(a => a.actionId === action.id)
    if (!found) throw new Error('UNKNOWN_PROFILED_ACTION')
    return found
  }
  const rules = action.kind === 'scratch' ? d.config.combat.infectedOrderly.actions.scratch : d.config.combat.infectedOrderly.actions.lungeBite
  return { ...rules, actionId: action.id, injuryKind: action.kind === 'scratch' ? 'laceration' : 'bite' }
}
