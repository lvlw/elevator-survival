import { deepFreeze } from '../../core/config'
import type { CombatValue } from '../../core/residence-combat/types'
import { deserializeCombatResidenceSave } from '../residence-save/combat-codec'
import { combatExpectationSchema } from '../residence-save/combat-schema'
import { parseResidence } from '../../core/residence-config/validation'
import { CombatResidenceSaveError } from '../residence-save/combat-types'
import { assertResidenceDomainAvailable, claimResidenceDomain } from './domain'
import { ResidenceSessionError, type ResidenceDomain, type Persistence } from './types'
import { readCombatComposition, assertCombatSyncFunction } from './combat-composition'
import { createCombatSessionCommand } from './combat-commands'
import { prepareCombatInitial, CombatInitialProgressObserved } from './combat-initial'
import { proposeCombatCommand } from './combat-proposals'
import { readCombatStartupExpectation, combatNextExpectation } from './combat-expectation'
import { prepareCombatPersistence } from './combat-persistence'
import { queryResidenceCombat, queryCombatTerminalEligibility } from './combat-queries'
import type { CombatSession, CombatSessionComposition, CombatSessionView, CombatSessionCommit, CombatMaintenanceResult, CombatSessionExpectation } from './combat-types'

export function buildCombatSession(domain: ResidenceDomain, input: CombatSessionComposition): CombatSession {
  assertResidenceDomainAvailable(domain)
  const composition = readCombatComposition(input)
  claimResidenceDomain(domain)
  let current: CombatValue | null = null, expected: CombatSessionExpectation | null = null
  let status: CombatSessionView['status'] = 'unbootstrapped', persistence: Persistence = 'not-attempted'
  let diagnostic: CombatSessionView['diagnostic'] = null, busy = false
  let mayCreate = composition.startup === 'first'
  const listeners = new Set<(v: CombatSessionView) => void>()
  const view = (): CombatSessionView => Object.freeze({ status, current, persistence, diagnostic })
  const unavailable = (): never => { throw new ResidenceSessionError('NOT_AVAILABLE', 'Operation not available') }
  function guard<T>(fn: () => T): T {
    if (busy) throw new ResidenceSessionError('BUSY', 'Combat session is executing')
    busy = true
    try { return fn() } finally { busy = false }
  }
  function write(text: string): 'saved' | 'save-failed' {
    try { return composition.write(text) === undefined ? 'saved' : 'save-failed' } catch { return 'save-failed' }
  }
  function commit(prepared: ReturnType<typeof prepareCombatPersistence>, maintenance: CombatMaintenanceResult | null): CombatSessionCommit {
    // No observable callback occurs between these assignments.
    current = prepared.value; expected = prepared.expected; status = 'ready'; diagnostic = null; mayCreate = false
    persistence = 'not-attempted'
    persistence = write(prepared.text)
    const notificationErrors: { code: 'LISTENER_FAILED' }[] = [], committed = view()
    for (const listener of [...listeners]) {
      try {
        const result: unknown = listener(committed)
        if (result !== undefined) notificationErrors.push({ code: 'LISTENER_FAILED' })
      } catch { notificationErrors.push({ code: 'LISTENER_FAILED' }) }
    }
    return deepFreeze({ kind: 'committed', current, persistence, maintenance, notificationErrors })
  }
  function load(): CombatSessionView {
    let cold: CombatSessionExpectation | null = null
    if (composition.cold) {
      // A cold provider represents pre-existing progress, even if its expected phase is first-hub.
      mayCreate = false; status = 'blocked'; diagnostic = 'STARTUP_BLOCKED'
      try { cold = readCombatStartupExpectation(composition.cold(), composition.policy) }
      catch (error) {
        if (error instanceof CombatResidenceSaveError) { diagnostic = error.code; return view() }
        if (error instanceof ResidenceSessionError && error.code === 'INVALID_FACTORY_RESULT') return view()
        throw error
      }
    }
    let text: unknown
    try {
      text = composition.read()
      if (text !== null && typeof text !== 'string') { mayCreate = false; throw new Error('Non-string read result') }
    } catch { status = 'read-error'; diagnostic = 'STORAGE_READ_FAILED'; return view() }
    if (text === null) {
      status = mayCreate ? 'no-save' : 'blocked'; diagnostic = mayCreate ? null : 'STARTUP_BLOCKED'
      return view()
    }
    mayCreate = false
    if (!cold) { status = 'blocked'; diagnostic = 'STARTUP_BLOCKED'; return view() }
    try {
      const candidate = deserializeCombatResidenceSave(text, parseResidence(combatExpectationSchema, cold), composition.policy)
      current = candidate.value; expected = cold; status = 'ready'; diagnostic = null
    } catch (error) {
      if (!(error instanceof CombatResidenceSaveError)) throw error
      status = 'blocked'; diagnostic = error.code
    }
    return view()
  }
  return Object.freeze({
    getState: view,
    queryCombat: () => current ? queryResidenceCombat(current, composition.dependencies) : null,
    queryTerminal: () => current ? queryCombatTerminalEligibility(current, composition.dependencies) : null,
    subscribe: (listener: (v: CombatSessionView) => void) => {
      assertCombatSyncFunction(listener)
      listeners.add(listener); return () => { listeners.delete(listener) }
    },
    bootstrap: () => guard(() => { if (status !== 'unbootstrapped' || current) return unavailable(); return load() }),
    retryRead: () => guard(() => { if (current || !['read-error', 'blocked'].includes(status)) return unavailable(); return load() }),
    createFirst: () => guard(() => {
      if (current || status !== 'no-save' || !mayCreate || !composition.initial) return unavailable()
      let proposal: ReturnType<typeof prepareCombatInitial>
      try { proposal = prepareCombatInitial(composition.initial(), composition.policy) }
      catch (error) {
        if (error instanceof CombatInitialProgressObserved) { mayCreate = false; status = 'blocked'; diagnostic = 'STARTUP_BLOCKED' }
        throw error
      }
      return commit(prepareCombatPersistence(proposal.value, proposal.expected, composition.policy), null)
    }),
    dispatch: (request: unknown) => guard(() => {
      if (!current || !expected) return unavailable()
      const command = createCombatSessionCommand(request, composition.dependencies.supply.tasks)
      const { plan, maintenance } = proposeCombatCommand(current, command, composition.dependencies)
      const nextExpected = combatNextExpectation(current, plan, command, expected.initial, composition.policy)
      return commit(prepareCombatPersistence(plan.snapshot, nextExpected, composition.policy), maintenance)
    }),
    retrySave: () => guard(() => {
      if (!current || !expected) return unavailable()
      const prepared = prepareCombatPersistence(current, expected, composition.policy)
      persistence = write(prepared.text)
      return view()
    }),
  })
}
