import { createCombatProfile } from '../../core/combat/profiled-controlled'
import { z } from 'zod'
import { countSchema, positiveSchema, parseResidence } from '../../core/residence-config/validation'
import type { CombatProfile } from '../../core/combat/combat-profile'
import { numberValue, numberField } from '../../core/residence-supply/config'
import type { SupplyDependencies } from '../../core/residence-supply/types'
import { hospitalSliceV01RuleConfig } from '../hospital-v0.1/rule-config'

/** Only inherited CTB facts are referenced; old scene time, initial gear and infection config are not copied. */
export function createInfectedCombatProfiles(deps: SupplyDependencies, bandageRecovery = numberValue(deps.configuration, 'bandage.hp')): readonly CombatProfile[] {
  const c = deps.configuration, inherited = hospitalSliceV01RuleConfig.combat
  const pair = (key: string, field: string) => {
    const record = parseResidence(z.strictObject({ hp: positiveSchema, first: countSchema,
      damages: z.tuple([countSchema, countSchema]), waits: z.tuple([positiveSchema, positiveSchema]) }), c.values[key])
    return field === 'damages' ? record.damages : record.waits
  }
  return Object.freeze(deps.tasks.data.enemies.map(enemy => {
    const damages = pair(enemy.parameters, 'damages'), waits = pair(enemy.parameters, 'waits')
    return createCombatProfile({ definitionId: 'infected-world-' + enemy.id,
      maxHealth: numberField(c, enemy.parameters, 'hp'), firstEnemyCtb: numberField(c, enemy.parameters, 'first'),
      reentryEnemyCtb: numberValue(c, 'reentry.enemy'), reentryPlayerCtb: numberValue(c, 'reentry.player'),
      // DEC-031/036 retain the two components. 200 is the legacy combined orderly delay, not a universal delay.
      bluntActionDelayBonus: 60,
      actions: [0, 1].map(i => ({ actionId: enemy.id + (i === 0 ? '-basic' : '-special'), ctb: waits[i], damage: damages[i],
        injuryKind: enemy.wounds[i], injuryRiskTier: enemy.woundRisk[i], exposureRiskTier: enemy.exposureRisk[i] })),
      rules: { player: { maxHealth: deps.residence.configuration.config.limits.hp },
        metalPipe: { maxDurability: numberValue(c, 'capacity.pipe'),
          basicAttack: { damage: numberValue(c, 'pipe.basic.damage'), ctb: numberValue(c, 'pipe.basic.ctb'), durabilityCost: numberValue(c, 'wear.pipe.basic') },
          chargedStrike: { damage: numberValue(c, 'pipe.signature.damage'), ctb: numberValue(c, 'pipe.signature.ctb'),
            durabilityCost: numberValue(c, 'wear.pipe.signature'), enemyActionDelay: 140,
            maxUsesPerExploration: deps.residence.configuration.config.quota.pipe_signature } },
        heavyCoat: inherited.heavyCoat, defend: inherited.defend, temporaryAttack: inherited.temporaryAttack,
        escape: { baseCtb: { normal: numberValue(c, 'retreat.normal'), loaded: numberValue(c, 'retreat.normal'), overloaded: numberValue(c, 'retreat.overloaded') },
          ctbPerUntreatedOpenWound: numberValue(c, 'retreat.wound'), woundCtbBonusCap: numberValue(c, 'retreat.wound_cap') },
        riskTiers: inherited.riskTiers, postPlayerActionBleedingDamage: deps.residence.configuration.config.health.bleed_action,
        bandage: { combatCtb: numberValue(c, 'bandage.ctb'), healthRecovery: bandageRecovery, stopsBleeding: hospitalSliceV01RuleConfig.medical.bandage.stopsBleeding },
        painkiller: { combatCtb: numberValue(c, 'painkiller.ctb'), escapeWoundCtbReduction: numberValue(c, 'painkiller.retreat') },
        armorMaximum: numberValue(c, 'capacity.coat'),
        backpack: { ...deps.catalog.data.backpack, totalCells: deps.catalog.data.backpack.width * deps.catalog.data.backpack.height },
      } })
  }))
}
