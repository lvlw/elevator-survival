// TEST ONLY: isolated G2 graph and identities; no production five-map registration.
import { vi } from 'vitest'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
import { fixture as g2Fixture, mutable, catalogInput, binding, move, reveal } from '../../core/residence-location/test-fixtures'
import { createMissionScope, establishMissionFact } from '../../core/mission-lifecycle/controlled'
import { createResidenceSavePolicy, createResidenceSession, createResidenceSessionDomain } from './controlled'
import { serializeResidenceSave, validateResidenceAggregate, type ActiveResidenceWorld, type FreshResidenceHub } from '../residence-save'
import type { ResidenceLocationSnapshot } from '../../core/residence-location'

export { mutable, catalogInput, binding, move, reveal }
export function fixture(options: Parameters<typeof g2Fixture>[1] = {}) {
  const g2 = g2Fixture(infectedResidenceConfig, options)
  const spare = { ...g2.lifecycle.binding.mission, commissionId: 'spare' }
  const declarations = [g2.lifecycle.binding.mission, spare]
  const scope = createMissionScope({ characterId: g2.state.character.identity.characterId, declarations },
    (v) => v === g2.dependencies.residence.rulesVersion)
  const unaccepted = establishMissionFact({ characterId: scope.characterId, mission: spare }, scope)
  const policy = createResidenceSavePolicy({ configuration: infectedResidenceConfig,
    rulesVersion: g2.dependencies.residence.rulesVersion, declarations, catalogs: [g2.dependencies.catalog] })
  const active = (snapshot: ResidenceLocationSnapshot = g2.state): ActiveResidenceWorld => {
    const result = validateResidenceAggregate({ phase: 'active-world', ...snapshot, missions: [g2.lifecycle, unaccepted] }, policy)
    if (result.phase !== 'active-world') throw new Error('active fixture')
    return result
  }
  const fresh = (): FreshResidenceHub => {
    const s = g2.state
    const result = validateResidenceAggregate({ phase: 'fresh-hub', character: { ...s.character, revision: 0, clock: { kind: 'first-ready' } },
      missions: declarations.map((mission) => establishMissionFact({ characterId: scope.characterId, mission }, scope)),
      carried: s.carried, itemStates: s.itemStates, catalogRef: { catalogId: g2.dependencies.catalog.data.id, catalogVersion: g2.dependencies.catalog.data.version } }, policy)
    if (result.phase !== 'fresh-hub') throw new Error('fresh fixture')
    return result
  }
  return { ...g2, fullScope: scope, policy, active, fresh }
}
export function memoryStorage(initial: string | null) {
  let value = initial
  let failRead = false
  let failWrite = false
  const hooks: { read?: () => void; write?: () => void } = {}
  const read = vi.fn(() => { hooks.read?.(); if (failRead) throw new Error('private read detail'); return value })
  const write = vi.fn((text: string) => { hooks.write?.(); if (failWrite) throw new Error('private write detail'); value = text })
  return { port: { read, write }, hooks, value: () => value,
    readFailure: (v: boolean) => { failRead = v }, writeFailure: (v: boolean) => { failWrite = v } }
}
export function harness(f = fixture(), initial: string | null = serializeResidenceSave(f.active(), f.policy)) {
  const storage = memoryStorage(initial)
  const factory = vi.fn(() => f.fresh())
  const domain = createResidenceSessionDomain()
  const composition = { policy: f.policy, storage: storage.port, createFirst: factory }
  const owner = createResidenceSession(domain, composition)
  const listener = vi.fn()
  owner.subscribe(listener)
  return { f, owner, storage, factory, domain, composition, listener }
}
export function currentActive(h: ReturnType<typeof harness>) {
  const current = h.owner.getState().current
  if (current?.phase !== 'active-world') throw new Error('active current required')
  return current
}
export const command = (s: ActiveResidenceWorld, edgeId = 'ab') => ({ kind: 'move' as const, ...binding(s), edgeId })
