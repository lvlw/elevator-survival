import { assertCombatSyncFunction } from '../../state/residence-session/combat-composition'
import type { PlayerView, PlayerRequest } from '../../state/residence-session/player-types'
import { createDraftStore } from './drafts'
import { createConfirmationStore } from './confirmation'
import { appendPreplayFeed, publicActionFeed } from './feed'
import { preplaySnapshot } from './snapshot'
import { publicPreplayError, isPlayerBusinessError } from './errors'
import type { PreplayPorts, PreplayController, PreplaySnapshot } from './types'
// TEST ONLY. Protocol reference consumer; never imported by production.
import { expect } from 'vitest'
import type { CommittedCombatPresentation } from './committed-presentation'
import type { PreplayResult } from './types'

export function presentationOf(result: PreplayResult) {
  expect(result.kind).toBe('committed'); expect(result.presentation).toBeDefined()
  return result.presentation!
}
export function expectClosedPresentation(p: CommittedCombatPresentation) {
  expect(Reflect.ownKeys(p).sort()).toEqual(['opponent', 'persistence', 'sequence', 'stageAfter', 'stageBefore', 'stop', 'token', 'version'])
  expect(Reflect.ownKeys(p.token).sort()).toEqual(['ordinal', 'scope'])
  expect(Reflect.ownKeys(p.token.scope)).toEqual([])
  expect(Reflect.ownKeys(p.opponent).sort()).toEqual(['kind', 'name', 'visualKey'])
  expect(p.sequence).toHaveLength(1)
  expect(Reflect.ownKeys(p.sequence[0]).sort()).toEqual(['action', 'actor', 'ordinal'])
  expect(p.sequence[0].actor).toEqual({ role: 'player' }); expect(p.sequence[0].ordinal).toBe(0)
  expect(p.version).toBe(1); expect(Number.isSafeInteger(p.token.ordinal)).toBe(true)
  for (const object of [p, p.token, p.token.scope, p.opponent, p.sequence, p.sequence[0], p.sequence[0].actor]) expect(Object.isFrozen(object)).toBe(true)
}
/** Single scope/high-water/pending only; no token set, command, save or gameplay port. */
export function referenceConsumer(canUse: () => boolean = () => true) {
  let scope: Readonly<object> | null = null, high = -1, generation = 0, accepted = 0, settled = 0
  let pending: ReturnType<typeof setTimeout> | null = null
  function cancel() { generation++; if (pending !== null) clearTimeout(pending); pending = null }
  function activate(next: Readonly<object>) { if (scope !== next) { cancel(); scope = next; high = -1 } }
  function consume(p: CommittedCombatPresentation, mode: 'animate' | 'skip' | 'reduced' = 'animate') {
    if (!canUse() || scope !== p.token.scope || !Number.isSafeInteger(p.token.ordinal) || p.token.ordinal <= high) return null
    cancel(); high = p.token.ordinal; accepted++
    const ticket = generation, active = scope
    const finish = () => {
      if (!canUse() || scope !== active || generation !== ticket) return false
      cancel(); settled++; return true
    }
    if (mode === 'animate') pending = setTimeout(finish, 20)
    else finish()
    return { finish }
  }
  return { activate, consume, cancel, counts: () => ({ accepted, settled, high, pending: pending !== null }) }
}

// TEST-only exact baseline controller; only exported name changes. No B1 issuer is used.
export function baselineCreatePreplayController(ports: PreplayPorts): PreplayController {
  const drafts = createDraftStore(), confirmations = createConfirmationStore(), listeners = new Set<() => void>()
  let busy = false, notifying = false, scope = ports.preplay.scope(), listenerErrors = 0
  let snapshot: PreplaySnapshot = preplaySnapshot({ status: 'stable', view: ports.player.query(), error: null, draft: null, feed: Object.freeze([]) })
  const notify = () => { notifying = true; try { for (const listener of [...listeners]) { try { listener() } catch { listenerErrors++ } } } finally { notifying = false } }
  const publish = (patch: Partial<PreplaySnapshot>) => { snapshot = preplaySnapshot({ ...snapshot, ...patch }); notify() }
  const result = (kind: PreplayResult['kind']): PreplayResult => Object.freeze({ kind, snapshot })
  function invalidateScope() {
    const next = ports.preplay.scope()
    if (next !== scope) { drafts.clear(); confirmations.clear(); scope = next }
  }
  function reject() { publish({ error: publicPreplayError('rejected') }); return result('rejected') }
  function adopt(view: PlayerView, before: PlayerView | null, committed: boolean) {
    invalidateScope()
    const draft = drafts.get()
    publish({ status: 'stable', view, error: null, draft: draft ? { token: draft.token, request: draft.request } : null,
      feed: committed ? appendPreplayFeed(snapshot.feed, publicActionFeed(before, view)) : snapshot.feed })
  }
  function run(operation: () => { view: PlayerView; committed: boolean; rejected?: boolean }): PreplayResult {
    if (busy || notifying) return result('rejected')
    const before = snapshot.view
    busy = true
    publish({ status: 'busy' })
    try {
      const completed = operation()
      adopt(completed.view, before, completed.committed)
      if (completed.rejected) { publish({ error: publicPreplayError('rejected') }); return result('rejected') }
      return result(completed.committed ? 'committed' : 'updated')
    } catch (error) {
      let view: PlayerView | null = null
      try { ports.synchronize(); view = ports.player.query(); invalidateScope() } catch { /* Keep failed projection non-executable. */ }
      const business = isPlayerBusinessError(error)
      publish({ status: view ? 'stable' : 'projection-error', view,
        draft: drafts.get() && view ? { token: drafts.get()!.token, request: drafts.get()!.request } : null,
        error: publicPreplayError(view ? business ? 'rejected' : 'execution-uncertain' : 'projection') })
      if (!business) throw error
      return result('rejected')
    } finally { busy = false }
  }
  // Native blocked callbacks invalidate; they never become a second ready projection.
  ports.player.subscribe(() => {
    if (busy) return
    drafts.clear(); confirmations.clear()
    publish({ view: null, status: 'projection-error', draft: null, error: publicPreplayError('projection') })
  })
  function executeCaptured(request: PlayerRequest): PreplayResult {
    return run(() => {
      const executed = ports.player.execute(request)
      return { view: executed.view, committed: executed.kind === 'committed', rejected: executed.kind === 'rejected' }
    })
  }
  const execute: PreplayController['execute'] = input => {
    if (busy || notifying || snapshot.status !== 'stable') return result('rejected')
    try {
      const captured = ports.preplay.capture(input), metadata = ports.preplay.inspect(captured.request)
      if (!['available', 'unknown'].includes(metadata.qualification.kind)) return reject()
      if (metadata.confirmation.kind !== 'none') return Object.freeze({ kind: 'confirmation-required', snapshot,
        confirmation: confirmations.create(captured.request, captured.scope, metadata) })
      return executeCaptured(captured.request)
    } catch (error) { if (!isPlayerBusinessError(error)) throw error; return reject() }
  }
  return Object.freeze({
    getSnapshot: () => snapshot,
    listenerFailures: () => listenerErrors,
    subscribe: listener => { assertCombatSyncFunction(listener); listeners.add(listener); return () => { listeners.delete(listener) } },
    bootstrap: () => busy || notifying || snapshot.view?.status !== 'unbootstrapped' ? result('rejected') : run(() => ({ view: ports.bootstrap(), committed: false })),
    createFirst: () => busy || notifying || snapshot.view?.status !== 'no-current' ? result('rejected') : run(() => ({ view: ports.createFirst(), committed: false })),
    retryRead: () => busy || notifying || !snapshot.view || !['blocked', 'read-error'].includes(snapshot.view.status) ? result('rejected') : run(() => ({ view: ports.retryRead(), committed: false })),
    retrySave: () => run(() => ({ view: ports.player.retrySave(), committed: false })),
    synchronize: () => run(() => { ports.synchronize(); return { view: ports.player.query(), committed: false } }),
    preview: input => ports.preplay.inspect(input),
    describeAction: action => ports.preplay.describeAction(action),
    beginDraft: input => {
      if (busy || notifying || snapshot.status !== 'stable') throw new Error('Draft is unavailable while presentation is blocked')
      const captured = ports.preplay.capture(input), token = drafts.create(captured.request, captured.scope)
      confirmations.clear(); publish({ draft: { token, request: captured.request } }); return token
    },
    cancel: () => { if (busy || notifying) return; drafts.clear(); confirmations.clear(); if (snapshot.draft) publish({ draft: null }) },
    executeDraft: token => {
      if (busy || notifying) return result('rejected')
      const request = drafts.resolve(token, ports.preplay.scope())
      return request ? execute(request) : reject()
    },
    execute,
    confirm: token => {
      if (busy || notifying || snapshot.status !== 'stable') return result('rejected')
      const request = confirmations.take(token, ports.preplay.scope(), ports.preplay.inspect)
      return request ? executeCaptured(request) : reject()
    },
  })
}
