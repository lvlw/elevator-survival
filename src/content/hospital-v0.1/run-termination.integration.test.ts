import { describe, expect, it } from 'vitest'
import { createPlayerCondition, type OpenWoundSnapshot } from '../../core/condition'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import { createEmptyEquipment } from '../../core/equipment'
import {
  createBackpackSnapshot,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import {
  resolveRunReturn,
  type RunReturnDependencies,
} from '../../core/run-return'
import {
  applyRunFailureEffects,
  bindRunSceneTerminationContextToScene,
  buildRunFailureTransitionPlan,
  projectRunSceneTerminationContextFromCurrentDayHub,
  resolveRunFailure,
  restoreRunFailureSnapshot,
  restoreRunSceneTerminationContext,
  type RunFailureEffect,
  type RunFailureSource,
  type RunTerminationDependencies,
} from '../../core/run-termination'
import {
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  getScenePhysicalItemInstanceIds,
  resolveSceneCombatPlayerAction,
  resolveSceneMoveCommand,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  createHospitalSceneCombatDependencies,
  hospitalHubSurvivalContentBindings,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneEdgeAccessCatalog,
  hospitalSceneMedicalContentBindings,
  hospitalSceneTaskEventCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
  hospitalWorldThreatCatalog,
} from '..'

const sceneInstanceId = 'hospital-run-failure-scene'
const runSeed = 'hospital-run-failure-seed'
const sceneDependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  config,
  edgeAccessCatalog: hospitalSceneEdgeAccessCatalog,
  sceneCombat: createHospitalSceneCombatDependencies(runSeed, sceneInstanceId),
  taskEventCatalog: hospitalSceneTaskEventCatalog,
}
const returnDependencies: RunReturnDependencies = {
  scene: sceneDependencies,
  lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
}
const currentDayHubDependencies = {
  returnDependencies,
  medicalBindings: hospitalSceneMedicalContentBindings,
  survivalBindings: hospitalHubSurvivalContentBindings,
  worldThreatCatalog: hospitalWorldThreatCatalog,
}
const dependencies: RunTerminationDependencies = {
  currentDayHub: currentDayHubDependencies,
  scene: sceneDependencies,
}

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

interface HubOptions {
  readonly day?: number
  readonly health?: number
  readonly bleeding?: boolean
  readonly wounds?: readonly OpenWoundSnapshot[]
  readonly exposures?: number
  readonly progress?: number
  readonly satiety?: number
  readonly warehouse?: readonly ItemInstance[]
  readonly taskStorage?: readonly ItemInstance[]
}

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const warehouse = options.warehouse ?? [
    item('stored-ration', HOSPITAL_ITEM_IDS.ration),
  ]
  const taskStorage = options.taskStorage ?? [
    item('stored-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase),
  ]
  const storedItems = [...warehouse, ...taskStorage]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: taskStorage },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [],
      placements: [],
    }, hospitalItemCatalog),
    equipment: createEmptyEquipment(
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    ),
    quickSlots: createQuickSlotSnapshot(
      [null, null],
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: {
      states: storedItems.map((storedItem) =>
        createFullItemState(storedItem, hospitalItemResourceCatalog),
      ),
    },
  }, {
    physicalCatalog: hospitalItemCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
    quickSlotCatalog: hospitalItemQuickSlotCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
    backpackRules: config.backpack,
  })
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-failure-golden',
        seed: runSeed,
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: options.day ?? 3,
      sceneInstanceId: 'previous-returned-scene',
    },
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: options.health ?? config.combat.player.maxHealth,
      bleeding: options.bleeding ?? false,
      openWounds: options.wounds ?? [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: options.exposures ?? 0,
    }, config.combat.player),
    runIntelLog: { intelIds: ['intel-before-scene'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points,
    },
    worldThreat: {
      definitionId: config.worldThreat.definitionId,
      progress: options.progress ?? 30,
    },
    satiety: { current: options.satiety ?? 4 },
    returnLedger: { sceneInstanceIds: ['previous-returned-scene'] },
  }, currentDayHubDependencies)
}

interface SceneOptions {
  readonly currentNodeId?: string
  readonly health?: number
  readonly bleeding?: boolean
  readonly remainingTime?: number
  readonly backpackItems?: readonly ItemInstance[]
  readonly runIntelIds?: readonly string[]
  readonly disinfectantUsesToday?: number
}

function scene(options: SceneOptions = {}): SceneExplorationSnapshot {
  const pipe = item('termination-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const backpackItems = options.backpackItems ?? [
    item('carried-bandage', HOSPITAL_ITEM_IDS.bandage),
    item('carried-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard),
    item('carried-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase),
  ]
  const placements = backpackItems.map(({ instanceId }, index) => ({
    instanceId,
    x: index === 2 ? 2 : index,
    y: 0,
    rotated: false,
  }))
  return createInitialSceneExplorationSnapshot({
    sceneInstanceId,
    searchState: createSceneSearchState({
      runSeed,
      sceneInstanceId,
      graph: hospitalSliceV01SceneGraph,
      searchCatalog: hospitalMainSearchCatalog,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    currentNodeId: options.currentNodeId ?? HOSPITAL_NODE_IDS.emergencyHall,
    remainingTime: options.remainingTime ?? config.scene.totalTime,
    enabledEdgeIds: [...new Set([
      ...HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
      ...HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
    ])],
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements,
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: null, utility: null },
    quickSlots: createQuickSlotSnapshot(
      [null, null],
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: {
      states: [
        createItemState({
          ...pipe,
          resource: { kind: 'durability', current: 6 },
        }, hospitalItemResourceCatalog),
        ...backpackItems.map((carried) =>
          createFullItemState(carried, hospitalItemResourceCatalog),
        ),
      ],
    },
    condition: createPlayerCondition({
      currentHealth: options.health ?? config.combat.player.maxHealth,
      bleeding: options.bleeding ?? false,
      openWounds: options.bleeding
        ? [{ id: 'terminal-wound', kind: 'laceration', treatment: 'untreated' }]
        : [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    dailyMedicalUsage: {
      disinfectantUsesToday: options.disinfectantUsesToday ?? 1,
    },
    runIntelLog: {
      intelIds: options.runIntelIds ?? ['intel-before-scene', 'intel-found-in-scene'],
    },
  }, sceneDependencies)
}

function boundContext(startHub = hub()) {
  return bindRunSceneTerminationContextToScene(
    projectRunSceneTerminationContextFromCurrentDayHub(
      startHub,
      dependencies,
    ),
    sceneInstanceId,
    dependencies,
  )
}

function combatDeath() {
  const entered = resolveSceneMoveCommand(
    scene({ health: 1 }),
    { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
    sceneDependencies,
  ).snapshot
  return resolveSceneCombatPlayerAction(
    entered,
    { kind: 'escape' },
    sceneDependencies,
  ).snapshot
}

function sceneSource(
  terminalScene = combatDeath(),
  context = boundContext(),
): RunFailureSource {
  return { kind: 'scene-defeat', terminalScene, context }
}

function terminalFromDaily(start: CurrentDayHubSnapshot) {
  const result = resolveDailySettlement(
    start,
    { kind: 'end-day' },
    currentDayHubDependencies,
  )
  expect(result.outcome.kind).toBe('terminal')
  if (result.outcome.kind !== 'terminal') {
    throw new Error('expected a daily settlement terminal')
  }
  return result.outcome.snapshot
}

describe('hospital Run failure termination coordinator', () => {
  it('projects stable Hub facts, binds only the Scene ID, and rejects Day 8', () => {
    const start = hub({ day: 7 })
    const projected = projectRunSceneTerminationContextFromCurrentDayHub(
      start,
      dependencies,
    )
    const rebound = bindRunSceneTerminationContextToScene(
      projected,
      sceneInstanceId,
      dependencies,
    )
    expect(rebound.runReturnCarryForward.continuity).toEqual({
      ...projected.runReturnCarryForward.continuity,
      sceneInstanceId,
    })
    expect(rebound.runReturnCarryForward.storedInventory).toEqual(
      projected.runReturnCarryForward.storedInventory,
    )
    expect(rebound.runReturnCarryForward.returnLedger).toEqual(
      projected.runReturnCarryForward.returnLedger,
    )
    expect(rebound.worldThreat).toEqual(projected.worldThreat)
    expect(rebound.satiety).toEqual(projected.satiety)
    expect(() => restoreRunSceneTerminationContext({
      ...rebound,
      runReturnCarryForward: {
        ...rebound.runReturnCarryForward,
        continuity: {
          ...rebound.runReturnCarryForward.continuity,
          currentDay: 8,
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('turns an actual infected-orderly combat death into one frozen health failure', () => {
    const startHub = hub()
    const terminalScene = combatDeath()
    expect(terminalScene).toMatchObject({
      status: 'dead',
      condition: { currentHealth: 0 },
    })
    const result = resolveRunFailure(
      sceneSource(terminalScene, boundContext(startHub)),
      dependencies,
    )
    expect(result.snapshot).toMatchObject({
      kind: 'run-failure',
      reason: 'health-depleted',
      source: { kind: 'scene-defeat' },
    })
    expect(result.summary).toEqual({
      kind: 'run-failure-summary',
      status: 'failed',
      reason: 'health-depleted',
      sourceKind: 'scene-defeat',
      runId: 'run-failure-golden',
      currentDay: 3,
    })
    expect(result.snapshot.source.kind).toBe('scene-defeat')
    if (result.snapshot.source.kind !== 'scene-defeat') return
    expect(result.snapshot.source.terminalScene.runIntelLog.intelIds).toContain(
      'intel-found-in-scene',
    )
    expect(result.snapshot.source.terminalScene.dailyMedicalUsage).toEqual({
      disinfectantUsesToday: 1,
    })
    expect(result.snapshot.source.context.worldThreat).toEqual(startHub.worldThreat)
    expect(result.snapshot.source.context.satiety).toEqual(startHub.satiety)
    expect(Object.isFrozen(result.snapshot)).toBe(true)
  })

  it('uses the same coordinator for an actual forced-return death', () => {
    const terminalScene = resolveSceneMoveCommand(
      scene({ health: 2, remainingTime: 5 }),
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      sceneDependencies,
    ).snapshot
    expect(terminalScene).toMatchObject({
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.pharmacy,
      condition: { currentHealth: 0 },
    })
    expect(resolveRunFailure(
      sceneSource(terminalScene),
      dependencies,
    ).snapshot.reason).toBe('health-depleted')
  })

  it('does not extract death-scene items or append a Return ledger entry', () => {
    const startHub = hub()
    const terminalScene = combatDeath()
    const result = resolveRunFailure(
      sceneSource(terminalScene, boundContext(startHub)),
      dependencies,
    )
    if (result.snapshot.source.kind !== 'scene-defeat') return
    const source = result.snapshot.source
    expect(source.context.runReturnCarryForward.storedInventory.warehouse.items)
      .toEqual(startHub.runLoadout.warehouse.items)
    expect(source.context.runReturnCarryForward.storedInventory.taskStorage.items)
      .toEqual(startHub.runLoadout.taskStorage.items)
    expect(source.context.runReturnCarryForward.returnLedger)
      .toEqual(startHub.returnLedger)
    expect(source.terminalScene.backpack.items.map(({ instanceId }) => instanceId))
      .toEqual(['carried-bandage', 'carried-card', 'carried-sample'])
    expect(source.context.runReturnCarryForward.returnLedger.sceneInstanceIds)
      .not.toContain(sceneInstanceId)
  })

  it('maps bleeding and deprivation daily terminals without rerunning settlement', () => {
    const bleedingTerminal = terminalFromDaily(hub({
      health: 2,
      bleeding: true,
      wounds: [{ id: 'daily-wound', kind: 'laceration', treatment: 'untreated' }],
    }))
    const deprivationTerminal = terminalFromDaily(hub({
      health: 1,
      satiety: 2,
      progress: 0,
    }))
    for (const terminalSnapshot of [bleedingTerminal, deprivationTerminal]) {
      const result = resolveRunFailure({
        kind: 'daily-settlement-terminal',
        terminalSnapshot,
      }, dependencies)
      expect(result.snapshot.reason).toBe('health-depleted')
      expect(result.snapshot.source).toEqual({
        kind: 'daily-settlement-terminal',
        terminalSnapshot,
      })
      expect(result.summary.currentDay).toBe(3)
    }
  })

  it('maps the committed infection terminal and preserves its phase facts', () => {
    const terminalSnapshot = terminalFromDaily(hub({
      health: 8,
      progress: 100,
      exposures: 1,
      satiety: 6,
    }))
    const result = resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot,
    }, dependencies)
    expect(result.snapshot.reason).toBe('world-threat-terminal')
    if (result.snapshot.source.kind !== 'daily-settlement-terminal') return
    expect(result.snapshot.source.terminalSnapshot).toEqual(terminalSnapshot)
    expect(result.snapshot.source.terminalSnapshot).toMatchObject({
      continuity: { currentDay: 3 },
      worldThreat: { progress: 140 },
      satiety: { current: 6 },
      playerCondition: { pendingInfectionExposures: 0 },
    })
  })

  it('strictly rejects invalid source facts, reason overrides, and recovery as active state', () => {
    const source = sceneSource()
    const valid = resolveRunFailure(source, dependencies).snapshot
    expect(restoreRunFailureSnapshot(valid, dependencies)).toEqual(valid)
    const { source: _omittedSource, ...missingSource } = valid
    expect(() => restoreRunFailureSnapshot(missingSource, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunFailureSnapshot({
      ...valid,
      reason: 'world-threat-terminal',
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunFailureSnapshot({ ...valid, extra: true }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunFailureSnapshot(null, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    if (source.kind !== 'scene-defeat') return
    for (const status of ['active', 'safe-returned', 'forced-returned'] as const) {
      expect(() => resolveRunFailure({
        ...source,
        terminalScene: createSceneExplorationSnapshot({
          ...scene(),
          status,
        }, sceneDependencies),
      }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    }
    const combatScene = resolveSceneMoveCommand(
      scene(),
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
      sceneDependencies,
    ).snapshot
    expect(combatScene.status).toBe('combat')
    expect(() => resolveRunFailure({
      ...source,
      terminalScene: combatScene,
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      ...source,
      reason: 'health-depleted',
    } as never, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      ...source,
      terminalScene: createSceneExplorationSnapshot({
        ...source.terminalScene,
        status: 'safe-returned',
        condition: createPlayerCondition({
          ...source.terminalScene.condition,
          currentHealth: 1,
        }, config.combat.player),
      }, sceneDependencies),
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      ...source,
      context: bindRunSceneTerminationContextToScene(
        source.context,
        'different-scene',
        dependencies,
      ),
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      ...source,
      terminalScene: {
        ...source.terminalScene,
        condition: {
          ...source.terminalScene.condition,
          currentHealth: 1,
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      ...source,
      context: {
        ...source.context,
        runReturnCarryForward: {
          ...source.context.runReturnCarryForward,
          storedInventory: {
            ...source.context.runReturnCarryForward.storedInventory,
            itemStates: { states: [] },
          },
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunReturn({
      terminalScene: source.terminalScene,
      carryForward: source.context.runReturnCarryForward,
    }, returnDependencies)).toThrowError(expect.objectContaining({
      code: 'SCENE_NOT_RETURNABLE',
    }))
    expect(() => createCurrentDayHubSnapshot(valid, currentDayHubDependencies)).toThrow()
  })

  it('strictly rejects an invalid Daily Settlement terminal source', () => {
    const terminalSnapshot = terminalFromDaily(hub({
      health: 2,
      bleeding: true,
      wounds: [{ id: 'strict-daily-wound', kind: 'laceration', treatment: 'untreated' }],
    }))
    expect(() => resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: {
        ...terminalSnapshot,
        terminationReason: 'world-threat-terminal',
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: { ...terminalSnapshot, extra: true },
    } as never, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: {
        ...terminalSnapshot,
        continuity: {
          ...terminalSnapshot.continuity,
          currentDay: 8,
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects global physical instance conflicts with stored Run inventory', () => {
    const terminalScene = combatDeath()
    const collidingId = getScenePhysicalItemInstanceIds(terminalScene)[0]
    const collidingHub = hub({
      warehouse: [item(collidingId, HOSPITAL_ITEM_IDS.ration)],
      taskStorage: [],
    })
    expect(() => resolveRunFailure(
      sceneSource(terminalScene, boundContext(collidingHub)),
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects every Effect mutation and leaves the source unchanged', () => {
    const source = sceneSource()
    const sourceBefore = JSON.stringify(source)
    const plan = buildRunFailureTransitionPlan(source, dependencies)
    const mutations: Array<(effects: RunFailureEffect[]) => void> = [
      (effects) => { effects.shift() },
      (effects) => { effects.push(effects[0]) },
      (effects) => { effects.reverse() },
      (effects) => { Object.assign(effects[0], { runId: 'other-run' }) },
      (effects) => { Object.assign(effects[0], { seed: 'other-seed' }) },
      (effects) => { Object.assign(effects[0], { rulesVersion: 'other-rules' }) },
      (effects) => { Object.assign(effects[0], { currentDay: 4 }) },
      (effects) => { Object.assign(effects[0], { sceneInstanceId: 'other-scene' }) },
      (effects) => { Object.assign(effects[0], { sourceKind: 'daily-settlement-terminal' }) },
      (effects) => { Object.assign(effects[1], { reason: 'world-threat-terminal' }) },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed') return
        Object.assign(committed.summary, { currentDay: 4 })
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        Object.assign(committed.snapshot.source.terminalScene, {
          status: 'safe-returned',
        })
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        Object.assign(committed.snapshot.source.terminalScene.condition, {
          currentHealth: 1,
        })
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        Object.assign(committed.snapshot.source.context.worldThreat, { progress: 31 })
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        Object.assign(committed.snapshot.source.context.satiety, { current: 3 })
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        Object.assign(committed.snapshot.source.terminalScene.dailyMedicalUsage, {
          disinfectantUsesToday: 0,
        })
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        ;(committed.snapshot.source.context.runReturnCarryForward.returnLedger
          .sceneInstanceIds as string[]).push(sceneInstanceId)
      },
      (effects) => {
        const committed = effects[2]
        if (committed.kind !== 'run-failure-committed' ||
          committed.snapshot.source.kind !== 'scene-defeat') return
        ;(committed.snapshot.source.context.runReturnCarryForward.storedInventory
          .itemStates.states as unknown[]).pop()
      },
    ]
    for (const mutate of mutations) {
      const effects = JSON.parse(JSON.stringify(plan.effects)) as RunFailureEffect[]
      mutate(effects)
      expect(() => applyRunFailureEffects(source, effects, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
      expect(JSON.stringify(source)).toBe(sourceBefore)
    }
  })
})
