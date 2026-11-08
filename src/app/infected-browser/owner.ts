import { BrowserOwnerError } from './errors'
import { generateBrowserIdentity } from './identity-materials'
import { createReservation } from './reservation'
import { choicesSchema, readRecord, type Checkpoint, type Reservation } from './schema'
import { readBrowserPair, reserveBrowser } from './storage'
import { createBrowserContext } from './startup'
import { requestBrowserLease, type BrowserLease } from './lease'
import { bindBrowserLifecycle } from './lifecycle'
import { browserSnapshot } from './snapshot'
import type { BrowserOwner, BrowserOptions, BrowserEnvironment, BrowserControls, BrowserSnapshot } from './types'
import { commitNewAttempt, prepareNewAttempt, type PreparedAttempt } from './new-attempt'
import type { NewAttemptResult } from './types'
import type { PreplayController } from '../infected-preplay/types'
import { createReadingRecord } from './narrative-entry/reading'

function ambientEnvironment(): BrowserEnvironment {
  return { secure: globalThis.isSecureContext === true, locks: globalThis.navigator?.locks ?? null,
    storage: () => globalThis.localStorage, entropy: generateBrowserIdentity,
    ...(typeof window === 'object' ? { lifecycle: window } : {}) }
}
type NewAttempt = { prepared: PreparedAttempt | null; attempted: boolean }
type Context = { restart?: NewAttempt; reservation?: Reservation; savedDeath?: () => Checkpoint | null; valid: boolean; controller: PreplayController | null; hasCurrent: (() => boolean) | null; unsubscribe: (() => void) | null; controls: BrowserControls | null; reading?: ReturnType<typeof createReadingRecord> }
/** Explicit application composition only. No player route, storage scan or second canonical. */
export function createInfectedBrowserOwner(options: BrowserOptions = {}): BrowserOwner {
  let snapshot = browserSnapshot('idle'), lease: BrowserLease | null = null, ctx: Context | null = null
  let environment: BrowserEnvironment | null = null, acquiring: Promise<BrowserSnapshot> | null = null
  let unbind: (() => void) | null = null, disposed = false, generation = 0, busy = false, notifying = false, initializationAttempted = false
  const listeners = new Set<() => void>()
  function publish(status: BrowserSnapshot['status'], preplay: BrowserSnapshot['preplay'] = null) {
    snapshot = browserSnapshot(status, preplay); notifying = true
    try { for (const f of [...listeners]) { try { f() } catch { /* Presentation listener isolation. */ } } }
    finally { notifying = false }
  }
  function abandon() { if (ctx) { ctx.valid = false; ctx.unsubscribe?.(); ctx.unsubscribe = null; ctx.controller = null; ctx.hasCurrent = null; ctx.controls = null }; ctx = null }
  const alive = (c: Context) => !disposed && c === ctx && c.valid && lease?.active() === true
  function suspend() {
    generation++; abandon(); const prior = lease; lease = null
    if (!disposed) publish('suspended')
    prior?.release()
  }
  function guard<T>(c: Context, fn: () => T): T {
    if (!alive(c)) throw new BrowserOwnerError('LOST_LEASE')
    if (busy || notifying) throw new BrowserOwnerError('UNAVAILABLE')
    busy = true; try { return fn() } finally { busy = false }
  }
  function requireController(c: Context) {
    if (!c.controller || (snapshot.status !== 'ready' && !(snapshot.status === 'blocked' && c.hasCurrent?.()))) throw new BrowserOwnerError('UNAVAILABLE')
    return c.controller
  }
  function install(c: Context, prepared: ReturnType<typeof createBrowserContext>, first: boolean, r: Parameters<typeof createBrowserContext>[0], storage: Parameters<typeof createBrowserContext>[2], replacement = false) {
    const controller = prepared.controller
    c.reservation = r; c.savedDeath = prepared.savedDeath
    c.controller = controller; c.hasCurrent = prepared.hasCurrent
    c.unsubscribe = controller.subscribe(() => { if (alive(c)) publish('ready', controller.getSnapshot()) })
    controller.bootstrap()
    if (!alive(c)) return
    if (first) controller.createFirst()
    if (!alive(c)) return
    if (prepared.hasCurrent()) c.reading = createReadingRecord(storage, r, () => alive(c), (() => { const original=prepared.readingCurrent(); const view=controller.getSnapshot().view;
      return original ? { ...original, known: [...original.known, ...(view?.status==='ready' ? view.closure?.known??[] : [])] } : null
    }), replacement)
    publish(controller.getSnapshot().view?.status === 'ready' ? 'ready' : 'blocked', controller.getSnapshot())
  }
  function deadWitness(c: Context): PreparedAttempt {
    const view = requireController(c).getSnapshot().view
    const checkpoint = c.savedDeath?.()
    if (view?.status !== 'ready' || view.phase !== 'dead' || !checkpoint || !c.reservation) {
      throw new BrowserOwnerError('UNAVAILABLE')
    }
    return { reservation: c.reservation, checkpoint }
  }

  function persistAttempt(c: Context, prepared: PreparedAttempt): NewAttemptResult {
    const old = deadWitness(c)
    try { commitNewAttempt(environment!.storage(), old, prepared, () => alive(c)) }
    catch { return 'save-failed' }
    if (alive(c)) load()
    return 'saved'
  }

  function freshContext(): Context {
    abandon()
    const c: Context = { valid: true, controller: null, hasCurrent: null, unsubscribe: null, controls: null }; ctx = c
    const call = <T>(f: (p: PreplayController) => T) => guard(c, () => f(requireController(c)))
    c.controls = Object.freeze({
      getSnapshot: () => call(p => p.getSnapshot()), execute: input => call(p => p.execute(input)),
      confirm: token => call(p => p.confirm(token)), preview: input => call(p => p.preview(input)),
      describeAction: action => call(p => p.describeAction(action)),
      beginDraft: input => call(p => p.beginDraft(input)), cancel: () => call(p => p.cancel()),
      executeDraft: token => call(p => p.executeDraft(token)), retrySave: () => call(p => { const result = p.retrySave(); c.reading?.flush(); return result }),
      getReading: () => guard(c, () => c.reading?.query() ?? Object.freeze({ marks: Object.freeze([]), warning: null })),
      acknowledgeReading: marks => guard(c, () => c.reading?.acknowledge(marks) ?? Object.freeze({ marks: Object.freeze([]), warning: null })),
      synchronize: () => call(p => p.synchronize()),
      retryRead: () => guard(c, () => {
        if (c.hasCurrent?.() || !['blocked', 'read-error', 'reservation-failed'].includes(snapshot.status))
          throw new BrowserOwnerError('UNAVAILABLE')
        load(); return snapshot
      }),
      beginNewAttempt: () => guard(c, () => {
        deadWitness(c)
        if (!c.restart) c.restart = { prepared: null, attempted: false }
      }),
      cancelNewAttempt: () => guard(c, () => { c.restart = undefined }),
      confirmNewAttempt: input => guard(c, () => {
        const old = deadWitness(c)
        const draft = c.restart
        if (!draft || draft.attempted) throw new BrowserOwnerError('UNAVAILABLE')
        let choices: ReturnType<typeof choicesSchema.parse>
        try { choices = readRecord(choicesSchema, input) } catch { throw new BrowserOwnerError('INVALID_SETUP') }
        draft.attempted = true
        try { draft.prepared = prepareNewAttempt(old.reservation, environment!.entropy(), choices, environment!.storage(), () => alive(c)) }
        catch { return 'prepare-failed' }
        return persistAttempt(c, draft.prepared)
      }),
      retryNewAttempt: () => guard(c, () => {
        if (!c.restart?.prepared) throw new BrowserOwnerError('UNAVAILABLE')
        return persistAttempt(c, c.restart.prepared)
      }),
      confirmSetup: input => guard(c, () => {
        if (snapshot.status !== 'setup' || c.controller || initializationAttempted) throw new BrowserOwnerError('UNAVAILABLE')
        let choices: ReturnType<typeof choicesSchema.parse>
        try { choices = readRecord(choicesSchema, input) } catch { throw new BrowserOwnerError('INVALID_SETUP') }
        // Mark the attempt before invoking external callbacks. Any partial initialization is conservative.
        initializationAttempted = true; publish('loading')
        if (!alive(c)) return snapshot
        try {
          const r = createReservation(environment!.entropy(), choices).reservation
          if (!alive(c)) return snapshot
          const storage = environment!.storage()
          try { reserveBrowser(storage, r, () => alive(c)) }
          catch { if (alive(c)) publish('reservation-failed'); return snapshot }
          if (!alive(c)) return snapshot
          install(c, createBrowserContext(r, null, storage, () => alive(c)), true, r, storage)
        } catch (error) { if (alive(c)) publish('blocked'); throw error }
        return snapshot
      }),
    })
    return c
  }
  function load() {
    const c = freshContext(); publish('loading')
    if (!alive(c)) return
    let pair: ReturnType<typeof readBrowserPair>
    let storage: ReturnType<BrowserEnvironment['storage']>
    try { storage = environment!.storage(); pair = readBrowserPair(storage, () => alive(c)) }
    catch (error) { if (alive(c)) publish(error instanceof BrowserOwnerError ? 'blocked' : 'read-error'); return }
    if (!alive(c)) return
    if (!pair) { publish(initializationAttempted ? 'blocked' : 'setup'); return }
    try { install(c, createBrowserContext(pair.reservation, pair.checkpoint, storage, () => alive(c), { replacement: pair.replacement }), false, pair.reservation, storage, pair.replacement) }
    catch (error) {
      if (alive(c)) publish('blocked')
      // Known corruption is an application blocked state; program defects remain observable.
      if (!(error instanceof BrowserOwnerError) && !(error instanceof Error && ['CombatResidenceSaveError', 'ResidenceError'].includes(error.name))) throw error
    }
  }
  const owner: BrowserOwner = Object.freeze({ getSnapshot: () => snapshot,
    subscribe: listener => { if (typeof listener !== 'function') throw new TypeError('Expected listener'); listeners.add(listener); return () => { listeners.delete(listener) } },
    controls: () => ctx && alive(ctx) ? ctx.controls : null,
    acquire: () => {
      if (disposed) return Promise.resolve(snapshot)
      if (acquiring) return acquiring
      if (busy || notifying) return Promise.resolve(snapshot)
      if (lease?.active()) return Promise.resolve(snapshot)
      const epoch = generation
      const acquire = async () => {
        try { environment = (options.environment ?? ambientEnvironment)() }
        catch { publish('unsupported'); return snapshot }
        if (!environment.secure || !environment.locks || typeof environment.locks.request !== 'function') { publish('unsupported'); return snapshot }
        unbind?.(); unbind = environment.lifecycle ? bindBrowserLifecycle(environment.lifecycle, suspend) : null
        publish('acquiring')
        let next: BrowserLease | null
        try { next = await requestBrowserLease(environment.locks, () => { if (lease) suspend() }) }
        catch {
          if (!disposed && generation === epoch) publish('unsupported')
          return snapshot
        }
        if (disposed || generation !== epoch) { next?.release(); return snapshot }
        if (!next) { publish('occupied'); return snapshot }
        lease = next; load(); return snapshot
      }
      acquiring = acquire().finally(() => { acquiring = null })
      return acquiring
    },
    suspend,
    dispose: () => { if (disposed) return; disposed = true; suspend(); unbind?.(); unbind = null; publish('disposed'); listeners.clear() },
  })
  return owner
}
