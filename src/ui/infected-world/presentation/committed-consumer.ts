import type { CommittedCombatPresentation } from '../../../app/infected-preplay/committed-presentation'
import type { ActionCue } from './presentation-types'
import { publicActionCopy } from './public-action-copy'

/** Bounded UI memory. No requests, commands, timers, storage or gameplay ports. */
export function createCommittedConsumer() {
  let scope: Readonly<object> | null = null, highWater = -1, generation = 0, disposed = false
  let cue: ActionCue | null = null
  const state = () => Object.freeze({ generation, cue })
  function cancel() { generation++; cue = null }
  return Object.freeze({ state,
    accept(p: CommittedCombatPresentation): number | null {
      if (disposed || p.version !== 1 || !p.token.scope || typeof p.token.scope !== 'object' ||
          !Number.isSafeInteger(p.token.ordinal) || p.token.ordinal < 0 || p.sequence.length !== 1 ||
          p.sequence[0].ordinal !== 0 || p.sequence[0].actor.role !== 'player' ||
          !Object.hasOwn(publicActionCopy, p.sequence[0].action) ||
          scope !== null && p.token.scope !== scope || p.token.ordinal <= highWater) return null
      // Mark consumed before any rendering/scheduling. Cancel never restores a token.
      scope = p.token.scope; highWater = p.token.ordinal; generation++
      cue = Object.freeze({ action: p.sequence[0].action, phase: 'active', epoch: generation }); return generation
    },
    settle(epoch: number) {
      if (disposed || epoch !== generation || cue?.phase !== 'active') return false
      cue = Object.freeze({ action: cue.action, phase: 'settled', epoch: cue.epoch }); return true
    },
    skip() { generation++; if (cue) cue = Object.freeze({ action: cue.action, phase: 'settled', epoch: cue.epoch }) },
    cancel,
    dispose() { disposed = true; cancel() },
  })
}
