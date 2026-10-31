import { deepFreeze } from '../../core/config'
import { requireCombatResidencePolicy } from '../residence-save/combat-policy'
import type { CombatResidencePolicy } from '../residence-save/combat-types'
import { readCombatValue } from '../../core/residence-combat/validation'
import type { CombatSession, CombatSessionComposition } from './combat-types'
import { createPlayerContext } from './player-context'
import { projectPlayerView } from './player-queries'
import { resolvePlayerCommand } from './player-commands'
import { qualifyPlayerCommand } from './player-preview'
import { isPlayerBusinessError, PlayerSelectionError } from './player-errors'
import type { PlayerSession, PlayerLabels, PlayerPreview, PlayerExecution } from './player-types'
import { buildCombatSession } from './combat-session'
import type { ResidenceDomain } from './types'
import { assertCombatSyncFunction } from './combat-composition'
import { createPlayerPreplay } from './player-preplay'
import { committedCombatAction } from './player-committed-presentation'

/** Trusted composition only. The supplied existing S is the sole current/writer. */
export function wrapPlayerSession(owner: CombatSession, policy: CombatResidencePolicy, labels: PlayerLabels) {
  const { dependencies: deps } = requireCombatResidencePolicy(policy)
  let context: ReturnType<typeof createPlayerContext> | null = null, busy = false
  function synchronize() {
    const value = owner.getState().current
    if (value === context?.value) return
    context = null
    if (value) { readCombatValue(value, deps); context = createPlayerContext(value, deps) }
  }
  synchronize()
  const query = () => projectPlayerView(owner.getState(), context, deps, labels, busy)
  function preview(input: unknown): PlayerPreview {
    try {
      if (busy || !context || owner.getState().current !== context.value) throw new PlayerSelectionError()
      return qualifyPlayerCommand(context.value, resolvePlayerCommand(context, input, deps), deps)
    } catch (e) {
      if (!isPlayerBusinessError(e)) throw e
      return deepFreeze({ kind: e instanceof PlayerSelectionError ? 'invalid-selection' : 'unavailable', cost: null })
    }
  }
  const player: PlayerSession = Object.freeze({ query,
    setup: () => { const v = owner.getState().current; return deepFreeze(v ? { tools: [v.choices.tool], specialties: [v.choices.specialty] } :
      { tools: ['crow', 'lamp', 'toolbox'], specialties: ['scout', 'engineer', 'survival'] }) },
    preview, resolve: preview,
    execute: (input: unknown): PlayerExecution => {
      const checked = preview(input)
      if (checked.kind !== 'available' && checked.kind !== 'unknown') return deepFreeze({ kind: 'rejected', view: query(), preview: checked })
      const command = resolvePlayerCommand(context!, input, deps)
      busy = true
      try {
        owner.dispatch(command)
      } catch (e) {
        if (!isPlayerBusinessError(e)) throw e
        return deepFreeze({ kind: 'rejected', view: projectPlayerView(owner.getState(), context, deps, labels), preview: { kind: 'unavailable', cost: null } })
      } finally { try { synchronize() } finally { busy = false } }
      const view = query(), committedAction = committedCombatAction(command)
      return deepFreeze(committedAction ? { kind: 'committed', view, preview: checked, committedAction } :
        { kind: 'committed', view, preview: checked })
    },
    retrySave: () => { if (busy) return query(); busy = true;
      try { owner.retrySave() } catch (e) { if (!isPlayerBusinessError(e)) throw e } finally { busy = false }; return query() },
    subscribe: (listener) => { assertCombatSyncFunction(listener); return owner.subscribe(() => listener(query())) },
  })
  function controlled<T>(run: () => T) {
    if (busy) throw new PlayerSelectionError()
    busy = true
    try { run() } finally { try { synchronize() } finally { busy = false } }
    return query()
  }
  const preplay = createPlayerPreplay(() => !busy && context?.value === owner.getState().current ? context : null, deps)
  return Object.freeze({ player, preplay, synchronize,
    bootstrap: () => controlled(() => owner.bootstrap()), retryRead: () => controlled(() => owner.retryRead()),
    createFirst: () => controlled(() => owner.createFirst()) })
}
export function createPlayerSession(domain: ResidenceDomain, composition: CombatSessionComposition, labels: PlayerLabels) {
  const owner = buildCombatSession(domain, composition)
  return wrapPlayerSession(owner, composition.policy, labels)
}
