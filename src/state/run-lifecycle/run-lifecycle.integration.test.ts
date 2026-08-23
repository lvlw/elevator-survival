import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSceneLaunchContent,
  hospitalSliceV01RuleConfig as config,
} from '../../content'
import { createPlayerCondition } from '../../core/condition'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import * as dailySettlementCore from '../../core/daily-settlement'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import {
  resolveRunFailure,
  type RunFailureSnapshot,
} from '../../core/run-termination'
import * as runTerminationCore from '../../core/run-termination'
import {
  createRunSceneSessionSnapshot,
  deriveSceneInstanceId,
  getRunSceneRuntime,
  resolveRunSceneSessionWithdrawal,
  resolveSceneLaunch,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import * as sceneLaunchCore from '../../core/scene-launch'
import {
  createSceneExplorationSnapshot,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import { StableRunCommandExecutionError } from '../command-execution'
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
  createStableRunLifecycleCommand,
  executeStableRunLifecycleCommand,
  getStableRunLifecycleCommandAvailability,
  StableRunLifecycleError,
  type StableRunLifecycleCommand,
} from '.'

const item = (instanceId: string, definitionId: string): ItemInstance => ({
  instanceId,
  definitionId,
  quantity: 1,
})

afterEach(() => {
  vi.restoreAllMocks()
})

interface HubOptions {
  readonly day?: number
  readonly health?: number
  readonly bleeding?: boolean
  readonly progress?: number
  readonly mainSceneUsedToday?: boolean
  readonly includeSample?: boolean
}

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const previousSceneId = `returned-before-lifecycle-day-${options.day ?? 2}`
  const storedRation = item('stored-ration', HOSPITAL_ITEM_IDS.ration)
  const battery = item('carried-battery', HOSPITAL_ITEM_IDS.standardBattery)
  const bandage = item('carried-bandage', HOSPITAL_ITEM_IDS.bandage)
  const card = item('carried-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
  const sample = item('carried-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)
  const pipe = item('equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const flashlight = item('equipped-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const backpackItems = options.includeSample
    ? [battery, bandage, card, sample]
    : [battery, bandage, card]
  const allItems = [storedRation, ...backpackItems, pipe, flashlight]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: [storedRation] },
    taskStorage: { items: [] },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: [
        { instanceId: battery.instanceId, x: 0, y: 0, rotated: false },
        { instanceId: bandage.instanceId, x: 1, y: 0, rotated: false },
        { instanceId: card.instanceId, x: 2, y: 0, rotated: false },
        ...(options.includeSample
          ? [{ instanceId: sample.instanceId, x: 0, y: 1, rotated: false }]
          : []),
      ],
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: null, utility: flashlight },
    quickSlots: createQuickSlotSnapshot(
      [null, null],
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: {
      states: allItems.map((candidate) =>
        candidate.instanceId === pipe.instanceId
          ? createItemState({
              ...candidate,
              resource: { kind: 'durability', current: 5 },
            }, hospitalItemResourceCatalog)
          : candidate.instanceId === flashlight.instanceId
            ? createItemState({
                ...candidate,
                resource: { kind: 'charge', current: 1 },
              }, hospitalItemResourceCatalog)
            : createFullItemState(candidate, hospitalItemResourceCatalog),
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
        runId: 'run-lifecycle-routing',
        seed: 'seed-lifecycle-routing',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: options.day ?? 2,
      sceneInstanceId: previousSceneId,
    },
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: options.health ?? 10,
      bleeding: options.bleeding ?? false,
      openWounds: options.bleeding
        ? [{ id: 'lifecycle-open-wound', kind: 'laceration', treatment: 'untreated' }]
        : [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    runIntelLog: { intelIds: ['intel-before-lifecycle-command'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 2,
      mainSceneUsedToday: options.mainSceneUsedToday ?? false,
    },
    worldThreat: {
      definitionId: config.worldThreat.definitionId,
      progress: options.progress ?? 0,
    },
    satiety: { current: 6 },
    returnLedger: { sceneInstanceIds: [previousSceneId] },
  }, hospitalCurrentDayHubDependencies)
}

function launch(start = hub()): RunSceneSessionSnapshot {
  return resolveSceneLaunch(
    start,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
}

function activeSessionAtEmergencyHall(
  remainingTime: number,
  condition?: RunSceneSessionSnapshot['scene']['condition'],
): RunSceneSessionSnapshot {
  const launched = launch()
  const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...launched.scene,
    currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    remainingTime,
    condition: condition ?? launched.scene.condition,
    status: 'active',
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot({
    context: launched.context,
    scene,
  }, hospitalSceneLaunchDependencies)
}

function terminalSession(
  session: RunSceneSessionSnapshot,
  status: 'safe-returned' | 'forced-returned' | 'dead',
): RunSceneSessionSnapshot {
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    status,
    remainingTime: status === 'forced-returned' ? 0 : session.scene.remainingTime,
    condition: status === 'dead'
      ? createPlayerCondition({
          ...session.scene.condition,
          currentHealth: 0,
        }, config.combat.player)
      : session.scene.condition,
    runIntelLog: {
      intelIds: [...session.scene.runIntelLog.intelIds, 'intel-from-terminal-scene'],
    },
    dailyMedicalUsage: { disinfectantUsesToday: 1 },
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot(
    { context: session.context, scene },
    hospitalSceneLaunchDependencies,
  )
}

function combatSession(): RunSceneSessionSnapshot {
  const launched = launch()
  const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
  const hall = resolveSceneMoveCommand(
    launched.scene,
    { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
    runtime.dependencies,
  ).snapshot
  const security = resolveSceneMoveCommand(
    hall,
    { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice },
    runtime.dependencies,
  ).snapshot
  const combat = resolveSceneMoveCommand(
    security,
    { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor },
    runtime.dependencies,
  ).snapshot
  return createRunSceneSessionSnapshot({
    context: launched.context,
    scene: combat,
  }, hospitalSceneLaunchDependencies)
}

function failurePhase(kind: 'health' | 'world-threat'): RunFailureSnapshot {
  const settlement = resolveDailySettlement(
    kind === 'health'
      ? hub({ health: 1, bleeding: true })
      : hub({ progress: 119 }),
    { kind: 'end-day' },
    hospitalCurrentDayHubDependencies,
  )
  if (settlement.outcome.kind !== 'terminal') throw new Error('expected terminal settlement')
  return resolveRunFailure({
    kind: 'daily-settlement-terminal',
    terminalSnapshot: settlement.outcome.snapshot,
  }, hospitalRunTerminationDependencies).snapshot
}

function trackedStorage(initialPhase: StableRunPhase): Readonly<{
  backing: MemoryRunSaveStorage
  storage: RunSaveStorage
  counters: { writes: number }
}> {
  const backing = new MemoryRunSaveStorage()
  saveRunPhase(backing, initialPhase, hospitalRunSaveRulesRegistry)
  const counters = { writes: 0 }
  return {
    backing,
    counters,
    storage: {
      read: () => backing.read(),
      write: (serialized) => {
        counters.writes += 1
        backing.write(serialized)
      },
      clear: () => backing.clear(),
    },
  }
}

describe('strict Stable Run lifecycle command routing', () => {
  it.each([
    'launch-main-scene',
    'end-day',
    'settle-terminal-scene',
  ] as const)('strictly parses %s', (kind) => {
    const command = createStableRunLifecycleCommand({ kind })
    expect(command).toEqual({ kind })
    expect(Object.isFrozen(command)).toBe(true)
  })

  it('rejects unknown, extra, missing, null, array, and class-instance commands', () => {
    class ForgedCommand {
      public readonly kind = 'end-day'
    }
    const invalid: readonly unknown[] = [
      { kind: 'unknown' },
      { kind: 'end-day', extra: true },
      {},
      null,
      [],
      new ForgedCommand(),
    ]
    for (const command of invalid) {
      expect(() => createStableRunLifecycleCommand(command)).toThrowError(
        expect.objectContaining<Partial<StableRunLifecycleError>>({ code: 'INVALID_COMMAND' }),
      )
    }
  })

  it('rejects an unknown Hub lifecycle command before any save', () => {
    const start = hub()
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const previous = tracked.backing.read()
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'unknown-lifecycle-command' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_COMMAND' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each([2, 7])('routes Day %i Hub launch through the formal Scene resolver and one save', (day) => {
    const start = hub({ day })
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: structuredClone(start) },
      command: { kind: 'launch-main-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed')
    expect(execution.phase.kind).toBe('scene-session')
    expect(Object.isFrozen(execution.phase)).toBe(true)
    if (execution.phase.kind !== 'scene-session') throw new Error('expected Scene Session')
    expect(execution.phase.payload.context.mainSceneUsedToday).toBe(true)
    expect(execution.phase.payload.scene.sceneInstanceId).toBe(
      deriveSceneInstanceId(
        start,
        hospitalSceneLaunchContent.sceneDefinitionId,
        hospitalCurrentDayHubDependencies,
      ),
    )
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
    expect(execution.persistence).not.toHaveProperty('result')
    expect(execution.persistence).not.toHaveProperty('effects')
  })

  it('lets the formal Scene resolver reject a repeated daily launch without saving', () => {
    const start = hub({ mainSceneUsedToday: true })
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const previous = tracked.backing.read()
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'launch-main-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each(['safe-returned', 'forced-returned'] as const)(
    'routes %s Scene through formal Return with inventory provenance and one save',
    (status) => {
      const terminal = terminalSession(launch(hub({ includeSample: true })), status)
      const tracked = trackedStorage({ kind: 'scene-session', payload: terminal })
      const beforeStates = new Map(
        terminal.scene.itemStates.states.map((state) => [state.instanceId, state]),
      )
      const execution = executeStableRunLifecycleCommand({
        currentPhase: { kind: 'scene-session', payload: terminal },
        command: { kind: 'settle-terminal-scene' },
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      })
      expect(execution.phase.kind).toBe('current-day-hub')
      if (execution.phase.kind !== 'current-day-hub') throw new Error('expected Hub')
      const returned = execution.phase.payload
      expect(returned.returnLedger.sceneInstanceIds).toContain(terminal.scene.sceneInstanceId)
      expect(returned.returnLedger.sceneInstanceIds.filter(
        (id) => id === terminal.scene.sceneInstanceId,
      )).toHaveLength(1)
      expect(returned.runLoadout.warehouse.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ instanceId: 'carried-bandage' }),
        expect.objectContaining({ instanceId: 'carried-card' }),
      ]))
      expect(returned.runLoadout.taskStorage.items).toContainEqual(
        expect.objectContaining({ instanceId: 'carried-sample' }),
      )
      for (const instanceId of ['carried-bandage', 'carried-card', 'carried-sample']) {
        expect(returned.runLoadout.itemStates.states.find(
          (state) => state.instanceId === instanceId,
        )).toEqual(beforeStates.get(instanceId))
      }
      expect(returned.runIntelLog).toEqual(terminal.scene.runIntelLog)
      expect(returned.dailyState.medicalUsage).toEqual(terminal.scene.dailyMedicalUsage)
      expect(tracked.counters.writes).toBe(1)
      expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
      const saved = tracked.backing.read()
      expect(() => executeStableRunLifecycleCommand({
        currentPhase: execution.phase,
        command: { kind: 'settle-terminal-scene' },
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      })).toThrowError(expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }))
      expect(tracked.counters.writes).toBe(1)
      expect(tracked.backing.read()).toBe(saved)
    },
  )

  it.each([
    ['safe-returned', 'return-to-hub'],
    ['forced-returned', 'return-to-hub'],
    ['dead', 'run-failure'],
  ] as const)('uses the lifecycle selector as the sole terminal route truth for %s', (status, settlementOutcome) => {
    const phase = { kind: 'scene-session' as const, payload: terminalSession(launch(), status) }
    expect(getStableRunLifecycleCommandAvailability(
      phase,
      { kind: 'settle-terminal-scene' },
    )).toEqual({ canExecute: true, settlementOutcome })
  })

  it.each([
    ['non-safety safe return', () => {
      const active = activeSessionAtEmergencyHall(20)
      return {
        active,
        forged: {
          ...active,
          scene: { ...active.scene, status: 'safe-returned' as const },
        },
      }
    }],
    ['positive-time forced return', () => {
      const active = launch()
      return {
        active,
        forged: {
          ...active,
          scene: { ...active.scene, status: 'forced-returned' as const },
        },
      }
    }],
    ['over-budget safe return', () => {
      const active = terminalSession(launch(), 'safe-returned')
      return {
        active,
        forged: {
          ...active,
          scene: {
            ...active.scene,
            remainingTime: config.scene.totalTime + 1,
          },
        },
      }
    }],
  ] as const)('rejects forged %s during input canonicalization before Return or save', (_name, create) => {
    const { active, forged } = create()
    const tracked = trackedStorage({ kind: 'scene-session', payload: active })
    const previous = tracked.backing.read()
    const returnResolver = vi.spyOn(sceneLaunchCore, 'resolveRunSceneSessionReturn')
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: forged },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_STABLE_PHASE' }))
    expect(returnResolver).not.toHaveBeenCalled()
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each([
    ['safe-returned', 20],
    ['forced-returned', 5],
  ] as const)('settles a formally withdrawn %s Scene through Return', (status, remainingTime) => {
    const active = activeSessionAtEmergencyHall(remainingTime)
    const terminal = resolveRunSceneSessionWithdrawal(
      active,
      { kind: 'withdraw-from-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    expect(terminal.scene).toMatchObject({
      status,
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      ...(status === 'forced-returned' ? { remainingTime: 0 } : {}),
    })
    const tracked = trackedStorage({ kind: 'scene-session', payload: terminal })
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: terminal },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('current-day-hub')
    expect(tracked.counters.writes).toBe(1)
  })

  it('settles a formal withdrawal death through RunFailure without ordinary Return', () => {
    const launched = launch()
    const fatalCondition = createPlayerCondition({
      ...launched.scene.condition,
      currentHealth: 1,
      bleeding: true,
      openWounds: [{
        id: 'fatal-withdrawal-wound',
        kind: 'laceration',
        treatment: 'untreated',
      }],
    }, config.combat.player)
    const active = activeSessionAtEmergencyHall(10, fatalCondition)
    const terminal = resolveRunSceneSessionWithdrawal(
      active,
      { kind: 'withdraw-from-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    expect(terminal.scene.status).toBe('dead')
    const tracked = trackedStorage({ kind: 'scene-session', payload: terminal })
    const returnResolver = vi.spyOn(sceneLaunchCore, 'resolveRunSceneSessionReturn')
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: terminal },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('run-failure')
    if (execution.phase.kind !== 'run-failure') throw new Error('expected RunFailure')
    expect(execution.phase.payload.source.kind).toBe('scene-defeat')
    expect(returnResolver).not.toHaveBeenCalled()
    expect(tracked.counters.writes).toBe(1)
  })

  it('routes a dead Scene only through formal RunFailure without extraction', () => {
    const terminal = terminalSession(launch(hub({ includeSample: true })), 'dead')
    const tracked = trackedStorage({ kind: 'scene-session', payload: terminal })
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: terminal },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('run-failure')
    if (execution.phase.kind !== 'run-failure') throw new Error('expected RunFailure')
    expect(execution.phase.payload.reason).toBe('health-depleted')
    expect(execution.phase.payload.source.kind).toBe('scene-defeat')
    if (execution.phase.payload.source.kind !== 'scene-defeat') {
      throw new Error('expected Scene defeat provenance')
    }
    expect(execution.phase.payload.source.terminalScene.backpack.items).toContainEqual(
      expect.objectContaining({ instanceId: 'carried-sample' }),
    )
    expect(execution.phase.payload.source.context.runReturnCarryForward.returnLedger.sceneInstanceIds)
      .not.toContain(terminal.scene.sceneInstanceId)
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it.each([
    ['active', () => launch()],
    ['combat', () => combatSession()],
  ] as const)('rejects settle-terminal-scene for a %s Scene without saving', (_status, makeSession) => {
    const session = makeSession()
    const tracked = trackedStorage({ kind: 'scene-session', payload: session })
    const previous = tracked.backing.read()
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: session },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each([
    [1, 2],
    [6, 7],
  ] as const)('routes ordinary Day %i End Day to Day %i Hub', (day, nextDay) => {
    const start = hub({ day })
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'end-day' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('current-day-hub')
    if (execution.phase.kind !== 'current-day-hub') throw new Error('expected next Hub')
    expect(execution.phase.payload.continuity.currentDay).toBe(nextDay)
    expect(execution.phase.payload.dailyState.mainSceneUsedToday).toBe(false)
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it.each([
    ['health-depleted', { health: 1, bleeding: true }],
    ['world-threat-terminal', { progress: 119 }],
  ] as const)('routes daily %s through formal RunFailure', (reason, options) => {
    const start = hub(options)
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'end-day' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.phase.kind).toBe('run-failure')
    if (execution.phase.kind !== 'run-failure') throw new Error('expected RunFailure')
    expect(execution.phase.payload.reason).toBe(reason)
    expect(execution.phase.payload.source.kind).toBe('daily-settlement-terminal')
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
  })

  it('propagates the Day 7 final resolver guard without saving or creating Day 8', () => {
    const start = hub({ day: 7 })
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const previous = tracked.backing.read()
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'end-day' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'FINAL_DAY_RESOLUTION_REQUIRED' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual({
      kind: 'current-day-hub', payload: start,
    })
  })

  it.each([
    ['hub + settle', () => ({ kind: 'current-day-hub', payload: hub() }) as StableRunPhase, { kind: 'settle-terminal-scene' }],
    ['scene + launch', () => ({ kind: 'scene-session', payload: launch() }) as StableRunPhase, { kind: 'launch-main-scene' }],
    ['scene + end-day', () => ({ kind: 'scene-session', payload: launch() }) as StableRunPhase, { kind: 'end-day' }],
  ] as const)('rejects unavailable matrix entry %s and preserves storage', (_label, makePhase, command) => {
    const phase = makePhase()
    const tracked = trackedStorage(phase)
    const previous = tracked.backing.read()
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: phase,
      command,
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it.each([
    { kind: 'launch-main-scene' },
    { kind: 'end-day' },
    { kind: 'settle-terminal-scene' },
  ] as const)('delegates RunFailure + $kind to the generic terminal guard', (command) => {
    const failure = failurePhase('health')
    const phase = { kind: 'run-failure' as const, payload: failure }
    const tracked = trackedStorage(phase)
    const previous = tracked.backing.read()
    expect(() => executeStableRunLifecycleCommand({
      currentPhase: phase,
      command,
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining<Partial<StableRunCommandExecutionError>>({
      code: 'TERMINAL_PHASE',
    }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('returns the committed canonical Scene once when Hub launch persistence fails', () => {
    const start = hub()
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const previous = tracked.backing.read()
    tracked.backing.failNextWrite()
    const resolver = vi.spyOn(sceneLaunchCore, 'resolveSceneLaunch')
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'launch-main-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(execution.phase.kind).toBe('scene-session')
    expect(Object.isFrozen(execution.phase)).toBe(true)
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
    expect(execution.result).toHaveProperty('effects')
    expect(execution.result).toHaveProperty('session')
  })

  it('returns one committed terminal Scene settlement when persistence fails without replay', () => {
    const terminal = terminalSession(launch(hub({ includeSample: true })), 'safe-returned')
    const tracked = trackedStorage({ kind: 'scene-session', payload: terminal })
    const previous = tracked.backing.read()
    tracked.backing.failNextWrite()
    const resolver = vi.spyOn(sceneLaunchCore, 'resolveRunSceneSessionReturn')
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: terminal },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(execution.phase.kind).toBe('current-day-hub')
    if (execution.phase.kind !== 'current-day-hub') throw new Error('expected committed Hub')
    expect(execution.phase.payload.returnLedger.sceneInstanceIds.filter(
      (id) => id === terminal.scene.sceneInstanceId,
    )).toHaveLength(1)
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('does not replay Scene RunFailure resolution when its single save fails', () => {
    const terminal = terminalSession(launch(), 'dead')
    const tracked = trackedStorage({ kind: 'scene-session', payload: terminal })
    const previous = tracked.backing.read()
    tracked.backing.failNextWrite()
    const resolver = vi.spyOn(runTerminationCore, 'resolveRunFailureFromSceneSession')
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'scene-session', payload: terminal },
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(execution.phase.kind).toBe('run-failure')
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
  })

  it('does not replay Daily Settlement or RunFailure when its single save fails', () => {
    const start = hub({ health: 1, bleeding: true })
    const tracked = trackedStorage({ kind: 'current-day-hub', payload: start })
    const previous = tracked.backing.read()
    tracked.backing.failNextWrite()
    const settlementResolver = vi.spyOn(dailySettlementCore, 'resolveDailySettlement')
    const failureResolver = vi.spyOn(runTerminationCore, 'resolveRunFailure')
    const execution = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'end-day' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(execution.phase.kind).toBe('run-failure')
    expect(settlementResolver).toHaveBeenCalledTimes(1)
    expect(failureResolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
  })
})
