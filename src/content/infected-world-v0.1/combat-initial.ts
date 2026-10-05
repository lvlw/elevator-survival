import { createInfectedSupplyDependencies } from './initial'
import { createInfectedCombatProfiles } from './combat-profile'
import { createLocationCatalog } from '../../core/residence-location/catalog'
import { createResidenceCombatDependencies } from '../../core/residence-combat/dependencies'
/** Explicit isolated E02 composition. Old supply factory and player registry are untouched. */
export function createInfectedCombatDependencies(characterId: string) {
  const old = createInfectedSupplyDependencies(characterId)
  const profiles = createInfectedCombatProfiles(old)
  const catalog = createLocationCatalog({ ...old.catalog.data, enemies: old.catalog.data.enemies.map(e => ({
    ...e, definition: { ...e.definition, actions: e.definition.actions.map((a, i) => ({ ...a,
      playerVisible: { ...a.playerVisible,
        relativeSpeed: e.id === 'porter' ? (i === 0 ? 'slow' : 'normal') : (i === 0 ? 'normal' : 'slow'),
        directDamageSeverity: e.id === 'porter' ? (i === 0 ? 'high' : 'medium') : (i === 0 ? 'medium' : 'high'),
      } })) },
  })) })
  return createResidenceCombatDependencies(Object.freeze({ ...old, catalog, catalogs: Object.freeze([catalog]) }), profiles)
}
