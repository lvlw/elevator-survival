import { infectedSupplyMission } from '../../content/infected-world-v0.1/identity'
import { same } from '../../core/residence-terminal/validation'
import { BrowserOwnerError } from './errors'
import { readBrowserIdentity } from './identity-materials'
import { browserComposition } from './composition'
import { choicesSchema, reservationSchema, readRecord, SLOT, type Reservation } from './schema'
export function createReservation(identity: unknown, choices: unknown) {
  const m = readBrowserIdentity(identity), c = readRecord(choicesSchema, choices), composition = browserComposition(m.characterId)
  const reservation = readRecord(reservationSchema, { format: 'elevator-survival.infected-reservation', formatVersion: 1,
    slot: SLOT, generation: m.generation, characterId: m.characterId, execution: { runId: m.runId, seed: m.seed,
      rulesVersion: infectedSupplyMission.rulesVersion }, choices: c, mission: infectedSupplyMission, versions: composition.versions })
  return { reservation, composition }
}
export function validateReservation(r: Reservation) {
  const c = browserComposition(r.characterId)
  if (!same(r.versions, c.versions) || !same(r.mission, infectedSupplyMission) || r.execution.rulesVersion !== r.mission.rulesVersion)
    throw new BrowserOwnerError('INVALID_RECORD')
  return c
}
