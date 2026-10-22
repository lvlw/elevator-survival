import { deepFreeze } from '../../core/config'
import { establishMissionFact } from '../../core/mission-lifecycle/controlled'
import type { CombatDependencies } from '../../core/residence-combat/types'
import type { Reservation } from './schema'
/** Only called by the real S initial provider after reservation has been stored. */
export function initialBrowserMaterials(r: Reservation, dependencies: CombatDependencies) {
  const d = dependencies.supply, cfg = d.residence.configuration.config
  return deepFreeze({ character: { identity: { characterId: r.characterId, rulesVersion: d.residence.rulesVersion,
    configurationId: d.residence.configuration.configurationId }, revision: 0, cycle: 1, clock: { kind: 'first-ready' },
    body: { energy: cfg.limits.energy, infectionProgress: 0, satiety: cfg.limits.satiety, suppression: 0,
      quotasRemaining: { ...cfg.quota }, condition: { currentHealth: cfg.limits.hp, bleeding: false, minorContusions: 0,
        painkillerActive: false, pendingInfectionExposures: 0, openWounds: [] } } },
    mission: establishMissionFact({ characterId: r.characterId, mission: r.mission }, d.residence.scope),
    execution: r.execution, ...r.choices })
}
