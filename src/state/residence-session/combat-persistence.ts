import { validateCombatResidenceAggregate } from '../residence-save/combat-validation'
import { serializeCombatResidenceSave } from '../residence-save/combat-codec'
import { CombatResidenceSaveError } from '../residence-save/combat-types'
import type { CombatResidencePolicy } from '../residence-save/combat-types'
import { combatExpectationSchema } from '../residence-save/combat-schema'
import { parseResidence } from '../../core/residence-config/validation'
import type { CombatSessionExpectation } from './combat-types'

export function prepareCombatPersistence(input: unknown, expected: CombatSessionExpectation, policy: CombatResidencePolicy) {
  const checkedExpected = parseResidence(combatExpectationSchema, expected)
  const value = validateCombatResidenceAggregate(input, checkedExpected, policy)
  const text = serializeCombatResidenceSave(value, checkedExpected, policy)
  if (typeof text !== 'string') throw new CombatResidenceSaveError('INVALID_STATE', 'Encoder did not return a complete v4 string')
  return { value, text, expected }
}
