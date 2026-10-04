import { deepFreeze } from '../../core/config'
import { sameResidenceValue } from '../../core/character-cycle/validation'
import { safeAdd } from '../../core/residence-config/validation'
import { planResidenceMove, assertResidenceLocationPlanCurrent, queryPlayerResidenceKnowledge } from '../../core/residence-location'
import { deserializeResidenceSave, serializeResidenceSave, validateResidenceAggregate, ResidenceSaveError,
  type ResidenceAggregate } from '../residence-save'
import { requireResidenceSavePolicy, residenceActiveContext } from '../residence-save/validation'
import { createResidenceSessionCommand } from './commands'
import { ResidenceSessionError, type ResidenceDomain, type ResidenceSessionComposition, type ResidenceSession,
  type ResidenceSessionView, type ResidenceCommit, type SessionStatus, type SessionDiagnostic, type Persistence } from './types'

// Capability registry only, not a second gameplay owner. No cross-tab claim is made.
const domains = new WeakSet<object>()
const claimed = new WeakSet<object>()
export function issueResidenceDomain(): ResidenceDomain {
  const domain = Object.freeze({}) as ResidenceDomain
  domains.add(domain)
  return domain
}
/** Implementation of the controlled composition boundary; never re-exported by ordinary index. */
export function buildResidenceSession(domain: ResidenceDomain, composition: ResidenceSessionComposition): ResidenceSession {
  if (!domain || !domains.has(domain)) throw new ResidenceSessionError('INVALID_DOMAIN', 'Composition-issued domain required')
  if (claimed.has(domain)) throw new ResidenceSessionError('DOMAIN_CLAIMED', 'This application domain already owns a writer')
  const policy = requireResidenceSavePolicy(composition.policy)
  const storage = composition.storage
  const factory = composition.createFirst
  if (!storage || typeof storage.read !== 'function' || typeof storage.write !== 'function' || typeof factory !== 'function') {
    throw new ResidenceSessionError('INVALID_COMPOSITION', 'Synchronous storage and controlled factory required')
  }
  // Capture the controlled ports, not mutable composition properties.
  const read = storage.read.bind(storage)
  const write = storage.write.bind(storage)
  claimed.add(domain)
  let current: ResidenceAggregate | null = null
  let status: SessionStatus = 'unbootstrapped'
  let diagnostic: SessionDiagnostic = null
  let persistence: Persistence = 'not-attempted'
  let busy = false
  const listeners = new Set<(view: ResidenceSessionView) => void>()
  const getState = (): ResidenceSessionView => Object.freeze({ status, current, persistence, diagnostic })
  const guarded = <T>(work: () => T): T => {
    if (busy) throw new ResidenceSessionError('BUSY', 'An operation is already in progress')
    busy = true
    try { return work() } finally { busy = false }
  }
  const unavailable = (): never => { throw new ResidenceSessionError('NOT_AVAILABLE', 'Operation unavailable at this session boundary') }
  const attemptWrite = (serialized: string): 'saved' | 'save-failed' => {
    try { write(serialized); return 'saved' } catch { return 'save-failed' }
  }
  const commit = (next: ResidenceAggregate, serialized: string): ResidenceCommit => {
    current = next
    status = 'ready'
    diagnostic = null
    persistence = attemptWrite(serialized)
    const notificationErrors: { code: 'LISTENER_FAILED' }[] = []
    const view = getState()
    for (const listener of [...listeners]) {
      try { listener(view) } catch { notificationErrors.push({ code: 'LISTENER_FAILED' }) }
    }
    return deepFreeze({ kind: 'committed', current: next, persistence, notificationErrors })
  }
  const load = (): ResidenceSessionView => {
    let serialized: string | null
    try { serialized = read() }
    catch { status = 'read-error'; diagnostic = 'STORAGE_READ_FAILED'; return getState() }
    if (serialized === null) { status = 'no-save'; diagnostic = null; return getState() }
    let candidate: ResidenceAggregate
    try { candidate = deserializeResidenceSave(serialized, policy) }
    catch (error) {
      if (!(error instanceof ResidenceSaveError)) throw error
      status = 'blocked'; diagnostic = error.code; return getState()
    }
    // Sole cold installation, possible only without any current via guarded lifecycle calls.
    current = candidate
    status = 'ready'; diagnostic = null
    return getState()
  }
  return Object.freeze({
    getState,
    queryKnowledge: () => {
      if (!current || current.phase !== 'active-world') return null
      const ctx = residenceActiveContext(current, policy)
      return queryPlayerResidenceKnowledge(ctx.snapshot, ctx.authority, ctx.dependencies)
    },
    subscribe: (listener: (view: ResidenceSessionView) => void) => {
      if (typeof listener !== 'function') throw new ResidenceSessionError('INVALID_COMPOSITION', 'Listener required')
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    bootstrap: () => guarded(() => {
      if (status !== 'unbootstrapped' || current !== null) return unavailable()
      return load()
    }),
    retryRead: () => guarded(() => {
      if (status !== 'read-error' || current !== null) return unavailable()
      return load()
    }),
    createFirst: () => guarded(() => {
      if (status !== 'no-save' || current !== null) return unavailable()
      let raw: unknown
      try { raw = factory() } catch { throw new ResidenceSessionError('FACTORY_FAILED', 'First factory failed; nothing committed') }
      const next = validateResidenceAggregate(raw, policy)
      if (next.phase !== 'fresh-hub' || next.character.revision !== 0) {
        throw new ResidenceSessionError('INVALID_FACTORY_RESULT', 'First creation requires a fresh revision-zero hub')
      }
      const serialized = serializeResidenceSave(next, policy)
      return commit(next, serialized)
    }),
    dispatch: (input: unknown) => guarded(() => {
      if (status !== 'ready' || current?.phase !== 'active-world') return unavailable()
      const command = createResidenceSessionCommand(input)
      if (command.expectedRevision !== current.character.revision) throw new ResidenceSessionError('STALE_COMMAND', 'Old command revision')
      if (!sameResidenceValue(command.binding, current.site.binding)) throw new ResidenceSessionError('BINDING_MISMATCH', 'Command belongs to another execution')
      const ctx = residenceActiveContext(current, policy)
      const edge = ctx.dependencies.catalog.data.edges.find((e) => e.id === command.edgeId)
      if (edge && (edge.arrival.healthLoss !== 0 || edge.arrival.exposuresAdded !== 0)) {
        throw new ResidenceSessionError('UNSUPPORTED_RESULT', 'Arrival event coordinator is not supported')
      }
      const plan = planResidenceMove(ctx.snapshot, command, ctx.authority, ctx.dependencies)
      assertResidenceLocationPlanCurrent(ctx.snapshot, plan, ctx.authority, ctx.dependencies)
      if (plan.coordination !== 'stable-local-result' || plan.snapshot.site.pending.kind !== 'none' ||
        plan.snapshot.character.body.condition.currentHealth === 0) {
        throw new ResidenceSessionError('UNSUPPORTED_RESULT', 'Combat or terminal result requires a future coordinator')
      }
      if (!sameResidenceValue(plan.snapshot.site.binding, current.site.binding) ||
        !sameResidenceValue(plan.snapshot.character.identity, current.character.identity) ||
        !sameResidenceValue(plan.snapshot.character.clock, current.character.clock) ||
        plan.snapshot.character.cycle !== current.character.cycle ||
        plan.snapshot.character.revision !== safeAdd(current.character.revision, 1)) {
        throw new ResidenceSessionError('PLAN_MISMATCH', 'Plan changed execution or revision continuity')
      }
      const next = validateResidenceAggregate({ phase: 'active-world', ...plan.snapshot, missions: current.missions }, policy)
      const serialized = serializeResidenceSave(next, policy)
      return commit(next, serialized)
    }),
    retrySave: () => guarded(() => {
      if (status !== 'ready' || current === null) return unavailable()
      persistence = attemptWrite(serializeResidenceSave(current, policy))
      return getState()
    }),
  })
}
