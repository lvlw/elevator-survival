import { describe, expect, it } from 'vitest'
import { type FrozenRuleConfig } from '../config'
import {
  activatePainkiller,
  addMinorContusion,
  createInitialPlayerCondition,
  createPlayerCondition,
  startBleeding,
} from '../condition'
import {
  createEmptyEquipment,
  createEquipmentProfileCatalog,
} from '../equipment'
import { createBackpackSnapshot, createItemCatalog } from '../inventory'
import {
  createFullItemState,
  createItemResourceCatalog,
} from '../item-state'
import {
  createEmptyQuickSlots,
  createQuickSlotProfileCatalog,
} from '../quick-slot'
import { createSceneGraph } from '../scene-graph'
import {
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  createMoveThroughSceneEdgeCommand,
  previewSceneMoveCommand,
  resolveSceneMoveCommand,
  SceneExplorationError,
} from '.'

const config = {
  combat: { player: { maxHealth: 12 } },
  backpack: {
    width: 6,
    height: 4,
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
    { id: 'isolated', name: '孤立点', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'safe-middle', from: 'safe', to: 'middle', baseTravelTime: 10, bidirectional: true },
    { id: 'middle-far', from: 'middle', to: 'far', baseTravelTime: 20, bidirectional: true },
    { id: 'one-way', from: 'middle', to: 'isolated', baseTravelTime: 10, bidirectional: false },
  ],
})

describe('strict movement command and snapshot boundaries', () => {
  it('normalizes only the exact one-field movement command without mutating input', () => {
    const input = { edgeId: 'safe-middle' }
    const before = structuredClone(input)
    const command = createMoveThroughSceneEdgeCommand(input)
    expect(command).toEqual(input)
    expect(command).not.toBe(input)
    expect(Object.isFrozen(command)).toBe(true)
    expect(input).toEqual(before)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it.each([
    null,
    [],
    Object.assign(new Date(0), { edgeId: 'safe-middle' }),
    { edgeId: '' },
    { kind: 'move', edgeId: 'safe-middle' },
    { edgeId: 'safe-middle', toNodeId: 'middle' },
    { edgeId: 'safe-middle', timeCost: 1 },
  ])('rejects malformed movement command %#', (input) => {
    expect(() => createMoveThroughSceneEdgeCommand(input as never)).toThrowError(
      expect.objectContaining({ code: 'INVALID_MOVE_COMMAND' }),
    )
  })

  it('uses the same strict command boundary for preview and resolution', () => {
    const invalid = { edgeId: 'safe-middle', toNodeId: 'middle' }
    expect(previewSceneMoveCommand(snapshot(), invalid as never, dependencies))
      .toEqual({ canExecute: false, rejectionCode: 'INVALID_MOVE_COMMAND' })
    expect(() => resolveSceneMoveCommand(snapshot(), invalid as never, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_MOVE_COMMAND' }))
  })

  it('requires all hidden state fields and rejects unknown top-level fields on restore', () => {
    const complete = snapshot()
    expect(createSceneExplorationSnapshot(complete, dependencies)).toEqual(complete)
    for (const field of ['alertState', 'sceneItems', 'combatState', 'dailyMedicalUsage'] as const) {
      const incomplete = { ...complete } as Record<string, unknown>
      delete incomplete[field]
      expect(() => createSceneExplorationSnapshot(incomplete as never, dependencies))
        .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    }
    expect(() => createSceneExplorationSnapshot(
      { ...complete, unknown: true } as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('keeps defaults exclusive to the initial constructor and deeply freezes output', () => {
    const initial = snapshot()
    expect(initial).toMatchObject({
      alertState: 'unalerted',
      combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
    })
    expect(Object.isFrozen(initial)).toBe(true)
    expect(Object.isFrozen(initial.sceneItems)).toBe(true)
    expect(Object.isFrozen(initial.combatState)).toBe(true)
    expect(Object.isFrozen(initial.dailyMedicalUsage)).toBe(true)
  })

  it('requires a supplied daily medical state when a new scene is created', () => {
    const incomplete = { ...snapshot() } as Record<string, unknown>
    delete incomplete.dailyMedicalUsage
    expect(() => createInitialSceneExplorationSnapshot(
      incomplete as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })
})
const catalog = createItemCatalog([
  { id: 'weight', name: '负重', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'stackable', maxQuantity: 30 } },
])
const equipmentCatalog = createEquipmentProfileCatalog(
  [{ definitionId: 'weight', kind: 'not-equippable' }],
  catalog.definitionIds,
)
const quickSlotCatalog = createQuickSlotProfileCatalog(
  [{ definitionId: 'weight', kind: 'not-eligible' }],
  catalog.definitionIds,
)
const itemResourceCatalog = createItemResourceCatalog(
  [{ definitionId: 'weight', kind: 'none' }],
  catalog.definitionIds,
)
const equipment = createEmptyEquipment(
  catalog,
  equipmentCatalog,
)
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
const sceneInstanceId = 'core-scene'
const searchState = {
  sceneInstanceId,
  nodeStates: graph.nodes.map((node) => ({
    kind: 'not-available' as const,
    nodeId: node.id,
  })),
}
const backpack = (weight = 0) =>
  createBackpackSnapshot(
    weight === 0
      ? { width: 6, height: 4, items: [], placements: [] }
      : {
          width: 6,
          height: 4,
          items: [{ instanceId: 'load', definitionId: 'weight', quantity: weight }],
          placements: [{ instanceId: 'load', x: 0, y: 0, rotated: false }],
        },
    catalog,
  )
const condition = (
  currentHealth = 12,
  bleeding = false,
  minorContusions = 0,
  painkillerActive = false,
) =>
  createPlayerCondition(
    {
      currentHealth,
      bleeding,
      openWounds: bleeding
          ? [{ id: 'fixture-wound', kind: 'laceration', treatment: 'untreated' }]
          : [],
        pendingInfectionExposures: 0,
      minorContusions,
      painkillerActive,
    },
    config.combat.player,
  )
const snapshot = (
  node = 'safe',
  remainingTime = 100,
  weight = 0,
  playerCondition = condition(),
  enabledEdgeIds = ['safe-middle', 'middle-far'],
) =>
  createInitialSceneExplorationSnapshot(
    {
      sceneInstanceId,
      searchState,
      currentNodeId: node,
      remainingTime,
      enabledEdgeIds,
      backpack: backpack(weight),
      equipment,
      quickSlots,
      itemStates: {
        states:
          weight === 0
            ? []
            : [
                createFullItemState(
                  { instanceId: 'load', definitionId: 'weight' },
                  itemResourceCatalog,
                ),
              ],
      },
      condition: playerCondition,
      dailyMedicalUsage: { disinfectantUsesToday: 0 },
      runIntelLog: { intelIds: [] },
    },
    dependencies,
  )

describe('scene exploration snapshot', () => {
  it('normalizes enabled edges and deeply freezes nested state without mutation', () => {
    const enabled = ['middle-far', 'safe-middle']
    const result = snapshot('safe', 100, 0, condition(), enabled)
    expect(result.enabledEdgeIds).toEqual(['middle-far', 'safe-middle'])
    expect(enabled).toEqual(['middle-far', 'safe-middle'])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.enabledEdgeIds)).toBe(true)
    expect(Object.isFrozen(result.condition)).toBe(true)
    expect(Object.isFrozen(result.backpack)).toBe(true)
  })

  it.each([
    [{ currentNodeId: 'missing' }, 'INVALID_CURRENT_NODE'],
    [{ remainingTime: -1 }, 'INVALID_REMAINING_TIME'],
    [{ enabledEdgeIds: ['safe-middle', 'safe-middle'] }, 'DUPLICATE_ENABLED_EDGE'],
  ])('rejects invalid snapshot %#', (change, code) => {
    expect(() =>
      createInitialSceneExplorationSnapshot(
        {
          sceneInstanceId,
          searchState,
          currentNodeId: 'safe',
          remainingTime: 10,
          enabledEdgeIds: ['safe-middle'],
          backpack: backpack(),
          equipment,
          quickSlots,
          itemStates: { states: [] },
          condition: condition(),
          dailyMedicalUsage: { disinfectantUsesToday: 0 },
          runIntelLog: { intelIds: [] },
          ...change,
        },
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code }))
  })

  it('rejects active zero health and dead positive health', () => {
    expect(() => snapshot('safe', 10, 0, condition(0))).toThrowError(
      expect.objectContaining({ code: 'STATUS_HEALTH_CONFLICT' }),
    )
    expect(() =>
      createSceneExplorationSnapshot(
        { ...snapshot(), status: 'dead', condition: condition(1) },
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'STATUS_HEALTH_CONFLICT' }))
  })

  it('binds normalized backpack dimensions to the rule configuration without mutation', () => {
    const input = {
      ...snapshot(),
      enabledEdgeIds: ['safe-middle'],
    }
    const before = structuredClone(input)
    const result = createSceneExplorationSnapshot(input, dependencies)
    expect(result.backpack).toMatchObject({ width: 6, height: 4 })
    expect(input).toEqual(before)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it.each([
    [7, 4],
    [6, 5],
    [100, 100],
  ])('rejects a valid %ix%i backpack from another rule configuration', (width, height) => {
    const mismatched = createBackpackSnapshot(
      { width, height, items: [], placements: [] },
      catalog,
    )
    expect(() =>
      createSceneExplorationSnapshot(
        { ...snapshot(), backpack: mismatched },
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'BACKPACK_CONFIG_MISMATCH' }),
    )
  })

  it('continues to reject a quick-slot count mismatch separately', () => {
    expect(() =>
      createSceneExplorationSnapshot(
        { ...snapshot(), quickSlots: { slots: [null] } },
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })
})

describe('scene move evaluation', () => {
  it('moves by edge id and returns deterministic structured effects', () => {
    const input = snapshot()
    const preview = previewSceneMoveCommand(input, { edgeId: 'safe-middle' }, dependencies)
    const resolved = resolveSceneMoveCommand(input, { edgeId: 'safe-middle' }, dependencies)
    expect(preview).toEqual({ canExecute: true, result: resolved.result })
    expect(resolved.snapshot).toMatchObject({
      status: 'active',
      currentNodeId: 'middle',
      remainingTime: 90,
    })
    expect(resolved.result.effects.map((effect) => effect.kind)).toEqual([
      'scene-node-changed',
      'scene-time-resolved',
    ])
    expect(input.currentNodeId).toBe('safe')
    expect(Object.isFrozen(resolved.result.effects)).toBe(true)
  })

  it.each([
    [0, false, false, 10],
    [17, false, false, 11],
    [0, true, false, 11],
    [17, true, false, 13],
    [17, true, true, 11],
    [25, false, false, 13],
  ])('calculates weight %i contusion=%s analgesia=%s as %i', (weight, contused, analgesia, expected) => {
    let state = createInitialPlayerCondition(config.combat.player)
    if (contused) state = addMinorContusion(state)
    if (analgesia) state = activatePainkiller(state)
    expect(resolveSceneMoveCommand(snapshot('safe', 100, weight, state), { edgeId: 'safe-middle' }, dependencies).result.finalMovementTime).toBe(expected)
  })

  it('applies multiple contusions once', () => {
    const state = addMinorContusion(addMinorContusion(condition()))
    expect(resolveSceneMoveCommand(snapshot('safe', 100, 0, state), { edgeId: 'safe-middle' }, dependencies).result.finalMovementTime).toBe(11)
  })

  it('calculates return from the destination and safely returns when moving to safety', () => {
    const outward = resolveSceneMoveCommand(snapshot(), { edgeId: 'safe-middle' }, dependencies)
    expect(outward.result.returnRoute).toMatchObject({ startNodeId: 'middle', baseReturnTime: 10 })
    const returning = resolveSceneMoveCommand(snapshot('middle'), { edgeId: 'safe-middle' }, dependencies)
    expect(returning.snapshot).toMatchObject({ status: 'safe-returned', currentNodeId: 'safe' })
    expect(returning.result.returnRoute).toMatchObject({ baseReturnTime: 0, estimatedReturnTime: 0, edgeIds: [] })
  })

  it('allows overtime, moves first, then forces return with ordered losses', () => {
    const result = resolveSceneMoveCommand(
      snapshot('middle', 5, 0, condition(12, true)),
      { edgeId: 'middle-far' },
      dependencies,
    )
    expect(result.result.sceneOutcome.overtimeDebt).toBe(15)
    expect(result.snapshot).toMatchObject({ status: 'forced-returned', currentNodeId: 'safe', remainingTime: 0 })
    expect(result.result.effects.map((effect) => effect.kind)).toEqual([
      'scene-node-changed',
      'scene-time-resolved',
      'health-lost',
      'health-lost',
      'health-lost',
      'scene-node-changed',
      'scene-status-changed',
    ])
    expect(result.result.effects.filter((effect) => effect.kind === 'health-lost').map((effect) => effect.source)).toEqual([
      'post-action-bleeding',
      'forced-return-base',
      'forced-return-bleeding',
    ])
  })

  it('makes bleeding death terminal after movement and before forced return', () => {
    const result = resolveSceneMoveCommand(
      snapshot('middle', 5, 0, condition(1, true)),
      { edgeId: 'middle-far' },
      dependencies,
    )
    expect(result.snapshot).toMatchObject({ status: 'dead', currentNodeId: 'far' })
    expect(result.result.effects.some((effect) => effect.kind === 'scene-node-changed' && effect.reason === 'forced-return')).toBe(false)
    expect(result.result.effects.at(-1)).toMatchObject({ kind: 'scene-status-changed', toStatus: 'dead' })
  })

  it.each([
    ['', 'INVALID_MOVE_COMMAND'],
    ['missing', 'UNKNOWN_EDGE'],
    ['one-way', 'EDGE_NOT_ENABLED'],
  ])('rejects edge %s as %s without mutation', (edgeId, code) => {
    const input = snapshot()
    expect(previewSceneMoveCommand(input, { edgeId }, dependencies)).toEqual({
      canExecute: false,
      rejectionCode: code,
    })
    expect(input.currentNodeId).toBe('safe')
  })

  it('rejects reverse one-way traversal, disconnected edge, no return route, and cannot carry', () => {
    expect(previewSceneMoveCommand(snapshot('isolated', 10, 0, condition(), ['one-way']), { edgeId: 'one-way' }, dependencies)).toMatchObject({ canExecute: false, rejectionCode: 'EDGE_NOT_CONNECTED' })
    expect(previewSceneMoveCommand(snapshot('safe'), { edgeId: 'middle-far' }, dependencies)).toMatchObject({ canExecute: false, rejectionCode: 'EDGE_NOT_CONNECTED' })
    expect(previewSceneMoveCommand(snapshot('middle', 10, 0, condition(), ['one-way']), { edgeId: 'one-way' }, dependencies)).toMatchObject({ canExecute: false, rejectionCode: 'NO_RETURN_ROUTE' })
    expect(previewSceneMoveCommand(snapshot('safe', 10, 29), { edgeId: 'safe-middle' }, dependencies)).toMatchObject({ canExecute: false, rejectionCode: 'CANNOT_CARRY' })
  })

  it.each(['safe-returned', 'forced-returned', 'dead'] as const)('rejects movement after %s', (status) => {
    const currentHealth = status === 'dead' ? 0 : 12
    const terminal = createSceneExplorationSnapshot(
      { ...snapshot(), status, condition: condition(currentHealth) },
      dependencies,
    )
    expect(previewSceneMoveCommand(terminal, { edgeId: 'safe-middle' }, dependencies)).toMatchObject({ canExecute: false, rejectionCode: 'SCENE_NOT_ACTIVE' })
  })

  it('rejects zero remaining time and throws from formal resolution', () => {
    const zero = snapshot('safe', 0)
    expect(previewSceneMoveCommand(zero, { edgeId: 'safe-middle' }, dependencies)).toMatchObject({ canExecute: false, rejectionCode: 'SCENE_TIME_EXHAUSTED' })
    expect(() => resolveSceneMoveCommand(zero, { edgeId: 'safe-middle' }, dependencies)).toThrowError(SceneExplorationError)
  })
})
