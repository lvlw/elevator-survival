import { createResidenceSessionDomain } from '../../state/residence-session/combat-controlled'
import { wrapPlayerSession } from '../../state/residence-session/player-facade'
import { buildCombatSession } from '../../state/residence-session/combat-session'
import { createPreplayController } from '../infected-preplay/controller'
import { checkpointFor, validateCheckpoint } from './checkpoint'
import { validateReservation } from './reservation'
import { initialBrowserMaterials } from './initial-materials'
import { writeBrowserCheckpoint } from './storage'
import type { BrowserStorage } from './types'
import type { Checkpoint, Reservation } from './schema'
import { BrowserOwnerError } from './errors'
import { narrativeKnowledge } from '../../state/residence-session/narrative-entry/projection'
/** Expected is fixed BEFORE any S or domain candidate decode. No value is installed here twice. */
export function createBrowserContext(r: Reservation, cp: Checkpoint | null, storage: BrowserStorage, active: () => boolean,
  options: Readonly<{ replacement?: boolean; capture?: (checkpoint: Checkpoint) => void }> = {}) {
  const guard = <T>(fn: () => T): T => { if (!active()) throw new BrowserOwnerError('LOST_LEASE'); return fn() }
  const c = validateReservation(r), expected = cp ? validateCheckpoint(r, cp, c) : null
  let lastSaved = cp
  const session = buildCombatSession(createResidenceSessionDomain(), { policy: c.policy, startup: cp ? 'existing' : 'first',
    storage: { mode: 'prepared', read: () => guard(() => cp?.v4Text ?? null), writePrepared: prepared => guard(() => {
      const next = checkpointFor(r, prepared, c)
      if (options.capture) options.capture(next)
      else writeBrowserCheckpoint(storage, r, next, active, options.replacement === true)
      lastSaved = next
    }) },
    ...(expected ? { provideColdExpectation: () => guard(() => expected) } : { provideInitialMaterials: () => guard(() => initialBrowserMaterials(r, c.dependencies)) }) })
  const ports = wrapPlayerSession(session, c.policy, c.labels)
  // Recheck immediately AFTER controller busy callbacks, not only before entering the controller.
  const controller = createPreplayController({ player: Object.freeze({ ...ports.player,
    query: () => guard(ports.player.query), execute: input => guard(() => ports.player.execute(input)),
    preview: input => guard(() => ports.player.preview(input)), resolve: input => guard(() => ports.player.resolve(input)),
    retrySave: () => guard(ports.player.retrySave),
    subscribe: listener => ports.player.subscribe(v => { if (active()) listener(v) }),
  }), preplay: ports.preplay, bootstrap: () => guard(ports.bootstrap), createFirst: () => guard(ports.createFirst),
    retryRead: () => guard(ports.retryRead), synchronize: () => guard(ports.synchronize) })
  let persistedRevision = cp ? validateCheckpoint(r, cp, c).revision : -1
  return Object.freeze({ controller, hasCurrent: () => session.getState().current !== null,
    savedDeath: () => {
      const state = session.getState()
      return lastSaved?.expected.phase === 'dead' && state.current?.character.revision === lastSaved.expected.revision
        && state.persistence !== 'save-failed' ? lastSaved : null
    },
    readingCurrent: () => {
      const state = session.getState(), value = state.current
      if (!value) return null
      if (state.persistence === 'saved') persistedRevision = value.character.revision
      return { revision: value.character.revision, persistedRevision, saved: value.character.revision <= persistedRevision,
        known: narrativeKnowledge(value, c.dependencies).known }
    } })
}
