// TEST ONLY: isolated synchronous ports and external anchors, never a player bootstrap.
import { expect, vi } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
import * as initialApi from '../../core/residence-supply/initial'
import * as supplyApi from '../../core/residence-supply/controlled'
import * as taskApi from '../../core/residence-task/controlled'
import * as inventoryApi from '../../core/residence-supply/inventory'
import * as medicalApi from '../../core/residence-supply/medical'
import * as maintenanceApi from '../../core/residence-supply/maintenance'
import * as terminalApi from '../../core/residence-terminal/supply-controlled'
import * as origins from '../../core/residence-supply/allocations'
import * as plans from '../../core/residence-supply/plans'
import * as missionApi from '../../core/mission-lifecycle/controlled'
import * as energy from '../../core/residence-energy'
import * as cycle from '../../core/character-cycle'
import * as movement from '../../core/residence-location/movement'
import * as location from '../../core/residence-location/controlled'
import * as itemTransfers from '../../core/residence-location/items'
import * as codec from '../residence-save/supply-codec'
import { createSupplyResidencePolicy, requireSupplyResidencePolicy } from '../residence-save/supply-policy'
import { expectation, mutable, fixture, atNode, resolvedDanger, searchAt, pickAlias, readSupplyValue } from '../residence-save/supply-test-fixtures'
import type { SupplyDependencies, SupplyValue } from '../../core/residence-supply/types'
import type { SupplyResidenceExpectation, SupplyResidencePolicy } from '../residence-save/supply-types'
import { createSupplySession, createResidenceSessionDomain } from './supply-controlled'
import type { SupplySession, SupplySessionComposition } from './supply-types'
export { expectation, mutable, fixture, atNode, resolvedDanger, searchAt, pickAlias, readSupplyValue }
export function initialMaterials(deps: SupplyDependencies, tool = 'toolbox', specialty = 'engineer') {
  const cfg = deps.residence.configuration.config
  return { character: { identity: { characterId: deps.residence.scope.characterId, rulesVersion: deps.residence.rulesVersion,
    configurationId: deps.residence.configuration.configurationId }, revision: 0, cycle: 1, clock: { kind: 'first-ready' },
    body: { energy: cfg.limits.energy, infectionProgress: 0, satiety: cfg.limits.satiety, suppression: 0,
      quotasRemaining: { ...cfg.quota }, condition: { currentHealth: cfg.limits.hp, bleeding: false, minorContusions: 0,
        painkillerActive: false, pendingInfectionExposures: 0, openWounds: [] } } },
    mission: missionApi.establishMissionFact({ characterId: deps.residence.scope.characterId, mission: deps.catalog.data.mission }, deps.residence.scope),
    execution: { runId: 'test-execution', seed: 'test-seed', rulesVersion: deps.residence.rulesVersion }, tool, specialty }
}
export function harness(options: { policy?: SupplyResidencePolicy; text?: string | null; expected?: SupplyResidenceExpectation;
  startup?: 'first' | 'existing'; materials?: unknown } = {}) {
  const original = options.policy ? requireSupplyResidencePolicy(options.policy) : createInfectedSupplyDependencies('session-test-character')
  const draw = vi.fn(original.draw)
  const policy = createSupplyResidencePolicy({ ...original, draw })
  const deps = requireSupplyResidencePolicy(policy)
  const materials = options.materials ?? initialMaterials(deps)
  const factory = vi.fn(() => materials), coldProvider = vi.fn((): unknown => options.expected)
  let disk = options.text ?? null
  const faults = { read: false, write: false }, hooks = { read: () => {}, write: () => {} }
  const storage = { read: vi.fn(() => { hooks.read(); if (faults.read) throw new Error('read'); return disk }),
    write: vi.fn((text: string) => { hooks.write(); if (faults.write) throw new Error('write'); disk = text }) }
  const composition: SupplySessionComposition = { policy, storage, startup: options.startup ?? 'first',
    provideInitialMaterials: factory, ...(options.expected ? { provideColdExpectation: coldProvider } : {}) }
  const domain = createResidenceSessionDomain(), owner = createSupplySession(domain, composition)
  const listener = vi.fn(); owner.subscribe(listener)
  return { owner, policy, deps, domain, composition, materials, factory, coldProvider, draw, storage, faults, hooks,
    listener, disk: () => disk, setDisk: (text: string | null) => { disk = text } }
}
export type Harness = ReturnType<typeof harness>
export function current(h: { owner: SupplySession }): SupplyValue {
  const value = h.owner.getState().current
  if (!value) throw new Error('TEST requires current')
  return value
}
export function request(h: { owner: SupplySession }, family: string, fields: Record<string, unknown> = {}) {
  const inner = family === 'source' ? 'reveal' : family
  return { kind: family, command: { kind: inner, expectedRevision: current(h).character.revision, ...fields } }
}
export function depart(h: Harness) {
  return h.owner.dispatch(request(h, 'depart', { commissionId: h.deps.catalog.data.mission.commissionId }))
}
export function start(h: Harness) {
  expect(h.owner.bootstrap().status).toBe('no-save'); h.owner.createFirst(); depart(h)
}
export function cold(value: SupplyValue, policy: SupplyResidencePolicy) {
  // Fix independent facts BEFORE exposing a string to a newly constructed owner.
  const expected = expectation(value, requireSupplyResidencePolicy(policy))
  const text = codec.serializeSupplyResidenceSave(value, expected, policy)
  const h = harness({ policy, text, expected, startup: 'existing' })
  expect(h.owner.bootstrap().status).toBe('ready')
  return h
}
export function coldLatest(h: Harness) {
  const expected = expectation(current(h), h.deps)
  const next = harness({ policy: h.policy, text: h.disk(), expected, startup: 'existing' })
  const e = observe(next), before = e.counts()
  expect(next.owner.bootstrap().current).toEqual(current(h))
  expect(next.storage.read).toHaveBeenCalledTimes(1); expect(next.coldProvider).toHaveBeenCalledTimes(1)
  expect(next.storage.write).not.toHaveBeenCalled(); expect(next.factory).not.toHaveBeenCalled(); expect(next.listener).not.toHaveBeenCalled()
  const delta = Object.fromEntries(Object.entries(e.counts()).map(([key, count]) => [key, count - before[key as keyof typeof before]]))
  expect(delta).toEqual({ ...Object.fromEntries(Object.keys(before).map(key => [key, 0])), read: 1, expected: 1, decode: 1 })
  recordCounts('cold:' + current(h).phase, { ...delta, coldInstall: 1 })
  return next
}
/** Test reporter output only; no file adapter or production logger. */
export function recordCounts(label: string, counts: Record<string, number>) {
  console.log('E01-S-COUNTS ' + JSON.stringify({ label, counts }))
}
export function reject(h: Harness, req: unknown, code: string) {
  const before = current(h), disk = h.disk(), writes = h.storage.write.mock.calls.length, notices = h.listener.mock.calls.length
  expect(() => h.owner.dispatch(req)).toThrowError(expect.objectContaining({ code }))
  expect(current(h)).toBe(before); expect(h.disk()).toBe(disk)
  expect(h.storage.write).toHaveBeenCalledTimes(writes); expect(h.listener).toHaveBeenCalledTimes(notices)
}
export function observe(h: Harness) {
  const spies = {
    initial: vi.spyOn(initialApi, 'establishSupplyInitial'), depart: vi.spyOn(initialApi, 'planSupplyDeparture'),
    move: vi.spyOn(supplyApi, 'planSupplyMove'), rest: vi.spyOn(supplyApi, 'planSupplyRest'),
    task: vi.spyOn(taskApi, 'planSupplyTaskAction'), reveal: vi.spyOn(taskApi, 'planSupplySourceReveal'),
    taskTransfer: vi.spyOn(taskApi, 'planSupplyTaskTransfer'), inventory: vi.spyOn(inventoryApi, 'planSupplyInventory'),
    medical: vi.spyOn(medicalApi, 'planSupplyMedical'), maintenance: vi.spyOn(maintenanceApi, 'planSupplyMaintenance'),
    terminal: vi.spyOn(terminalApi, 'planSupplyTerminal'), consume: vi.spyOn(terminalApi, 'consumeSupplyDeath'),
    origin: vi.spyOn(origins, 'issueSupplyOrigin'), plan: vi.spyOn(plans, 'issueSupplyPlan'),
    activate: vi.spyOn(missionApi, 'activateMission'), terminate: vi.spyOn(missionApi, 'terminateMission'),
    action: vi.spyOn(energy, 'planResidenceAction'), cycle: vi.spyOn(cycle, 'planCharacterCycle'),
    g2Move: vi.spyOn(movement, 'planResidenceBoundMove'), g2Rest: vi.spyOn(location, 'planResidenceLocationRest'),
    g2Transfer: vi.spyOn(itemTransfers, 'planResidenceItemTransfer'), g2Initial: vi.spyOn(location, 'establishResidenceLocation'),
    encode: vi.spyOn(codec, 'serializeSupplyResidenceSave'), decode: vi.spyOn(codec, 'deserializeSupplyResidenceSave'),
  }
  const replacements = new Set<object>(), batches = new Set<object>()
  h.hooks.write = () => { replacements.add(current(h)) }
  h.owner.subscribe(v => { batches.add(v.current!) })
  const counts = () => ({ ...Object.fromEntries(Object.entries(spies).map(([k, s]) => [k, s.mock.calls.length])) as Record<keyof typeof spies, number>,
    draw: h.draw.mock.calls.length, materials: h.factory.mock.calls.length, expected: h.coldProvider.mock.calls.length,
    read: h.storage.read.mock.calls.length, write: h.storage.write.mock.calls.length,
    current: replacements.size, batches: batches.size })
  return { spies, counts }
}
