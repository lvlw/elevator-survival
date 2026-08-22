import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSliceV01RuleConfig as config,
} from '../../content'
import { createPlayerCondition } from '../../core/condition'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import {
  createBackpackSnapshot,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import { resolveRunFailure } from '../../core/run-termination'
import { getSceneNodeItems } from '../../core/scene-items'
import {
  resolveSceneLaunch,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import { StableRunCommandExecutionError } from '../command-execution'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  hospitalSceneLaunchDependencies,
  loadRunPhase,
  saveRunPhase,
  type RunSaveStorage,
  type StableRunPhase,
} from '../run-save'
import {
  createStableRunStore,
  createStableRunStoreFromStorage,
  type StableRunStore,
} from '.'

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

const flashlight = item('store-flashlight', HOSPITAL_ITEM_IDS.flashlight)
const ration = item('store-ration', HOSPITAL_ITEM_IDS.ration)

class TrackedStorage implements RunSaveStorage {
  public writes = 0
  public failNextWrite = false
  private value: string | null

  public constructor(initialValue: string | null = null) {
    this.value = initialValue
  }

  public read(): string | null { return this.value }
  public write(serialized: string): void {
    this.writes += 1
    if (this.failNextWrite) {
      this.failNextWrite = false
      throw new Error('store persistence failure')
    }
    this.value = serialized
  }
  public clear(): void { this.value = null }
  public resetWrites(): void { this.writes = 0 }
}

interface HubOptions {
  readonly health?: number
  readonly bleeding?: boolean
  readonly mainSceneUsedToday?: boolean
  readonly warehouse?: readonly ItemInstance[]
}

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const warehouse = options.warehouse ?? [ration]
  const owned = [...warehouse, flashlight]
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-store-integration',
        seed: 'seed-scene-routing',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: 2,
      sceneInstanceId: 'returned-before-store-integration',
    },
    runLoadout: createRunLoadoutSnapshot({
      warehouse: { items: warehouse },
      taskStorage: { items: [] },
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: [],
        placements: [],
      }, hospitalItemCatalog),
      equipment: { weapon: null, armor: null, utility: flashlight },
      quickSlots: createQuickSlotSnapshot(
        [null, null],
        config.backpack.quickSlotCount,
        hospitalItemCatalog,
        hospitalItemQuickSlotCatalog,
      ),
      itemStates: {
        states: owned.map((candidate) =>
          createFullItemState(candidate, hospitalItemResourceCatalog)),
      },
    }, {
      physicalCatalog: hospitalItemCatalog,
      equipmentCatalog: hospitalItemEquipmentCatalog,
      quickSlotCatalog: hospitalItemQuickSlotCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
      backpackRules: config.backpack,
    }),
    playerCondition: createPlayerCondition({
      currentHealth: options.health ?? config.combat.player.maxHealth,
      bleeding: options.bleeding ?? false,
      openWounds: options.bleeding
        ? [{ id: 'store-wound', kind: 'laceration', treatment: 'untreated' }]
        : [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    runIntelLog: { intelIds: [] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points,
      mainSceneUsedToday: options.mainSceneUsedToday ?? false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 },
    satiety: { current: 4 },
    returnLedger: { sceneInstanceIds: ['returned-before-store-integration'] },
  }, hospitalCurrentDayHubDependencies)
}

function sceneSession(start = hub()): RunSceneSessionSnapshot {
  return resolveSceneLaunch(
    start,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
}

function failurePhase(): StableRunPhase {
  const settlement = resolveDailySettlement(
    hub({ health: 1, bleeding: true, mainSceneUsedToday: true }),
    { kind: 'end-day' },
    hospitalCurrentDayHubDependencies,
  )
  if (settlement.outcome.kind !== 'terminal') throw new Error('expected terminal')
  const failure = resolveRunFailure({
    kind: 'daily-settlement-terminal',
    terminalSnapshot: settlement.outcome.snapshot,
  }, hospitalRunTerminationDependencies)
  return { kind: 'run-failure', payload: failure.snapshot }
}

function createStore(
  phase: StableRunPhase,
  storage = new TrackedStorage(),
): StableRunStore {
  return createStableRunStore({
    initialPhase: phase,
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  })
}

function requireScene(store: StableRunStore): RunSceneSessionSnapshot {
  const phase = store.getState().phase
  if (phase.kind !== 'scene-session') throw new Error('expected scene-session')
  return phase.payload
}

describe('Stable Run Store initialization and public ownership', () => {
  it.each([
    { kind: 'current-day-hub', payload: hub() },
    { kind: 'scene-session', payload: sceneSession() },
    failurePhase(),
  ] as const)('strictly initializes a canonical $kind phase without saving', (phase) => {
    const storage = new TrackedStorage()
    const store = createStableRunStore({
      initialPhase: phase,
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(store.getState().phase).toEqual(phase)
    expect(store.getState().phase).not.toBe(phase)
    expect(store.getInitialState()).toBe(store.getState())
    expect(storage.writes).toBe(0)
    expect(Object.keys(store.getState())).toEqual(['phase'])
    expect(Object.keys(store).sort()).toEqual([
      'dispatch',
      'getInitialState',
      'getState',
      'subscribe',
    ])
    expect('setState' in store).toBe(false)
    expect(Object.isFrozen(store)).toBe(true)
    expect(Object.isFrozen(store.getState())).toBe(true)
  })

  it('rejects an invalid initial phase without saving or repairing it', () => {
    const storage = new TrackedStorage()
    expect(() => createStableRunStore({
      initialPhase: { kind: 'current-day-hub', payload: {} },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_STABLE_PHASE' }))
    expect(storage.writes).toBe(0)
    expect(storage.read()).toBeNull()
  })
})

describe('Stable Run Store storage bootstrap', () => {
  it.each([
    { kind: 'current-day-hub', payload: hub() },
    { kind: 'scene-session', payload: sceneSession() },
    failurePhase(),
  ] as const)('restores a canonical $kind Store from the existing save', (phase) => {
    const storage = new TrackedStorage()
    saveRunPhase(storage, phase, hospitalRunSaveRulesRegistry)
    const serialized = storage.read()
    storage.resetWrites()
    const store = createStableRunStoreFromStorage({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(store?.getState().phase).toEqual(phase)
    expect(storage.writes).toBe(0)
    expect(storage.read()).toBe(serialized)
  })

  it('returns null for an empty save and preserves corrupt storage on failure', () => {
    const empty = new TrackedStorage()
    expect(createStableRunStoreFromStorage({
      storage: empty,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toBeNull()
    expect(empty.writes).toBe(0)

    const corrupt = new TrackedStorage('{not-json')
    expect(() => createStableRunStoreFromStorage({
      storage: corrupt,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_JSON' }))
    expect(corrupt.read()).toBe('{not-json')
    expect(corrupt.writes).toBe(0)
  })
})

describe('Stable Run Store dispatch and subscriber semantics', () => {
  it('routes lifecycle, Scene, and Hub families through the unified dispatcher', () => {
    const storage = new TrackedStorage()
    const store = createStore(
      { kind: 'current-day-hub', payload: hub() },
      storage,
    )
    const identity = hub().continuity.runIdentity

    const launched = store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    })
    expect(store.getState().phase).toBe(launched.phase)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(
      launched.phase,
    )

    const moved = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    })
    expect(store.getState().phase).toBe(moved.phase)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(
      moved.phase,
    )

    const hubStorage = new TrackedStorage()
    const hubStore = createStore(
      { kind: 'current-day-hub', payload: hub() },
      hubStorage,
    )
    const survived = hubStore.dispatch({
      kind: 'hub',
      command: {
        kind: 'hub-survival',
        command: {
          kind: 'use-hub-ration',
          source: { container: 'warehouse', itemInstanceId: ration.instanceId },
        },
      },
    })
    expect(hubStore.getState().phase).toBe(survived.phase)
    expect(loadRunPhase(hubStorage, hospitalRunSaveRulesRegistry)).toEqual(
      survived.phase,
    )
    for (const phase of [moved.phase, survived.phase]) {
      const actual = phase.kind === 'current-day-hub'
        ? phase.payload.continuity.runIdentity
        : phase.kind === 'scene-session'
          ? phase.payload.context.runReturnCarryForward.continuity.runIdentity
          : null
      expect(actual).toEqual(identity)
    }
  })

  it('notifies once on success and never stores execution or result', () => {
    const store = createStore({ kind: 'current-day-hub', payload: hub() })
    let notifications = 0
    const unsubscribe = store.subscribe(() => { notifications += 1 })
    const execution = store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    })
    expect(notifications).toBe(1)
    expect(store.getState()).toEqual({ phase: execution.phase })
    expect(Object.keys(store.getState())).toEqual(['phase'])
    unsubscribe()
  })

  it('keeps phase, subscriber count, and storage unchanged on rejection', () => {
    const storage = new TrackedStorage()
    const store = createStore(
      { kind: 'current-day-hub', payload: hub() },
      storage,
    )
    const before = store.getState()
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    expect(() => store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    })).toThrowError(expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }))
    expect(store.getState()).toBe(before)
    expect(notifications).toBe(0)
    expect(storage.writes).toBe(0)
  })

  it('keeps a RunFailure Store readable and delegates mutation rejection', () => {
    const storage = new TrackedStorage()
    const store = createStore(failurePhase(), storage)
    const before = store.getState()
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    expect(() => store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'end-day' },
    })).toThrowError(expect.objectContaining<Partial<StableRunCommandExecutionError>>({
      code: 'TERMINAL_PHASE',
    }))
    expect(store.getState()).toBe(before)
    expect(notifications).toBe(0)
    expect(storage.writes).toBe(0)
  })
})

describe('Store-owned headless chains', () => {
  it('drives one complete application chain using only Store dispatch', () => {
    const storage = new TrackedStorage()
    const store = createStore(
      { kind: 'current-day-hub', payload: hub() },
      storage,
    )
    const identity = hub().continuity.runIdentity
    let last = store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    })
    const sceneId = requireScene(store).scene.sceneInstanceId
    last = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    })
    last = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-main-search',
        command: { illumination: 'search-without-flashlight' },
      },
    })
    expect(requireScene(store).scene.sceneInstanceId).toBe(sceneId)
    expect(getSceneNodeItems(
      requireScene(store).scene.sceneItems,
      HOSPITAL_NODE_IDS.emergencyHall,
    ).length).toBeGreaterThan(0)
    last = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-withdraw',
        command: { kind: 'withdraw-from-scene' },
      },
    })
    expect(requireScene(store).scene.status).toBe('safe-returned')
    last = store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'settle-terminal-scene' },
    })
    expect(store.getState().phase.kind).toBe('current-day-hub')
    last = store.dispatch({
      kind: 'hub',
      command: {
        kind: 'hub-survival',
        command: {
          kind: 'use-hub-ration',
          source: { container: 'warehouse', itemInstanceId: ration.instanceId },
        },
      },
    })
    expect(store.getState().phase).toBe(last.phase)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(last.phase)
    if (last.phase.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(last.phase.payload.continuity.runIdentity).toEqual(identity)
  })

  it('resumes a saved Scene without refreshing deterministic or physical state', () => {
    const storage = new TrackedStorage()
    const storeA = createStore(
      { kind: 'current-day-hub', payload: hub() },
      storage,
    )
    storeA.dispatch({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    })
    storeA.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    })
    storeA.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-main-search',
        command: { illumination: 'search-without-flashlight' },
      },
    })
    const before = requireScene(storeA).scene
    const storeB = createStableRunStoreFromStorage({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    if (!storeB) throw new Error('expected resumed Store')
    const resumed = requireScene(storeB).scene
    expect(resumed.sceneInstanceId).toBe(before.sceneInstanceId)
    expect(resumed.searchState).toEqual(before.searchState)
    expect(resumed.sceneItems).toEqual(before.sceneItems)
    expect(resumed.itemStates).toEqual(before.itemStates)
    const execution = storeB.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-withdraw',
        command: { kind: 'withdraw-from-scene' },
      },
    })
    expect(storeB.getState().phase).toBe(execution.phase)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(
      execution.phase,
    )
  })

  it('continues from committed memory after a failed random-bearing save', () => {
    const storage = new TrackedStorage()
    const store = createStore(
      { kind: 'current-day-hub', payload: hub() },
      storage,
    )
    store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    })
    store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    })
    const persistedBefore = storage.read()
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    storage.resetWrites()
    storage.failNextWrite = true
    const searched = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-main-search',
        command: { illumination: 'search-without-flashlight' },
      },
    })
    expect(searched.kind).toBe('executed-with-save-failure')
    expect(store.getState().phase).toBe(searched.phase)
    expect(notifications).toBe(1)
    expect(storage.writes).toBe(1)
    expect(storage.read()).toBe(persistedBefore)

    const revealed = getSceneNodeItems(
      requireScene(store).scene.sceneItems,
      HOSPITAL_NODE_IDS.emergencyHall,
    )[0]
    if (!revealed) throw new Error('expected committed revealed item')
    const picked = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-node-item-pickup',
        command: {
          nodeItemInstanceId: revealed.item.instanceId,
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
      },
    })
    expect(picked.kind).toBe('executed')
    expect(notifications).toBe(2)
    expect(store.getState().phase).toBe(picked.phase)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(
      picked.phase,
    )
    expect(requireScene(store).scene.backpack.items).toContainEqual(
      revealed.item,
    )
  })
})
