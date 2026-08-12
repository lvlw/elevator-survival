import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import {
  applyRunReturnEffects,
  bindRunReturnCarryForwardToScene,
  buildRunReturnTransitionPlan,
  createItemReturnLifecycleCatalog,
  createRunReturnLedgerSnapshot,
  createRunReturnSnapshot,
  createRunStoredInventorySnapshot,
  getStoredTaskItemQuantity,
  hasStoredTaskItem,
  projectRunStoredInventory,
  projectRunReturnCarryForwardFromRunReturn,
  restoreRunReturnCarryForwardSnapshot,
  resolveRunReturn,
  type RunReturnDependencies,
  type RunReturnEffect,
  type RunReturnInput,
} from '../../core/run-return'
import {
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  type SceneExplorationDependencies,
  type SceneExplorationStatus,
} from '../../core/scene-exploration'
import { addSceneItems, createEmptySceneItemsSnapshot } from '../../core/scene-items'
import { createSceneSearchState } from '../../core/scene-search'
import {
  HOSPITAL_COMBAT_ENCOUNTER_IDS,
  HOSPITAL_INTEL_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_TASK_EVENT_IDS,
  createHospitalSceneCombatDependencies,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalItemReturnLifecycleProfiles,
  hospitalMainSearchCatalog,
  hospitalSceneTaskEventCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const SCENE_ID = 'hospital-run-return-scene'

const continuity = (sceneInstanceId = SCENE_ID) => ({
  runIdentity: {
    runId: 'hospital-run-return',
    seed: 'hospital-run-return-seed',
    rulesVersion: config.metadata.rulesVersion,
  },
  currentDay: 2,
  sceneInstanceId,
})

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

const backpackItems = (includeSample: boolean): readonly ItemInstance[] => [
  item('returned-metal', HOSPITAL_ITEM_IDS.metalParts),
  item('returned-bandages', HOSPITAL_ITEM_IDS.bandage, 2),
  item('returned-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard),
  item('returned-crowbar', HOSPITAL_ITEM_IDS.crowbar),
  item('returned-flashlight', HOSPITAL_ITEM_IDS.flashlight),
  ...(includeSample ? [item('returned-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)] : []),
]

function sceneDependencies(withCompletedTask = false): SceneExplorationDependencies {
  const base: SceneExplorationDependencies = {
    graph: hospitalSliceV01SceneGraph,
    physicalCatalog: hospitalItemCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
    quickSlotCatalog: hospitalItemQuickSlotCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    config,
  }
  if (!withCompletedTask) return base
  return {
    ...base,
    taskEventCatalog: hospitalSceneTaskEventCatalog,
    sceneCombat: createHospitalSceneCombatDependencies('run-return-seed', SCENE_ID),
  }
}

function terminalScene(input: Readonly<{
  status?: SceneExplorationStatus
  includeSample?: boolean
  sceneTaskCompleted?: boolean
  leaveTaskItem?: boolean
}> = {}) {
  const status = input.status ?? 'safe-returned'
  const includeSample = input.includeSample ?? true
  const dependencies = sceneDependencies(input.sceneTaskCompleted)
  const items = backpackItems(includeSample)
  const pipe = item('equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const coat = item('equipped-coat', HOSPITAL_ITEM_IDS.heavyCoat)
  const painkiller = item('quick-painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const itemStates = [
    ...items.map((candidate) => {
      if (candidate.definitionId === HOSPITAL_ITEM_IDS.crowbar) {
        return createItemState({ ...candidate, resource: { kind: 'durability', current: 1 } }, hospitalItemResourceCatalog)
      }
      if (candidate.definitionId === HOSPITAL_ITEM_IDS.flashlight) {
        return createItemState({ ...candidate, resource: { kind: 'charge', current: 2 } }, hospitalItemResourceCatalog)
      }
      return createFullItemState(candidate, hospitalItemResourceCatalog)
    }),
    createItemState({ ...pipe, resource: { kind: 'durability', current: 1 } }, hospitalItemResourceCatalog),
    createItemState({ ...coat, resource: { kind: 'integrity', current: 2 } }, hospitalItemResourceCatalog),
    createFullItemState(painkiller, hospitalItemResourceCatalog),
  ]
  const placements = [
    { instanceId: 'returned-metal', x: 4, y: 0, rotated: false },
    { instanceId: 'returned-bandages', x: 5, y: 0, rotated: false },
    { instanceId: 'returned-card', x: 4, y: 1, rotated: false },
    { instanceId: 'returned-crowbar', x: 2, y: 0, rotated: false },
    { instanceId: 'returned-flashlight', x: 3, y: 0, rotated: false },
    ...(includeSample
      ? [{ instanceId: 'returned-sample', x: 0, y: 0, rotated: false }]
      : []),
  ]
  const searchState = createSceneSearchState({
    runSeed: 'run-return-seed',
    sceneInstanceId: SCENE_ID,
    graph: hospitalSliceV01SceneGraph,
    searchCatalog: hospitalMainSearchCatalog,
    itemCatalog: hospitalItemCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
  })
  const sceneItemDependencies = {
    graph: hospitalSliceV01SceneGraph,
    itemCatalog: hospitalItemCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
  }
  let sceneItems = createEmptySceneItemsSnapshot(sceneItemDependencies)
  sceneItems = addSceneItems(sceneItems, HOSPITAL_NODE_IDS.specimenColdRoom, [{
    item: item('left-electronics', HOSPITAL_ITEM_IDS.electronicComponents),
    state: createFullItemState(
      item('left-electronics', HOSPITAL_ITEM_IDS.electronicComponents),
      hospitalItemResourceCatalog,
    ),
  }], sceneItemDependencies)
  if (input.leaveTaskItem) {
    sceneItems = addSceneItems(sceneItems, HOSPITAL_NODE_IDS.specimenColdRoom, [{
      item: item('left-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase),
      state: createFullItemState(
        item('left-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase),
        hospitalItemResourceCatalog,
      ),
    }], sceneItemDependencies)
  }
  const initial = createInitialSceneExplorationSnapshot({
    sceneInstanceId: SCENE_ID,
    searchState,
    sceneItems,
    currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    remainingTime: 0,
    enabledEdgeIds: [],
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items,
      placements,
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: coat, utility: null },
    quickSlots: { slots: [painkiller, null] },
    itemStates: { states: itemStates },
    condition: createPlayerCondition({
      currentHealth: 7,
      bleeding: false,
      openWounds: [],
      minorContusions: 1,
      painkillerActive: false,
      pendingInfectionExposures: 1,
    }, config.combat.player),
    dailyMedicalUsage: { disinfectantUsesToday: 1 },
    runIntelLog: {
      intelIds: input.sceneTaskCompleted
        ? ['intel-from-search', HOSPITAL_INTEL_IDS.pathogenCaseOrigin]
        : ['intel-from-search'],
    },
  }, dependencies)
  let combatState = initial.combatState
  let taskEvents = initial.taskEvents
  if (input.sceneTaskCompleted) {
    const encounter = combatState.encounters.find(
      ({ encounterId }) => encounterId === HOSPITAL_COMBAT_ENCOUNTER_IDS.infectedOrderly,
    )
    if (!encounter || encounter.kind !== 'dormant') throw new Error('expected dormant encounter')
    combatState = {
      ...combatState,
      encounters: [{
        ...encounter,
        enemy: {
          ...encounter.enemy,
          currentHealth: 0,
          defeated: true,
          hasBeenEncountered: true,
        },
      }],
    }
    taskEvents = {
      entries: [{
        eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval,
        status: 'completed',
      }],
    }
  }
  return {
    dependencies,
    snapshot: createSceneExplorationSnapshot({
      ...initial,
      status,
      condition: status === 'dead'
        ? createPlayerCondition({
            ...initial.condition,
            currentHealth: 0,
          }, config.combat.player)
        : initial.condition,
      combatState,
      taskEvents,
    }, dependencies),
  }
}

function storedInventory(input: Readonly<{
  warehouseItems?: readonly ItemInstance[]
  taskItems?: readonly ItemInstance[]
}> = {}) {
  const existing = item('existing-bandage', HOSPITAL_ITEM_IDS.bandage)
  const dependencies = {
    physicalCatalog: hospitalItemCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
  }
  const warehouseItems = input.warehouseItems ?? [existing]
  const taskItems = input.taskItems ?? []
  return createRunStoredInventorySnapshot({
    warehouse: { items: warehouseItems },
    taskStorage: { items: taskItems },
    itemStates: {
      states: [...warehouseItems, ...taskItems].map((candidate) =>
        createFullItemState(candidate, hospitalItemResourceCatalog),
      ),
    },
  }, dependencies)
}

function returnInput(
  input: Parameters<typeof terminalScene>[0] = {},
  inventory = storedInventory(),
): {
  request: RunReturnInput
  dependencies: RunReturnDependencies
} {
  const terminal = terminalScene(input)
  const dependencies: RunReturnDependencies = {
    scene: terminal.dependencies,
    lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
  }
  return {
    request: {
      terminalScene: terminal.snapshot,
      carryForward: restoreRunReturnCarryForwardSnapshot({
        continuity: continuity(terminal.snapshot.sceneInstanceId),
        storedInventory: inventory,
        returnLedger: { sceneInstanceIds: [] },
      }, dependencies),
    },
    dependencies,
  }
}

describe('hospital Run return settlement', () => {
  it('classifies all hospital items into strict return lifecycles', () => {
    expect(hospitalItemReturnLifecycleCatalog.definitionIds).toEqual(
      [...hospitalItemCatalog.definitionIds].sort(),
    )
    expect(hospitalItemReturnLifecycleCatalog.get(HOSPITAL_ITEM_IDS.isolationWardAccessCard).kind).toBe('permission')
    expect(hospitalItemReturnLifecycleCatalog.get(HOSPITAL_ITEM_IDS.sealedPathogenCase).kind).toBe('quest')
    expect(hospitalItemReturnLifecycleCatalog.get(HOSPITAL_ITEM_IDS.bandage).kind).toBe('ordinary')
    expect(() => createItemReturnLifecycleCatalog(
      hospitalItemReturnLifecycleProfiles.slice(1),
      hospitalItemCatalog,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createItemReturnLifecycleCatalog(
      [...hospitalItemReturnLifecycleProfiles, hospitalItemReturnLifecycleProfiles[0]!],
      hospitalItemCatalog,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createItemReturnLifecycleCatalog(
      [{ ...hospitalItemReturnLifecycleProfiles[0]!, unknown: true }, ...hospitalItemReturnLifecycleProfiles.slice(1)] as never,
      hospitalItemCatalog,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it.each(['safe-returned', 'forced-returned'] as const)(
    'moves only backpack items to the formal Run destinations after %s',
    (status) => {
      const { request, dependencies } = returnInput({ status })
      const result = resolveRunReturn(request, dependencies)
      expect(result.summary.returnKind).toBe(status === 'safe-returned' ? 'safe' : 'forced')
      expect(result.snapshot.player.backpack).toMatchObject({ items: [], placements: [] })
      expect(result.snapshot.warehouse.items.map(({ instanceId }) => instanceId)).toEqual([
        'existing-bandage',
        'returned-bandages',
        'returned-card',
        'returned-crowbar',
        'returned-flashlight',
        'returned-metal',
      ])
      expect(result.snapshot.taskStorage.items).toEqual([
        expect.objectContaining({
          instanceId: 'returned-sample',
          definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
          quantity: 1,
        }),
      ])
      expect(result.snapshot.player.equipment).toEqual(request.terminalScene.equipment)
      expect(result.snapshot.player.quickSlots).toEqual(request.terminalScene.quickSlots)
      expect(result.snapshot.itemStates.states).toEqual(expect.arrayContaining(
        [...request.terminalScene.itemStates.states],
      ))
      expect(result.snapshot.itemStates.states.find(({ instanceId }) => instanceId === 'returned-crowbar')?.resource).toEqual({ kind: 'durability', current: 1 })
      expect(result.snapshot.itemStates.states.find(({ instanceId }) => instanceId === 'returned-flashlight')?.resource).toEqual({ kind: 'charge', current: 2 })
      expect(result.snapshot.itemStates.states.find(({ instanceId }) => instanceId === 'equipped-pipe')?.resource).toEqual({ kind: 'durability', current: 1 })
      expect(result.snapshot.itemStates.states.find(({ instanceId }) => instanceId === 'equipped-coat')?.resource).toEqual({ kind: 'integrity', current: 2 })
      expect(result.snapshot.warehouse.items.filter(({ definitionId }) => definitionId === HOSPITAL_ITEM_IDS.bandage)).toHaveLength(2)
      expect(result.snapshot.runIntelLog).toEqual(request.terminalScene.runIntelLog)
      expect(result.snapshot.dailyMedicalUsage).toEqual({ disinfectantUsesToday: 1 })
      expect(result.snapshot.returnLedger.sceneInstanceIds).toEqual([SCENE_ID])
      expect(result.snapshot.continuity).toEqual(request.carryForward.continuity)
      expect(hasStoredTaskItem(result.snapshot.taskStorage, HOSPITAL_ITEM_IDS.sealedPathogenCase, 1)).toBe(true)
      expect(Object.isFrozen(result.snapshot)).toBe(true)
      expect(Object.isFrozen(result.snapshot.warehouse.items)).toBe(true)
      expect(Object.isFrozen(request)).toBe(false)
      expect(Object.isFrozen(request.carryForward.returnLedger)).toBe(true)
      expect(request.terminalScene.backpack.items).toHaveLength(6)
    },
  )

  it.each(['active', 'dead'] as const)(
    'rejects non-returnable scene status %s without changing any Run storage',
    (status) => {
      const { request, dependencies } = returnInput({ status })
      const before = structuredClone(request.carryForward.storedInventory)
      expect(() => buildRunReturnTransitionPlan(request, dependencies)).toThrowError(
        expect.objectContaining({ code: 'SCENE_NOT_RETURNABLE' }),
      )
      expect(request.carryForward.storedInventory).toEqual(before)
    },
  )

  it('rejects Return continuity for a different terminal scene', () => {
    const { request, dependencies } = returnInput()
    expect(() => resolveRunReturn({
      ...request,
      carryForward: {
        ...request.carryForward,
        continuity: { ...request.carryForward.continuity, sceneInstanceId: 'different-scene' },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects old scattered Return input and malformed carry-forward restoration', () => {
    const { request, dependencies } = returnInput()
    expect(() => resolveRunReturn({
      terminalScene: request.terminalScene,
      continuity: request.carryForward.continuity,
      storedInventory: request.carryForward.storedInventory,
      returnLedger: request.carryForward.returnLedger,
    } as never, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...request.carryForward,
      unknown: true,
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...request.carryForward,
      storedInventory: {
        ...request.carryForward.storedInventory,
        itemStates: { states: [] },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('strictly restores only complete carry-forward aggregates and rejects the legacy binding format', () => {
    const { request, dependencies } = returnInput()
    const carryForward = request.carryForward

    expect(restoreRunReturnCarryForwardSnapshot(carryForward, dependencies)).toEqual(carryForward)
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      binding: 'legacy-json-copy',
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    for (const field of ['continuity', 'storedInventory', 'returnLedger'] as const) {
      const incomplete = { ...carryForward }
      delete incomplete[field]
      expect(() => restoreRunReturnCarryForwardSnapshot(incomplete, dependencies))
        .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    }
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      continuity: { ...carryForward.continuity, currentDay: 0 },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      continuity: { ...carryForward.continuity, sceneInstanceId: '' },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      continuity: {
        ...carryForward.continuity,
        runIdentity: {
          ...carryForward.continuity.runIdentity,
          rulesVersion: 'hospital-rules-v2',
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      storedInventory: {
        ...carryForward.storedInventory,
        itemStates: { states: [] },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      storedInventory: {
        ...carryForward.storedInventory,
        itemStates: {
          states: [
            ...carryForward.storedInventory.itemStates.states,
            createFullItemState(item('extra-carry-forward-state', HOSPITAL_ITEM_IDS.metalParts), hospitalItemResourceCatalog),
          ],
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const duplicatedAcrossStorage = storedInventory({
      warehouseItems: [item('duplicated-storage-item', HOSPITAL_ITEM_IDS.bandage)],
      taskItems: [item('task-storage-item', HOSPITAL_ITEM_IDS.sealedPathogenCase)],
    })
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      storedInventory: {
        ...duplicatedAcrossStorage,
        taskStorage: {
          items: [{
            ...duplicatedAcrossStorage.taskStorage.items[0]!,
            instanceId: duplicatedAcrossStorage.warehouse.items[0]!.instanceId,
          }],
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => restoreRunReturnCarryForwardSnapshot({
      ...carryForward,
      returnLedger: { sceneInstanceIds: [SCENE_ID, SCENE_ID] },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects Return continuity whose rulesVersion differs from dependencies', () => {
    const { request, dependencies } = returnInput()
    expect(() => resolveRunReturn({
      ...request,
      carryForward: {
        ...request.carryForward,
        continuity: {
          ...request.carryForward.continuity,
          runIdentity: { ...request.carryForward.continuity.runIdentity, rulesVersion: 'hospital-rules-v2' },
        },
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('does not derive task completion from a completed SceneTaskEvent without a safely returned sample', () => {
    const { request, dependencies } = returnInput({
      includeSample: false,
      sceneTaskCompleted: true,
    })
    const result = resolveRunReturn(request, dependencies)
    expect(getStoredTaskItemQuantity(result.snapshot.taskStorage, HOSPITAL_ITEM_IDS.sealedPathogenCase)).toBe(0)
    expect(hasStoredTaskItem(result.snapshot.taskStorage, HOSPITAL_ITEM_IDS.sealedPathogenCase, 1)).toBe(false)
  })

  it('never stores scene remnants, unretrieved task items, or hidden search outcomes', () => {
    const { request, dependencies } = returnInput({
      includeSample: false,
      leaveTaskItem: true,
    })
    const result = resolveRunReturn(request, dependencies)
    expect(result.snapshot.warehouse.items.some(({ instanceId }) => instanceId === 'left-electronics')).toBe(false)
    expect(result.snapshot.taskStorage.items).toHaveLength(0)
    expect(result.summary.lostSceneTaskInstanceIds).toEqual(['left-sample'])
  })

  it('rejects repeat settlement by scene instance without duplicating inventory', () => {
    const { request, dependencies } = returnInput()
    const first = resolveRunReturn(request, dependencies)
    expect(() => resolveRunReturn({
      ...request,
      carryForward: bindRunReturnCarryForwardToScene(
        projectRunReturnCarryForwardFromRunReturn(first.snapshot, dependencies),
        request.terminalScene.sceneInstanceId,
        dependencies,
      ),
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'RETURN_ALREADY_SETTLED' }))
  })

  it('projects stored inventory from the unified Run item-state source', () => {
    const { request, dependencies } = returnInput()
    const settled = resolveRunReturn(request, dependencies).snapshot
    const before = structuredClone(settled)
    const projection = projectRunStoredInventory(settled, dependencies)

    expect(projection.warehouse.items).toEqual(settled.warehouse.items)
    expect(projection.taskStorage.items).toEqual(settled.taskStorage.items)
    expect(projection.itemStates.states.find(({ instanceId }) => instanceId === 'returned-crowbar')?.resource)
      .toEqual({ kind: 'durability', current: 1 })
    expect(projection.itemStates.states.find(({ instanceId }) => instanceId === 'returned-sample')?.resource)
      .toEqual({ kind: 'none' })
    expect(projection.itemStates.states.some(({ instanceId }) =>
      ['equipped-pipe', 'equipped-coat', 'quick-painkiller'].includes(instanceId),
    )).toBe(false)
    expect(settled.itemStates.states.find(({ instanceId }) => instanceId === 'equipped-pipe')?.resource)
      .toEqual({ kind: 'durability', current: 1 })
    expect(settled.itemStates.states.find(({ instanceId }) => instanceId === 'quick-painkiller')?.resource)
      .toEqual({ kind: 'none' })
    expect(settled).toEqual(before)
    expect(Object.isFrozen(projection)).toBe(true)
  })

  it('rejects Run Storage instance IDs reused anywhere in the terminal Scene', () => {
    const terminal = terminalScene({ leaveTaskItem: true })
    const groundItems = terminal.snapshot.sceneItems.nodeStates.flatMap(({ items }) => items)
    const unsearchedItem = terminal.snapshot.searchState.nodeStates
      .find((node) => node.kind === 'unsearched')
      ?.preparedOutcome.revealedItems[0]?.item
    const cases: readonly Readonly<{
      item: ItemInstance
      destination: 'warehouse' | 'task-storage'
    }>[] = [
      { item: terminal.snapshot.backpack.items[0]!, destination: 'warehouse' },
      { item: terminal.snapshot.equipment.weapon!, destination: 'warehouse' },
      { item: terminal.snapshot.quickSlots.slots[0]!, destination: 'warehouse' },
      { item: groundItems.find(({ item }) => item.instanceId === 'left-electronics')!.item, destination: 'warehouse' },
      { item: groundItems.find(({ item }) => item.instanceId === 'left-sample')!.item, destination: 'task-storage' },
      { item: unsearchedItem!, destination: 'warehouse' },
    ]

    expect(unsearchedItem).toBeDefined()
    for (const candidate of cases) {
      const inventory = candidate.destination === 'warehouse'
        ? storedInventory({ warehouseItems: [candidate.item] })
        : storedInventory({ taskItems: [candidate.item] })
      const request: RunReturnInput = {
        terminalScene: terminal.snapshot,
        carryForward: restoreRunReturnCarryForwardSnapshot({
          continuity: continuity(terminal.snapshot.sceneInstanceId),
          storedInventory: inventory,
          returnLedger: { sceneInstanceIds: [] },
        }, {
          scene: terminal.dependencies,
          lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
        }),
      }
      const before = structuredClone(inventory)
      expect(() => resolveRunReturn(request, {
        scene: terminal.dependencies,
        lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
      })).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
      expect(inventory).toEqual(before)
    }
  })

  it('rejects tampered or incomplete Effects before applying any transfer', () => {
    const { request, dependencies } = returnInput()
    const plan = buildRunReturnTransitionPlan(request, dependencies)
    const sampleIndex = plan.effects.findIndex((effect) =>
      effect.kind === 'run-item-transferred' && effect.item.definitionId === HOSPITAL_ITEM_IDS.sealedPathogenCase,
    )
    const tamperedDestination = plan.effects.map((effect, index): RunReturnEffect =>
      index === sampleIndex && effect.kind === 'run-item-transferred'
        ? { ...effect, destination: 'warehouse' }
        : effect,
    )
    const withoutLedger = plan.effects.filter(({ kind }) => kind !== 'run-return-recorded')
    const changedFacts = plan.effects.map((effect): RunReturnEffect =>
      effect.kind === 'run-facts-carried-forward'
        ? { ...effect, runIntelLog: { intelIds: [] } }
        : effect,
    )
    const changedContinuity = plan.effects.map((effect): RunReturnEffect =>
      effect.kind === 'run-facts-carried-forward'
        ? {
            ...effect,
            continuity: {
              ...effect.continuity,
              runIdentity: { ...effect.continuity.runIdentity, runId: 'other-run' },
            },
          }
        : effect,
    )
    const changedQuantity = plan.effects.map((effect): RunReturnEffect =>
      effect.kind === 'run-item-transferred' && effect.item.instanceId === 'returned-bandages'
        ? { ...effect, item: { ...effect.item, quantity: effect.item.quantity + 1 } }
        : effect,
    )
    const changedResource = plan.effects.map((effect): RunReturnEffect =>
      effect.kind === 'run-item-transferred' && effect.item.instanceId === 'returned-crowbar'
        ? { ...effect, itemState: { ...effect.itemState, resource: { kind: 'durability', current: 0 } } }
        : effect,
    )
    const withoutTransfer = plan.effects.filter((effect) =>
      effect.kind !== 'run-item-transferred' || effect.item.instanceId !== 'returned-metal',
    )
    expect(() => applyRunReturnEffects(request, tamperedDestination, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunReturnEffects(request, withoutLedger, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunReturnEffects(request, changedFacts, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunReturnEffects(request, changedContinuity, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    for (const continuityField of ['seed', 'rulesVersion'] as const) {
      const changed = plan.effects.map((effect): RunReturnEffect =>
        effect.kind === 'run-facts-carried-forward'
          ? {
              ...effect,
              continuity: {
                ...effect.continuity,
                runIdentity: { ...effect.continuity.runIdentity, [continuityField]: `other-${continuityField}` },
              },
            }
          : effect,
      )
      expect(() => applyRunReturnEffects(request, changed, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    }
    for (const field of ['currentDay', 'sceneInstanceId'] as const) {
      const changed = plan.effects.map((effect): RunReturnEffect =>
        effect.kind === 'run-facts-carried-forward'
          ? {
              ...effect,
              continuity: {
                ...effect.continuity,
                [field]: field === 'currentDay' ? effect.continuity.currentDay + 1 : 'other-scene',
              },
            }
          : effect,
      )
      expect(() => applyRunReturnEffects(request, changed, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    }
    expect(() => applyRunReturnEffects(request, changedQuantity, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunReturnEffects(request, changedResource, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunReturnEffects(request, withoutTransfer, dependencies)).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(request.carryForward.storedInventory.warehouse.items).toHaveLength(1)
  })

  it('strictly rejects wrong destinations, duplicate instances, and incomplete ItemState ownership', () => {
    const storageDependencies = {
      physicalCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
    }
    const sample = item('sample-in-warehouse', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [sample] },
      taskStorage: { items: [] },
      itemStates: { states: [createFullItemState(sample, hospitalItemResourceCatalog)] },
    }, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const ordinary = item('ordinary-in-task', HOSPITAL_ITEM_IDS.bandage)
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [] },
      taskStorage: { items: [ordinary] },
      itemStates: { states: [createFullItemState(ordinary, hospitalItemResourceCatalog)] },
    }, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const duplicate = item('duplicate', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [{ ...duplicate, definitionId: HOSPITAL_ITEM_IDS.bandage }] },
      taskStorage: { items: [duplicate] },
      itemStates: { states: [createFullItemState(duplicate, hospitalItemResourceCatalog)] },
    }, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [ordinary] },
      taskStorage: { items: [] },
      itemStates: { states: [] },
    }, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const extra = item('extra-state', HOSPITAL_ITEM_IDS.metalParts)
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [ordinary] },
      taskStorage: { items: [] },
      itemStates: { states: [
        createFullItemState(ordinary, hospitalItemResourceCatalog),
        createFullItemState(extra, hospitalItemResourceCatalog),
      ] },
    }, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [ordinary] },
      taskStorage: { items: [] },
      itemStates: { states: [createFullItemState({
        instanceId: ordinary.instanceId,
        definitionId: HOSPITAL_ITEM_IDS.metalParts,
      }, hospitalItemResourceCatalog)] },
    }, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunStoredInventorySnapshot({
      warehouse: { items: [] },
      taskStorage: { items: [] },
      itemStates: { states: [] },
      unknown: true,
    } as never, storageDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunStoredInventorySnapshot(null as never, storageDependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    )
    expect(() => createRunReturnLedgerSnapshot({
      sceneInstanceIds: [SCENE_ID, SCENE_ID],
    })).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunReturnLedgerSnapshot({
      sceneInstanceIds: [],
      unknown: true,
    } as never)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('strictly restores only complete and internally consistent Run return snapshots', () => {
    const { request, dependencies } = returnInput()
    const settled = resolveRunReturn(request, dependencies).snapshot
    const input = () => structuredClone(settled)

    const nonEmptyBackpack = input()
    expect(() => createRunReturnSnapshot({
      ...nonEmptyBackpack,
      player: {
        ...nonEmptyBackpack.player,
        backpack: request.terminalScene.backpack,
      },
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const warehouseEquipmentDuplicate = input()
    expect(() => createRunReturnSnapshot({
      ...warehouseEquipmentDuplicate,
      warehouse: {
        items: [{
          ...warehouseEquipmentDuplicate.warehouse.items[0]!,
          instanceId: warehouseEquipmentDuplicate.player.equipment.weapon!.instanceId,
        }, ...warehouseEquipmentDuplicate.warehouse.items.slice(1)],
      },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const taskQuickSlotDuplicate = input()
    expect(() => createRunReturnSnapshot({
      ...taskQuickSlotDuplicate,
      taskStorage: {
        items: [{
          ...taskQuickSlotDuplicate.taskStorage.items[0]!,
          instanceId: taskQuickSlotDuplicate.player.quickSlots.slots[0]!.instanceId,
        }],
      },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const missingState = input()
    expect(() => createRunReturnSnapshot({
      ...missingState,
      itemStates: { states: missingState.itemStates.states.slice(1) },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const extraState = input()
    expect(() => createRunReturnSnapshot({
      ...extraState,
      itemStates: {
        states: [
          ...extraState.itemStates.states,
          createFullItemState(item('extra-run-state', HOSPITAL_ITEM_IDS.metalParts), hospitalItemResourceCatalog),
        ],
      },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const definitionMismatch = input()
    const storedItem = definitionMismatch.warehouse.items[0]!
    expect(() => createRunReturnSnapshot({
      ...definitionMismatch,
      itemStates: {
        states: definitionMismatch.itemStates.states.map((state) =>
          state.instanceId === storedItem.instanceId
            ? createFullItemState({
                instanceId: state.instanceId,
                definitionId: HOSPITAL_ITEM_IDS.metalParts,
              }, hospitalItemResourceCatalog)
            : state,
        ),
      },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const wrongLifecycle = input()
    expect(() => createRunReturnSnapshot({
      ...wrongLifecycle,
      warehouse: {
        items: [
          ...wrongLifecycle.warehouse.items,
          wrongLifecycle.taskStorage.items[0]!,
        ],
      },
      taskStorage: { items: [] },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const duplicateLedger = input()
    expect(() => createRunReturnSnapshot({
      ...duplicateLedger,
      returnLedger: { sceneInstanceIds: [SCENE_ID, SCENE_ID] },
    }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    expect(() => createRunReturnSnapshot({
      ...input(),
      unknown: true,
    } as never, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunReturnSnapshot(null as never, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })
})
