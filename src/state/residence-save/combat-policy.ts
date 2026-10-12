import { deepFreeze } from '../../core/config'
import { requireCombatDependencies } from '../../core/residence-combat/dependencies'
import { RANDOM_ALGORITHM_VERSION } from '../../core/random'
import { same } from '../../core/residence-terminal/validation'
import { SupplyError } from '../../core/residence-supply/types'
import { createSupplyResidencePolicy, requireSupplyResidencePolicy } from './supply-policy'
import { SupplyResidenceSaveError } from './supply-types'
import { CombatResidenceSaveError, type CombatResidencePolicy, type CombatResidencePolicyInput } from './combat-types'

const handles = new WeakMap<CombatResidencePolicy, Readonly<{
  dependencies: CombatResidencePolicyInput['dependencies']; versions: ReturnType<typeof versionsFor>
  scope: CombatResidencePolicyInput['dependencies']['supply']['residence']['scope']
}>>()
function invalid(): never { throw new CombatResidenceSaveError('INVALID_POLICY', 'Invalid or unissued v4 policy') }
function versionsFor(d: CombatResidencePolicyInput['dependencies']) {
  const s = d.supply
  return deepFreeze({ rulesVersion: s.residence.rulesVersion,
    residenceConfigurationId: s.residence.configuration.configurationId,
    terminalConfigurationId: s.terminal.configurationId, supplyConfigurationId: s.configuration.configurationId,
    contentId: s.tasks.contentId, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION,
    profileIds: d.profiles.map(p => p.definitionId),
    catalogs: s.catalogs.map(c => ({ catalogId: c.data.id, catalogVersion: c.data.version, mission: { ...c.data.mission } })) })
}
/** The issued P handle is required. This does not issue any gameplay authority. */
export function createCombatResidencePolicy(input: CombatResidencePolicyInput): CombatResidencePolicy {
  if (!input || Object.getPrototypeOf(input) !== Object.prototype ||
    !Reflect.ownKeys(input).every(k => typeof k === 'string') ||
    !same(Reflect.ownKeys(input).sort(), ['dependencies', 'randomAlgorithmVersion']) ||
    !Object.values(Object.getOwnPropertyDescriptors(input)).every(d => d.enumerable && 'value' in d)) invalid()
  try {
    const dependencies = requireCombatDependencies(input.dependencies)
    if (input.randomAlgorithmVersion !== RANDOM_ALGORITHM_VERSION) invalid()
    // Reuse dependency binding validation only; never convert a CombatValue to v3.
    const s = requireSupplyResidencePolicy(createSupplyResidencePolicy(dependencies.supply))
    const policy: CombatResidencePolicy = Object.freeze({ kind: 'combat-residence-policy' })
    handles.set(policy, Object.freeze({ dependencies, scope: s.residence.scope, versions: versionsFor(dependencies) }))
    return policy
  } catch (error) {
    if (error instanceof CombatResidenceSaveError) throw error
    if (error instanceof SupplyError || error instanceof SupplyResidenceSaveError) invalid()
    throw error
  }
}
export function requireCombatResidencePolicy(policy: CombatResidencePolicy) {
  const handle = handles.get(policy)
  if (!handle || !same(handle.scope, handle.dependencies.supply.residence.scope) ||
    !same(handle.versions, versionsFor(handle.dependencies))) invalid()
  return handle
}
