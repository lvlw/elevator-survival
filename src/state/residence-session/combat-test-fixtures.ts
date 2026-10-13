// TEST ONLY: isolated synchronous ports; cold anchors are fixed before a candidate read.
import { expect, vi } from 'vitest'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createResidenceCombatDependencies } from '../../core/residence-combat/dependencies'
import { createCombatResidencePolicy } from '../residence-save/combat-policy'
import { serializeCombatResidenceSave } from '../residence-save/combat-codec'
import { initialMaterials as supplyMaterials } from './supply-test-fixtures'
import { expectation, quietDraw, mutable, fixture, entered, bodyBoundary, atDay, maintenanceReady, completeSuccess } from '../residence-save/combat-test-fixtures'
import { createCombatSession, createResidenceSessionDomain } from './combat-controlled'
import type { CombatDependencies, CombatValue } from '../../core/residence-combat/types'
import type { CombatSession, CombatSessionComposition, CombatSessionExpectation } from './combat-types'
import { RANDOM_ALGORITHM_VERSION } from '../../core/random'
export { expectation, quietDraw, mutable, fixture, entered, bodyBoundary, atDay, maintenanceReady, completeSuccess }

export function harness(options: { dependencies?: CombatDependencies; text?: string | null; expected?: CombatSessionExpectation;
  startup?: 'first' | 'existing'; materials?: unknown; tool?: 'crow' | 'lamp' | 'toolbox';
  specialty?: 'scout' | 'engineer' | 'survival'; draw?: CombatDependencies['supply']['draw'] } = {}) {
  const base = options.dependencies ?? createInfectedCombatDependencies('combat-test-character')
  const draw = vi.fn(options.draw ?? quietDraw)
  const deps = createResidenceCombatDependencies(Object.freeze({ ...base.supply, draw }), base.profiles)
  const policy = createCombatResidencePolicy({ dependencies: deps, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION })
  const raw = supplyMaterials(deps.supply, options.tool ?? 'crow', options.specialty ?? 'engineer')
  raw.execution.runId = 'combat-test-execution'; raw.execution.seed = 'combat-seed'
  const materials = options.materials ?? raw
  const factory = vi.fn(() => materials), coldProvider = vi.fn((): unknown => options.expected)
  let disk = options.text ?? null
  let saved: { text: string; expected: CombatSessionExpectation; value: CombatValue } | null = null
  const faults = { read: false, write: false }, hooks = { read: () => {}, write: () => {}, initial: () => {}, cold: () => {} }
  factory.mockImplementation(() => { hooks.initial(); return materials })
  coldProvider.mockImplementation(() => { hooks.cold(); return options.expected })
  const storage = { read: vi.fn(() => { hooks.read(); if (faults.read) throw new Error('read'); return disk }),
    write: vi.fn((text: string) => {
      hooks.write(); if (faults.write) throw new Error('write')
      const value = current({ owner }), initial = options.expected ?
        { ...options.expected.initial.execution, ...options.expected.initial.choices } : rawInitial(materials)
      saved = { text, value, expected: expectation(value, deps, initial) }
      disk = text
    }) }
  const composition: CombatSessionComposition = { policy, storage, startup: options.startup ?? 'first',
    provideInitialMaterials: factory, ...(options.expected ? { provideColdExpectation: coldProvider } : {}) }
  const domain = createResidenceSessionDomain(), owner = createCombatSession(domain, composition)
  const listener = vi.fn(); owner.subscribe(listener)
  return { owner, deps, policy, domain, composition, materials, factory, coldProvider, draw, storage, faults, hooks, listener,
    disk: () => disk, saved: () => saved, setDisk: (text: string | null) => { disk = text } }
}
export type Harness = ReturnType<typeof harness>
export function rawInitial(materials: unknown) {
  const m = materials as { execution: { runId: string; seed: string }; tool: string; specialty: string }
  return { ...m.execution, tool: m.tool, specialty: m.specialty }
}
export function current(h: { owner: CombatSession }): CombatValue {
  const v = h.owner.getState().current
  if (!v) throw new Error('TEST requires installed current')
  return v
}
export function request(h: { owner: CombatSession }, family: string, fields: Record<string, unknown> = {}) {
  const kind = family === 'source' ? 'reveal' : family === 'combat' ? 'combat-action' : family
  return { kind: family, command: { kind, expectedRevision: current(h).character.revision,
    ...(family === 'combat' ? { expectedBattleId: current(h).battle!.entry.id } : {}), ...fields } }
}
export function depart(h: Harness) { return h.owner.dispatch(request(h, 'depart', { commissionId: h.deps.supply.catalog.data.mission.commissionId })) }
export function start(h: Harness) {
  expect(h.owner.bootstrap().status).toBe('no-save'); h.owner.createFirst(); depart(h)
}
export function coldRecord(value: CombatValue, deps: CombatDependencies, materials?: Parameters<typeof expectation>[2]) {
  const expected = expectation(value, deps, materials)
  const h = harness({ dependencies: deps, expected, startup: 'existing' })
  h.setDisk(serializeCombatResidenceSave(value, expected, h.policy))
  return h
}
export function installBoundary(value: CombatValue, deps: CombatDependencies) {
  const h = coldRecord(value, deps); expect(h.owner.bootstrap().status).toBe('ready'); return h
}
export function coldSaved(h: Harness) {
  const saved = h.saved()
  if (!saved) throw new Error('No successful write exists')
  const next = harness({ dependencies: h.deps, text: saved.text, expected: saved.expected, startup: 'existing' })
  expect(next.owner.bootstrap().current).toEqual(saved.value)
  expect(next.storage.read).toHaveBeenCalledTimes(1); expect(next.coldProvider).toHaveBeenCalledTimes(1)
  expect(next.factory).not.toHaveBeenCalled(); expect(next.storage.write).not.toHaveBeenCalled(); expect(next.listener).not.toHaveBeenCalled()
  return next
}
export function reject(h: Harness, command: unknown, code?: string) {
  const before = current(h), disk = h.disk(), writes = h.storage.write.mock.calls.length, notices = h.listener.mock.calls.length
  expect(() => h.owner.dispatch(command)).toThrowError(code ? expect.objectContaining({ code }) : undefined)
  expect(current(h)).toBe(before); expect(h.disk()).toBe(disk)
  expect(h.storage.write).toHaveBeenCalledTimes(writes); expect(h.listener).toHaveBeenCalledTimes(notices)
}
