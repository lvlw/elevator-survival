import { deepFreeze } from '../../core/config'
import { same } from '../../core/residence-terminal/validation'
import type { SupplyValue } from '../../core/residence-supply/types'
import { validateSupplyResidenceAggregate } from './supply-validation'
import { SupplyResidenceSaveError, type SupplyResidenceCandidate, type SupplyResidenceExpectation, type SupplyResidencePolicy } from './supply-types'

/** Same-progress candidate only; independent committed state is mandatory, never defaulted to input. */
export function restoreSupplyResidenceCandidate(input: unknown, independentCommitted: SupplyValue,
  expected: SupplyResidenceExpectation, policy: SupplyResidencePolicy): SupplyResidenceCandidate {
  let committed: SupplyValue
  try { committed = validateSupplyResidenceAggregate(independentCommitted, expected, policy) }
  catch { throw new SupplyResidenceSaveError('EXPECTED_MISMATCH', 'Missing or invalid independent committed state') }
  const value = validateSupplyResidenceAggregate(input, expected, policy)
  if (!same(value, committed)) throw new SupplyResidenceSaveError('EXPECTED_MISMATCH', 'Candidate changed known committed facts')
  return deepFreeze({ kind: 'supply-residence-candidate', value })
}
