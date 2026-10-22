import { same } from '../../core/residence-terminal/validation'
import { readCombatResidenceExpectation } from '../../state/residence-save/combat-validation'
import type { CombatPreparedWrite } from '../../state/residence-session/combat-types'
import { BrowserOwnerError } from './errors'
import { checkpointSchema, readRecord, SLOT, type Checkpoint, type Reservation } from './schema'
import type { browserComposition } from './composition'
/** Checks independent metadata only; does not parse, inspect or patch the opaque v4 text. */
export function validateCheckpoint(r: Reservation, cp: Checkpoint, c: ReturnType<typeof browserComposition>) {
  const e = readCombatResidenceExpectation(cp.expected, c.policy)
  if (cp.generation !== r.generation || !same(e.initial, { binding: { characterId: r.characterId, mission: r.mission },
    execution: r.execution, choices: r.choices })) throw new BrowserOwnerError('INVALID_RECORD')
  return e
}
export function checkpointFor(r: Reservation, prepared: CombatPreparedWrite, c: ReturnType<typeof browserComposition>) {
  const cp = readRecord(checkpointSchema, { format: 'elevator-survival.infected-checkpoint', formatVersion: 1,
    slot: SLOT, generation: r.generation, expected: prepared.expected, v4Text: prepared.text })
  validateCheckpoint(r, cp, c)
  return cp
}
