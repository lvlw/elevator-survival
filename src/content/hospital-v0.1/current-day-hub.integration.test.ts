import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import {
  applyHubSurvivalEffects,
  buildHubSurvivalTransitionPlan,
  createCurrentDayHubSnapshot,
  createCurrentDayHubSnapshotFromReturn,
  createHubSurvivalCommand,
  getAvailableHubSurvivalCommands,
  previewHubSurvivalCommand,
  previewPlayerVisibleHubSurvivalCommand,
  resolveCurrentDayHubLoadoutCommand,
  resolveCurrentDayHubMedicalCommand,
  resolveHubSurvivalCommand,
  projectRunReturnCarryForwardFromCurrentDayHub,
  type CurrentDayHubSnapshot,
  type HubSurvivalCommand,
  type HubSurvivalEffect,
} from '../../core/current-day-hub'
import { createEmptyEquipment } from '../../core/equipment'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, getItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import {
  bindRunReturnCarryForwardToScene,
  createRunReturnSnapshot,
  resolveRunReturn,
  type RunReturnDependencies,
} from '../../core/run-return'
import {
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import { createWorldThreatSnapshot } from '../../core/world-threat'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalHubSurvivalContentBindings,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneLaunchContent,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
  hospitalWorldThreatCatalog,
} from '..'

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({ instanceId, definitionId, quantity })

const returnDependencies: RunReturnDependencies = {
  scene: {
    graph: hospitalSliceV01SceneGraph,
    physicalCatalog: hospitalItemCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
    quickSlotCatalog: hospitalItemQuickSlotCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    config,
  },
  lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
}

const dependencies = {
  mainSceneDefinitionId: hospitalSceneLaunchContent.sceneDefinitionId,
  returnDependencies,
  medicalBindings: hospitalSceneMedicalContentBindings,
  survivalBindings: hospitalHubSurvivalContentBindings,
  worldThreatCatalog: hospitalWorldThreatCatalog,
}

const continuity = (sceneInstanceId = 'returned-scene') => ({
  runIdentity: {
    runId: 'hospital-run-a',
    seed: 'hospital-seed-a',
    rulesVersion: config.metadata.rulesVersion,
  },
  currentDay: 2,
  sceneInstanceId,
})

interface HubInput {
  readonly warehouse?: readonly ItemInstance[]
  readonly taskStorage?: readonly ItemInstance[]
  readonly backpack?: readonly ItemInstance[]
  readonly quickSlots?: readonly (ItemInstance | null)[]
  readonly health?: number
  readonly bleeding?: boolean
  readonly wounds?: readonly Readonly<{ id: string; kind: 'laceration'; treatment: 'untreated' | 'treated' }>[]
  readonly pendingExposures?: number
  readonly progress?: number
  readonly satiety?: number
  readonly suppressionUses?: number
  readonly suppressionAmount?: number
  readonly mainSceneUsedToday?: boolean
}

function hub(input: HubInput = {}): CurrentDayHubSnapshot {
  const warehouse = input.warehouse ?? []
  const taskStorage = input.taskStorage ?? []
  const backpack = input.backpack ?? []
  const quickSlots = input.quickSlots ?? [null, null]
  const items = [
    ...warehouse,
    ...taskStorage,
    ...backpack,
    ...quickSlots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: taskStorage },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpack,
      placements: backpack.map(({ instanceId }, x) => ({ instanceId, x, y: 0, rotated: false })),
    }, hospitalItemCatalog),
    equipment: createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
    quickSlots: createQuickSlotSnapshot(quickSlots, config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
    itemStates: { states: items.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
  }, {
    physicalCatalog: hospitalItemCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
    quickSlotCatalog: hospitalItemQuickSlotCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
    backpackRules: config.backpack,
  })
  return createCurrentDayHubSnapshot({
    continuity: continuity(),
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: input.health ?? config.combat.player.maxHealth,
      bleeding: input.bleeding ?? false,
      openWounds: input.wounds ?? [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: input.pendingExposures ?? 0,
    }, config.combat.player),
    runIntelLog: { intelIds: ['intel-preserved'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: {
        usesToday: input.suppressionUses ?? 0,
        suppressionAmountToday: input.suppressionAmount ?? 0,
      },
      maintenanceLaborRemaining: 3,
      mainSceneUsedToday: input.mainSceneUsedToday ?? false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: input.progress ?? 0 },
    satiety: { current: input.satiety ?? 4 },
    returnLedger: { sceneInstanceIds: ['returned-scene'] },
  }, dependencies)
}

function emptySafeReturnedScene(sceneInstanceId: string) {
  const scene = returnDependencies.scene
  const initial = createInitialSceneExplorationSnapshot({
    sceneInstanceId,
    searchState: createSceneSearchState({
      runSeed: 'hospital-run-a-seed',
      sceneInstanceId,
      graph: hospitalSliceV01SceneGraph,
      searchCatalog: hospitalMainSearchCatalog,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    remainingTime: 0,
    enabledEdgeIds: [],
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [],
      placements: [],
    }, hospitalItemCatalog),
    equipment: createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
    quickSlots: createQuickSlotSnapshot(
      [null, null],
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: { states: [] },
    condition: createPlayerCondition({
      currentHealth: config.combat.player.maxHealth,
      bleeding: false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    dailyMedicalUsage: { disinfectantUsesToday: 0 },
    runIntelLog: { intelIds: [] },
  }, scene)
  return createSceneExplorationSnapshot({ ...initial, status: 'safe-returned' }, scene)
}

function survival(kind: HubSurvivalCommand['kind'], source: HubSurvivalCommand['source']): HubSurvivalCommand {
  return { kind, source }
}

function returnedSnapshot(sceneInstanceId = 'scene-a') {
  return createRunReturnSnapshot({
    continuity: continuity(sceneInstanceId),
    player: {
      backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
      equipment: createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
      quickSlots: createQuickSlotSnapshot([null, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
      condition: createPlayerCondition({ currentHealth: 11, bleeding: false, openWounds: [], minorContusions: 1, painkillerActive: false, pendingInfectionExposures: 1 }, config.combat.player),
    },
    warehouse: { items: [] },
    taskStorage: { items: [] },
    itemStates: { states: [] },
    runIntelLog: { intelIds: ['intel-a'] },
    dailyMedicalUsage: { disinfectantUsesToday: 1 },
    returnLedger: { sceneInstanceIds: [sceneInstanceId] },
  }, returnDependencies)
}

const carryForward = (sceneInstanceId = 'scene-a') => ({
  continuity: continuity(sceneInstanceId),
  worldThreat: { definitionId: config.worldThreat.definitionId, progress: 30 },
  satiety: { current: 5 },
  threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
  maintenanceLaborRemaining: 2,
  mainSceneUsedToday: true as const,
})

describe('hospital current-day hub', () => {
  it('constructs the stable Hub state from RunReturn plus one strict carry-forward structure', () => {
    const ration = item('warehouse-ration', HOSPITAL_ITEM_IDS.ration)
    const returned = createRunReturnSnapshot({
      continuity: continuity('scene-a'),
      player: {
        backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
        equipment: createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
        quickSlots: createQuickSlotSnapshot([null, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
        condition: createPlayerCondition({ currentHealth: 11, bleeding: false, openWounds: [], minorContusions: 1, painkillerActive: false, pendingInfectionExposures: 1 }, config.combat.player),
      },
      warehouse: { items: [ration] },
      taskStorage: { items: [] },
      itemStates: { states: [createFullItemState(ration, hospitalItemResourceCatalog)] },
      runIntelLog: { intelIds: ['intel-a'] },
      dailyMedicalUsage: { disinfectantUsesToday: 1 },
      returnLedger: { sceneInstanceIds: ['scene-a'] },
    }, returnDependencies)
    const result = createCurrentDayHubSnapshotFromReturn(returned, {
      continuity: continuity('scene-a'),
      worldThreat: { definitionId: config.worldThreat.definitionId, progress: 30 },
      satiety: { current: 5 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 2,
      mainSceneUsedToday: true,
    }, dependencies)
    expect(result).toMatchObject({
      playerCondition: { currentHealth: 11, pendingInfectionExposures: 1 },
      runIntelLog: { intelIds: ['intel-a'] },
      dailyState: {
        medicalUsage: { disinfectantUsesToday: 1 },
        maintenanceLaborRemaining: 2,
        mainSceneUsedToday: true,
      },
      worldThreat: { progress: 30 }, satiety: { current: 5 }, returnLedger: { sceneInstanceIds: ['scene-a'] },
    })
    expect(result.runLoadout.warehouse.items[0].instanceId).toBe('warehouse-ration')
  })

  it('integrates loadout and Hub medical subtransactions without losing unrelated Hub facts', () => {
    const ration = item('ration', HOSPITAL_ITEM_IDS.ration)
    const bandage = item('bandage', HOSPITAL_ITEM_IDS.bandage)
    const start = hub({
      warehouse: [ration, bandage], health: 10, bleeding: true,
      wounds: [{ id: 'wound-a', kind: 'laceration', treatment: 'untreated' }], progress: 30, satiety: 3,
      mainSceneUsedToday: true,
    })
    const moved = resolveCurrentDayHubLoadoutCommand(start, {
      kind: 'warehouse-to-backpack', instanceId: 'ration', placement: { instanceId: 'ration', x: 0, y: 0, rotated: false },
    }, dependencies).snapshot
    expect(moved.runLoadout.backpack.items[0].instanceId).toBe('ration')
    expect(moved.worldThreat).toEqual(start.worldThreat)
    expect(moved.runIntelLog).toEqual(start.runIntelLog)
    expect(moved.continuity).toEqual(start.continuity)
    const treated = resolveCurrentDayHubMedicalCommand(moved, {
      kind: 'use-run-hub-medical-item', source: { container: 'warehouse', itemInstanceId: 'bandage' },
      target: { kind: 'open-wound', woundId: 'wound-a' },
    }, dependencies).snapshot
    expect(treated.playerCondition).toMatchObject({ currentHealth: 11, bleeding: false })
    expect(treated.worldThreat).toEqual(start.worldThreat)
    expect(treated.satiety).toEqual(start.satiety)
    expect(treated.returnLedger).toEqual(start.returnLedger)
    expect(treated.continuity).toEqual(start.continuity)
    expect(treated.dailyState.mainSceneUsedToday).toBe(true)
  })

  it('projects one continuity-bound Return carry-forward aggregate from CurrentDayHub', () => {
    const warehouseRation = item('warehouse-ration', HOSPITAL_ITEM_IDS.ration)
    const start = hub({ warehouse: [warehouseRation] })
    const carryForward = projectRunReturnCarryForwardFromCurrentDayHub(start, dependencies)
    const rebound = bindRunReturnCarryForwardToScene(
      carryForward,
      'next-hospital-scene',
      returnDependencies,
    )
    expect(carryForward.continuity).toEqual(start.continuity)
    expect(carryForward.storedInventory.warehouse.items).toEqual([warehouseRation])
    expect(carryForward.storedInventory.itemStates.states).toHaveLength(1)
    expect(carryForward.returnLedger).toEqual(start.returnLedger)
    expect(rebound.continuity).toEqual({
      ...start.continuity,
      sceneInstanceId: 'next-hospital-scene',
    })
    expect(rebound.storedInventory).toEqual(carryForward.storedInventory)
    expect(rebound.returnLedger).toEqual(carryForward.returnLedger)
  })

  it('carries one Run identity, storage, and ledger through Hub, a rebound Scene, Return, and Hub', () => {
    const warehouseRation = item('warehouse-ration', HOSPITAL_ITEM_IDS.ration)
    const taskSample = item('task-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    const start = hub({
      warehouse: [warehouseRation],
      taskStorage: [taskSample],
      mainSceneUsedToday: true,
    })
    const rebound = bindRunReturnCarryForwardToScene(
      projectRunReturnCarryForwardFromCurrentDayHub(start, dependencies),
      'next-hospital-scene',
      returnDependencies,
    )
    const returned = resolveRunReturn({
      terminalScene: emptySafeReturnedScene('next-hospital-scene'),
      carryForward: rebound,
    }, returnDependencies).snapshot
    const nextHub = createCurrentDayHubSnapshotFromReturn(returned, {
      continuity: rebound.continuity,
      worldThreat: start.worldThreat,
      satiety: start.satiety,
      threatSuppression: start.dailyState.threatSuppression,
      maintenanceLaborRemaining: start.dailyState.maintenanceLaborRemaining,
      mainSceneUsedToday: true,
    }, dependencies)

    expect(returned.continuity).toEqual(rebound.continuity)
    expect(returned.warehouse.items).toEqual([warehouseRation])
    expect(returned.taskStorage.items).toEqual([taskSample])
    expect(returned.returnLedger.sceneInstanceIds).toEqual([
      'next-hospital-scene',
      'returned-scene',
    ])
    expect(nextHub.continuity).toEqual(rebound.continuity)
    expect(nextHub.runLoadout.warehouse.items).toEqual([warehouseRation])
    expect(nextHub.runLoadout.taskStorage.items).toEqual([taskSample])
    expect(nextHub.returnLedger).toEqual(returned.returnLedger)
  })

  it('uses suppressant for an exposure, records 1/15, and changes neither exposure nor progress', () => {
    const suppressant = item('suppressant-stack', HOSPITAL_ITEM_IDS.infectionSuppressant, 2)
    const start = hub({
      warehouse: [suppressant], pendingExposures: 1, progress: 0,
      mainSceneUsedToday: true,
    })
    const command = survival('use-hub-infection-suppressant', { container: 'warehouse', itemInstanceId: 'suppressant-stack' })
    const result = resolveHubSurvivalCommand(start, command, dependencies)
    expect(result.snapshot.dailyState.mainSceneUsedToday).toBe(true)
    expect(result.snapshot.dailyState.threatSuppression).toEqual({ usesToday: 1, suppressionAmountToday: 15 })
    expect(result.snapshot.playerCondition.pendingInfectionExposures).toBe(1)
    expect(result.snapshot.worldThreat.progress).toBe(0)
    expect(result.snapshot.continuity).toEqual(start.continuity)
    expect(result.snapshot.runLoadout.warehouse.items[0].quantity).toBe(1)
    expect(getItemState(result.snapshot.runLoadout.itemStates, 'suppressant-stack').resource).toEqual({ kind: 'none' })
    expect(() => resolveHubSurvivalCommand(result.snapshot, command, dependencies)).toThrow(/不符合正式规则/)
  })

  it('previews suppressant from the formal plan without exposing identity or changing threat facts', () => {
    const suppressant = item('hidden-suppressant-instance', HOSPITAL_ITEM_IDS.infectionSuppressant, 2)
    const start = hub({ warehouse: [suppressant], pendingExposures: 1, progress: 73 })
    const action = survival('use-hub-infection-suppressant', {
      container: 'warehouse', itemInstanceId: suppressant.instanceId,
    })
    const formal = previewHubSurvivalCommand(start, action, dependencies)
    const safe = previewPlayerVisibleHubSurvivalCommand(start, action, dependencies)
    expect(formal.canExecute).toBe(true)
    if (!formal.canExecute) throw new Error('expected formal suppressant Preview')
    expect(start.worldThreat.progress).toBe(73)
    expect(formal.result.snapshot.worldThreat.progress).toBe(73)
    expect(safe).toMatchObject({
      canExecute: true,
      result: {
        action: 'use-hub-infection-suppressant',
        source: { container: 'warehouse', ordinal: 1 },
        sourceQuantityBefore: 2,
        sourceQuantityAfter: 1,
        suppressionUsesBefore: 0,
        suppressionUsesAfter: 1,
        suppressionAmountBefore: 0,
        suppressionAmountAfter: 15,
        infectionExposuresBefore: 1,
        infectionExposuresAfter: 1,
        hubSceneTime: 0,
      },
    })
    expect(start.runLoadout.warehouse.items[0].quantity).toBe(2)
    expect(start.dailyState.threatSuppression).toEqual({ usesToday: 0, suppressionAmountToday: 0 })
    const serialized = JSON.stringify(safe)
    for (const hidden of [
      'hidden-suppressant-instance', 'instanceId', 'effects', 'snapshot',
      'worldThreatProgress', 'worldThreat.progress', '73',
    ]) {
      expect(serialized).not.toContain(hidden)
    }
  })

  it('previews ration restoration and shares formal rejection at maximum satiety', () => {
    const ration = item('preview-ration', HOSPITAL_ITEM_IDS.ration)
    const start = hub({ backpack: [ration], satiety: 5 })
    const action = survival('use-hub-ration', {
      container: 'backpack', itemInstanceId: ration.instanceId,
    })
    expect(previewPlayerVisibleHubSurvivalCommand(start, action, dependencies)).toMatchObject({
      canExecute: true,
      result: {
        source: { container: 'backpack', column: 1, row: 1 },
        satietyBefore: 5,
        satietyRestored: 1,
        satietyAfter: 6,
      },
    })
    const full = hub({ warehouse: [ration], satiety: 6 })
    const unavailable = survival('use-hub-ration', {
      container: 'warehouse', itemInstanceId: ration.instanceId,
    })
    expect(previewHubSurvivalCommand(full, unavailable, dependencies)).toMatchObject({
      canExecute: false,
      rejectionCode: 'ACTION_NOT_AVAILABLE',
    })
    expect(previewPlayerVisibleHubSurvivalCommand(full, unavailable, dependencies)).toMatchObject({
      canExecute: false,
      rejectionCode: 'ACTION_NOT_AVAILABLE',
    })
    expect(full.runLoadout.warehouse.items).toEqual([ration])
  })

  it('allows suppressant for existing progress and consumes the explicit backpack source', () => {
    const suppressant = item('backpack-suppressant', HOSPITAL_ITEM_IDS.infectionSuppressant)
    const start = hub({ backpack: [suppressant], progress: 10 })
    const result = resolveHubSurvivalCommand(start, survival('use-hub-infection-suppressant', { container: 'backpack', itemInstanceId: suppressant.instanceId }), dependencies)
    expect(result.snapshot.runLoadout.backpack.items).toEqual([])
    expect(result.snapshot.runLoadout.itemStates.states).toEqual([])
    expect(result.snapshot.worldThreat.progress).toBe(10)
    expect(result.snapshot.continuity).toEqual(start.continuity)
  })

  it('does not expose suppressant with neither exposure nor progress', () => {
    const start = hub({ warehouse: [item('suppressant', HOSPITAL_ITEM_IDS.infectionSuppressant)], progress: 0, pendingExposures: 0 })
    expect(getAvailableHubSurvivalCommands(start, dependencies)).toEqual([])
  })

  it.each([[0, 2], [4, 6], [5, 6]] as const)('uses backpack ration from %i to %i', (before, after) => {
    const ration = item(`ration-${before}`, HOSPITAL_ITEM_IDS.ration)
    const start = hub({ backpack: [ration], satiety: before })
    const result = resolveHubSurvivalCommand(start, survival('use-hub-ration', { container: 'backpack', itemInstanceId: ration.instanceId }), dependencies)
    expect(result.snapshot.satiety.current).toBe(after)
    expect(result.snapshot.runLoadout.backpack.items).toEqual([])
    expect(result.snapshot.runLoadout.itemStates.states).toEqual([])
    expect(result.snapshot.continuity).toEqual(start.continuity)
  })

  it('rejects ration at maximum without consumption and cannot express task/equipment sources', () => {
    const ration = item('ration', HOSPITAL_ITEM_IDS.ration)
    const start = hub({ warehouse: [ration], satiety: 6 })
    const command = survival('use-hub-ration', { container: 'warehouse', itemInstanceId: 'ration' })
    expect(() => resolveHubSurvivalCommand(start, command, dependencies)).toThrow(/不符合正式规则/)
    expect(start.runLoadout.warehouse.items).toEqual([ration])
    expect(() => createHubSurvivalCommand({ kind: 'use-hub-ration', source: { container: 'task-storage', itemInstanceId: 'ration' } })).toThrow()
    expect(() => createHubSurvivalCommand({ kind: 'use-hub-ration', source: { container: 'equipment', slot: 'utility' } })).toThrow()
  })

  it('strictly rejects invalid Hub facts and unknown fields', () => {
    const start = hub()
    expect(() => createCurrentDayHubSnapshot({ ...start, worldThreat: { ...start.worldThreat, progress: -1 } }, dependencies)).toThrow()
    expect(() => createCurrentDayHubSnapshot({ ...start, satiety: { current: 7 } }, dependencies)).toThrow()
    expect(() => createCurrentDayHubSnapshot({ ...start, dailyState: { ...start.dailyState, threatSuppression: { usesToday: 0, suppressionAmountToday: 15 } } }, dependencies)).toThrow()
    expect(() => createCurrentDayHubSnapshot({ ...start, dailyState: { ...start.dailyState, maintenanceLaborRemaining: 4 } }, dependencies)).toThrow()
    expect(() => createCurrentDayHubSnapshot({ ...start, extra: true }, dependencies)).toThrow()
  })

  it('accepts a final-day active Hub and centrally rejects expired days for every Hub transaction', () => {
    const ration = item('day-seven-ration', HOSPITAL_ITEM_IDS.ration)
    const daySeven = createCurrentDayHubSnapshot({
      ...hub({ warehouse: [ration] }),
      continuity: { ...continuity(), currentDay: 7 },
    }, dependencies)
    expect(resolveHubSurvivalCommand(daySeven, survival(
      'use-hub-ration',
      { container: 'warehouse', itemInstanceId: ration.instanceId },
    ), dependencies).snapshot.satiety.current).toBe(6)

    const expired = {
      ...daySeven,
      continuity: { ...daySeven.continuity, currentDay: 8 },
    } as CurrentDayHubSnapshot
    expect(() => createCurrentDayHubSnapshot(expired, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveCurrentDayHubLoadoutCommand(expired, {} as never, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveCurrentDayHubMedicalCommand(expired, {} as never, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveHubSurvivalCommand(expired, {} as never, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('allows world threat to express terminal while active Hub rejects 120 and above', () => {
    expect(createWorldThreatSnapshot({
      definitionId: config.worldThreat.definitionId,
      progress: 120,
    }, hospitalWorldThreatCatalog)).toEqual({
      definitionId: config.worldThreat.definitionId,
      progress: 120,
    })
    expect(hub({ progress: 119 }).worldThreat.progress).toBe(119)
    expect(() => hub({ progress: 120 })).toThrow(/终末世界威胁/)
    expect(() => hub({ progress: 121 })).toThrow(/终末世界威胁/)
  })

  it.each([
    ['runId', (value: ReturnType<typeof carryForward>) => ({ ...value, continuity: { ...value.continuity, runIdentity: { ...value.continuity.runIdentity, runId: 'run-b' } } })],
    ['seed', (value: ReturnType<typeof carryForward>) => ({ ...value, continuity: { ...value.continuity, runIdentity: { ...value.continuity.runIdentity, seed: 'seed-b' } } })],
    ['rulesVersion', (value: ReturnType<typeof carryForward>) => ({ ...value, continuity: { ...value.continuity, runIdentity: { ...value.continuity.runIdentity, rulesVersion: 'hospital-rules-v2' } } })],
    ['currentDay', (value: ReturnType<typeof carryForward>) => ({ ...value, continuity: { ...value.continuity, currentDay: 3 } })],
    ['sceneInstanceId', (value: ReturnType<typeof carryForward>) => ({ ...value, continuity: { ...value.continuity, sceneInstanceId: 'scene-y' } })],
  ])('rejects FromReturn carry-forward with mismatched %s', (_name, mutate) => {
    expect(() => createCurrentDayHubSnapshotFromReturn(
      returnedSnapshot(),
      mutate(carryForward()),
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects a returned Hub that attempts to clear the daily main-scene usage fact', () => {
    expect(() => createCurrentDayHubSnapshotFromReturn(
      returnedSnapshot(),
      { ...carryForward(), mainSceneUsedToday: false } as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects Hub restoration when continuity rulesVersion differs from dependencies', () => {
    const start = hub()
    expect(() => createCurrentDayHubSnapshot({
      ...start,
      continuity: {
        ...start.continuity,
        runIdentity: { ...start.continuity.runIdentity, rulesVersion: 'hospital-rules-v2' },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it.each([
    ['source', (effects: readonly HubSurvivalEffect[]) => effects.map((effect) => effect.kind === 'hub-survival-item-consumed'
      ? { ...effect, consumption: { ...effect.consumption, source: { container: 'warehouse' as const, itemInstanceId: 'other' } } }
      : effect)],
    ['item identity', (effects: readonly HubSurvivalEffect[]) => effects.map((effect) => effect.kind === 'hub-survival-item-consumed'
      ? { ...effect, consumption: { ...effect.consumption, definitionId: HOSPITAL_ITEM_IDS.ration } }
      : effect)],
    ['quantity', (effects: readonly HubSurvivalEffect[]) => effects.map((effect) => effect.kind === 'hub-survival-item-consumed'
      ? { ...effect, consumption: { ...effect.consumption, quantityAfter: 2 } }
      : effect)],
    ['suppression amount', (effects: readonly HubSurvivalEffect[]) => effects.map((effect) => effect.kind === 'hub-threat-suppression-changed'
      ? { ...effect, amountAfter: 14 }
      : effect)],
    ['suppression use count', (effects: readonly HubSurvivalEffect[]) => effects.map((effect) => effect.kind === 'hub-threat-suppression-changed'
      ? { ...effect, usesAfter: 0 }
      : effect)],
    ['ItemState', (effects: readonly HubSurvivalEffect[]) => effects.map((effect) => effect.kind === 'current-day-hub-state-committed'
      ? { ...effect, snapshot: { ...effect.snapshot, runLoadout: { ...effect.snapshot.runLoadout, itemStates: { states: [] } } } }
      : effect)],
  ])('rejects %s Effect tampering atomically', (_name, mutate) => {
    const suppressant = item('suppressant', HOSPITAL_ITEM_IDS.infectionSuppressant, 2)
    const start = hub({ warehouse: [suppressant], progress: 10 })
    const command = survival('use-hub-infection-suppressant', { container: 'warehouse', itemInstanceId: 'suppressant' })
    const plan = buildHubSurvivalTransitionPlan(start, command, dependencies)
    expect(() => applyHubSurvivalEffects(start, command, mutate(plan.effects), dependencies)).toThrow(/Effect/)
    expect(start.dailyState.threatSuppression).toEqual({ usesToday: 0, suppressionAmountToday: 0 })
    expect(start.runLoadout.warehouse.items[0].quantity).toBe(2)
  })

  it('rejects satiety Effect and Effect-order tampering atomically', () => {
    const start = hub({ warehouse: [item('ration', HOSPITAL_ITEM_IDS.ration)], satiety: 4 })
    const command = survival('use-hub-ration', { container: 'warehouse', itemInstanceId: 'ration' })
    const plan = buildHubSurvivalTransitionPlan(start, command, dependencies)
    const modified = plan.effects.map((effect) => effect.kind === 'hub-satiety-restored'
      ? { ...effect, after: 5 }
      : effect)
    expect(() => applyHubSurvivalEffects(start, command, modified, dependencies)).toThrow(/Effect/)
    expect(() => applyHubSurvivalEffects(start, command, [...plan.effects].reverse(), dependencies)).toThrow(/Effect/)
    expect(start.satiety.current).toBe(4)
    expect(start.runLoadout.warehouse.items[0].instanceId).toBe('ration')
  })

  it('rejects committed-state continuity tampering', () => {
    const start = hub({ warehouse: [item('ration', HOSPITAL_ITEM_IDS.ration)], satiety: 4 })
    const command = survival('use-hub-ration', { container: 'warehouse', itemInstanceId: 'ration' })
    const plan = buildHubSurvivalTransitionPlan(start, command, dependencies)
    const tampered = plan.effects.map((effect) => effect.kind === 'current-day-hub-state-committed'
      ? {
          ...effect,
          snapshot: {
            ...effect.snapshot,
            continuity: {
              ...effect.snapshot.continuity,
              runIdentity: { ...effect.snapshot.continuity.runIdentity, runId: 'other-run' },
            },
          },
        }
      : effect)
    expect(() => applyHubSurvivalEffects(start, command, tampered, dependencies)).toThrow(/Effect/)
    expect(start.continuity.runIdentity.runId).toBe('hospital-run-a')
  })
})
