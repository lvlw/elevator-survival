import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_OBSTACLE_IDS,
  HOSPITAL_TASK_EVENT_IDS,
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
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState, getItemState } from '../../core/item-state'
import { classifyLoad } from '../../core/load'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import { resolveRunFailure } from '../../core/run-termination'
import { addSceneItems, getSceneNodeItems } from '../../core/scene-items'
import * as sceneCore from '../../core/scene-exploration'
import {
  createSceneExplorationSnapshot,
  type SceneExplorationSnapshot,
  type SceneInventoryCommand,
} from '../../core/scene-exploration'
import * as sceneLaunchCore from '../../core/scene-launch'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
  resolveSceneLaunch,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import { StableRunCommandExecutionError } from '../command-execution'
import {
  executeStableRunLifecycleCommand,
  StableRunLifecycleError,
} from '../run-lifecycle'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  hospitalSceneLaunchDependencies,
  loadRunPhase,
  MemoryRunSaveStorage,
  saveRunPhase,
  type RunSaveStorage,
  type StableRunPhase,
} from '../run-save'
import {
  createStableRunSceneCommand,
  executeStableRunSceneCommand,
  StableRunSceneError,
  type StableRunSceneCommand,
} from '.'

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

interface HubOptions {
  readonly backpackItems?: readonly ItemInstance[]
  readonly placements?: readonly BackpackPlacement[]
  readonly quickSlots?: readonly (ItemInstance | null)[]
  readonly health?: number
  readonly bleeding?: boolean
  readonly minorContusions?: number
  readonly utility?: ItemInstance
  readonly mainSceneUsedToday?: boolean
}

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const flashlight = item('scene-router-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const utility = options.utility ?? flashlight
  const backpackItems = options.backpackItems ?? []
  const quickSlots = options.quickSlots ?? [null, null]
  const carried = [
    ...backpackItems,
    utility,
    ...quickSlots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-scene-routing',
        seed: 'seed-scene-routing',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: 2,
      sceneInstanceId: 'returned-before-scene-routing',
    },
    runLoadout: createRunLoadoutSnapshot({
      warehouse: { items: [] },
      taskStorage: { items: [] },
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: backpackItems,
        placements: options.placements ?? [],
      }, hospitalItemCatalog),
      equipment: { weapon: null, armor: null, utility },
      quickSlots: createQuickSlotSnapshot(
        quickSlots,
        config.backpack.quickSlotCount,
        hospitalItemCatalog,
        hospitalItemQuickSlotCatalog,
      ),
      itemStates: {
        states: carried.map((candidate) =>
          createFullItemState(candidate, hospitalItemResourceCatalog),
        ),
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
        ? [{ id: 'scene-router-wound', kind: 'laceration', treatment: 'untreated' }]
        : [],
      minorContusions: options.minorContusions ?? 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    runIntelLog: { intelIds: [] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 3,
      mainSceneUsedToday: options.mainSceneUsedToday ?? false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 },
    satiety: { current: 6 },
    returnLedger: { sceneInstanceIds: ['returned-before-scene-routing'] },
  }, hospitalCurrentDayHubDependencies)
}

function launch(start = hub()): RunSceneSessionSnapshot {
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
  if (settlement.outcome.kind !== 'terminal') {
    throw new Error('expected terminal daily settlement')
  }
  const failure = resolveRunFailure({
    kind: 'daily-settlement-terminal',
    terminalSnapshot: settlement.outcome.snapshot,
  }, hospitalRunTerminationDependencies)
  return { kind: 'run-failure', payload: failure.snapshot }
}

function trackedStorage(initialPhase: StableRunPhase): Readonly<{
  backing: MemoryRunSaveStorage
  storage: RunSaveStorage
  counters: { writes: number }
  failNextWrite(): void
}> {
  const backing = new MemoryRunSaveStorage()
  saveRunPhase(backing, initialPhase, hospitalRunSaveRulesRegistry)
  const counters = { writes: 0 }
  let fail = false
  return {
    backing,
    counters,
    failNextWrite() { fail = true },
    storage: {
      read: () => backing.read(),
      write: (serialized) => {
        counters.writes += 1
        if (fail) {
          fail = false
          throw new Error('scene router write failed')
        }
        backing.write(serialized)
      },
      clear: () => backing.clear(),
    },
  }
}

function requireScene(phase: StableRunPhase): RunSceneSessionSnapshot {
  if (phase.kind !== 'scene-session') throw new Error('expected scene-session')
  return phase.payload
}

const legalCommands = Object.freeze([
  { kind: 'scene-move', command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall } },
  { kind: 'scene-main-search', command: { illumination: 'search-without-flashlight' } },
  {
    kind: 'scene-node-item-pickup',
    command: {
      nodeItemInstanceId: 'ground-item',
      quantity: 1,
      placement: { x: 0, y: 0, rotated: false },
    },
  },
  {
    kind: 'scene-inventory',
    command: { kind: 'drop-scene-backpack-item', instanceId: 'backpack-item' },
  },
  { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } },
  {
    kind: 'scene-obstacle',
    command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.decline },
  },
  {
    kind: 'scene-task-event',
    command: { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, optionId: 'decline' },
  },
  {
    kind: 'scene-medical',
    command: { source: { container: 'backpack', itemInstanceId: 'medical-item' } },
  },
  {
    kind: 'scene-battery',
    command: { batteryInstanceId: 'battery-item', targetInstanceId: 'flashlight-item' },
  },
  {
    kind: 'scene-combat-action',
    command: { kind: 'defend' },
  },
] as const)

function phaseFromScene(
  session: RunSceneSessionSnapshot,
  scene: SceneExplorationSnapshot,
): StableRunPhase {
  return {
    kind: 'scene-session',
    payload: createRunSceneSessionSnapshot({
      context: session.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('strict Stable Run Scene command routing', () => {
  it.each(legalCommands)('normalizes and freezes $kind', (input) => {
    const command = createStableRunSceneCommand(input)
    expect(command).toEqual(input)
    expect(command).not.toBe(input)
    expect(command.command).not.toBe(input.command)
    expect(Object.isFrozen(command)).toBe(true)
    expect(Object.isFrozen(command.command)).toBe(true)
  })

  it.each([
    null,
    [],
    {},
    { kind: 'unknown', command: {} },
    { kind: 'scene-move' },
    { kind: 'scene-move', command: { edgeId: 'edge' }, extra: true },
    { kind: 'scene-move', command: { edgeId: 'edge', effects: [] } },
    { kind: 'scene-move', command: { illumination: 'search-without-flashlight' } },
    { kind: 'scene-main-search', command: { illumination: 'search-without-flashlight', result: {} } },
    { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' }, nextPhase: 'hub' },
    { kind: 'scene-inventory', command: { kind: 'drop-scene-backpack-item', instanceId: 'item' }, savePolicy: 'skip' },
    new (class SceneCommand {
      public readonly kind = 'scene-withdraw'
      public readonly command = { kind: 'withdraw-from-scene' }
    })(),
  ])('rejects malformed application command %#', (input) => {
    expect(() => createStableRunSceneCommand(input)).toThrowError(
      expect.objectContaining<Partial<StableRunSceneError>>({ code: 'INVALID_COMMAND' }),
    )
  })

  it.each(legalCommands)('rejects $kind from Hub without saving', (command) => {
    const start: StableRunPhase = { kind: 'current-day-hub', payload: hub() }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command,
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining<Partial<StableRunSceneError>>({
      code: 'COMMAND_NOT_AVAILABLE',
    }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each(legalCommands)('delegates terminal rejection for $kind to the generic executor', (command) => {
    const start = failurePhase()
    const tracked = trackedStorage(start)
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command,
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining<Partial<StableRunCommandExecutionError>>({
      code: 'TERMINAL_PHASE',
    }))
    expect(tracked.counters.writes).toBe(0)
  })

  it('routes one canonical headless chain through Save and lifecycle settlement', () => {
    const bandage = item('chain-bandage', HOSPITAL_ITEM_IDS.bandage)
    let phase: StableRunPhase = {
      kind: 'current-day-hub',
      payload: hub({
        backpackItems: [bandage],
        placements: [{ instanceId: bandage.instanceId, x: 0, y: 0, rotated: false }],
      }),
    }
    const tracked = trackedStorage(phase)
    const identity = phase.payload.continuity.runIdentity
    let writes = 0

    const launched = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'launch-main-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = launched.phase
    writes += 1
    expect(tracked.counters.writes).toBe(writes)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    const sceneInstanceId = requireScene(phase).scene.sceneInstanceId

    for (const command of [
      {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
      {
        kind: 'scene-main-search',
        command: { illumination: 'search-without-flashlight' },
      },
    ] as const) {
      const execution = executeStableRunSceneCommand({
        currentPhase: phase,
        command,
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      })
      phase = execution.phase
      writes += 1
      expect(tracked.counters.writes).toBe(writes)
      expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
      expect(requireScene(phase).scene.sceneInstanceId).toBe(sceneInstanceId)
    }

    const searched = requireScene(phase).scene
    const savedAfterSearch = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: phase,
      command: {
        kind: 'scene-main-search',
        command: { illumination: 'search-without-flashlight' },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrow()
    expect(tracked.counters.writes).toBe(writes)
    expect(tracked.backing.read()).toBe(savedAfterSearch)
    const metal = getSceneNodeItems(
      searched.sceneItems,
      HOSPITAL_NODE_IDS.emergencyHall,
    ).find(({ item: candidate }) => candidate.definitionId === HOSPITAL_ITEM_IDS.metalParts)
    if (!metal) throw new Error('expected deterministic metal-parts result')
    const intelAfterSearch = searched.runIntelLog

    const picked = executeStableRunSceneCommand({
      currentPhase: phase,
      command: {
        kind: 'scene-node-item-pickup',
        command: {
          nodeItemInstanceId: metal.item.instanceId,
          quantity: 1,
          placement: { x: 1, y: 0, rotated: false },
        },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = picked.phase
    writes += 1
    expect(tracked.counters.writes).toBe(writes)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    expect(requireScene(phase).scene.runIntelLog).toEqual(intelAfterSearch)
    expect(requireScene(phase).scene.backpack.items).toContainEqual(metal.item)

    const organized = executeStableRunSceneCommand({
      currentPhase: phase,
      command: {
        kind: 'scene-inventory',
        command: {
          kind: 'scene-backpack-to-quick-slot',
          instanceId: bandage.instanceId,
          targetSlotIndex: 0,
        },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = organized.phase
    writes += 1
    expect(tracked.counters.writes).toBe(writes)
    expect(requireScene(phase).scene.quickSlots.slots[0]?.instanceId).toBe(bandage.instanceId)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)

    const withdrawn = executeStableRunSceneCommand({
      currentPhase: phase,
      command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = withdrawn.phase
    writes += 1
    expect(tracked.counters.writes).toBe(writes)
    expect(phase.kind).toBe('scene-session')
    expect(requireScene(phase).scene.status).toBe('safe-returned')
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)

    const settled = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = settled.phase
    writes += 1
    expect(tracked.counters.writes).toBe(writes)
    expect(phase.kind).toBe('current-day-hub')
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    if (phase.kind !== 'current-day-hub') throw new Error('expected returned Hub')
    expect(phase.payload.continuity.runIdentity).toEqual(identity)
    expect(phase.payload.dailyState.mainSceneUsedToday).toBe(true)
  })

  it('rejects a core-invalid move without saving the old Scene', () => {
    const start: StableRunPhase = { kind: 'scene-session', payload: launch() }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-move', command: { edgeId: 'unknown-edge' } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrow()
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each([
    {
      kind: 'scene-node-item-pickup',
      command: {
        nodeItemInstanceId: 'ground-item',
        quantity: 0,
        placement: { x: 0, y: 0, rotated: false },
      },
    },
    {
      kind: 'scene-node-item-pickup',
      command: {
        nodeItemInstanceId: 'ground-item',
        quantity: 1,
        placement: { x: -1, y: 0, rotated: false },
      },
    },
  ])('rejects invalid pickup structure without saving %#', (command) => {
    const start: StableRunPhase = { kind: 'scene-session', payload: launch() }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command,
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_COMMAND' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('keeps quest dropping behind the explicit confirmation command', () => {
    const sample = item('unconfirmed-quest-drop', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    const start: StableRunPhase = {
      kind: 'scene-session',
      payload: launch(hub({
        backpackItems: [sample],
        placements: [{ instanceId: sample.instanceId, x: 0, y: 0, rotated: false }],
      })),
    }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command: {
        kind: 'scene-inventory',
        command: { kind: 'drop-scene-backpack-item', instanceId: sample.instanceId },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrow()
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })
})

describe('all formal Scene inventory variants through the Stable Run router', () => {
  const bandageA = item('inventory-bandage-a', HOSPITAL_ITEM_IDS.bandage, 2)
  const bandageB = item('inventory-bandage-b', HOSPITAL_ITEM_IDS.bandage)
  const battery = item('inventory-battery', HOSPITAL_ITEM_IDS.standardBattery)
  const sample = item('inventory-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)

  const cases: readonly Readonly<{
    name: string
    options: HubOptions
    command: SceneInventoryCommand
  }>[] = [
    {
      name: 'move backpack item',
      options: {
        backpackItems: [battery],
        placements: [{ instanceId: battery.instanceId, x: 0, y: 0, rotated: false }],
      },
      command: {
        kind: 'move-scene-backpack-item',
        instanceId: battery.instanceId,
        placement: { instanceId: battery.instanceId, x: 2, y: 0, rotated: false },
      },
    },
    {
      name: 'split stack',
      options: {
        backpackItems: [bandageA],
        placements: [{ instanceId: bandageA.instanceId, x: 0, y: 0, rotated: false }],
      },
      command: {
        kind: 'split-scene-backpack-stack',
        sourceInstanceId: bandageA.instanceId,
        quantity: 1,
        placement: { x: 2, y: 0, rotated: false },
      },
    },
    {
      name: 'merge stacks',
      options: {
        backpackItems: [
          item(bandageA.instanceId, bandageA.definitionId),
          bandageB,
        ],
        placements: [
          { instanceId: bandageA.instanceId, x: 0, y: 0, rotated: false },
          { instanceId: bandageB.instanceId, x: 1, y: 0, rotated: false },
        ],
      },
      command: {
        kind: 'merge-scene-backpack-stacks',
        sourceInstanceId: bandageA.instanceId,
        targetInstanceId: bandageB.instanceId,
        quantity: 1,
      },
    },
    {
      name: 'backpack to quick slot',
      options: {
        backpackItems: [bandageB],
        placements: [{ instanceId: bandageB.instanceId, x: 0, y: 0, rotated: false }],
      },
      command: {
        kind: 'scene-backpack-to-quick-slot',
        instanceId: bandageB.instanceId,
        targetSlotIndex: 0,
      },
    },
    {
      name: 'quick slot to backpack',
      options: { quickSlots: [bandageB, null] },
      command: {
        kind: 'scene-quick-slot-to-backpack',
        sourceSlotIndex: 0,
        placement: { x: 0, y: 0, rotated: false },
      },
    },
    {
      name: 'drop ordinary item',
      options: {
        backpackItems: [battery],
        placements: [{ instanceId: battery.instanceId, x: 0, y: 0, rotated: false }],
      },
      command: { kind: 'drop-scene-backpack-item', instanceId: battery.instanceId },
    },
    {
      name: 'confirmed quest item drop',
      options: {
        backpackItems: [sample],
        placements: [{ instanceId: sample.instanceId, x: 0, y: 0, rotated: false }],
      },
      command: { kind: 'confirm-drop-scene-quest-item', instanceId: sample.instanceId },
    },
  ]

  it.each(cases)('routes $name with one save and strict reload', ({ options, command }) => {
    const start: StableRunPhase = {
      kind: 'scene-session',
      payload: launch(hub(options)),
    }
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-inventory', command },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('scene-session')
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(
      execution.phase,
    )
    const scene = requireScene(execution.phase).scene
    expect(scene.sceneInstanceId).toBe(start.payload.scene.sceneInstanceId)
    if (command.kind === 'drop-scene-backpack-item' ||
      command.kind === 'confirm-drop-scene-quest-item') {
      expect(getSceneNodeItems(scene.sceneItems, scene.currentNodeId).some(
        ({ item: candidate }) => candidate.instanceId === command.instanceId,
      )).toBe(true)
    }
  })
})

describe('Scene quick-slot to backpack carry limit', () => {
  function carryLimitSession(backpackWeight: 27 | 28): RunSceneSessionSnapshot {
    const stackQuantities = backpackWeight === 27
      ? [4, 4, 4, 4, 4, 4, 3]
      : [4, 4, 4, 4, 4, 4, 4]
    const backpackItems = stackQuantities.map((quantity, index) => item(
      `carry-limit-battery-${index}`,
      HOSPITAL_ITEM_IDS.standardBattery,
      quantity,
    ))
    const placements = backpackItems.map((candidate, index) => ({
      instanceId: candidate.instanceId,
      x: index % config.backpack.width,
      y: Math.floor(index / config.backpack.width),
      rotated: false,
    }))
    return launch(hub({
      backpackItems,
      placements,
      quickSlots: [item(
        'carry-limit-quick-bandage',
        HOSPITAL_ITEM_IDS.bandage,
      ), null],
    }))
  }

  const command = {
    kind: 'scene-quick-slot-to-backpack' as const,
    sourceSlotIndex: 0,
    placement: { x: 1, y: 1, rotated: false },
  }

  it('allows the configured carryable overloaded boundary and preserves identity', () => {
    const session = carryLimitSession(27)
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const before = session.scene
    const quickItem = before.quickSlots.slots[0]!
    const quickState = getItemState(before.itemStates, quickItem.instanceId)

    const preview = sceneCore.previewSceneInventoryCommand(
      before,
      command,
      runtime.dependencies,
    )
    expect(preview.canExecute).toBe(true)

    const resolution = sceneCore.resolveSceneInventoryCommand(
      before,
      command,
      runtime.dependencies,
    )
    const after = resolution.snapshot
    const backpackWeight = calculateBackpackWeightSubtotal(
      after.backpack,
      hospitalItemCatalog,
    )
    expect(backpackWeight).toBe(28)
    expect(classifyLoad(backpackWeight, config.backpack)).toMatchObject({
      tier: 'overloaded',
      canCarry: true,
    })
    expect(after.quickSlots.slots[0]).toBeNull()
    expect(after.backpack.items.find(
      ({ instanceId }) => instanceId === quickItem.instanceId,
    )).toEqual(quickItem)
    expect(getItemState(after.itemStates, quickItem.instanceId)).toEqual(quickState)
    expect(after.remainingTime).toBe(before.remainingTime)
    expect(after.condition.currentHealth).toBe(before.condition.currentHealth)
    expect(after.status).toBe('active')
  })

  it('rejects the configured cannot-carry boundary consistently in Preview and Resolution', () => {
    const session = carryLimitSession(28)
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const before = session.scene
    const beforeQuickItem = before.quickSlots.slots[0]
    const beforeBackpack = before.backpack
    const beforeItemStates = before.itemStates

    expect(sceneCore.previewSceneInventoryCommand(
      before,
      command,
      runtime.dependencies,
    )).toEqual({ canExecute: false, rejectionCode: 'CANNOT_CARRY' })
    expect(() => sceneCore.resolveSceneInventoryCommand(
      before,
      command,
      runtime.dependencies,
    )).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
    expect(before.quickSlots.slots[0]).toBe(beforeQuickItem)
    expect(before.backpack).toBe(beforeBackpack)
    expect(before.itemStates).toBe(beforeItemStates)
  })

  it('rejects cannot-carry through Stable Run without committing or saving', () => {
    const session = carryLimitSession(28)
    const phase: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(phase)
    const savedBefore = tracked.backing.read()

    expect(() => executeStableRunSceneCommand({
      currentPhase: phase,
      command: { kind: 'scene-inventory', command },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(savedBefore)
    expect(phase).toEqual({ kind: 'scene-session', payload: session })
  })
})

describe('pickup identity, terminal action, and persistence failure routing', () => {
  it('preserves a core-derived partial pickup identity and ItemState through reload', () => {
    const launched = launch()
    const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
    const ground = item('router-ground-bandage', HOSPITAL_ITEM_IDS.bandage, 2)
    const scene = createSceneExplorationSnapshot({
      ...launched.scene,
      sceneItems: addSceneItems(
        launched.scene.sceneItems,
        launched.scene.currentNodeId,
        [{ item: ground, state: createFullItemState(ground, hospitalItemResourceCatalog) }],
        {
          graph: runtime.dependencies.graph,
          itemCatalog: hospitalItemCatalog,
          itemResourceCatalog: hospitalItemResourceCatalog,
        },
      ),
    }, runtime.dependencies)
    const start: StableRunPhase = {
      kind: 'scene-session',
      payload: createRunSceneSessionSnapshot(
        { context: launched.context, scene },
        hospitalSceneLaunchDependencies,
      ),
    }
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: {
        kind: 'scene-node-item-pickup',
        command: {
          nodeItemInstanceId: ground.instanceId,
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const after = requireScene(execution.phase).scene
    const extracted = after.backpack.items[0]
    expect(extracted?.instanceId).toContain('scene-node-pickup-split:')
    expect(after.itemStates.states.some(
      ({ instanceId }) => instanceId === extracted?.instanceId,
    )).toBe(true)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(
      execution.phase,
    )
  })

  it('saves a search-produced terminal Scene before a later lifecycle settlement', () => {
    const launched = launch()
    const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
    const moved = sceneCore.resolveSceneMoveCommand(
      launched.scene,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      runtime.dependencies,
    ).snapshot
    const scene = createSceneExplorationSnapshot(
      { ...moved, remainingTime: 1 },
      runtime.dependencies,
    )
    let phase: StableRunPhase = {
      kind: 'scene-session',
      payload: createRunSceneSessionSnapshot(
        { context: launched.context, scene },
        hospitalSceneLaunchDependencies,
      ),
    }
    const tracked = trackedStorage(phase)
    const execution = executeStableRunSceneCommand({
      currentPhase: phase,
      command: {
        kind: 'scene-main-search',
        command: { illumination: 'search-without-flashlight' },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = execution.phase
    expect(phase.kind).toBe('scene-session')
    expect(requireScene(phase).scene.status).toBe('forced-returned')
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    expect(tracked.counters.writes).toBe(1)

    const settled = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(settled.phase.kind).toBe('current-day-hub')
    expect(tracked.counters.writes).toBe(2)
  })

  it('returns an ongoing committed Scene after one failed write without rerunning Move', () => {
    const start: StableRunPhase = { kind: 'scene-session', payload: launch() }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    const resolver = vi.spyOn(sceneCore, 'resolveSceneMoveCommand')
    tracked.failNextWrite()
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(requireScene(execution.phase).scene.currentNodeId).toBe(
      HOSPITAL_NODE_IDS.emergencyHall,
    )
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('returns a terminal committed Scene after one failed write without rerunning withdrawal', () => {
    const launched = launch()
    const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
    const hall = sceneCore.resolveSceneMoveCommand(
      launched.scene,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      runtime.dependencies,
    ).snapshot
    const start: StableRunPhase = {
      kind: 'scene-session',
      payload: createRunSceneSessionSnapshot(
        { context: launched.context, scene: hall },
        hospitalSceneLaunchDependencies,
      ),
    }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    const resolver = vi.spyOn(sceneLaunchCore, 'resolveRunSceneSessionWithdrawal')
    tracked.failNextWrite()
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(requireScene(execution.phase).scene.status).toBe('safe-returned')
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('leaves combat withdrawal rejection to core and preserves storage', () => {
    const card = item('combat-access-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const launched = launch(hub({
      backpackItems: [card],
      placements: [{ instanceId: card.instanceId, x: 0, y: 0, rotated: false }],
    }))
    const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
    const hall = sceneCore.resolveSceneMoveCommand(
      launched.scene,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      runtime.dependencies,
    ).snapshot
    const security = sceneCore.resolveSceneMoveCommand(
      hall,
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice },
      runtime.dependencies,
    ).snapshot
    const combat = sceneCore.resolveSceneMoveCommand(
      security,
      { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor },
      runtime.dependencies,
    ).snapshot
    const start: StableRunPhase = {
      kind: 'scene-session',
      payload: createRunSceneSessionSnapshot(
        { context: launched.context, scene: combat },
        hospitalSceneLaunchDependencies,
      ),
    }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrow()
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('routes obstacle decline, force entry, and keeps direct core risk facts through Save', () => {
    const session = launch()
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const atDoor = sceneCore.resolveSceneMoveCommand(
      session.scene,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      runtime.dependencies,
    ).snapshot
    const start = phaseFromScene(session, atDoor)
    const tracked = trackedStorage(start)
    const forceCommand = {
      kind: 'scene-obstacle' as const,
      command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry },
    }
    const direct = sceneCore.resolveSceneObstacleOptionCommand(atDoor, forceCommand.command, runtime.dependencies)
    const forced = executeStableRunSceneCommand({ currentPhase: start, command: forceCommand, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    expect(requireScene(forced.phase).scene).toEqual(direct.snapshot)
    expect(forced.result).toMatchObject({ result: { riskTrace: direct.result.riskTrace } })
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(forced.phase)

    const declineTracked = trackedStorage(start)
    const declined = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-obstacle', command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.decline } },
      storage: declineTracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(requireScene(declined.phase).scene.remainingTime).toBe(atDoor.remainingTime)
  })

  it('routes an equipped-resource obstacle option and retains its spawned physical entity', () => {
    const toolkit = item('router-toolkit', HOSPITAL_ITEM_IDS.toolkit)
    const session = launch(hub({ utility: toolkit }))
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const atDoor = sceneCore.resolveSceneMoveCommand(session.scene, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, runtime.dependencies).snapshot
    const start = phaseFromScene(session, atDoor)
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-obstacle', command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const scene = requireScene(execution.phase).scene
    expect(scene.itemStates.states.find(({ instanceId }) => instanceId === toolkit.instanceId)?.resource).toMatchObject({ kind: 'durability', current: 1 })
    expect(getSceneNodeItems(scene.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)).toHaveLength(1)
    expect(tracked.counters.writes).toBe(1)
  })

  it('routes backpack and quick-slot medical items without copying daily usage into Session context', () => {
    const bandage = item('router-bandage', HOSPITAL_ITEM_IDS.bandage)
    const quickBandage = item('router-quick-bandage', HOSPITAL_ITEM_IDS.bandage)
    for (const [source, start] of [
      [{ container: 'backpack', itemInstanceId: bandage.instanceId }, launch(hub({ backpackItems: [bandage], placements: [{ instanceId: bandage.instanceId, x: 0, y: 0, rotated: false }], health: 10, bleeding: true }))],
      [{ container: 'quick-slot', quickSlotIndex: 0 }, launch(hub({ quickSlots: [quickBandage, null], health: 10, bleeding: true }))],
    ] as const) {
      const tracked = trackedStorage({ kind: 'scene-session', payload: start })
      const execution = executeStableRunSceneCommand({
        currentPhase: { kind: 'scene-session', payload: start },
        command: { kind: 'scene-medical', command: { source, target: { kind: 'open-wound', woundId: 'scene-router-wound' } } },
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      })
      expect(requireScene(execution.phase).scene.condition.bleeding).toBe(false)
      expect('dailyMedicalUsage' in requireScene(execution.phase).context).toBe(false)
      expect(tracked.counters.writes).toBe(1)
      expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
    }
  })

  it('routes a real backpack battery to the equipped flashlight through Save', () => {
    const battery = item('router-battery', HOSPITAL_ITEM_IDS.standardBattery)
    const session = launch(hub({ backpackItems: [battery], placements: [{ instanceId: battery.instanceId, x: 0, y: 0, rotated: false }] }))
    const flashlight = session.scene.equipment.utility
    if (!flashlight) throw new Error('expected flashlight')
    const depleted = createSceneExplorationSnapshot({
      ...session.scene,
      itemStates: { states: session.scene.itemStates.states.map((state) => state.instanceId === flashlight.instanceId ? { ...state, resource: { kind: 'charge', current: 0 } } : state) },
    }, getRunSceneRuntime(session, hospitalSceneLaunchDependencies).dependencies)
    const start = phaseFromScene(session, depleted)
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-battery', command: { batteryInstanceId: battery.instanceId, targetInstanceId: flashlight.instanceId } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(requireScene(execution.phase).scene.backpack.items.some(({ instanceId }) => instanceId === battery.instanceId)).toBe(false)
    expect(requireScene(execution.phase).scene.itemStates.states.find(({ instanceId }) => instanceId === flashlight.instanceId)?.resource).toMatchObject({ kind: 'charge', current: 3 })
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it('keeps a terminal battery action as a saved Scene Session and does not auto-settle it', () => {
    const battery = item('terminal-router-battery', HOSPITAL_ITEM_IDS.standardBattery)
    const session = launch(hub({ backpackItems: [battery], placements: [{ instanceId: battery.instanceId, x: 0, y: 0, rotated: false }] }))
    const flashlight = session.scene.equipment.utility
    if (!flashlight) throw new Error('expected flashlight')
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const terminalReady = createSceneExplorationSnapshot({
      ...session.scene,
      remainingTime: 1,
      itemStates: { states: session.scene.itemStates.states.map((state) => state.instanceId === flashlight.instanceId ? { ...state, resource: { kind: 'charge', current: 0 } } : state) },
    }, runtime.dependencies)
    const start = phaseFromScene(session, terminalReady)
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-battery', command: { batteryInstanceId: battery.instanceId, targetInstanceId: flashlight.instanceId } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('scene-session')
    expect(requireScene(execution.phase).scene.status).toBe('forced-returned')
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it('routes task-event decline from a formally defeated encounter and persists the Scene', () => {
    const session = launch()
    const encounter = session.scene.combatState.encounters[0]
    if (!encounter || encounter.kind !== 'dormant') throw new Error('expected dormant encounter')
    const prepared = createSceneExplorationSnapshot({
      ...session.scene,
      currentNodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
      enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
      combatState: { ...session.scene.combatState, encounters: [{ ...encounter, enemy: { ...encounter.enemy, currentHealth: 0, defeated: true, hasBeenEncountered: true } }] },
    }, getRunSceneRuntime(session, hospitalSceneLaunchDependencies).dependencies)
    const start = phaseFromScene(session, prepared)
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-task-event', command: { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, optionId: 'decline' } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(requireScene(execution.phase).scene.taskEvents.entries).toEqual([
      { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, status: 'available' },
    ])
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it('routes sample extraction with its stable instance, Scene intel, and deterministic risk trace', () => {
    const session = launch()
    const encounter = session.scene.combatState.encounters[0]
    if (!encounter || encounter.kind !== 'dormant') throw new Error('expected dormant encounter')
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const prepared = createSceneExplorationSnapshot({
      ...session.scene,
      currentNodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
      enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
      combatState: { ...session.scene.combatState, encounters: [{ ...encounter, enemy: { ...encounter.enemy, currentHealth: 0, defeated: true, hasBeenEncountered: true } }] },
    }, runtime.dependencies)
    const start = phaseFromScene(session, prepared)
    const tracked = trackedStorage(start)
    const command = { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, optionId: 'cautious-extraction', placement: { x: 0, y: 0, rotated: false } }
    const direct = sceneCore.resolveSceneTaskEventCommand(prepared, command, runtime.dependencies)
    const execution = executeStableRunSceneCommand({ currentPhase: start, command: { kind: 'scene-task-event', command }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    expect(requireScene(execution.phase).scene).toEqual(direct.snapshot)
    expect(requireScene(execution.phase).scene.backpack.items[0]?.instanceId).toBe(direct.snapshot.backpack.items[0]?.instanceId)
    expect(execution.result).toMatchObject({ result: { riskTrace: direct.result.riskTrace } })
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it('routes the access-card obstacle option as a successful no-risk permission route', () => {
    const card = item('router-access-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const session = launch(hub({ backpackItems: [card], placements: [{ instanceId: card.instanceId, x: 0, y: 0, rotated: false }] }))
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const atDoor = sceneCore.resolveSceneMoveCommand(session.scene, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, runtime.dependencies).snapshot
    const start = phaseFromScene(session, atDoor)
    const tracked = trackedStorage(start)
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-obstacle', command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.result).toMatchObject({ result: { riskTrace: null } })
    expect(requireScene(execution.phase).scene.enabledEdgeIds).toContain(HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor)
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it('keeps one random obstacle result committed when its only storage write fails', () => {
    const session = launch()
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const atDoor = sceneCore.resolveSceneMoveCommand(session.scene, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, runtime.dependencies).snapshot
    const start = phaseFromScene(session, atDoor)
    const expected = sceneCore.resolveSceneObstacleOptionCommand(atDoor, {
      obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
      optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
    }, runtime.dependencies)
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    const resolver = vi.spyOn(sceneCore, 'resolveSceneObstacleOptionCommand')
    tracked.failNextWrite()
    const execution = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-obstacle', command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
    expect(execution.result).toMatchObject({ result: { riskTrace: expected.result.riskTrace } })
    expect(requireScene(execution.phase).scene).toEqual(expected.snapshot)
  })

  it('routes a minor-contusion medical target and rejects unavailable medical without saving', () => {
    const firstAid = item('router-first-aid', HOSPITAL_ITEM_IDS.firstAidKit)
    const session = launch(hub({
      backpackItems: [firstAid],
      placements: [{ instanceId: firstAid.instanceId, x: 0, y: 0, rotated: false }],
      minorContusions: 1,
    }))
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(start)
    const treated = executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-medical', command: { source: { container: 'backpack', itemInstanceId: firstAid.instanceId }, target: { kind: 'minor-contusion' } } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(requireScene(treated.phase).scene.condition.minorContusions).toBe(0)
    expect(requireScene(treated.phase).scene.dailyMedicalUsage).toEqual(session.scene.dailyMedicalUsage)
    expect('dailyMedicalUsage' in requireScene(treated.phase).context).toBe(false)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(treated.phase)

    const unavailable = trackedStorage(start)
    const previous = unavailable.backing.read()
    expect(() => executeStableRunSceneCommand({
      currentPhase: start,
      command: { kind: 'scene-medical', command: { source: { container: 'backpack', itemInstanceId: 'missing-medical' } } },
      storage: unavailable.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrow()
    expect(unavailable.counters.writes).toBe(0)
    expect(unavailable.backing.read()).toBe(previous)
  })

  it('leaves invalid and already-full battery rejection to core without saving', () => {
    const battery = item('router-full-battery', HOSPITAL_ITEM_IDS.standardBattery)
    const session = launch(hub({ backpackItems: [battery], placements: [{ instanceId: battery.instanceId, x: 0, y: 0, rotated: false }] }))
    const target = session.scene.equipment.utility
    if (!target) throw new Error('expected flashlight')
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    for (const command of [
      { batteryInstanceId: 'missing-battery', targetInstanceId: target.instanceId },
      { batteryInstanceId: battery.instanceId, targetInstanceId: target.instanceId },
    ]) {
      const tracked = trackedStorage(start)
      const previous = tracked.backing.read()
      expect(() => executeStableRunSceneCommand({ currentPhase: start, command: { kind: 'scene-battery', command }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })).toThrow()
      expect(tracked.counters.writes).toBe(0)
      expect(tracked.backing.read()).toBe(previous)
    }
  })

  it('keeps a completed task-event Scene saved when core rejects a repeated extraction', () => {
    const session = launch()
    const encounter = session.scene.combatState.encounters[0]
    if (!encounter || encounter.kind !== 'dormant') throw new Error('expected dormant encounter')
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const prepared = createSceneExplorationSnapshot({
      ...session.scene,
      currentNodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
      enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
      combatState: { ...session.scene.combatState, encounters: [{ ...encounter, enemy: { ...encounter.enemy, currentHealth: 0, defeated: true, hasBeenEncountered: true } }] },
    }, runtime.dependencies)
    const start = phaseFromScene(session, prepared)
    const tracked = trackedStorage(start)
    const command = { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, optionId: 'cautious-extraction', placement: { x: 0, y: 0, rotated: false } }
    const completed = executeStableRunSceneCommand({ currentPhase: start, command: { kind: 'scene-task-event', command }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const previous = tracked.backing.read()
    expect(() => executeStableRunSceneCommand({ currentPhase: completed.phase, command: { kind: 'scene-task-event', command }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })).toThrow()
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('shares malformed-command rejection between each core preview and the application router', () => {
    const session = launch()
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const atDoor = sceneCore.resolveSceneMoveCommand(session.scene, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, runtime.dependencies).snapshot
    const cases = [
      {
        route: { kind: 'scene-obstacle', command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.decline, extra: true } },
        preview: () => sceneCore.previewSceneObstacleOptionCommand(atDoor, { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.decline, extra: true }, runtime.dependencies),
      },
      {
        route: { kind: 'scene-task-event', command: { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, optionId: 'decline', extra: true } },
        preview: () => sceneCore.previewSceneTaskEventCommand(session.scene, { eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval, optionId: 'decline', extra: true }, runtime.dependencies),
      },
      {
        route: { kind: 'scene-medical', command: { source: { container: 'backpack', itemInstanceId: 'missing' }, extra: true } },
        preview: () => sceneCore.previewSceneMedicalCommand(session.scene, { source: { container: 'backpack', itemInstanceId: 'missing' }, extra: true }, runtime.dependencies),
      },
      {
        route: { kind: 'scene-battery', command: { batteryInstanceId: 'battery', targetInstanceId: 'target', extra: true } },
        preview: () => sceneCore.previewSceneBatteryCommand(session.scene, { batteryInstanceId: 'battery', targetInstanceId: 'target', extra: true }, runtime.dependencies),
      },
    ]
    for (const entry of cases) {
      expect(entry.preview()).toMatchObject({ canExecute: false })
      expect(() => createStableRunSceneCommand(entry.route)).toThrowError(expect.objectContaining({ code: 'INVALID_COMMAND' }))
    }
  })

  it('chains obstacle, medical, withdrawal, and lifecycle settlement only through execution phases', () => {
    const card = item('chain-access-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const bandage = item('chain-interaction-bandage', HOSPITAL_ITEM_IDS.bandage)
    let phase: StableRunPhase = { kind: 'current-day-hub', payload: hub({
      backpackItems: [card, bandage],
      placements: [{ instanceId: card.instanceId, x: 0, y: 0, rotated: false }, { instanceId: bandage.instanceId, x: 1, y: 0, rotated: false }],
      health: 10,
      bleeding: true,
    }) }
    const tracked = trackedStorage(phase)
    const identity = phase.payload.continuity.runIdentity
    let writes = 0
    const launched = executeStableRunLifecycleCommand({ currentPhase: phase, command: { kind: 'launch-main-scene' }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    phase = launched.phase
    writes += 1
    const sceneId = requireScene(phase).scene.sceneInstanceId
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    const moved = executeStableRunSceneCommand({ currentPhase: phase, command: { kind: 'scene-move', command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall } }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    phase = moved.phase
    writes += 1
    const opened = executeStableRunSceneCommand({ currentPhase: phase, command: { kind: 'scene-obstacle', command: { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard } }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    phase = opened.phase
    writes += 1
    const medical = executeStableRunSceneCommand({ currentPhase: phase, command: { kind: 'scene-medical', command: { source: { container: 'backpack', itemInstanceId: bandage.instanceId }, target: { kind: 'open-wound', woundId: 'scene-router-wound' } } }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    phase = medical.phase
    writes += 1
    const withdrew = executeStableRunSceneCommand({ currentPhase: phase, command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    phase = withdrew.phase
    writes += 1
    expect(phase.kind).toBe('scene-session')
    expect(requireScene(phase).scene.status).toBe('safe-returned')
    expect(tracked.counters.writes).toBe(writes)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    expect(requireScene(phase).scene.sceneInstanceId).toBe(sceneId)
    const settled = executeStableRunLifecycleCommand({ currentPhase: phase, command: { kind: 'settle-terminal-scene' }, storage: tracked.storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    phase = settled.phase
    writes += 1
    expect(phase.kind).toBe('current-day-hub')
    if (phase.kind !== 'current-day-hub') throw new Error('expected CurrentDayHub after settlement')
    expect(phase.payload.continuity.runIdentity).toEqual(identity)
    expect(tracked.counters.writes).toBe(writes)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
  })
})
