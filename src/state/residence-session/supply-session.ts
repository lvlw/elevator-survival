import { deepFreeze } from '../../core/config'
import { querySupplyKnownObjects } from '../../core/residence-supply/queries'
import type { SupplyValue } from '../../core/residence-supply/types'
import { deserializeSupplyResidenceSave } from '../residence-save/supply-codec'
import { SupplyResidenceSaveError } from '../residence-save/supply-types'
import type { SupplyResidenceExpectation } from '../residence-save/supply-types'
import { assertResidenceDomainAvailable, claimResidenceDomain } from './domain'
import { ResidenceSessionError, type ResidenceDomain, type Persistence } from './types'
import { readSupplyComposition } from './supply-composition'
import { createSupplySessionCommand } from './supply-commands'
import { prepareSupplyInitial, SupplyInitialProgressObserved } from './supply-initial'
import { proposeSupplyCommand } from './supply-proposals'
import { readSupplyStartupExpectation, supplyNextExpectation } from './supply-expectation'
import { prepareSupplyPersistence } from './supply-persistence'
import type { SupplySession, SupplySessionComposition, SupplySessionView, SupplySessionCommit, SupplyMaintenanceResult } from './supply-types'

export function buildSupplySession(domain: ResidenceDomain, input: SupplySessionComposition): SupplySession {
  assertResidenceDomainAvailable(domain)
  const composition = readSupplyComposition(input)
  claimResidenceDomain(domain)
  let current: SupplyValue | null = null
  let initial: SupplyResidenceExpectation['initial'] | null = null
  let status: SupplySessionView['status'] = 'unbootstrapped', persistence: Persistence = 'not-attempted'
  let diagnostic: SupplySessionView['diagnostic'] = null, busy = false
  let mayCreate = composition.startup === 'first'
  const listeners = new Set<(v: SupplySessionView) => void>()
  const view = (): SupplySessionView => Object.freeze({ status, current, persistence, diagnostic })
  const unavailable = (): never => { throw new ResidenceSessionError('NOT_AVAILABLE', 'Operation not available') }
  function guard<T>(fn: () => T): T {
    if (busy) throw new ResidenceSessionError('BUSY', 'Supply session is executing')
    busy = true
    try { return fn() } finally { busy = false }
  }
  function write(text: string): 'saved' | 'save-failed' {
    try {
      if (composition.write(text) !== undefined) return 'save-failed'
      return 'saved'
    } catch { return 'save-failed' }
  }
  function commit(prepared: ReturnType<typeof prepareSupplyPersistence>, maintenance: SupplyMaintenanceResult | null): SupplySessionCommit {
    current = prepared.value; status = 'ready'; diagnostic = null; mayCreate = false
    persistence = write(prepared.text)
    const notificationErrors: { code: 'LISTENER_FAILED' }[] = []
    const committed = view()
    for (const listener of [...listeners]) {
      try { listener(committed) } catch { notificationErrors.push({ code: 'LISTENER_FAILED' }) }
    }
    return deepFreeze({ kind: 'committed', current, persistence, maintenance, notificationErrors })
  }
  function load(): SupplySessionView {
    let text: unknown
    try {
      text = composition.read()
      if (text !== null && typeof text !== 'string') {
        mayCreate = false
        throw new Error('Non-string storage result')
      }
    } catch {
      status = 'read-error'; diagnostic = 'STORAGE_READ_FAILED'; return view()
    }
    if (text === null) {
      status = mayCreate ? 'no-save' : 'blocked'; diagnostic = mayCreate ? null : 'STARTUP_BLOCKED'
      return view()
    }
    mayCreate = false
    try {
      if (!composition.cold) { status = 'blocked'; diagnostic = 'STARTUP_BLOCKED'; return view() }
      const expected = readSupplyStartupExpectation(composition.cold(), composition.policy)
      const candidate = deserializeSupplyResidenceSave(text, expected, composition.policy)
      initial = expected.initial; current = candidate.value; status = 'ready'; diagnostic = null
    } catch (error) {
      status = 'blocked'; diagnostic = error instanceof SupplyResidenceSaveError ? error.code : 'STARTUP_BLOCKED'
    }
    return view()
  }
  // This projection only reads our already committed value, never untrusted storage.
  function committedExpected(): SupplyResidenceExpectation {
    if (!current || !initial) return unavailable()
    return { identity: current.character.identity, phase: current.phase, revision: current.character.revision,
      cycle: current.character.cycle, initial,
      missions: current.missions.map(m => m.status === 'unaccepted' ? { binding: m.binding, status: m.status } :
        m.status === 'active' ? { binding: m.binding, status: m.status, execution: m.execution } :
          { binding: m.binding, status: m.status, execution: m.execution, outcome: m.outcome }) }
  }
  return Object.freeze({
    getState: view,
    queryKnowledge: () => current ? querySupplyKnownObjects(current, composition.dependencies) : null,
    subscribe: (listener: (v: SupplySessionView) => void) => {
      if (typeof listener !== 'function') throw new ResidenceSessionError('INVALID_COMMAND', 'Expected listener')
      listeners.add(listener); return () => { listeners.delete(listener) }
    },
    bootstrap: () => guard(() => { if (status !== 'unbootstrapped' || current) return unavailable(); return load() }),
    retryRead: () => guard(() => { if (current || !['read-error', 'blocked'].includes(status)) return unavailable(); return load() }),
    createFirst: () => guard(() => {
      if (current || status !== 'no-save' || !mayCreate || !composition.initial) return unavailable()
      let proposal: ReturnType<typeof prepareSupplyInitial>
      try { proposal = prepareSupplyInitial(composition.initial(), composition.policy) }
      catch (error) {
        if (error instanceof SupplyInitialProgressObserved) { mayCreate = false; status = 'blocked'; diagnostic = 'STARTUP_BLOCKED' }
        throw error
      }
      const prepared = prepareSupplyPersistence(proposal.value, proposal.expected, composition.policy)
      initial = proposal.expected.initial
      return commit(prepared, null)
    }),
    dispatch: (request: unknown) => guard(() => {
      if (!current || !initial) return unavailable()
      const command = createSupplySessionCommand(request, composition.dependencies.tasks)
      const { plan, maintenance } = proposeSupplyCommand(current, command, composition.dependencies)
      const expected = supplyNextExpectation(current, plan, command, initial, composition.policy)
      return commit(prepareSupplyPersistence(plan.snapshot, expected, composition.policy), maintenance)
    }),
    retrySave: () => guard(() => {
      if (!current) return unavailable()
      const prepared = prepareSupplyPersistence(current, committedExpected(), composition.policy)
      persistence = write(prepared.text)
      return view()
    }),
  })
}
