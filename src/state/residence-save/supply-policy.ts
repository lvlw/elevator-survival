import { deepFreeze } from '../../core/config'
import { readScope } from '../../core/mission-lifecycle/validation'
import { requireResidenceConfig } from '../../core/residence-config'
import { idSchema, parseResidence } from '../../core/residence-config/validation'
import { requireCatalog } from '../../core/residence-location/catalog'
import { requireSupplyConfig } from '../../core/residence-supply/config'
import { requireTaskCatalog } from '../../core/residence-task/catalog'
import { requireTerminalConfig } from '../../core/residence-terminal/config'
import { same } from '../../core/residence-terminal/validation'
import { SupplyResidenceSaveError, type SupplyResidenceDependencies, type SupplyResidencePolicy } from './supply-types'

const handles = new WeakMap<SupplyResidencePolicy, SupplyResidenceDependencies>()
function invalid(): never { throw new SupplyResidenceSaveError('INVALID_POLICY', 'Invalid or unissued v3 dependency policy') }
function shell(v: unknown, keys: string[]): asserts v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Object.getPrototypeOf(v) !== Object.prototype ||
    !same(Reflect.ownKeys(v).sort(), keys.sort()) ||
    !Object.values(Object.getOwnPropertyDescriptors(v)).every(d => d.enumerable && 'value' in d)) invalid()
}
export function createSupplyResidencePolicy(input: SupplyResidenceDependencies): SupplyResidencePolicy {
  try {
    shell(input, ['residence', 'terminal', 'configuration', 'catalog', 'catalogs', 'tasks', 'draw'])
    shell(input.residence, ['configuration', 'rulesVersion', 'scope'])
    const configuration = requireResidenceConfig(input.residence.configuration)
    const rulesVersion = parseResidence(idSchema, input.residence.rulesVersion)
    const scope = deepFreeze(readScope(input.residence.scope))
    // Validate array descriptors before accessing handles or freezing our own copy.
    if (!Array.isArray(input.catalogs) || Object.getPrototypeOf(input.catalogs) !== Array.prototype ||
      Reflect.ownKeys(input.catalogs).length !== input.catalogs.length + 1 ||
      !Object.entries(Object.getOwnPropertyDescriptors(input.catalogs)).every(([key, d]) => key === 'length' ||
        /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < input.catalogs.length && d.enumerable && 'value' in d)) invalid()
    const catalogs = input.catalogs.map(requireCatalog)
    const catalog = requireCatalog(input.catalog), tasks = requireTaskCatalog(input.tasks)
    const supply = requireSupplyConfig(input.configuration), terminal = requireTerminalConfig(input.terminal)
    if (typeof input.draw !== 'function' || !catalogs.includes(catalog) ||
      catalogs.length !== scope.declarations.length || !scope.declarations.length ||
      new Set(catalogs.map(c => c.data.id)).size !== catalogs.length ||
      new Set(catalogs.map(c => c.data.mission.commissionId)).size !== catalogs.length ||
      scope.declarations.some(d => d.rulesVersion !== rulesVersion || !catalogs.some(c => same(c.data.mission, d))) ||
      tasks.configurationId !== supply.configurationId || catalogs.some(c => c.data.version !== tasks.contentId)) invalid()
    const profiles = new Map<string, unknown>()
    for (const c of catalogs) for (const item of c.data.items) {
      if (profiles.has(item.physical.id) && !same(profiles.get(item.physical.id), item)) invalid()
      profiles.set(item.physical.id, item)
    }
    const policy: SupplyResidencePolicy = Object.freeze({ kind: 'supply-residence-policy' })
    handles.set(policy, Object.freeze({ residence: Object.freeze({ configuration, rulesVersion, scope }),
      terminal, configuration: supply, catalog, catalogs: Object.freeze(catalogs), tasks, draw: input.draw }))
    return policy
  } catch (error) {
    if (error instanceof SupplyResidenceSaveError) throw error
    invalid()
  }
}
export function requireSupplyResidencePolicy(policy: SupplyResidencePolicy): SupplyResidenceDependencies {
  const deps = handles.get(policy)
  if (!deps) invalid()
  return deps
}
