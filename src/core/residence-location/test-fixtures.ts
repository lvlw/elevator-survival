// TEST ONLY: isolated graph/content/costs, not approved five-map definitions.
import type { ResidenceConfig } from '../residence-config'
import type { CharacterCycleState, CycleAuthority } from '../character-cycle'
import { activateMission, createMissionScope, establishMissionFact } from '../mission-lifecycle/controlled'
import { createLocationCatalog, establishResidenceLocation } from './controlled'
import type { LocationCatalogData } from './catalog'
import type { LocationAuthority, LocationDependencies, ResidenceLocationSnapshot } from './types'
import { planResidenceMove, planResidenceSourceReveal } from './index'

export const rulesVersion = 'g2-isolated-rules'
export const mission = { worldId: 'world', templateId: 'template', commissionId: 'commission', rulesVersion, contractVersion: 'contract' }
export const execution = { runId: 'execution', seed: 'golden-seed', rulesVersion }
export const paid = { kind: 'paid' as const, base: 8, factors: [] }
export function catalogInput(): LocationCatalogData {
  return structuredClone({ id: 'test-catalog', version: 'v1', mission, entryNodeId: 'a',
    nodes: [
      { id: 'a', name: 'Place A', placeId: 'east', surfaceEdgeIds: ['ab', 'ba'], surfaceSourceIds: ['fixed', 'lottery-a'], rest: 'A' },
      { id: 'b', name: 'Place B', placeId: 'west', surfaceEdgeIds: ['bc', 'cb'], surfaceSourceIds: ['lottery-b'], rest: 'C' },
      { id: 'c', name: 'Guarded room', placeId: 'west', surfaceEdgeIds: [], surfaceSourceIds: [], rest: 'C' },
    ],
    edges: [
      { id: 'ab', from: 'a', to: 'b', cost: paid, requiredFactIds: [], requiredItemDefinitionId: null, arrival: { healthLoss: 0, exposuresAdded: 0 } },
      { id: 'ba', from: 'b', to: 'a', cost: paid, requiredFactIds: [], requiredItemDefinitionId: null, arrival: { healthLoss: 0, exposuresAdded: 0 } },
      { id: 'bc', from: 'b', to: 'c', cost: paid, requiredFactIds: ['road-open'], requiredItemDefinitionId: null, arrival: { healthLoss: 0, exposuresAdded: 0 } },
      { id: 'cb', from: 'c', to: 'b', cost: paid, requiredFactIds: [], requiredItemDefinitionId: null, arrival: { healthLoss: 0, exposuresAdded: 0 } },
      { id: 'secret', from: 'a', to: 'c', cost: paid, requiredFactIds: [], requiredItemDefinitionId: null, arrival: { healthLoss: 0, exposuresAdded: 0 } },
    ],
    facts: [{ id: 'road-open', initial: false }, { id: 'installed', initial: false }],
    sources: [
      { id: 'fixed', nodeId: 'a', cost: paid, requiredFactIds: [], contents: { kind: 'fixed', grants: [
        { definitionId: 'pipe', quantity: 1, resource: { kind: 'durability', current: 2 } },
        { definitionId: 'lamp', quantity: 1, resource: { kind: 'charge', current: 1 } },
      ] } },
      ...['a', 'b'].map((nodeId) => ({ id: `lottery-${nodeId}`, nodeId, cost: paid, requiredFactIds: [],
        contents: { kind: 'choice' as const, choices: [
          [{ definitionId: 'supply', quantity: 2, resource: { kind: 'none' as const } }],
          [{ definitionId: 'lamp', quantity: 1, resource: { kind: 'charge' as const, current: 1 } }],
        ] } })),
    ],
    enemies: [{ id: 'guard', nodeId: 'c', definition: { id: 'test-enemy', maxHealth: 10, tags: [], weaknessTags: [],
      initialIntentActionId: 'scratch', actionCycle: ['scratch', 'bite'], actions: [
        { id: 'scratch', kind: 'scratch', playerVisible: { category: 'basic-attack', relativeSpeed: 'normal', directDamageSeverity: 'medium',
          mayCauseInjury: true, mayCauseInfectionExposure: false, mayCauseControl: false } },
        { id: 'bite', kind: 'lunge-bite', playerVisible: { category: 'special-attack', relativeSpeed: 'slow', directDamageSeverity: 'high',
          mayCauseInjury: true, mayCauseInfectionExposure: true, mayCauseControl: false } },
      ] } }],
    items: [
      ['pipe', 1, 2, 2, 'durability', 5], ['lamp', 1, 1, 1, 'charge', 3],
      ['supply', 1, 1, 2, 'none', 0], ['card', 1, 1, 0, 'none', 0],
      ['bulky', 4, 4, 1, 'none', 0], ['heavy', 1, 1, 11, 'none', 0], ['quest', 2, 2, 1, 'none', 0],
    ].map((row) => {
      const [id, width, height, unitWeight, kind, maximum] = row as [string, number, number, number, 'none' | 'durability' | 'charge', number]
      return { physical: { id, name: id, width, height, unitWeight, canRotate: true,
        stacking: id === 'supply' ? { kind: 'stackable' as const, maxQuantity: 6 } : { kind: 'none' as const } },
      resource: kind === 'none' ? { definitionId: id, kind } : { definitionId: id, kind, maximum },
      equipment: id === 'pipe' || id === 'lamp' ? { definitionId: id, kind: 'equippable' as const,
        eligibleSlots: [id === 'pipe' ? 'weapon' as const : 'utility' as const] } : { definitionId: id, kind: 'not-equippable' as const },
      quickSlot: { definitionId: id, kind: id === 'supply' ? 'eligible' as const : 'not-eligible' as const }, ordinary: id !== 'quest' }
    }),
    backpack: { width: 4, height: 4, quickSlotCount: 2, weightBands: {
      normal: { min: 0, max: 5, timeIncreasePercent: 0 }, loaded: { min: 6, max: 8, timeIncreasePercent: 10 },
      overloaded: { min: 9, max: 10, timeIncreasePercent: 25 }, cannotCarryFrom: 11,
    } },
  })
}
export type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] }
export const mutable = <T>(value: T): Mutable<T> => structuredClone(value) as Mutable<T>
export function fixture(configuration: ResidenceConfig, options: { energy?: number; hp?: number; bleeding?: boolean; seed?: string; catalog?: LocationCatalogData } = {}) {
  const scope = createMissionScope({ characterId: 'character', declarations: [mission] }, (v) => v === rulesVersion)
  const run = { ...execution, seed: options.seed ?? execution.seed }
  const lifecycle = activateMission(establishMissionFact({ characterId: 'character', mission }, scope),
    { binding: { characterId: 'character', mission }, execution: run }, scope)
  const character: CharacterCycleState = { identity: { characterId: 'character', rulesVersion, configurationId: configuration.configurationId },
    revision: 0, cycle: 1, clock: { kind: 'active', mission, execution: run, startCycle: 1, taskDay: 1 },
    body: { energy: options.energy ?? 100, infectionProgress: 0, satiety: 6, suppression: 0,
      quotasRemaining: { suppressant: 1, disinfectant: 1, pipe_signature: 1 },
      condition: { currentHealth: options.hp ?? 12, bleeding: options.bleeding ?? false, openWounds: [], minorContusions: 0,
        painkillerActive: false, pendingInfectionExposures: 0 } } }
  const dependencies: LocationDependencies = { residence: { configuration, rulesVersion, scope }, catalog: createLocationCatalog(options.catalog ?? catalogInput()) }
  const authorityFor = (s: { character: CharacterCycleState; site: { nodeId: string } }): LocationAuthority => {
    if (s.character.clock.kind !== 'active') throw new Error('fixture requires active clock')
    const cycle: CycleAuthority = { identity: s.character.identity, revision: s.character.revision, cycle: s.character.cycle,
      lifecycle: s.character.clock, rest: dependencies.catalog.data.nodes.find((n) => n.id === s.site.nodeId)!.rest,
      stableContext: 'stable', normalReturn: null, departure: null }
    return { cycle, mission: lifecycle }
  }
  const state = establishResidenceLocation({ character, carried: { backpack: { width: 4, height: 4, items: [], placements: [] },
    equipment: { weapon: null, armor: null, utility: null }, quickSlots: { slots: [null, null] } }, itemStates: { states: [] } },
  authorityFor({ character, site: { nodeId: dependencies.catalog.data.entryNodeId } }), dependencies)
  return { state, dependencies, authorityFor, lifecycle, scope }
}
export const binding = (s: ResidenceLocationSnapshot) => ({ binding: s.site.binding, expectedRevision: s.character.revision })
export const move = (f: ReturnType<typeof fixture>, s: ResidenceLocationSnapshot, edgeId: string) =>
  planResidenceMove(s, { ...binding(s), kind: 'move', edgeId }, f.authorityFor(s), f.dependencies)
export const reveal = (f: ReturnType<typeof fixture>, s: ResidenceLocationSnapshot, sourceId: string) =>
  planResidenceSourceReveal(s, { ...binding(s), kind: 'reveal', sourceId }, f.authorityFor(s), f.dependencies)
