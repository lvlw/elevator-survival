import { createCombatEngineSnapshot, createCombatProfile, createProfiledCombatDependencies } from '../combat/profiled-controlled'
import { supplyBandageRecovery } from '../residence-supply/shared-medical'
import { carriedItems } from '../residence-location/validation'
import { ensure } from '../residence-supply/shared-validation'
import type { CombatDependencies, CombatValue } from './types'
export function projectCombat(value: CombatValue, deps: CombatDependencies) {
  const b = value.battle, site = value.site, s = deps.supply, c = s.catalog
  ensure(b && site && site.pending.kind === 'combat-required', 'No live battle', 'NOT_AVAILABLE')
  const enemy = site.enemies.find(e => e.id === b.entry.enemyId)!
  const profile = deps.profiles.find(p => p.definitionId === enemy.state.definitionId)!
  const engine = createProfiledCombatDependencies({ profile: createCombatProfile({ ...profile,
    rules: { ...profile.rules, bandage: { ...profile.rules.bandage, healthRecovery: supplyBandageRecovery(value, s) } } }),
    runSeed: site.binding.execution.seed, sceneInstanceId: site.binding.catalogId,
    physicalCatalog: c.physical, equipmentCatalog: c.containers.equipmentCatalog, quickSlotCatalog: c.containers.quickSlotCatalog,
    itemResourceCatalog: c.resources, lifecycleCatalog: deps.lifecycle, enemyCatalog: c.enemies,
    bindings: { enemyDefinitionId: profile.definitionId, metalPipeDefinitionId: 'weapon_metal_pipe',
      heavyCoatDefinitionId: 'armor_heavy_coat', bandageDefinitionId: s.tasks.data.items.find(i => i.alias === 'bandage')!.id,
      painkillerDefinitionId: s.tasks.data.items.find(i => i.alias === 'painkiller')!.id },
    draw: s.draw, riskAddress: { executionId: site.binding.execution.runId, catalogId: site.binding.catalogId } })
  const ids = new Set(carriedItems(value.carried).map(i => i.instanceId))
  const snapshot = createCombatEngineSnapshot({ status: 'awaiting-player', currentCtb: b.currentCtb,
    playerNextActionCtb: b.playerNext, enemyNextActionCtb: b.enemyNext, temporaryDefense: b.temporaryDefense,
    playerCondition: value.character.body.condition, backpack: value.carried.backpack, equipment: value.carried.equipment,
    quickSlots: value.carried.quickSlots, itemStates: { states: value.itemStates.states.filter(i => ids.has(i.instanceId)) },
    enemy: enemy.state, usage: { metalPipeChargedStrikeUses: s.residence.configuration.config.quota.pipe_signature -
      value.character.body.quotasRemaining.pipe_signature } }, engine)
  return { snapshot, engine }
}
