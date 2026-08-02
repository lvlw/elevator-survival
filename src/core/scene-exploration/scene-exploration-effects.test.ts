import { describe, expect, it } from 'vitest'
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
    postActionBleedingDamage: 1,
    travelTimeModifiers: { minorContusionTimeIncreasePercent: 10 },
  },
  medical: {
    painkiller: { suppressesMinorContusionMovementPenalty: true },
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
) =>
  createInitialSceneExplorationSnapshot(
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
    },
    dependencies,
  )

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
      config.combat.player,
    )
    const second = applySceneExplorationEffects(
      start,
      resolved.result.effects,
      config.combat.player,
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
        config.combat.player,
      ),
    ).toEqual(bleeding.snapshot)

    const safeStart = initial('middle')
    const safe = resolve(safeStart)
    expect(
      applySceneExplorationEffects(
        safeStart,
        safe.result.effects,
        config.combat.player,
      ).status,
    ).toBe('safe-returned')

    const forcedStart = initial('middle', 5, 12, true)
    const forced = resolve(forcedStart, 'middle-far')
    expect(
      applySceneExplorationEffects(
        forcedStart,
        forced.result.effects,
        config.combat.player,
      ),
    ).toEqual(forced.snapshot)

    const deathStart = initial('middle', 5, 1, true)
    const death = resolve(deathStart, 'middle-far')
    const replayedDeath = applySceneExplorationEffects(
      deathStart,
      death.result.effects,
      config.combat.player,
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

  it('requires no graph, inventory catalog, load rules, or route calculation to replay', () => {
    const start = initial()
    const effects = resolve(start).result.effects
    expect(
      applySceneExplorationEffects(start, effects, config.combat.player),
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
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'UNKNOWN_EFFECT' }))
  })

  it('rejects node, time, health, result, and status before-value mismatches', () => {
    const start = initial('middle', 5, 12, true)
    const effects = resolve(start, 'middle-far').result.effects
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 0, { fromNodeId: 'safe' }),
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_NODE_MISMATCH' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 1, { remainingTimeBefore: 6 }),
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_TIME_MISMATCH' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 2, { healthBefore: 11 }),
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_HEALTH_MISMATCH' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, 2, { actualLoss: 2 }),
        config.combat.player,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'EFFECT_HEALTH_RESULT_MISMATCH' }),
    )
    expect(() =>
      applySceneExplorationEffects(
        start,
        replaceEffect(effects, effects.length - 1, {
          fromStatus: 'safe-returned',
        }),
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_STATUS_MISMATCH' }))
  })

  it('rejects time before movement, duplicate time, and reordered health losses', () => {
    const normal = resolve(initial()).result.effects
    expect(() =>
      applySceneExplorationEffects(
        initial(),
        [normal[1], normal[0]],
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }))
    expect(() =>
      applySceneExplorationEffects(
        initial(),
        [normal[0], normal[1], normal[1]],
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }))

    const forcedStart = initial('middle', 5, 12, true)
    const forced = resolve(forcedStart, 'middle-far').result.effects
    expect(() =>
      applySceneExplorationEffects(
        forcedStart,
        [forced[0], forced[1], forced[3], forced[2], ...forced.slice(4)],
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }))
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
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }))

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
        config.combat.player,
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
        config.combat.player,
      ),
    ).toThrowError(SceneExplorationError)
    expect(start).toEqual(before)
  })
})
