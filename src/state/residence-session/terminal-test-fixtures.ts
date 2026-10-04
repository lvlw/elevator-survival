// TEST ONLY. Isolated G2/A/B catalogs, never registered as player content.
import { expect, vi } from 'vitest'
import * as missionApi from '../../core/mission-lifecycle/controlled'
import * as cycleApi from '../../core/character-cycle'
import * as energyApi from '../../core/residence-energy'
import * as locationApi from '../../core/residence-location'
import * as locationControlled from '../../core/residence-location/controlled'
import * as terminalApi from '../../core/residence-terminal/controlled'
import * as randomApi from '../../core/random'
import { execution } from '../../core/residence-location/test-fixtures'
import type { LocationCatalogData } from '../../core/residence-location/catalog'
import { fixture, initial, policyFor, mutable, history, normal, death, withAssets } from '../residence-save/terminal-test-fixtures'
import { serializeTerminalResidenceSave, deserializeTerminalResidenceSave, type TerminalResidenceAggregate,
  type TerminalResidenceSavePolicy, type FreshTerminalResidenceHub } from '../residence-save/terminal-index'
import { memoryStorage } from './test-fixtures'
import { createTerminalResidenceSession, createResidenceSessionDomain } from './terminal-controlled'
import type { TerminalResidenceSession } from './terminal-types'
export { fixture, initial, mutable, history, normal, death, withAssets, execution, policyFor }

export function harness(policy: TerminalResidenceSavePolicy, text: string | null, first: unknown = initial().fresh) {
  const storage = memoryStorage(text)
  const factory = vi.fn(() => first)
  const provider = vi.fn((): unknown => ({ ...execution }))
  const domain = createResidenceSessionDomain()
  const composition = { policy, storage: storage.port, createFirst: factory, provideFirstExecution: provider }
  const owner = createTerminalResidenceSession(domain, composition)
  const listener = vi.fn(); owner.subscribe(listener)
  return { policy, storage, factory, provider, domain, composition, owner, listener }
}
export type Harness = ReturnType<typeof harness>
export function firstHarness(options: {
  catalog?: (data: LocationCatalogData) => void
  fresh?: (value: ReturnType<typeof mutable<FreshTerminalResidenceHub>>) => void
} = {}) {
  const f = initial()
  const data = mutable(f.policy.policies[0].catalog.data)
  options.catalog?.(data)
  const catalog = locationControlled.createLocationCatalog(data)
  const dependencies = { ...f.dependencies, policies: [{ ...f.dependencies.policies[0], catalog }] }
  const policy = policyFor(dependencies)
  const fresh = mutable(f.fresh)
  fresh.catalogRef = { catalogId: catalog.data.id, catalogVersion: catalog.data.version }
  options.fresh?.(fresh)
  return { ...harness(policy, null, fresh), fresh, dependencies }
}
export function cold(value: TerminalResidenceAggregate, policy: TerminalResidenceSavePolicy) {
  const h = harness(policy, serializeTerminalResidenceSave(value, policy))
  h.owner.bootstrap()
  return h
}
export function active(h: { owner: TerminalResidenceSession }) {
  const s = h.owner.getState().current
  if (s?.phase !== 'active-world' || !s.site) throw new Error('Expected canonical active current')
  return { ...s, site: s.site }
}
export function launch(h: { owner: TerminalResidenceSession }) {
  const s = h.owner.getState().current!
  return { kind: 'launch' as const, identity: s.character.identity, expectedRevision: s.character.revision,
    commissionId: s.missions[0].binding.mission.commissionId }
}
export function request(h: { owner: TerminalResidenceSession }, kind: string, fields: Record<string, unknown> = {}) {
  const s = active(h)
  return { kind, binding: s.site.binding, expectedRevision: s.character.revision, ...fields }
}
export function start(h: Harness) {
  expect(h.owner.bootstrap().status).toBe('no-save')
  h.owner.createFirst()
  h.owner.dispatch(launch(h))
}
export function rejectUnchanged(h: Harness, input: unknown, code?: string) {
  const before = h.owner.getState(); const saved = h.storage.value()
  const writes = h.storage.port.write.mock.calls.length; const notices = h.listener.mock.calls.length
  if (code) expect(() => h.owner.dispatch(input)).toThrowError(expect.objectContaining({ code }))
  else expect(() => h.owner.dispatch(input)).toThrow()
  expect(h.owner.getState()).toEqual(before); expect(h.owner.getState().current).toBe(before.current)
  expect(h.storage.value()).toBe(saved)
  expect(h.storage.port.write).toHaveBeenCalledTimes(writes); expect(h.listener).toHaveBeenCalledTimes(notices)
}
export function savedEqualsCurrent(h: Harness) {
  expect(deserializeTerminalResidenceSave(h.storage.value()!, h.policy)).toEqual(h.owner.getState().current)
}
/** Install observers AFTER fixture production. Counts are native calls, not claimed outcomes. */
export function observe(h: Harness) {
  const spies = {
    activate: vi.spyOn(missionApi, 'activateMission'), terminate: vi.spyOn(missionApi, 'terminateMission'),
    cycle: vi.spyOn(cycleApi, 'planCharacterCycle'), action: vi.spyOn(energyApi, 'planResidenceAction'),
    establish: vi.spyOn(locationControlled, 'establishResidenceLocation'),
    move: vi.spyOn(locationApi, 'planResidenceMove'), reveal: vi.spyOn(locationApi, 'planResidenceSourceReveal'),
    transfer: vi.spyOn(locationApi, 'planResidenceItemTransfer'), rest: vi.spyOn(locationControlled, 'planResidenceLocationRest'),
    terminal: vi.spyOn(terminalApi, 'planResidenceTerminal'), consume: vi.spyOn(terminalApi, 'consumeResidenceLocationDeath'),
    draw: vi.spyOn(randomApi, 'drawIntInclusive'),
  }
  const replacements = new Set<object>()
  const notifications = new Set<object>()
  h.storage.hooks.write = () => { replacements.add(h.owner.getState().current!) }
  const secondListener = vi.fn((v) => { notifications.add(v.current) })
  h.owner.subscribe(secondListener)
  const plans = () => Object.fromEntries(Object.entries(spies).map(([name, spy]) => [name, spy.mock.calls.length]))
  const counts = () => ({ ...plans(), factory: h.factory.mock.calls.length, provider: h.provider.mock.calls.length,
    read: h.storage.port.read.mock.calls.length, write: h.storage.port.write.mock.calls.length,
    currentReplacements: replacements.size, notificationBatches: notifications.size,
    listener1: h.listener.mock.calls.length, listener2: secondListener.mock.calls.length })
  return { spies, plans, counts, replacements }
}
