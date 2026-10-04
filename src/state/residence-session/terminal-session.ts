import { deepFreeze } from '../../core/config'
import { queryPlayerResidenceKnowledge } from '../../core/residence-location'
import { queryTerminalEligibility } from '../../core/residence-terminal'
import { deserializeTerminalResidenceSave, serializeTerminalResidenceSave, validateTerminalResidenceAggregate,
  TerminalResidenceSaveError, type TerminalResidenceAggregate } from '../residence-save/terminal-index'
import { requireTerminalResidenceSavePolicy } from '../residence-save/terminal-policy'
import { assertResidenceDomainAvailable, claimResidenceDomain } from './domain'
import { ResidenceSessionError, type ResidenceDomain, type Persistence, type SessionStatus } from './types'
import { createTerminalResidenceSessionCommand } from './terminal-commands'
import { terminalActiveContext } from './terminal-context'
import { proposeTerminalFirstLaunch } from './terminal-launch'
import { proposeTerminalTransition } from './terminal-transitions'
import { TerminalResidenceSessionError, type TerminalResidenceComposition, type TerminalResidenceSession,
  type TerminalResidenceSessionView, type TerminalResidenceCommit } from './terminal-types'

function domainOperation(operation: () => void) {
  try { operation() }
  catch (error) {
    if (error instanceof ResidenceSessionError && (error.code === 'INVALID_DOMAIN' || error.code === 'DOMAIN_CLAIMED')) {
      throw new TerminalResidenceSessionError(error.code, error.message)
    }
    throw error
  }
}
function invalidComposition(): never {
  throw new TerminalResidenceSessionError('INVALID_COMPOSITION', 'Controlled policy, synchronous ports and first factory required')
}
function shell(input: unknown, required: readonly string[], optional: readonly string[] = []): void {
  if (!input || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype ||
    required.some((key) => !Object.hasOwn(input, key)) ||
    Reflect.ownKeys(input).some((key) => typeof key !== 'string' || ![...required, ...optional].includes(key)) ||
    Object.values(Object.getOwnPropertyDescriptors(input)).some((d) => !d.enumerable || !('value' in d))) invalidComposition()
}
function synchronous(fn: unknown): void {
  if (typeof fn !== 'function' || ['[object AsyncFunction]', '[object GeneratorFunction]', '[object AsyncGeneratorFunction]']
    .includes(Object.prototype.toString.call(fn))) invalidComposition()
}

/** Explicit v2 owner. No default-v1 replacement and no arbitrary current installation API. */
export function buildTerminalResidenceSession(domain: ResidenceDomain, composition: TerminalResidenceComposition): TerminalResidenceSession {
  domainOperation(() => assertResidenceDomainAvailable(domain))
  shell(composition, ['policy', 'storage', 'createFirst'], ['provideFirstExecution'])
  const policy = requireTerminalResidenceSavePolicy(composition.policy)
  const storage = composition.storage
  shell(storage, ['read', 'write'])
  const factory = composition.createFirst
  const provider = composition.provideFirstExecution
  synchronous(storage.read); synchronous(storage.write); synchronous(factory)
  if (provider !== undefined) synchronous(provider)
  const read = storage.read.bind(storage)
  const write = storage.write.bind(storage)
  domainOperation(() => claimResidenceDomain(domain))

  let current: TerminalResidenceAggregate | null = null
  let status: SessionStatus = 'unbootstrapped'
  let persistence: Persistence = 'not-attempted'
  let diagnostic: TerminalResidenceSessionView['diagnostic'] = null
  let busy = false
  const listeners = new Set<(view: TerminalResidenceSessionView) => void>()
  const getState = (): TerminalResidenceSessionView => Object.freeze({ status, current, persistence, diagnostic })
  const guarded = <T>(work: () => T): T => {
    if (busy) throw new TerminalResidenceSessionError('BUSY', 'An operation is already in progress')
    busy = true
    try { return work() } finally { busy = false }
  }
  const unavailable = (): never => { throw new TerminalResidenceSessionError('NOT_AVAILABLE', 'Operation unavailable at this session boundary') }
  const attemptWrite = (serialized: string): 'saved' | 'save-failed' => {
    try {
      // A non-void / Promise result violates the synchronous port contract.
      if (write(serialized) !== undefined) return 'save-failed'
      return 'saved'
    } catch { return 'save-failed' }
  }
  const commit = (next: TerminalResidenceAggregate, serialized: string): TerminalResidenceCommit => {
    current = next
    status = 'ready'; diagnostic = null
    persistence = attemptWrite(serialized)
    const errors: { code: 'LISTENER_FAILED' }[] = []
    const view = getState()
    for (const listener of [...listeners]) {
      try { listener(view) } catch { errors.push({ code: 'LISTENER_FAILED' }) }
    }
    return deepFreeze({ kind: 'committed', current: next, persistence, notificationErrors: errors })
  }
  const prepareAndCommit = (proposal: unknown) => {
    const next = validateTerminalResidenceAggregate(proposal, policy)
    const serialized = serializeTerminalResidenceSave(next, policy)
    return commit(next, serialized)
  }
  const load = (): TerminalResidenceSessionView => {
    let text: string | null
    try { text = read() }
    catch { status = 'read-error'; diagnostic = 'STORAGE_READ_FAILED'; return getState() }
    if (text === null) { status = 'no-save'; diagnostic = null; return getState() }
    let candidate: TerminalResidenceAggregate
    try { candidate = deserializeTerminalResidenceSave(text, policy) }
    catch (error) {
      if (!(error instanceof TerminalResidenceSaveError)) throw error
      status = 'blocked'; diagnostic = error.code; return getState()
    }
    current = candidate
    status = 'ready'; diagnostic = null
    return getState()
  }
  return Object.freeze({
    getState,
    queryKnowledge: () => {
      if (!current || current.phase !== 'active-world') return null
      const ctx = terminalActiveContext(current, policy)
      return queryPlayerResidenceKnowledge(ctx.snapshot, ctx.authority, ctx.locationDependencies)
    },
    queryTerminalEligibility: () => {
      if (!current || current.phase !== 'active-world') return Object.freeze({ deliver: false, withdraw: false, deadline: false })
      const ctx = terminalActiveContext(current, policy)
      return queryTerminalEligibility(current, ctx.terminalAuthority)
    },
    subscribe: (listener: (view: TerminalResidenceSessionView) => void) => {
      if (typeof listener !== 'function') invalidComposition()
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    bootstrap: () => guarded(() => {
      if (current !== null || status !== 'unbootstrapped') return unavailable()
      return load()
    }),
    retryRead: () => guarded(() => {
      if (current !== null || (status !== 'read-error' && status !== 'blocked')) return unavailable()
      return load()
    }),
    createFirst: () => guarded(() => {
      if (current !== null || status !== 'no-save') return unavailable()
      let raw: unknown
      try { raw = factory() } catch { throw new TerminalResidenceSessionError('FACTORY_FAILED', 'First factory failed; nothing committed') }
      const next = validateTerminalResidenceAggregate(raw, policy)
      if (next.phase !== 'fresh-hub' || next.character.revision !== 0) {
        throw new TerminalResidenceSessionError('INVALID_FACTORY_RESULT', 'First creation requires a genuine fresh hub')
      }
      return prepareAndCommit(next)
    }),
    dispatch: (input: unknown) => guarded(() => {
      if (current === null || status !== 'ready') return unavailable()
      const command = createTerminalResidenceSessionCommand(input)
      if (command.expectedRevision !== current.character.revision) throw new TerminalResidenceSessionError('STALE_COMMAND', 'Old command revision')
      const next = command.kind === 'launch'
        ? current.phase === 'fresh-hub' ? proposeTerminalFirstLaunch(current, command, policy, provider) : unavailable()
        : current.phase === 'active-world' ? proposeTerminalTransition(current, command, policy) : unavailable()
      return prepareAndCommit(next)
    }),
    retrySave: () => guarded(() => {
      if (current === null || status !== 'ready') return unavailable()
      persistence = attemptWrite(serializeTerminalResidenceSave(current, policy))
      return getState()
    }),
  })
}
