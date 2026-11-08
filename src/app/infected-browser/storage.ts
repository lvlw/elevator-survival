import { CHECKPOINT_KEY, RESERVATION_KEY, replacementSchema, storedCheckpointSchema, reservationSchema,
  readJSON, readRecord, type Checkpoint, type Reservation } from './schema'
import type { BrowserStorage } from './types'
import { BrowserOwnerError } from './errors'

export function readBrowserPair(storage: BrowserStorage, active: () => boolean) {
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  const reservation = storage.getItem(RESERVATION_KEY)
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  const checkpoint = storage.getItem(CHECKPOINT_KEY)
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  if (reservation === null && checkpoint === null) return null
  if (typeof checkpoint !== 'string') throw new BrowserOwnerError('INVALID_RECORD')
  const record = readJSON(storedCheckpointSchema, checkpoint)
  if ('reservation' in record) return { reservation: record.reservation, checkpoint: record.checkpoint, replacement: true as const }
  if (typeof reservation !== 'string') throw new BrowserOwnerError('INVALID_RECORD')
  return { reservation: readJSON(reservationSchema, reservation), checkpoint: record, replacement: false as const }
}

export function reserveBrowser(storage: BrowserStorage, r: Reservation, active: () => boolean) {
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  if (storage.setItem(RESERVATION_KEY, JSON.stringify(r)) !== undefined) throw new BrowserOwnerError('INVALID_RECORD')
}

export function writeBrowserCheckpoint(storage: BrowserStorage, r: Reservation, cp: Checkpoint,
  active: () => boolean, replacement: boolean) {
  const record = replacement ? readRecord(replacementSchema, {
    format: 'elevator-survival.infected-replacement', formatVersion: 1, reservation: r, checkpoint: cp,
  }) : cp
  const text = JSON.stringify(record)
  if (!active()) throw new BrowserOwnerError('LOST_LEASE')
  if (storage.setItem(CHECKPOINT_KEY, text) !== undefined) throw new BrowserOwnerError('INVALID_RECORD')
}
