import { createMissionScope, establishMissionFact } from '../../core/mission-lifecycle/controlled'
import { drawIntInclusive } from '../../core/random'
import { infectedResidenceConfig } from '../infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig } from '../infected-terminal-core-v0.1/config'
import { infectedWorldSupplyConfig } from './config'
import { infectedSupplyMission } from './identity'
import { createInfectedSupplyLocationCatalog, infectedSupplyTasks } from './catalog'
import type { SupplyDependencies } from '../../core/residence-supply/types'
/** Explicit isolated composition. No registry, seed default, player bootstrap, or second commission. */
export function createInfectedSupplyDependencies(characterId: string): SupplyDependencies {
  const scope = createMissionScope({ characterId, declarations: [infectedSupplyMission] }, v => v === infectedSupplyMission.rulesVersion)
  const catalog = createInfectedSupplyLocationCatalog()
  return Object.freeze({ residence: Object.freeze({ configuration: infectedResidenceConfig,
    rulesVersion: infectedSupplyMission.rulesVersion, scope }), terminal: infectedTerminalCoreConfig,
    configuration: infectedWorldSupplyConfig, catalog, catalogs: Object.freeze([catalog]), tasks: infectedSupplyTasks, draw: drawIntInclusive })
}
export function createInfectedSupplyUnaccepted(deps: SupplyDependencies) {
  return establishMissionFact({ characterId: deps.residence.scope.characterId, mission: deps.catalog.data.mission }, deps.residence.scope)
}
