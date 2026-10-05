import { deepFreeze } from '../../core/config'
import { restoreMissionCandidate } from '../../core/mission-lifecycle'
import { readExecution, readExpectation, validateBinding } from '../../core/mission-lifecycle/validation'
import { parseResidence } from '../../core/residence-config/validation'
import { readSupplyValue } from '../../core/residence-supply/validation'
import { same } from '../../core/residence-terminal/validation'
import { requireSupplyResidencePolicy } from './supply-policy'
import { supplyExpectationSchema } from './supply-schema'
import { validateSupplyResidenceHistory } from './supply-history'
import { SupplyResidenceSaveError, type SupplyResidenceExpectation, type SupplyResidencePolicy } from './supply-types'

export function readSupplyResidenceExpectation(input: SupplyResidenceExpectation, policy: SupplyResidencePolicy) {
  const deps = requireSupplyResidencePolicy(policy), scope = deps.residence.scope
  try {
    const expected = parseResidence(supplyExpectationSchema, input)
    if (!same(expected.identity, { characterId: scope.characterId, rulesVersion: deps.residence.rulesVersion,
      configurationId: deps.residence.configuration.configurationId }) || expected.missions.length !== scope.declarations.length)
      throw new Error('Independent identity or scope mismatch')
    expected.missions.forEach((m, i) => {
      readExpectation(m, scope)
      if (!same(m.binding.mission, scope.declarations[i])) throw new Error('Wrong declaration order')
    })
    validateBinding(expected.initial.binding, scope)
    readExecution(expected.initial.execution, expected.initial.binding)
    return deepFreeze(expected)
  } catch {
    throw new SupplyResidenceSaveError('EXPECTED_MISMATCH', 'Missing or invalid independent v3 expectation')
  }
}
export function validateSupplyResidenceAggregate(input: unknown, expectedInput: SupplyResidenceExpectation, policy: SupplyResidencePolicy) {
  const deps = requireSupplyResidencePolicy(policy)
  const expected = readSupplyResidenceExpectation(expectedInput, policy)
  try {
    const value = readSupplyValue(input, deps)
    if (value.phase !== expected.phase || !same(value.character.identity, expected.identity) ||
      value.character.revision !== expected.revision || value.character.cycle !== expected.cycle)
      throw new SupplyResidenceSaveError('EXPECTED_MISMATCH', 'Phase/identity/progress differs from external expected')
    value.missions.forEach((m, i) => {
      try { restoreMissionCandidate(m, expected.missions[i], deps.residence.scope) }
      catch { throw new SupplyResidenceSaveError('EXPECTED_MISMATCH', 'Mission/execution differs from external expected') }
    })
    for (const origin of value.origins.filter(o => o.kind === 'initial')) {
      if (!same(origin.binding.identity, expected.identity) || !same(origin.binding.mission, expected.initial.binding.mission) ||
        !same(origin.binding.execution, expected.initial.execution))
        throw new SupplyResidenceSaveError('EXPECTED_MISMATCH', 'Initial execution differs from independent binding')
    }
    if (value.phase === 'active-world' && value.site?.pending.kind !== 'none')
      throw new SupplyResidenceSaveError('UNSUPPORTED_STAGE', 'Live pending combat is not a v3 stable boundary')
    validateSupplyResidenceHistory(value, deps)
    return value
  } catch (error) {
    if (error instanceof SupplyResidenceSaveError) throw error
    throw new SupplyResidenceSaveError('INVALID_STATE', 'Invalid v3 supply aggregate')
  }
}
