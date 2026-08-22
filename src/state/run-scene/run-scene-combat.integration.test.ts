import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_OBSTACLE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSliceV01RuleConfig as config,
} from '../../content'
import {
  CombatError,
  createCombatPlayerActionCommand,
  previewCombatPlayerAction,
  resolveCombatPlayerAction,
  type CombatPlayerActionCommand,
} from '../../core/combat'
import {
  createPlayerCondition,
  type OpenWoundSnapshot,
} from '../../core/condition'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import {
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import {
  createFullItemState,
  createItemState,
  getItemState,
} from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import * as sceneCore from '../../core/scene-exploration'
import {
  createSceneExplorationSnapshot,
  previewSceneCombatPlayerAction,
  resolveSceneCombatPlayerAction,
} from '../../core/scene-exploration'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
  resolveSceneLaunch,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import { executeStableRunLifecycleCommand } from '../run-lifecycle'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
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
} from '.'

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

const accessCard = item(
  'combat-router-access-card',
  HOSPITAL_ITEM_IDS.isolationWardAccessCard,
)
const defaultPipe = item('combat-router-pipe', HOSPITAL_ITEM_IDS.metalPipe)
const defaultCoat = item('combat-router-coat', HOSPITAL_ITEM_IDS.heavyCoat)

interface CombatHubOptions {
  readonly weapon?: ItemInstance | null
  readonly armor?: ItemInstance | null
  readonly weaponDurability?: number
  readonly backpackItems?: readonly ItemInstance[]
  readonly backpackPlacements?: readonly BackpackPlacement[]
  readonly quickSlots?: readonly (ItemInstance | null)[]
  readonly health?: number
  readonly bleeding?: boolean
  readonly openWounds?: readonly OpenWoundSnapshot[]
  readonly minorContusions?: number
}

function combatHub(options: CombatHubOptions = {}): CurrentDayHubSnapshot {
  const weapon = options.weapon === undefined ? defaultPipe : options.weapon
  const armor = options.armor === undefined ? defaultCoat : options.armor
  const backpackItems = [accessCard, ...(options.backpackItems ?? [])]
  const backpackPlacements: readonly BackpackPlacement[] = [
    { instanceId: accessCard.instanceId, x: 0, y: 0, rotated: false },
    ...(options.backpackPlacements ?? []),
  ]
  const quickSlots = options.quickSlots ?? [null, null]
  const carried = [
    ...backpackItems,
    ...(weapon ? [weapon] : []),
    ...(armor ? [armor] : []),
    ...quickSlots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-scene-combat-routing',
        seed: 'seed-scene-combat-routing',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: 2,
      sceneInstanceId: 'returned-before-combat-routing',
    },
    runLoadout: createRunLoadoutSnapshot({
      warehouse: { items: [] },
      taskStorage: { items: [] },
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: backpackItems,
        placements: backpackPlacements,
      }, hospitalItemCatalog),
      equipment: { weapon, armor, utility: null },
      quickSlots: createQuickSlotSnapshot(
        quickSlots,
        config.backpack.quickSlotCount,
        hospitalItemCatalog,
        hospitalItemQuickSlotCatalog,
      ),
      itemStates: {
        states: carried.map((candidate) => {
          if (candidate.instanceId === weapon?.instanceId) {
            return createItemState({
              ...candidate,
              resource: {
                kind: 'durability',
                current: options.weaponDurability ?? config.combat.metalPipe.maxDurability,
              },
            }, hospitalItemResourceCatalog)
          }
          return createFullItemState(candidate, hospitalItemResourceCatalog)
        }),
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
      openWounds: options.openWounds ?? [],
      minorContusions: options.minorContusions ?? 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    runIntelLog: { intelIds: [] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 3,
      mainSceneUsedToday: false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 },
    satiety: { current: 6 },
    returnLedger: { sceneInstanceIds: ['returned-before-combat-routing'] },
  }, hospitalCurrentDayHubDependencies)
}

function launch(start = combatHub()): RunSceneSessionSnapshot {
  return resolveSceneLaunch(
    start,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
}

function enterCombat(
  options: CombatHubOptions = {},
  combatRemainingTime?: number,
): RunSceneSessionSnapshot {
  const session = launch(combatHub(options))
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  let scene = sceneCore.resolveSceneMoveCommand(
    session.scene,
    { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
    runtime.dependencies,
  ).snapshot
  scene = sceneCore.resolveSceneObstacleOptionCommand(scene, {
    obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
    optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard,
  }, runtime.dependencies).snapshot
  scene = sceneCore.resolveSceneMoveCommand(scene, {
    edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
  }, runtime.dependencies).snapshot
  if (combatRemainingTime !== undefined) {
    scene = createSceneExplorationSnapshot({
      ...scene,
      remainingTime: combatRemainingTime,
    }, runtime.dependencies)
  }
  return createRunSceneSessionSnapshot({
    context: session.context,
    scene,
  }, hospitalSceneLaunchDependencies)
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
          throw new Error('combat router write failed')
        }
        backing.write(serialized)
      },
      clear: () => backing.clear(),
    },
  }
}

function requireSession(phase: StableRunPhase): RunSceneSessionSnapshot {
  if (phase.kind !== 'scene-session') throw new Error('expected scene-session')
  return phase.payload
}

function activeCombat(session: RunSceneSessionSnapshot) {
  const encounter = session.scene.combatState.encounters.find(
    (candidate) => candidate.kind === 'active',
  )
  if (!encounter || encounter.kind !== 'active') {
    throw new Error('expected active combat encounter')
  }
  return encounter.combat
}

function executeCombat(
  phase: StableRunPhase,
  command: CombatPlayerActionCommand,
  storage: RunSaveStorage,
) {
  return executeStableRunSceneCommand({
    currentPhase: phase,
    command: { kind: 'scene-combat-action', command },
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Stable Run Scene combat command boundary', () => {
  it('normalizes and freezes the tenth Scene application command', () => {
    const input = {
      kind: 'scene-combat-action',
      command: { kind: 'use-quick-slot-item', quickSlotIndex: 0 },
    }
    const normalized = createStableRunSceneCommand(input)
    expect(normalized).toEqual(input)
    expect(normalized).not.toBe(input)
    expect(normalized.command).not.toBe(input.command)
    expect(Object.isFrozen(normalized)).toBe(true)
    expect(Object.isFrozen(normalized.command)).toBe(true)
  })

  it('shares one malformed-command boundary across Combat, Scene, and Router', () => {
    const session = enterCombat()
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const combat = activeCombat(session)
    const malformed = { kind: 'defend', damage: 99 }
    expect(() => createCombatPlayerActionCommand(malformed)).toThrowError(
      expect.objectContaining<Partial<CombatError>>({ code: 'INVALID_COMBAT_COMMAND' }),
    )
    expect(previewCombatPlayerAction(
      combat,
      malformed,
      runtime.dependencies.sceneCombat!.combat,
    )).toMatchObject({ canExecute: false, errorCode: 'INVALID_COMBAT_COMMAND' })
    expect(() => resolveCombatPlayerAction(
      combat,
      malformed,
      runtime.dependencies.sceneCombat!.combat,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_COMMAND' }))
    expect(previewSceneCombatPlayerAction(
      session.scene,
      malformed,
      runtime.dependencies,
    )).toMatchObject({ canExecute: false })
    expect(() => resolveSceneCombatPlayerAction(
      session.scene,
      malformed,
      runtime.dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_COMMAND' }))
    expect(() => createStableRunSceneCommand({
      kind: 'scene-combat-action',
      command: malformed,
    })).toThrowError(expect.objectContaining<Partial<StableRunSceneError>>({
      code: 'INVALID_COMMAND',
    }))
  })

  it('leaves a structurally valid combat action in an active Scene to core rejection', () => {
    const start: StableRunPhase = { kind: 'scene-session', payload: launch() }
    const tracked = trackedStorage(start)
    const before = tracked.backing.read()
    expect(() => executeCombat(start, { kind: 'defend' }, tracked.storage))
      .toThrowError(expect.objectContaining({ code: 'SCENE_NOT_IN_COMBAT' }))
    expect(tracked.counters.writes).toBe(0)
    expect(tracked.backing.read()).toBe(before)
  })
})

describe('Stable Run Scene combat action routing', () => {
  it.each([
    { kind: 'metal-pipe-basic-attack' },
    { kind: 'metal-pipe-charged-strike' },
    { kind: 'defend' },
  ] as const)('routes $kind through core and one stable save', (command) => {
    const session = enterCombat()
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const expected = resolveSceneCombatPlayerAction(
      session.scene,
      command,
      runtime.dependencies,
    )
    const tracked = trackedStorage(start)
    const execution = executeCombat(start, command, tracked.storage)
    expect(execution.result).toEqual(expected)
    expect(requireSession(execution.phase).scene).toEqual(expected.snapshot)
    expect(requireSession(execution.phase).context).toEqual(session.context)
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry))
      .toEqual(execution.phase)
  })

  it('allows a durability-one charged strike to resolve fully before breaking', () => {
    const session = enterCombat({ weaponDurability: 1 })
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(start)
    const execution = executeCombat(
      start,
      { kind: 'metal-pipe-charged-strike' },
      tracked.storage,
    )
    const next = requireSession(execution.phase)
    const active = activeCombat(next)
    expect(active.enemy.currentHealth).toBe(8)
    expect(active.usage.metalPipeChargedStrikeUses).toBe(1)
    expect(active.enemyNextActionCtb).toBe(270)
    expect(getItemState(next.scene.itemStates, defaultPipe.instanceId).resource)
      .toEqual({ kind: 'durability', current: 0 })
    expect(tracked.counters.writes).toBe(1)
  })

  it('keeps temporary attack tied only to the current weapon slot', () => {
    const backup = item('combat-router-backup-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const session = enterCombat({
      weapon: null,
      backpackItems: [backup],
      backpackPlacements: [
        { instanceId: backup.instanceId, x: 1, y: 0, rotated: false },
      ],
    })
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(start)
    const before = getItemState(session.scene.itemStates, backup.instanceId)
    const execution = executeCombat(
      start,
      { kind: 'temporary-attack' },
      tracked.storage,
    )
    const next = requireSession(execution.phase)
    expect(next.scene.equipment.weapon).toBeNull()
    expect(next.scene.backpack.items).toContainEqual(backup)
    expect(getItemState(next.scene.itemStates, backup.instanceId)).toEqual(before)
    expect(activeCombat(next).enemy.currentHealth).toBe(12)
    expect(tracked.counters.writes).toBe(1)
  })

  it('keeps temporary attack available for a broken equipped weapon with a usable backup', () => {
    const backup = item('combat-router-broken-slot-backup', HOSPITAL_ITEM_IDS.metalPipe)
    const session = enterCombat({
      weaponDurability: 0,
      backpackItems: [backup],
      backpackPlacements: [
        { instanceId: backup.instanceId, x: 1, y: 0, rotated: false },
      ],
    })
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(start)
    const execution = executeCombat(
      start,
      { kind: 'temporary-attack' },
      tracked.storage,
    )
    const next = requireSession(execution.phase)
    expect(next.scene.equipment.weapon).toEqual(defaultPipe)
    expect(getItemState(next.scene.itemStates, defaultPipe.instanceId).resource)
      .toEqual({ kind: 'durability', current: 0 })
    expect(next.scene.backpack.items).toContainEqual(backup)
    expect(getItemState(next.scene.itemStates, backup.instanceId).resource)
      .toEqual({ kind: 'durability', current: config.combat.metalPipe.maxDurability })
    expect(activeCombat(next).enemy.currentHealth).toBe(12)
    expect(tracked.counters.writes).toBe(1)
  })

  it('consumes a real quick-slot bandage without replenishing from the backpack', () => {
    const quick = item('combat-router-quick-bandage', HOSPITAL_ITEM_IDS.bandage)
    const spare = item('combat-router-spare-bandage', HOSPITAL_ITEM_IDS.bandage)
    const session = enterCombat({
      health: 12,
      bleeding: true,
      openWounds: [{
        id: 'combat-router-wound',
        kind: 'laceration',
        treatment: 'untreated',
      }],
      quickSlots: [quick, null],
      backpackItems: [spare],
      backpackPlacements: [
        { instanceId: spare.instanceId, x: 1, y: 0, rotated: false },
      ],
    })
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(start)
    const execution = executeCombat(start, {
      kind: 'use-quick-slot-item',
      quickSlotIndex: 0,
      targetOpenWoundId: 'combat-router-wound',
    }, tracked.storage)
    const next = requireSession(execution.phase)
    expect(next.scene.quickSlots.slots[0]).toBeNull()
    expect(next.scene.backpack.items).toContainEqual(spare)
    expect(next.scene.itemStates.states.some(
      ({ instanceId }) => instanceId === quick.instanceId,
    )).toBe(false)
    expect(next.scene.condition).toMatchObject({ bleeding: false })
    expect(next.scene.condition.openWounds[0]?.treatment).toBe('treated')
    expect(activeCombat(next).quickSlots).toEqual(next.scene.quickSlots)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry))
      .toEqual(execution.phase)
  })

  it('consumes a real quick-slot painkiller without accepting a forged wound target', () => {
    const quick = item('combat-router-quick-painkiller', HOSPITAL_ITEM_IDS.painkiller)
    const spare = item('combat-router-spare-painkiller', HOSPITAL_ITEM_IDS.painkiller)
    const session = enterCombat({
      minorContusions: 1,
      quickSlots: [quick, null],
      backpackItems: [spare],
      backpackPlacements: [
        { instanceId: spare.instanceId, x: 1, y: 0, rotated: false },
      ],
    })
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const rejected = trackedStorage(start)
    expect(() => executeCombat(start, {
      kind: 'use-quick-slot-item',
      quickSlotIndex: 0,
      targetOpenWoundId: 'forged-wound',
    }, rejected.storage)).toThrowError(expect.objectContaining({
      code: 'ACTION_NOT_AVAILABLE',
    }))
    expect(rejected.counters.writes).toBe(0)

    const tracked = trackedStorage(start)
    const execution = executeCombat(start, {
      kind: 'use-quick-slot-item',
      quickSlotIndex: 0,
    }, tracked.storage)
    const next = requireSession(execution.phase)
    expect(next.scene.quickSlots.slots[0]).toBeNull()
    expect(next.scene.backpack.items).toContainEqual(spare)
    expect(next.scene.condition.painkillerActive).toBe(true)
    expect(next.scene.itemStates.states.some(
      ({ instanceId }) => instanceId === quick.instanceId,
    )).toBe(false)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry))
      .toEqual(execution.phase)
  })

  it('preserves escape enemy identity, health, cycle, and reentry timing', () => {
    let phase: StableRunPhase = {
      kind: 'current-day-hub',
      payload: combatHub(),
    }
    const tracked = trackedStorage(phase)
    phase = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'launch-main-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    for (const command of [
      {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
      {
        kind: 'scene-obstacle',
        command: {
          obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
          optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard,
        },
      },
      {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
      },
    ] as const) {
      phase = executeStableRunSceneCommand({
        currentPhase: phase,
        command,
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      }).phase
    }
    const before = activeCombat(requireSession(phase))
    const escaped = executeCombat(phase, { kind: 'escape' }, tracked.storage)
    phase = escaped.phase
    const dormant = requireSession(phase).scene.combatState.encounters[0]
    if (dormant.kind !== 'dormant') throw new Error('expected dormant encounter')
    expect(dormant.enemy).toMatchObject({
      enemyInstanceId: before.enemy.enemyInstanceId,
      currentHealth: before.enemy.currentHealth,
      resolvedActionCount: 1,
      defeated: false,
    })
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    const reentered = executeStableRunSceneCommand({
      currentPhase: phase,
      command: {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
      },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = reentered.phase
    const active = activeCombat(requireSession(phase))
    expect(active.enemy).toEqual(dormant.enemy)
    expect(active.enemyNextActionCtb).toBe(50)
    expect(tracked.counters.writes).toBe(6)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
  })

  it('saves a dead Scene before a separate lifecycle command creates RunFailure', () => {
    let phase: StableRunPhase = {
      kind: 'scene-session',
      payload: enterCombat({ health: 1 }),
    }
    const tracked = trackedStorage(phase)
    const defeated = executeCombat(phase, { kind: 'escape' }, tracked.storage)
    phase = defeated.phase
    expect(phase.kind).toBe('scene-session')
    expect(requireSession(phase).scene.status).toBe('dead')
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)

    const settled = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    phase = settled.phase
    expect(phase.kind).toBe('run-failure')
    if (phase.kind !== 'run-failure') throw new Error('expected RunFailure')
    expect(phase.payload.source.kind).toBe('scene-defeat')
    expect(tracked.counters.writes).toBe(2)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
  })

  it('saves combat timeout as a terminal Scene before lifecycle settlement', () => {
    let phase: StableRunPhase = {
      kind: 'scene-session',
      payload: enterCombat({}, 10),
    }
    const tracked = trackedStorage(phase)
    phase = executeCombat(phase, { kind: 'escape' }, tracked.storage).phase
    expect(requireSession(phase).scene).toMatchObject({
      status: 'forced-returned',
      remainingTime: 0,
    })
    expect(phase.kind).toBe('scene-session')
    expect(tracked.counters.writes).toBe(1)
    expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    const settled = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(settled.phase.kind).toBe('current-day-hub')
    expect(tracked.counters.writes).toBe(2)
  })
})

describe('Stable Run Scene combat determinism and application chain', () => {
  it('returns one random-bearing committed combat result after one failed write', () => {
    const session = enterCombat()
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const command = { kind: 'metal-pipe-basic-attack' } as const
    const expected = resolveSceneCombatPlayerAction(
      session.scene,
      command,
      runtime.dependencies,
    )
    const expectedSession = createRunSceneSessionSnapshot({
      context: session.context,
      scene: expected.snapshot,
    }, hospitalSceneLaunchDependencies)
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    tracked.failNextWrite()
    const resolver = vi.spyOn(sceneCore, 'resolveSceneCombatPlayerAction')
    const execution = executeCombat(start, command, tracked.storage)
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
    expect(requireSession(execution.phase)).toEqual(expectedSession)
    expect(execution.result).toEqual(expected)
    const actualCombat = activeCombat(requireSession(execution.phase))
    const expectedCombat = activeCombat(expectedSession)
    expect(actualCombat.enemy.resolvedActionCount)
      .toBe(expectedCombat.enemy.resolvedActionCount)
    expect(JSON.stringify(execution.result)).toContain('combat-risk-resolved')
  })

  it('does not replay an ordinary ongoing combat mutation after write failure', () => {
    const session = enterCombat()
    const start: StableRunPhase = { kind: 'scene-session', payload: session }
    const tracked = trackedStorage(start)
    const previous = tracked.backing.read()
    tracked.failNextWrite()
    const resolver = vi.spyOn(sceneCore, 'resolveSceneCombatPlayerAction')
    const execution = executeCombat(
      start,
      { kind: 'metal-pipe-charged-strike' },
      tracked.storage,
    )
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(tracked.counters.writes).toBe(1)
    expect(tracked.backing.read()).toBe(previous)
    expect(requireSession(execution.phase).scene.status).toBe('combat')
  })

  it('runs launch, combat victory, withdrawal, and settlement only through execution phases', () => {
    let phase: StableRunPhase = {
      kind: 'current-day-hub',
      payload: combatHub(),
    }
    const identity = phase.payload.continuity.runIdentity
    const tracked = trackedStorage(phase)
    let writes = 0
    const assertCommitted = () => {
      expect(tracked.counters.writes).toBe(writes)
      expect(loadRunPhase(tracked.storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
    }

    phase = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'launch-main-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    writes += 1
    const sceneInstanceId = requireSession(phase).scene.sceneInstanceId
    assertCommitted()

    for (const command of [
      {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      },
      {
        kind: 'scene-obstacle',
        command: {
          obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
          optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard,
        },
      },
      {
        kind: 'scene-move',
        command: { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
      },
    ] as const) {
      phase = executeStableRunSceneCommand({
        currentPhase: phase,
        command,
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      }).phase
      writes += 1
      expect(requireSession(phase).scene.sceneInstanceId).toBe(sceneInstanceId)
      assertCommitted()
    }
    expect(requireSession(phase).scene.status).toBe('combat')

    for (const command of [
      { kind: 'metal-pipe-basic-attack' },
      { kind: 'metal-pipe-charged-strike' },
      { kind: 'metal-pipe-basic-attack' },
    ] as const) {
      phase = executeCombat(phase, command, tracked.storage).phase
      writes += 1
      expect(requireSession(phase).scene.sceneInstanceId).toBe(sceneInstanceId)
      assertCommitted()
    }
    const victory = requireSession(phase)
    expect(victory.scene.status).toBe('active')
    const defeated = victory.scene.combatState.encounters[0]
    expect(defeated.kind === 'dormant' && defeated.enemy.defeated).toBe(true)

    for (const edgeId of [
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    ]) {
      phase = executeStableRunSceneCommand({
        currentPhase: phase,
        command: { kind: 'scene-move', command: { edgeId } },
        storage: tracked.storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      }).phase
      writes += 1
      expect(requireSession(phase).scene.status).toBe('active')
      assertCommitted()
    }
    phase = executeStableRunSceneCommand({
      currentPhase: phase,
      command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    writes += 1
    expect(requireSession(phase).scene.status).toBe('safe-returned')
    assertCommitted()

    phase = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'settle-terminal-scene' },
      storage: tracked.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    writes += 1
    expect(phase.kind).toBe('current-day-hub')
    if (phase.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(phase.payload.continuity.runIdentity).toEqual(identity)
    assertCommitted()
  })
})
