import { deepFreeze } from '../../core/config'
import { restoreMissionCandidate, type MissionExpectation } from '../../core/mission-lifecycle'
import { same } from '../../core/residence-terminal/validation'
import { terminalResidenceDependencies, validateTerminalResidenceAggregate } from './terminal-validation'
import { TerminalResidenceSaveError, type TerminalResidenceAggregate, type TerminalResidenceCandidate,
  type TerminalResidenceSavePolicy } from './terminal-types'

/** Independent expected is mandatory; cold reads have separate, explicitly named entry points. */
export function restoreTerminalResidenceCandidate(input: unknown, expectedInput: TerminalResidenceAggregate,
  policy: TerminalResidenceSavePolicy): TerminalResidenceCandidate {
  const value = validateTerminalResidenceAggregate(input, policy)
  let expected: TerminalResidenceAggregate
  try { expected = validateTerminalResidenceAggregate(expectedInput, policy) }
  catch { throw new TerminalResidenceSaveError('EXPECTED_MISMATCH', 'Missing or invalid independent expected aggregate') }
  const { scope } = terminalResidenceDependencies(expected.character.identity.characterId, policy).residence
  try {
    value.missions.forEach((mission, i) => {
      const independent = expected.missions[i]
      const expectation: MissionExpectation = independent.status === 'unaccepted'
        ? { binding: independent.binding, status: independent.status }
        : independent.status === 'active'
          ? { binding: independent.binding, status: independent.status, execution: independent.execution }
          : { binding: independent.binding, status: independent.status, execution: independent.execution, outcome: independent.outcome }
      restoreMissionCandidate(mission, expectation, scope)
    })
    if (!same(value, expected)) throw new Error('Different committed progress')
  } catch { throw new TerminalResidenceSaveError('EXPECTED_MISMATCH', 'Candidate differs from independent committed progress') }
  return deepFreeze({ kind: 'terminal-residence-candidate', value })
}
