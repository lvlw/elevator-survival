import { describe, expect, it } from 'vitest'
import {
  createFullySurfaceVisibleNavigationCatalog,
  createTestNavigationKnowledgeAlongPath,
} from '../../test-support/scene-navigation'
import { type FrozenRuleConfig } from '../config'
import { createPlayerCondition } from '../condition'
import {
  createEmptyEquipment,
  createEquipmentProfileCatalog,
} from '../equipment'
import { createBackpackSnapshot, createItemCatalog } from '../inventory'
import { createItemResourceCatalog } from '../item-state'
import {
  createEmptyQuickSlots,
  createQuickSlotProfileCatalog,
} from '../quick-slot'
import { createSceneGraph } from '../scene-graph'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  resolveSceneMoveCommand,
  SceneExplorationError,
  type SceneExplorationEffect,
} from '.'

const config = {
  combat: { player: { maxHealth: 12 } },
  backpack: {
    width: 1,
    height: 1,
    quickSlotCount: 2,
    weightBands: {
      normal: { min: 0, max: 16, timeIncreasePercent: 0 },
      loaded: { min: 17, max: 24, timeIncreasePercent: 10 },
      overloaded: { min: 25, max: 28, timeIncreasePercent: 25 },
      cannotCarryFrom: 29,
    },
  },
  scene: {
    totalTime: 100,
    postActionBleedingDamage: 1,
    travelTimeModifiers: { minorContusionTimeIncreasePercent: 10 },
  },
  medical: {
    painkiller: { suppressesMinorContusionMovementPenalty: true },
    disinfectant: { maxUsesPerDay: 1 },
  },
  forcedReturn: {
    effectiveTimePerBaseDamage: 20,
    baseDamageCap: 4,
    bleedingExtraDamage: 1,
    bleedingExtraDamageCountsTowardBaseCap: false,
  },
} as unknown as FrozenRuleConfig
const graph = createSceneGraph({
  nodes: [
    { id: 'safe', name: '安全点', isReturnSafetyNode: true },
    { id: 'middle', name: '中点', isReturnSafetyNode: false },
    { id: 'far', name: '远点', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'safe-middle', from: 'safe', to: 'middle', baseTravelTime: 10, bidirectional: true },
    { id: 'middle-far', from: 'middle', to: 'far', baseTravelTime: 20, bidirectional: true },
  ],
})
const catalog = createItemCatalog([])
const equipmentCatalog = createEquipmentProfileCatalog([], [])
const quickSlotCatalog = createQuickSlotProfileCatalog([], [])
const itemResourceCatalog = createItemResourceCatalog([], [])
const equipment = createEmptyEquipment(catalog, equipmentCatalog)
const quickSlots = createEmptyQuickSlots(
  config.backpack.quickSlotCount,
  catalog,
  quickSlotCatalog,
)
const dependencies = {
  graph,
  navigationCatalog: createFullySurfaceVisibleNavigationCatalog(graph),
  physicalCatalog: catalog,
  equipmentCatalog,
  quickSlotCatalog,
  itemResourceCatalog,
  config,
}
const sceneInstanceId = 'effect-scene'
const searchState = {
  sceneInstanceId,
  nodeStates: graph.nodes.map((node) => ({
    kind: 'not-available' as const,
    nodeId: node.id,
  })),
}
const initial = (
  node = 'safe',
  remainingTime = 100,
  health = 12,
  bleeding = false,
) => {
  const snapshot = createInitialSceneExplorationSnapshot(
    {
      sceneInstanceId,
      searchState,
      currentNodeId: node,
      remainingTime,
      enabledEdgeIds: ['safe-middle', 'middle-far'],
      backpack: createBackpackSnapshot(
        { width: 1, height: 1, items: [], placements: [] },
        catalog,
      ),
      equipment,
      quickSlots,
      itemStates: { states: [] },
      condition: createPlayerCondition(
        {
          currentHealth: health,
          bleeding,
          openWounds: bleeding
          ? [{ id: 'fixture-wound', kind: 'laceration', treatment: 'untreated' }]
          : [],
        pendingInfectionExposures: 0,
          minorContusions: 0,
          painkillerActive: false,
        },
        config.combat.player,
      ),
      dailyMedicalUsage: { disinfectantUsesToday: 0 },
      runIntelLog: { intelIds: [] },
    },
    dependencies,
  )
  return node === 'safe'
    ? snapshot
    : createSceneExplorationSnapshot({
        ...snapshot,
        navigationKnowledge: createTestNavigationKnowledgeAlongPath(
          ['safe', node],
          graph,
          dependencies.navigationCatalog,
        ),
      }, dependencies)
}

const resolve = (
  start = initial(),
  edgeId = 'safe-middle',
) => resolveSceneMoveCommand(start, { edgeId }, dependencies)

function replaceEffect(
  effects: readonly SceneExplorationEffect[],
  index: number,
  changes: Record<string, unknown>,
): readonly SceneExplorationEffect[] {
  return effects.map((effect, candidate) =>
    candidate === index ? { ...effect, ...changes } : effect,
  ) as readonly SceneExplorationEffect[]
}

describe('scene exploration Effect replay', () => {
  it('rebuilds normal movement exactly and deterministically', () => {
    const start = initial()
    const resolved = resolve(start)
    const first = applySceneExplorationEffects(
      start,
      resolved.result.effects,
      dependencies,
    )
    const second = applySceneExplorationEffects(
      start,
      resolved.result.effects,
      dependencies,
    )
    expect(first).toEqual(resolved.snapshot)
    expect(second).toEqual(first)
    expect(start.currentNodeId).toBe('safe')
    expect(Object.isFrozen(first)).toBe(true)
  })

  it('rebuilds bleeding, safe-return, forced-return and death outcomes', () => {
    const bleedingStart = initial('safe', 100, 2, true)
    const bleeding = resolve(bleedingStart)
    expect(
      applySceneExplorationEffects(
        bleedingStart,
        bleeding.result.effects,
        dependencies,
      ),
    ).toEqual(bleeding.snapshot)

    const safeStart = initial('middle')
    const safe = resolve(safeStart)
    expect(
      applySceneExplorationEffects(
        safeStart,
        safe.result.effects,
        dependencies,
      ).status,
    ).toBe('safe-returned')

    const forcedStart = initial('middle', 5, 12, true)
    const forced = resolve(forcedStart, 'middle-far')
    expect(
      applySceneExplorationEffects(
        forcedStart,
        forced.result.effects,
        dependencies,
      ),
    ).toEqual(forced.snapshot)

    const deathStart = initial('middle', 5, 1, true)
    const death = resolve(deathStart, 'middle-far')
    const replayedDeath = applySceneExplorationEffects(
      deathStart,
      death.result.effects,
      dependencies,
    )
    expect(replayedDeath).toMatchObject({ status: 'dead', currentNodeId: 'far' })
    expect(
      death.result.effects.some(
        (effect) =>
          effect.kind === 'scene-node-changed' &&
          effect.reason === 'forced-return',
      ),
    ).toBe(false)
  })

  it('requires full dependencies to regenerate and verify a movement plan', () => {
    const start = initial()
    const effects = resolve(start).result.effects
    expect(() =>
      applySceneExplorationEffects(start, effects, config.combat.player),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
    expect(
      applySceneExplorationEffects(start, effects, dependencies),
    ).toMatchObject({ currentNodeId: 'middle', remainingTime: 90 })
  })
})

describe('scene exploration Effect tamper detection', () => {
  it('rejects empty and unknown Effect arrays', () => {
    expect(() =>
      applySceneExplorationEffects(initial(), [], config.combat.player),
    ).toThrowError(expect.objectContaining({ code: 'EMPTY_EFFECTS' }))
    expect(() =>
      applySceneExplorationEffects(
        initial(),
        [{ kind: 'unknown' }] as unknown as SceneExplorationEffect[],
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'UNKNOWN_EFFECT' }))
  })

  it('rejects a forged first-arrival navigation delta atomically', () => {
    const start = initial()
    const effects = structuredClone(resolve(start).result.effects)
    const navigation = effects.find(
      (effect) => effect.kind === 'scene-navigation-knowledge-updated',
    )
    if (navigation?.kind !== 'scene-navigation-knowledge-updated') {
      throw new Error('expected navigation Effect')
    }
    Object.assign(navigation, { addedKnownEdgeIds: [] })
    expect(() => applySceneExplorationEffects(start, effects, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
    expect(start.navigationKnowledge).toEqual({
      discoveredNodeIds: ['middle', 'safe'],
      visitedNodeIds: ['safe'],
      knownEdgeIds: ['safe-middle'],
    })
  })

  it('rejects node, time, health, result, and status before-value mismatches', () => {
    const start = initial('middle', 5, 12, true)
    const effects = resolve(start, 'middle-far').result.effects
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 0, { fromNodeId: 'safe' }),
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 1, { remainingTimeBefore: 6 }),
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 2, { healthBefore: 11 }),
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 2, { actualLoss: 2 }),
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }),
    )
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, effects.length - 1, {
          fromStatus: 'safe-returned',
        }),
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
  })

  it('rejects time before movement, duplicate time, and reordered health losses', () => {
    const normal = resolve(initial()).result.effects
    expect(() =>
      applySceneExplorationEffects(
        initial(),
        [normal[2], normal[0], normal[1]],
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }))
    expect(() =>
      applySceneExplorationEffects(
        initial(),
        [normal[0], normal[1], normal[2], normal[2]],
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))

    const forcedStart = initial('middle', 5, 12, true)
    const forced = resolve(forcedStart, 'middle-far').result.effects
    expect(() =>
      applySceneExplorationEffects(
        forcedStart,
        [forced[0], forced[1], forced[3], forced[2], ...forced.slice(4)],
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
  })

  it('rejects node changes after dead and forced status without a return node', () => {
    const deathStart = initial('middle', 5, 1, true)
    const death = resolve(deathStart, 'middle-far').result.effects
    const extraNode = {
      kind: 'scene-node-changed',
      reason: 'forced-return',
      fromNodeId: 'far',
      toNodeId: 'safe',
      routeNodeIds: ['far', 'middle', 'safe'],
      routeEdgeIds: ['middle-far', 'safe-middle'],
    } as const
    expect(() =>
      applySceneExplorationEffects(
        deathStart,
        [...death, extraNode],
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))

    const forcedStart = initial('middle', 5)
    const forced = resolve(forcedStart, 'middle-far').result.effects
    const withoutReturnNode = forced.filter(
      (effect) =>
        !(
          effect.kind === 'scene-node-changed' &&
          effect.reason === 'forced-return'
        ),
    )
    expect(() =>
      applySceneExplorationEffects(
        forcedStart,
        withoutReturnNode,
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }),
    )
  })

  it('fails atomically without modifying the initial snapshot', () => {
    const start = initial()
    const before = structuredClone(start)
    const effects = resolve(start).result.effects
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 1, { remainingTimeBefore: 999 }),
        dependencies,
      ),
    ).toThrowError(SceneExplorationError)
    expect(start).toEqual(before)
  })

  it('rejects complete-plan movement tampering atomically', () => {
    const start = initial()
    const normal = resolve(start).result.effects
    const normalMutations: ((effects: SceneExplorationEffect[]) => void)[] = [
      (effects) => Object.assign(effects[0], { edgeId: 'middle-far' }),
      (effects) => Object.assign(effects[0], { fromNodeId: 'far' }),
      (effects) => Object.assign(effects[0], { toNodeId: 'far' }),
      (effects) => Object.assign(effects[1], { actionTimeCost: 1 }),
      (effects) => Object.assign(effects[1], { remainingTimeBefore: 99 }),
      (effects) => Object.assign(effects[1], { remainingTimeAfter: 99 }),
      (effects) => Object.assign(effects[1], { overtimeDebt: 1 }),
      (effects) => effects.push({
        kind: 'health-lost',
        source: 'post-action-bleeding',
        requestedLoss: 1,
        actualLoss: 1,
        healthBefore: 12,
        healthAfter: 11,
      }),
      (effects) => effects.splice(1, 1),
    ]
    for (const mutate of normalMutations) {
      const effects = structuredClone(normal) as SceneExplorationEffect[]
      const before = structuredClone(start)
      mutate(effects)
      expect(() => applySceneExplorationEffects(start, effects, dependencies))
        .toThrowError(SceneExplorationError)
      expect(start).toEqual(before)
    }

    const forcedStart = initial('middle', 5, 12, true)
    const forced = resolve(forcedStart, 'middle-far').result.effects
    const forcedMutations: ((effects: SceneExplorationEffect[]) => void)[] = [
      (effects) => effects.splice(effects.findIndex(
        (effect) => effect.kind === 'health-lost' && effect.source === 'post-action-bleeding',
      ), 1),
      (effects) => effects.splice(effects.findIndex(
        (effect) => effect.kind === 'scene-node-changed' && effect.reason === 'forced-return',
      ), 1),
      (effects) => Object.assign(effects.find(
        (effect) => effect.kind === 'scene-node-changed' && effect.reason === 'forced-return',
      )!, { toNodeId: 'middle' }),
      (effects) => Object.assign(effects.find(
        (effect) => effect.kind === 'scene-node-changed' && effect.reason === 'forced-return',
      )!, { routeEdgeIds: [] }),
      (effects) => effects.splice(effects.findIndex(
        (effect) => effect.kind === 'scene-status-changed',
      ), 1),
    ]
    for (const mutate of forcedMutations) {
      const effects = structuredClone(forced) as SceneExplorationEffect[]
      const before = structuredClone(forcedStart)
      mutate(effects)
      expect(() => applySceneExplorationEffects(forcedStart, effects, dependencies))
        .toThrowError(SceneExplorationError)
      expect(forcedStart).toEqual(before)
    }
  })
})
