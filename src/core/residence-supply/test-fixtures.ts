// TEST ONLY. No production imports; isolated real initial/departure chain.
import { establishMissionFact } from '../mission-lifecycle/controlled'
import { establishSupplyInitial, planSupplyDeparture } from './initial'
import { createSupplyAuthority } from './authority'
import { cycleContext } from './validation'
import type { SupplyValue, SupplyDependencies } from './types'
export function fixture(dependencies: SupplyDependencies, options: { tool?: 'crow' | 'lamp' | 'toolbox'; specialty?: 'scout' | 'engineer' | 'survival'; seed?: string; hp?: number; bleeding?: boolean; energy?: number } = {}) {
  const cfg = dependencies.residence.configuration.config
  const character = { identity: { characterId: dependencies.residence.scope.characterId, rulesVersion: dependencies.residence.rulesVersion,
    configurationId: dependencies.residence.configuration.configurationId }, revision: 0, cycle: 1, clock: { kind: 'first-ready' as const },
    body: { energy: options.energy ?? cfg.limits.energy, infectionProgress: 0, satiety: cfg.limits.satiety, suppression: 0,
      quotasRemaining: { ...cfg.quota }, condition: { currentHealth: options.hp ?? cfg.limits.hp, bleeding: options.bleeding ?? false,
        minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0, openWounds: [] } } }
  const initial = establishSupplyInitial({ character, mission: establishMissionFact({ characterId: dependencies.residence.scope.characterId,
    mission: dependencies.catalog.data.mission }, dependencies.residence.scope),
    execution: { runId: 'test-execution', seed: options.seed ?? 'test-seed', rulesVersion: dependencies.residence.rulesVersion },
    tool: options.tool ?? 'toolbox', specialty: options.specialty ?? 'engineer' }, dependencies)
  const authorize = (v: SupplyValue) => createSupplyAuthority(v, { cycle: cycleContext(v.character, dependencies, v.site?.nodeId ?? null), missions: v.missions }, dependencies)
  const departed = planSupplyDeparture(initial, { kind: 'depart', expectedRevision: initial.character.revision,
    commissionId: dependencies.catalog.data.mission.commissionId }, authorize(initial))
  return { dependencies, initial, value: departed.snapshot, departed, authorize }
}
export const revision = (v: SupplyValue) => ({ expectedRevision: v.character.revision })
