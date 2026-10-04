// TEST ONLY: isolated G2 graph and identities; no production five-map registration.
import { vi } from 'vitest'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
import { fixture as g2Fixture, mutable, catalogInput, binding, move, reveal } from '../../core/residence-location/test-fixtures'
import { createMissionScope, establishMissionFact } from '../../core/mission-lifecycle/controlled'
import { createResidenceSavePolicy, createResidenceSession, createResidenceSessionDomain } from './controlled'
import { serializeResidenceSave, validateResidenceAggregate, type ActiveResidenceWorld, type FreshResidenceHub } from '../residence-save'
import type { ResidenceLocationSnapshot } from '../../core/residence-location'
import { createLocationCatalog } from '../../core/residence-location/controlled'
import { mission, execution, rulesVersion, type Mutable } from '../../core/residence-location/test-fixtures'
import type { LocationCatalogData } from '../../core/residence-location/catalog'

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
export function currentActive(h: Pick<ReturnType<typeof harness>, 'owner'>) {
  const current = h.owner.getState().current
  if (current?.phase !== 'active-world') throw new Error('active current required')
  return current
}
export const command = (s: ActiveResidenceWorld, edgeId = 'ab') => ({ kind: 'move' as const, ...binding(s), edgeId })

/** G4: independent fresh construction, never an established active-world fixture. */
export function firstHarness(options: { catalog?: LocationCatalogData; mutateFresh?: (s: Mutable<FreshResidenceHub>) => void;
  initial?: string | null; provider?: () => unknown; omitProvider?: boolean } = {}) {
  const catalog = createLocationCatalog(options.catalog ?? catalogInput())
  const declarations = [mission, { ...mission, commissionId: 'spare' }]
  const scope = createMissionScope({ characterId: 'character', declarations }, (v) => v === rulesVersion)
  const policy = createResidenceSavePolicy({ configuration: infectedResidenceConfig, rulesVersion, declarations, catalogs: [catalog] })
  const raw: Mutable<FreshResidenceHub> = {
    phase: 'fresh-hub', catalogRef: { catalogId: catalog.data.id, catalogVersion: catalog.data.version },
    character: { identity: { characterId: scope.characterId, rulesVersion, configurationId: infectedResidenceConfig.configurationId },
      revision: 0, cycle: 1, clock: { kind: 'first-ready' }, body: { energy: 100, infectionProgress: 0, satiety: 6, suppression: 0,
        quotasRemaining: { suppressant: 1, disinfectant: 1, pipe_signature: 1 },
        condition: { currentHealth: 12, bleeding: false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 } } },
    missions: mutable(declarations.map((m) => establishMissionFact({ characterId: scope.characterId, mission: m }, scope))),
    carried: { backpack: { width: 4, height: 4, items: [], placements: [] },
      equipment: { weapon: null, armor: null, utility: null }, quickSlots: { slots: [null, null] } }, itemStates: { states: [] },
  }
  options.mutateFresh?.(raw)
  const factory = vi.fn(() => raw)
  const provider = vi.fn(options.provider ?? (() => ({ ...execution })))
  const storage = memoryStorage(options.initial ?? null)
  const domain = createResidenceSessionDomain()
  const composition = { policy, storage: storage.port, createFirst: factory,
    ...(options.omitProvider ? {} : { provideFirstExecution: provider }) }
  const owner = createResidenceSession(domain, composition)
  const listener = vi.fn(); owner.subscribe(listener)
  return { owner, policy, catalog, scope, raw, factory, provider, storage, listener, composition, domain }
}
export type FirstHarness = ReturnType<typeof firstHarness>
export function launchCommand(h: Pick<FirstHarness, 'owner'>) {
  const s = h.owner.getState().current
  if (!s) throw new Error('current required')
  return { kind: 'launch' as const, identity: s.character.identity, expectedRevision: s.character.revision, commissionId: mission.commissionId }
}
export function startFirst(h: FirstHarness) {
  h.owner.bootstrap(); h.owner.createFirst()
  return h.owner.dispatch(launchCommand(h))
}
