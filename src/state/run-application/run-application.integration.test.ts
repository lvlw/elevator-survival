import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
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
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import { resolveRunFailure } from '../../core/run-termination'
import { getSceneNodeItems } from '../../core/scene-items'
import type { RunSceneSessionSnapshot } from '../../core/scene-launch'
import { StableRunCommandExecutionError } from '../command-execution'
import { StableRunHubError } from '../run-hub'
import { StableRunLifecycleError } from '../run-lifecycle'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  getStableRunPhaseIdentity,
  loadRunPhase,
  saveRunPhase,
  type RunSaveStorage,
  type StableRunPhase,
} from '../run-save'
import { StableRunSceneError } from '../run-scene'
import {
  createStableRunApplicationCommand,
  executeStableRunApplicationCommand,
  StableRunApplicationError,
  type StableRunApplicationCommand,
  type StableRunApplicationExecution,
} from '.'

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

class TrackedStorage implements RunSaveStorage {
  public writes = 0
  public failWrites = false
  private value: string | null = null

  public read(): string | null { return this.value }
  public write(serialized: string): void {
    this.writes += 1
    if (this.failWrites) throw new Error('application storage failure')
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
  readonly satiety?: number
}

const pipe = item('application-pipe', HOSPITAL_ITEM_IDS.metalPipe)
const coat = item('application-coat', HOSPITAL_ITEM_IDS.heavyCoat)
const flashlight = item('application-flashlight', HOSPITAL_ITEM_IDS.flashlight)
const bandage = item('application-bandage', HOSPITAL_ITEM_IDS.bandage)
const ration = item('application-ration', HOSPITAL_ITEM_IDS.ration)

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const warehouse = options.warehouse ?? [bandage, ration]
  const owned = [...warehouse, pipe, coat, flashlight]
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-application-replay',
        seed: 'seed-scene-routing',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: 2,
      sceneInstanceId: 'returned-before-application-replay',
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
      equipment: { weapon: pipe, armor: coat, utility: flashlight },
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
        ? [{ id: 'application-wound', kind: 'laceration', treatment: 'untreated' }]
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
    satiety: { current: options.satiety ?? 4 },
    returnLedger: { sceneInstanceIds: ['returned-before-application-replay'] },
  }, hospitalCurrentDayHubDependencies)
}

function requireScene(phase: StableRunPhase): RunSceneSessionSnapshot {
  if (phase.kind !== 'scene-session') throw new Error('expected scene-session')
  return phase.payload
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

function dispatch(
  phase: StableRunPhase,
  command: StableRunApplicationCommand,
  storage: RunSaveStorage,
): StableRunApplicationExecution {
  return executeStableRunApplicationCommand({
    currentPhase: phase,
    command,
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  })
}

interface ReplayTrace {
  readonly executions: readonly StableRunApplicationExecution[]
  readonly serializedAfterEachStep: readonly string[]
  readonly finalPhase: StableRunPhase
  readonly taskItemInstanceId: string
  readonly sceneInstanceId: string
}

function runHospitalApplicationChain(reloadEveryStep: boolean): ReplayTrace {
  const storage = new TrackedStorage()
  let phase: StableRunPhase = { kind: 'current-day-hub', payload: hub() }
  const identity = phase.payload.continuity.runIdentity
  const executions: StableRunApplicationExecution[] = []
  const serializedAfterEachStep: string[] = []

  const step = (command: StableRunApplicationCommand): StableRunApplicationExecution => {
    const beforeWrites = storage.writes
    const execution = dispatch(phase, command, storage)
    expect(storage.writes).toBe(beforeWrites + 1)
    const serialized = storage.read()
    if (serialized === null) throw new Error('expected serialized Run save')
    executions.push(execution)
    serializedAfterEachStep.push(serialized)
    const loaded = reloadEveryStep
      ? loadRunPhase(storage, hospitalRunSaveRulesRegistry)
      : execution.phase
    if (loaded === null) throw new Error('expected reloaded Run phase')
    phase = loaded
    expect(phase).toEqual(execution.phase)
    return execution
  }

  step({ kind: 'lifecycle', command: { kind: 'launch-main-scene' } })
  const sceneInstanceId = requireScene(phase).scene.sceneInstanceId
  step({
    kind: 'scene',
    command: {
      kind: 'scene-move',
      command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
    },
  })
  step({
    kind: 'scene',
    command: {
      kind: 'scene-main-search',
      command: { illumination: 'search-without-flashlight' },
    },
  })
  const metal = getSceneNodeItems(
    requireScene(phase).scene.sceneItems,
    HOSPITAL_NODE_IDS.emergencyHall,
  ).find(({ item: candidate }) =>
    candidate.definitionId === HOSPITAL_ITEM_IDS.metalParts)
  if (!metal) throw new Error('expected deterministic metal-parts search result')
  step({
    kind: 'scene',
    command: {
      kind: 'scene-node-item-pickup',
      command: {
        nodeItemInstanceId: metal.item.instanceId,
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      },
    },
  })
  step({
    kind: 'scene',
    command: {
      kind: 'scene-obstacle',
      command: {
        obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
        optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
      },
    },
  })
  step({
    kind: 'scene',
    command: {
      kind: 'scene-move',
      command: { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
    },
  })
  for (const command of [
    { kind: 'metal-pipe-basic-attack' },
    { kind: 'metal-pipe-charged-strike' },
    { kind: 'metal-pipe-basic-attack' },
  ] as const) {
    step({
      kind: 'scene',
      command: { kind: 'scene-combat-action', command },
    })
  }
  expect(requireScene(phase).scene.status).toBe('active')
  step({
    kind: 'scene',
    command: {
      kind: 'scene-move',
      command: { edgeId: HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom },
    },
  })
  step({
    kind: 'scene',
    command: {
      kind: 'scene-task-event',
      command: {
        eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval,
        optionId: 'cautious-extraction',
        placement: { x: 1, y: 0, rotated: false },
      },
    },
  })
  const taskItem = requireScene(phase).scene.backpack.items.find(
    ({ definitionId }) => definitionId === HOSPITAL_ITEM_IDS.sealedPathogenCase,
  )
  if (!taskItem) throw new Error('expected extracted task item')
  step({
    kind: 'scene',
    command: {
      kind: 'scene-withdraw',
      command: { kind: 'withdraw-from-scene' },
    },
  })
  expect(requireScene(phase).scene.status).toBe('safe-returned')
  step({ kind: 'lifecycle', command: { kind: 'settle-terminal-scene' } })
  if (phase.kind !== 'current-day-hub') throw new Error('expected returned Hub')
  expect(phase.payload.runLoadout.taskStorage.items).toContainEqual(taskItem)
  expect(phase.payload.runLoadout.warehouse.items).toContainEqual(metal.item)

  step({
    kind: 'hub',
    command: {
      kind: 'hub-loadout',
      command: {
        kind: 'warehouse-to-backpack',
        instanceId: bandage.instanceId,
        placement: {
          instanceId: bandage.instanceId,
          x: 0,
          y: 0,
          rotated: false,
        },
      },
    },
  })
  step({
    kind: 'hub',
    command: {
      kind: 'hub-maintenance',
      command: {
        kind: 'repair-with-metal-parts',
        source: {
          container: 'warehouse',
          itemInstanceId: metal.item.instanceId,
        },
        allocations: [{
          target: {
            container: 'equipment',
            equipmentSlot: 'weapon',
            itemInstanceId: pipe.instanceId,
          },
          points: 2,
        }],
      },
    },
  })
  step({
    kind: 'hub',
    command: {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-ration',
        source: { container: 'warehouse', itemInstanceId: ration.instanceId },
      },
    },
  })
  step({ kind: 'lifecycle', command: { kind: 'end-day' } })
  if (phase.kind !== 'current-day-hub') throw new Error('expected next-day Hub')
  expect(phase.payload.continuity.currentDay).toBe(3)
  expect(phase.payload.continuity.runIdentity).toEqual(identity)

  for (const execution of executions) {
    expect(getStableRunPhaseIdentity(execution.phase)).toEqual(identity)
  }
  for (const execution of executions.slice(0, -1)) {
    if (execution.phase.kind === 'run-failure') {
      throw new Error('hospital success path must not terminate the Run')
    }
    const currentDay = execution.phase.kind === 'current-day-hub'
      ? execution.phase.payload.continuity.currentDay
      : execution.phase.payload.context.runReturnCarryForward.continuity.currentDay
    expect(currentDay).toBe(2)
  }
  const scenePhases = executions
    .map(({ phase: resultPhase }) => resultPhase)
    .filter((resultPhase): resultPhase is Extract<StableRunPhase, { kind: 'scene-session' }> =>
      resultPhase.kind === 'scene-session')
  expect(scenePhases.length).toBeGreaterThan(0)
  expect(scenePhases.every(({ payload }) =>
    payload.scene.sceneInstanceId === sceneInstanceId)).toBe(true)
  const deterministicFacts = JSON.stringify(executions)
  expect(deterministicFacts).toContain('scene-main-search-revealed')
  expect(deterministicFacts).toContain('scene-obstacle-risk-resolved')
  expect(deterministicFacts).toContain('combat-risk-resolved')

  return {
    executions,
    serializedAfterEachStep,
    finalPhase: phase,
    taskItemInstanceId: taskItem.instanceId,
    sceneInstanceId,
  }
}

describe('strict Stable Run application command boundary', () => {
  const valid = [
    { kind: 'lifecycle', command: { kind: 'launch-main-scene' } },
    {
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    },
    {
      kind: 'hub',
      command: {
        kind: 'hub-survival',
        command: {
          kind: 'use-hub-ration',
          source: { container: 'warehouse', itemInstanceId: ration.instanceId },
        },
      },
    },
  ] as const

  it.each(valid)('normalizes and freezes the $kind family', (input) => {
    const command = createStableRunApplicationCommand(input)
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
    { kind: 'lifecycle' },
    { kind: 'lifecycle', command: { kind: 'launch-main-scene' }, extra: true },
    new (class ApplicationCommand {
      public readonly kind = 'lifecycle'
      public readonly command = { kind: 'launch-main-scene' }
    })(),
  ])('rejects malformed application envelopes %#', (input) => {
    expect(() => createStableRunApplicationCommand(input)).toThrowError(
      expect.objectContaining<Partial<StableRunApplicationError>>({
        code: 'INVALID_COMMAND',
      }),
    )
  })

  it('delegates malformed inner commands to each specialized parser', () => {
    expect(() => createStableRunApplicationCommand({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene', extra: true },
    })).toThrowError(StableRunLifecycleError)
    expect(() => createStableRunApplicationCommand({
      kind: 'scene',
      command: { kind: 'scene-move', command: { edgeId: 'edge', extra: true } },
    })).toThrowError(StableRunSceneError)
    expect(() => createStableRunApplicationCommand({
      kind: 'hub',
      command: { kind: 'hub-survival', command: { kind: 'unknown' } },
    })).toThrowError(StableRunHubError)
  })

  it('preserves specialized wrong-family and generic terminal rejection', () => {
    const storage = new TrackedStorage()
    expect(() => dispatch(
      { kind: 'current-day-hub', payload: hub() },
      valid[1],
      storage,
    )).toThrowError(expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)

    const launched = dispatch(
      { kind: 'current-day-hub', payload: hub() },
      valid[0],
      storage,
    )
    storage.resetWrites()
    expect(() => dispatch(launched.phase, valid[2], storage)).toThrowError(
      expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }),
    )
    expect(storage.writes).toBe(0)

    for (const command of valid) {
      expect(() => dispatch(failurePhase(), command, storage)).toThrowError(
        expect.objectContaining<Partial<StableRunCommandExecutionError>>({
          code: 'TERMINAL_PHASE',
        }),
      )
    }
    expect(storage.writes).toBe(0)
  })

  it('propagates the pre-scene End Day gate without saving or mutating the phase', () => {
    const storage = new TrackedStorage()
    const start = hub({ mainSceneUsedToday: false })
    const phase = { kind: 'current-day-hub' as const, payload: start }
    saveRunPhase(storage, phase, hospitalRunSaveRulesRegistry)
    const previous = storage.read()
    storage.resetWrites()
    const before = JSON.stringify(phase)
    expect(() => dispatch(phase, {
      kind: 'lifecycle',
      command: { kind: 'end-day' },
    }, storage)).toThrowError(expect.objectContaining({ code: 'MAIN_SCENE_REQUIRED' }))
    expect(storage.writes).toBe(0)
    expect(storage.read()).toBe(previous)
    expect(JSON.stringify(phase)).toBe(before)
  })
})

describe('unified application deterministic replay', () => {
  it('replays the full hospital application chain identically in independent storage', () => {
    const replayA = runHospitalApplicationChain(false)
    const replayB = runHospitalApplicationChain(false)
    expect(replayA.executions).toEqual(replayB.executions)
    expect(replayA.serializedAfterEachStep).toEqual(
      replayB.serializedAfterEachStep,
    )
    expect(replayA.finalPhase).toEqual(replayB.finalPhase)
    expect(replayA.sceneInstanceId).toBe(replayB.sceneInstanceId)
    expect(replayA.taskItemInstanceId).toBe(replayB.taskItemInstanceId)
  })

  it('keeps every deterministic result and identity stable with reload after every step', () => {
    const withoutReload = runHospitalApplicationChain(false)
    const withReload = runHospitalApplicationChain(true)
    expect(withReload.executions).toEqual(withoutReload.executions)
    expect(withReload.serializedAfterEachStep).toEqual(
      withoutReload.serializedAfterEachStep,
    )
    expect(withReload.finalPhase).toEqual(withoutReload.finalPhase)
    expect(withReload.sceneInstanceId).toBe(withoutReload.sceneInstanceId)
    expect(withReload.taskItemInstanceId).toBe(
      withoutReload.taskItemInstanceId,
    )
  })

  it('keeps one write per lifecycle, Scene, and Hub mutation', () => {
    const storage = new TrackedStorage()
    let phase: StableRunPhase = { kind: 'current-day-hub', payload: hub() }
    phase = dispatch(phase, {
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    }, storage).phase
    expect(storage.writes).toBe(1)
    phase = dispatch(phase, {
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    }, storage).phase
    expect(storage.writes).toBe(2)
    phase = dispatch(phase, {
      kind: 'scene',
      command: {
        kind: 'scene-withdraw',
        command: { kind: 'withdraw-from-scene' },
      },
    }, storage).phase
    phase = dispatch(phase, {
      kind: 'lifecycle',
      command: { kind: 'settle-terminal-scene' },
    }, storage).phase
    const beforeHub = storage.writes
    dispatch(phase, {
      kind: 'hub',
      command: {
        kind: 'hub-loadout',
        command: {
          kind: 'warehouse-to-backpack',
          instanceId: bandage.instanceId,
          placement: {
            instanceId: bandage.instanceId,
            x: 0,
            y: 0,
            rotated: false,
          },
        },
      },
    }, storage)
    expect(storage.writes).toBe(beforeHub + 1)
  })

  it('passes through one committed random Scene result after one failed write', () => {
    const storage = new TrackedStorage()
    let phase: StableRunPhase = { kind: 'current-day-hub', payload: hub() }
    phase = dispatch(phase, {
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    }, storage).phase
    phase = dispatch(phase, {
      kind: 'scene',
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
    }, storage).phase
    const previous = storage.read()
    storage.resetWrites()
    storage.failWrites = true
    const execution = dispatch(phase, {
      kind: 'scene',
      command: {
        kind: 'scene-obstacle',
        command: {
          obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
          optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
        },
      },
    }, storage)
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(storage.writes).toBe(1)
    expect(storage.read()).toBe(previous)
    expect(execution.phase.kind).toBe('scene-session')
  })

  it('passes through one committed irreversible Hub result after one failed write', () => {
    const storage = new TrackedStorage()
    const phase: StableRunPhase = { kind: 'current-day-hub', payload: hub() }
    saveRunPhase(storage, phase, hospitalRunSaveRulesRegistry)
    const previous = storage.read()
    storage.resetWrites()
    storage.failWrites = true
    const execution = dispatch(phase, {
      kind: 'hub',
      command: {
        kind: 'hub-survival',
        command: {
          kind: 'use-hub-ration',
          source: { container: 'warehouse', itemInstanceId: ration.instanceId },
        },
      },
    }, storage)
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(storage.writes).toBe(1)
    expect(storage.read()).toBe(previous)
    expect(execution.phase.kind).toBe('current-day-hub')
  })
})
