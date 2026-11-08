import { same } from '../../core/residence-terminal/validation'
import { BrowserOwnerError } from './errors'
import { createReservation } from './reservation'
import type { Checkpoint, Reservation } from './schema'
import { createBrowserContext } from './startup'
import { readBrowserPair, writeBrowserCheckpoint } from './storage'
import type { BrowserStorage, SetupChoices } from './types'

export type PreparedAttempt = Readonly<{ reservation: Reservation; checkpoint: Checkpoint }>

export function prepareNewAttempt(old: Reservation, identity: unknown, choices: SetupChoices,
  storage: BrowserStorage, active: () => boolean): PreparedAttempt {
  const { reservation } = createReservation(identity, choices)
  if (reservation.generation === old.generation || reservation.characterId === old.characterId
    || reservation.execution.runId === old.execution.runId || reservation.execution.seed === old.execution.seed) {
    throw new BrowserOwnerError('INVALID_RECORD')
  }
  const captures: Checkpoint[] = []
  const capture = (cp: Checkpoint) => { captures.push(cp) }
  const staged = createBrowserContext(reservation, null, storage, active, { capture })
  staged.controller.bootstrap()
  const created = staged.controller.createFirst().snapshot.view
  const checkpoint = captures[0]
  if (captures.length !== 1 || !checkpoint || created?.status !== 'ready' || created.point !== 'first-hub') {
    throw new BrowserOwnerError('INVALID_RECORD')
  }
  const verified = createBrowserContext(reservation, checkpoint, storage, active, { capture })
  const restored = verified.controller.bootstrap().snapshot.view
  if (captures.length !== 1 || restored?.status !== 'ready' || restored.point !== 'first-hub') {
    throw new BrowserOwnerError('INVALID_RECORD')
  }
  return Object.freeze({ reservation, checkpoint })
}

export function commitNewAttempt(storage: BrowserStorage, old: PreparedAttempt, next: PreparedAttempt,
  active: () => boolean) {
  const pair = readBrowserPair(storage, active)
  if (!pair || !same(pair.reservation, old.reservation) || !same(pair.checkpoint, old.checkpoint)) {
    throw new BrowserOwnerError('INVALID_RECORD')
  }
  writeBrowserCheckpoint(storage, next.reservation, next.checkpoint, active, true)
}
