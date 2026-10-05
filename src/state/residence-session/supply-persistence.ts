import { serializeSupplyResidenceSave } from '../residence-save/supply-codec'
import { validateSupplyResidenceAggregate } from '../residence-save/supply-validation'
import { SupplyResidenceSaveError } from '../residence-save/supply-types'
import type { SupplyResidenceExpectation, SupplyResidencePolicy } from '../residence-save/supply-types'

export function prepareSupplyPersistence(input: unknown, expected: SupplyResidenceExpectation, policy: SupplyResidencePolicy) {
  const value = validateSupplyResidenceAggregate(input, expected, policy)
  const text = serializeSupplyResidenceSave(value, expected, policy)
  if (typeof text !== 'string') throw new SupplyResidenceSaveError('INVALID_STATE', 'Encoder did not return a complete string')
  return { value, text }
}
