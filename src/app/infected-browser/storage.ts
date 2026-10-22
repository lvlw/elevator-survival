import { CHECKPOINT_KEY, RESERVATION_KEY, checkpointSchema, reservationSchema, readJSON, type Reservation } from './schema'
import type { BrowserStorage } from './types'
import type { CombatPreparedWrite } from '../../state/residence-session/combat-types'
import { BrowserOwnerError } from './errors'
import { checkpointFor } from './checkpoint'
import type { browserComposition } from './composition'
export function readBrowserPair(storage: BrowserStorage, active: () => boolean) {
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  const reservation = storage.getItem(RESERVATION_KEY)
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  const checkpoint = storage.getItem(CHECKPOINT_KEY)
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  if (reservation === null && checkpoint === null) return null
  if (typeof reservation !== 'string' || typeof checkpoint !== 'string') throw new BrowserOwnerError('INVALID_RECORD')
  return { reservation: readJSON(reservationSchema, reservation), checkpoint: readJSON(checkpointSchema, checkpoint) }
}
export function reserveBrowser(storage: BrowserStorage, r: Reservation, active: () => boolean) {
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  if (storage.setItem(RESERVATION_KEY, JSON.stringify(r)) !== undefined) throw new BrowserOwnerError('INVALID_RECORD')
}
export function preparedBrowserWriter(storage: BrowserStorage, r: Reservation,
  c: ReturnType<typeof browserComposition>, active: () => boolean) {
  return (prepared: CombatPreparedWrite): void => {
    if (!active()) throw new BrowserOwnerError('LOST_LEASE')
    const cp = checkpointFor(r, prepared, c)
    if (storage.setItem(CHECKPOINT_KEY, JSON.stringify(cp)) !== undefined) throw new BrowserOwnerError('INVALID_RECORD')
  }
}
