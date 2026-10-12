import { deepFreeze } from '../../core/config'
import { same } from '../../core/residence-terminal/validation'
import { validateCombatResidenceAggregate } from './combat-validation'
import { CombatResidenceSaveError, type CombatResidenceCandidate, type CombatResidenceExpectation, type CombatResidencePolicy } from './combat-types'

/** Both values are independently validated; anchors alone are not a committed-state comparison. */
export function restoreCombatResidenceCandidate(input: unknown, independentCommitted: unknown,
  expected: CombatResidenceExpectation, policy: CombatResidencePolicy): CombatResidenceCandidate {
  const committed = validateCombatResidenceAggregate(independentCommitted, expected, policy)
  const value = validateCombatResidenceAggregate(input, expected, policy)
  if (!same(value, committed)) throw new CombatResidenceSaveError('EXPECTED_MISMATCH', 'Candidate changed complete known committed facts')
  return deepFreeze({ kind: 'combat-residence-candidate', value })
}
