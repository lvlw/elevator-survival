import type { LocationCatalogData } from '../../core/residence-location/catalog'
import { numberField, type SupplyConfig } from '../../core/residence-supply/config'
import type { TaskCatalog } from '../../core/residence-task/catalog'
/** Static persistent enemy declarations only. No CTB action producer. */
export function buildInfectedSupplyEnemies(config: SupplyConfig, tasks: TaskCatalog): LocationCatalogData['enemies'] {
  return tasks.data.enemies.map(e => ({ id: e.id, nodeId: e.node,
    definition: { id: 'infected-world-' + e.id, maxHealth: numberField(config, e.parameters, 'hp'),
      tags: ['infected'], weaknessTags: e.bluntWeakness ? ['blunt'] : [],
      initialIntentActionId: e.id + '-basic', actionCycle: [e.id + '-basic', e.id + '-special'],
      actions: [0, 1].map(i => ({ id: e.id + (i === 0 ? '-basic' : '-special'),
        kind: i === 0 ? 'scratch' as const : 'lunge-bite' as const,
        playerVisible: { category: i === 0 ? 'basic-attack' as const : 'special-attack' as const,
          relativeSpeed: i === 0 ? 'normal' as const : 'slow' as const,
          directDamageSeverity: i === 0 ? 'medium' as const : 'high' as const,
          mayCauseInjury: e.woundRisk[i] !== 'none', mayCauseInfectionExposure: e.exposureRisk[i] !== 'none', mayCauseControl: false } })) } }))
}
