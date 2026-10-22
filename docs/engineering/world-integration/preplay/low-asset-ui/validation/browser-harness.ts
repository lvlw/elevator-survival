// TEST ONLY: real React UI in a private temporary browser profile. Never imported by main.
import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { InfectedWorldApp } from '../../../../../../src/ui/infected-world/app'
import { createInfectedBrowserOwner } from '../../../../../../src/app/infected-browser/owner'
import { generateBrowserIdentity } from '../../../../../../src/app/infected-browser/identity-materials'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../../../../../src/app/infected-browser/schema'
import type { BrowserControls, BrowserOwner } from '../../../../../../src/app/infected-browser/types'
import { runDomRouteA, runDomRouteB } from './browser-cases'
import { boundaryRecords } from '../../browser-owner/validation/browser-cases'

if (!import.meta.env.DEV) throw new Error('TEST harness is DEV-only')
const params = new URLSearchParams(location.search), seed = params.get('seed')
const faults = { read: false, reservation: false, checkpoint: false }
const io: { operation: 'read' | 'write'; key: 'reservation' | 'checkpoint' | 'unexpected'; success: boolean }[] = []
const calls: Record<string, number> = {}
const lifecycle: { event: string; persisted: boolean }[] = []
const publicationCounts = { owners: 0, publications: 0, entropy: 0 }
let currentOwner: BrowserOwner | null = null
const boundary = params.get('boundary')
let boundaryWrites = 0
// Supplemental TEST-only genuine P + strict-v4 fixture, never part of read-null A/B.
// Only the two absent new-world records may be initialized, never overwritten.
if ((boundary === 'both-zero' || boundary === 'alive-enemy') && localStorage.getItem(RESERVATION_KEY) === null && localStorage.getItem(CHECKPOINT_KEY) === null) {
  const records = boundaryRecords(boundary)
  localStorage.setItem(RESERVATION_KEY, records.reservation)
  localStorage.setItem(CHECKPOINT_KEY, records.checkpoint)
  boundaryWrites = 2
}
const classifiedKey = (key: string): 'reservation' | 'checkpoint' | 'unexpected' => key === RESERVATION_KEY ? 'reservation' : key === CHECKPOINT_KEY ? 'checkpoint' : 'unexpected'
const count = (name: string) => { calls[name] = (calls[name] ?? 0) + 1 }
const ownerFactory = (): BrowserOwner => {
  publicationCounts.owners++
  const native = createInfectedBrowserOwner({ environment: () => ({
    secure: isSecureContext, locks: navigator.locks, lifecycle: window,
    storage: () => ({
      getItem(key) {
        const record = { operation: 'read' as const, key: classifiedKey(key), success: false }
        io.push(record)
        if (faults.read) throw new Error('TEST injected read failure')
        const text = localStorage.getItem(key); record.success = true; return text
      },
      setItem(key, text) {
        const record = { operation: 'write' as const, key: classifiedKey(key), success: false }
        io.push(record)
        if (key === RESERVATION_KEY && faults.reservation || key === CHECKPOINT_KEY && faults.checkpoint) throw new Error('TEST injected write failure')
        localStorage.setItem(key, text); record.success = true
      },
    }),
    entropy: () => {
      publicationCounts.entropy++
      const material = generateBrowserIdentity()
      return seed ? { ...material, characterId: 'E03-A-character', runId: 'E03-A-execution', seed } : material
    },
  }) })
  native.subscribe(() => { publicationCounts.publications++ })
  const wrappers = new WeakMap<BrowserControls, BrowserControls>()
  const wrapped: BrowserOwner = Object.freeze({
    ...native,
    controls() {
      const controls = native.controls()
      if (!controls) return null
      const cached = wrappers.get(controls)
      if (cached) return cached
      const methods = Object.fromEntries(Object.entries(controls).map(([name, value]) => [name,
        typeof value === 'function' ? (...args: unknown[]) => { count(name); return Reflect.apply(value, controls, args) } : value,
      ])) as BrowserControls
      const result = Object.freeze(methods); wrappers.set(controls, result); return result
    },
  })
  currentOwner = wrapped
  return wrapped
}
const container = document.querySelector<HTMLElement>('#root')!
let root = createRoot(container)
const mount = () => root.render(createElement(StrictMode, null, createElement(InfectedWorldApp, { ownerFactory })))
const snapshot = () => currentOwner?.getSnapshot() ?? null
const sentinelKey = 'elevator-survival:active-run'
window.addEventListener('pagehide', event => {
  lifecycle.push({ event: 'pagehide', persisted: event.persisted })
  sessionStorage.setItem('low-asset-ui-TEST-lifecycle', JSON.stringify(lifecycle))
})
window.addEventListener('pageshow', event => { lifecycle.push({ event: 'pageshow', persisted: event.persisted }) })
const api = Object.freeze({
  snapshot,
  counts: () => ({ ...publicationCounts, controlsCalls: { ...calls }, io: io.map(entry => ({ ...entry })), lifecycle: [...lifecycle], previousLifecycle: sessionStorage.getItem('low-asset-ui-TEST-lifecycle'),
    boundaryPreparation: { kind: boundary, writes: boundaryWrites, source: boundary ? 'supplemental genuine P and strict codec, not read-null route' : 'none' } }),
  faults: (patch: Partial<typeof faults>) => {
    for (const name of ['read', 'reservation', 'checkpoint'] as const) if (typeof patch[name] === 'boolean') faults[name] = patch[name]!
  },
  suspend: () => currentOwner?.suspend(),
  dispose: () => currentOwner?.dispose(),
  unmount: () => root.unmount(),
  remount: () => { root = createRoot(container); mount() },
  sentinel: (value?: string) => { if (value !== undefined) localStorage.setItem(sentinelKey, value); return localStorage.getItem(sentinelKey) },
  routeA: (stage: number) => runDomRouteA(stage, snapshot),
  routeB: (stage: number) => runDomRouteB(stage, snapshot),
})
Object.assign(window, { lowAssetTest: api })
mount()
