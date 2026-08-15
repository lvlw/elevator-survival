import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import { createEmptyEquipment } from '../../core/equipment'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import {
  SceneLaunchError,
  applySceneLaunchEffects,
  buildSceneLaunchTransitionPlan,
  createRunSceneSessionSnapshot,
  deriveSceneInstanceId,
  getRunSceneRuntime,
  previewSceneLaunch,
  resolveRunSceneSessionReturn,
  resolveSceneLaunch,
  type RunSceneSessionSnapshot,
  type SceneLaunchDependencies,
  type SceneLaunchEffect,
} from '../../core/scene-launch'
import {
  createSceneExplorationSnapshot,
  resolveSceneBatteryCommand,
  resolveSceneMedicalCommand,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import {
  resolveRunFailureFromSceneSession,
  type RunTerminationDependencies,
} from '../../core/run-termination'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalHubSurvivalContentBindings,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSceneLaunchContent,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
  hospitalWorldThreatCatalog,
} from '..'

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({
  instanceId,
  definitionId,
  quantity,
})

const baseReturnDependencies = {
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

const currentDayHubDependencies = {
  returnDependencies: baseReturnDependencies,
  medicalBindings: hospitalSceneMedicalContentBindings,
  survivalBindings: hospitalHubSurvivalContentBindings,
  worldThreatCatalog: hospitalWorldThreatCatalog,
}

const launchDependencies: SceneLaunchDependencies = {
  currentDayHub: currentDayHubDependencies,
  content: hospitalSceneLaunchContent,
}

const terminationDependencies: RunTerminationDependencies = {
  currentDayHub: currentDayHubDependencies,
  sceneLaunch: launchDependencies,
}

interface HubOptions {
  readonly day?: number
  readonly runId?: string
  readonly seed?: string
  readonly mainSceneUsedToday?: boolean
  readonly returnLedger?: readonly string[]
  readonly warehouse?: readonly ItemInstance[]
}

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const previousSceneId = `returned-before-day-${options.day ?? 2}`
  const warehouse = options.warehouse ?? [item('stored-ration', HOSPITAL_ITEM_IDS.ration)]
  const battery = item('carried-battery', HOSPITAL_ITEM_IDS.standardBattery)
  const bandage = item('carried-bandage', HOSPITAL_ITEM_IDS.bandage)
  const card = item('carried-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
  const flashlight = item('equipped-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const pipe = item('equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const backpackItems = [battery, bandage, card]
  const carried = [...backpackItems, flashlight, pipe]
  const allItems = [...warehouse, ...carried]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: [] },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: [
        { instanceId: battery.instanceId, x: 0, y: 0, rotated: false },
        { instanceId: bandage.instanceId, x: 1, y: 0, rotated: false },
        { instanceId: card.instanceId, x: 2, y: 0, rotated: false },
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
        candidate.instanceId === flashlight.instanceId
          ? createItemState({ ...candidate, resource: { kind: 'charge', current: 0 } }, hospitalItemResourceCatalog)
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
        runId: options.runId ?? 'run-scene-launch',
        seed: options.seed ?? 'seed-scene-launch',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: options.day ?? 2,
      sceneInstanceId: previousSceneId,
    },
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: 10,
      bleeding: false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 1,
    }, config.combat.player),
    runIntelLog: { intelIds: ['intel-before-launch'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 2,
      mainSceneUsedToday: options.mainSceneUsedToday ?? false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 20 },
    satiety: { current: 5 },
    returnLedger: {
      sceneInstanceIds: [...(options.returnLedger ?? [previousSceneId])].sort(),
    },
  }, currentDayHubDependencies)
}

function terminalSession(
  session: RunSceneSessionSnapshot,
  status: 'safe-returned' | 'forced-returned' | 'dead',
): RunSceneSessionSnapshot {
  const runtime = getRunSceneRuntime(session, launchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    status,
    remainingTime: status === 'forced-returned' ? 0 : session.scene.remainingTime,
    condition: status === 'dead'
      ? createPlayerCondition({ ...session.scene.condition, currentHealth: 0 }, config.combat.player)
      : session.scene.condition,
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot({ context: session.context, scene }, launchDependencies)
}

describe('hospital formal Scene Launch and active Scene lifecycle', () => {
  it('derives stable instance identity from Run, rule version, day, and formal scene content', () => {
    const start = hub()
    const sameA = deriveSceneInstanceId(start, hospitalSceneLaunchContent.sceneDefinitionId, currentDayHubDependencies)
    const sameB = deriveSceneInstanceId(start, hospitalSceneLaunchContent.sceneDefinitionId, currentDayHubDependencies)
    const nextDay = deriveSceneInstanceId(hub({ day: 3 }), hospitalSceneLaunchContent.sceneDefinitionId, currentDayHubDependencies)
    const otherRun = deriveSceneInstanceId(hub({ runId: 'other-run' }), hospitalSceneLaunchContent.sceneDefinitionId, currentDayHubDependencies)
    expect(sameA).toBe(sameB)
    expect(nextDay).not.toBe(sameA)
    expect(otherRun).not.toBe(sameA)
  })

  it('launches atomically from a strict Hub and projects only the carried physical truth', () => {
    const start = hub()
    const preview = previewSceneLaunch(start, { kind: 'launch-main-scene' }, launchDependencies)
    const result = resolveSceneLaunch(start, { kind: 'launch-main-scene' }, launchDependencies)
    expect(preview).toEqual({ canExecute: true, result })
    expect(start.dailyState.mainSceneUsedToday).toBe(false)
    expect(result.session.context.mainSceneUsedToday).toBe(true)
    expect(result.session.context.runReturnCarryForward.continuity.sceneInstanceId)
      .toBe(result.session.scene.sceneInstanceId)
    expect(result.session.scene).toMatchObject({
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: config.scene.totalTime,
      condition: start.playerCondition,
      dailyMedicalUsage: start.dailyState.medicalUsage,
      runIntelLog: start.runIntelLog,
    })
    expect(result.session.scene.backpack).toEqual(start.runLoadout.backpack)
    expect(result.session.scene.equipment).toEqual(start.runLoadout.equipment)
    expect(result.session.scene.quickSlots).toEqual(start.runLoadout.quickSlots)
    expect(result.session.scene.itemStates.states.map(({ instanceId }) => instanceId).sort())
      .toEqual(['carried-bandage', 'carried-battery', 'carried-card', 'equipped-flashlight', 'equipped-pipe'])
    expect(result.session.scene.itemStates.states).not.toContainEqual(
      expect.objectContaining({ instanceId: 'stored-ration' }),
    )
    expect(result.session.context).not.toHaveProperty('dailyMedicalUsage')
    expect(result.session.context).not.toHaveProperty('runIntelLog')
  })

  it('rejects unknown command fields and an incomplete formal runtime bundle', () => {
    expect(() => resolveSceneLaunch(
      hub(),
      { kind: 'launch-main-scene', extra: true } as never,
      launchDependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    for (const missing of ['sceneCombat', 'lifecycleCatalog', 'deviceRechargeCatalog'] as const) {
      const incomplete: SceneLaunchDependencies = {
        ...launchDependencies,
        content: {
          ...hospitalSceneLaunchContent,
          createRuntime(runSeed, sceneInstanceId) {
            const runtime = hospitalSceneLaunchContent.createRuntime(runSeed, sceneInstanceId)
            return {
              ...runtime,
              dependencies: { ...runtime.dependencies, [missing]: undefined },
            } as never
          },
        },
      }
      expect(() => resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, incomplete))
        .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    }
  })

  it('rejects a Run-storage collision with a deterministic hidden Scene item', () => {
    const first = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, launchDependencies).session
    const hidden = first.scene.searchState.nodeStates
      .flatMap((node) => node.kind === 'unsearched' ? node.preparedOutcome.revealedItems : [])
      .find(({ item: candidate }) =>
        hospitalItemReturnLifecycleCatalog.get(candidate.definitionId).kind !== 'quest',
      )
    expect(hidden).toBeDefined()
    if (!hidden) return
    expect(() => resolveSceneLaunch(
      hub({ warehouse: [hidden.item] }),
      { kind: 'launch-main-scene' },
      launchDependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('strictly restores one provenance context without duplicating mutable Scene facts', () => {
    const session = resolveSceneLaunch(
      hub(),
      { kind: 'launch-main-scene' },
      launchDependencies,
    ).session
    expect(() => createRunSceneSessionSnapshot({
      context: { ...session.context, mainSceneUsedToday: false },
      scene: session.scene,
    }, launchDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunSceneSessionSnapshot({
      context: { ...session.context, dailyMedicalUsage: { disinfectantUsesToday: 0 } },
      scene: session.scene,
    }, launchDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createRunSceneSessionSnapshot({
      context: session.context,
      scene: { ...session.scene, sceneInstanceId: 'forged-scene-instance' },
    }, launchDependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects second launch and a forged unused flag whose deterministic ID is already returned', () => {
    expect(() => resolveSceneLaunch(
      hub({ mainSceneUsedToday: true }),
      { kind: 'launch-main-scene' },
      launchDependencies,
    )).toThrowError(expect.objectContaining<Partial<SceneLaunchError>>({ code: 'ACTION_NOT_AVAILABLE' }))
    const start = hub()
    const derived = deriveSceneInstanceId(start, hospitalSceneLaunchContent.sceneDefinitionId, currentDayHubDependencies)
    const forged = createCurrentDayHubSnapshot({
      ...start,
      returnLedger: {
        sceneInstanceIds: [...start.returnLedger.sceneInstanceIds, derived].sort(),
      },
    }, currentDayHubDependencies)
    expect(() => resolveSceneLaunch(forged, { kind: 'launch-main-scene' }, launchDependencies))
      .toThrowError(expect.objectContaining<Partial<SceneLaunchError>>({ code: 'ACTION_NOT_AVAILABLE' }))
  })

  it('rejects every launch Effect mutation without changing the Hub', () => {
    const start = hub()
    const before = JSON.stringify(start)
    const plan = buildSceneLaunchTransitionPlan(start, { kind: 'launch-main-scene' }, launchDependencies)
    const mutations: readonly ((effects: SceneLaunchEffect[]) => void)[] = [
      (effects) => { effects.shift() },
      (effects) => { effects.push(effects[0]!) },
      (effects) => { effects.reverse() },
      (effects) => { Object.assign(effects[0], { after: false }) },
      (effects) => {
        const effect = effects.find(({ kind }) => kind === 'run-continuity-bound-to-scene')
        if (effect?.kind === 'run-continuity-bound-to-scene') Object.assign(effect.after, { currentDay: 7 })
      },
      (effects) => {
        const effect = effects.find(({ kind }) => kind === 'formal-scene-initialized')
        if (effect?.kind === 'formal-scene-initialized') Object.assign(effect.scene, { remainingTime: 1 })
      },
      (effects) => {
        const effect = effects.find(({ kind }) => kind === 'run-scene-session-committed')
        if (effect?.kind === 'run-scene-session-committed') Object.assign(effect.session.context, { mainSceneUsedToday: false })
      },
      (effects) => {
        const effect = effects.find(({ kind }) => kind === 'run-scene-session-committed')
        if (effect?.kind === 'run-scene-session-committed') {
          Object.assign(effect.session.context.runReturnCarryForward.continuity.runIdentity, { runId: 'forged-run' })
        }
      },
    ]
    for (const mutate of mutations) {
      const effects = JSON.parse(JSON.stringify(plan.effects)) as SceneLaunchEffect[]
      mutate(effects)
      expect(() => applySceneLaunchEffects(start, plan.command, effects, launchDependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
      expect(JSON.stringify(start)).toBe(before)
    }
  })

  it('uses the complete runtime to enter immediate combat and rejects forged active danger for battery and medical', () => {
    const launched = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, launchDependencies).session
    const runtime = getRunSceneRuntime(launched, launchDependencies)
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
    const entered = resolveSceneMoveCommand(
      security,
      { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor },
      runtime.dependencies,
    ).snapshot
    expect(entered.status).toBe('combat')

    const forged = {
      ...launched.scene,
      currentNodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      status: 'active' as const,
    }
    expect(() => createRunSceneSessionSnapshot({ context: launched.context, scene: forged }, launchDependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolveSceneBatteryCommand(
      forged,
      { batteryInstanceId: 'carried-battery', targetInstanceId: 'equipped-flashlight' },
      runtime.dependencies,
    )).toThrow()
    expect(() => resolveSceneMedicalCommand(
      forged,
      { source: { container: 'backpack', itemInstanceId: 'carried-bandage' } },
      runtime.dependencies,
    )).toThrow()
  })

  it.each(['safe-returned', 'forced-returned'] as const)(
    'keeps daily use true through %s Return and blocks another launch',
    (status) => {
      const launched = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, launchDependencies).session
      const returned = resolveRunSceneSessionReturn(
        terminalSession(launched, status),
        launchDependencies,
      )
      expect(returned.currentDayHub.dailyState.mainSceneUsedToday).toBe(true)
      expect(returned.currentDayHub.returnLedger.sceneInstanceIds)
        .toContain(launched.scene.sceneInstanceId)
      expect(returned.currentDayHub.runIntelLog).toEqual(launched.scene.runIntelLog)
      expect(returned.currentDayHub.dailyState.medicalUsage).toEqual(launched.scene.dailyMedicalUsage)
      expect(() => resolveSceneLaunch(
        returned.currentDayHub,
        { kind: 'launch-main-scene' },
        launchDependencies,
      )).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    },
  )

  it('projects terminal Scene intel and daily medical usage back to Hub instead of a context copy', () => {
    const launched = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, launchDependencies).session
    const runtime = getRunSceneRuntime(launched, launchDependencies)
    const changedScene = createSceneExplorationSnapshot({
      ...launched.scene,
      dailyMedicalUsage: { disinfectantUsesToday: 1 },
      runIntelLog: { intelIds: [...launched.scene.runIntelLog.intelIds, 'intel-from-terminal-scene'] },
      status: 'safe-returned',
    }, runtime.dependencies)
    const returned = resolveRunSceneSessionReturn(
      createRunSceneSessionSnapshot({ context: launched.context, scene: changedScene }, launchDependencies),
      launchDependencies,
    ).currentDayHub
    expect(returned.dailyState.medicalUsage).toEqual(changedScene.dailyMedicalUsage)
    expect(returned.runIntelLog).toEqual(changedScene.runIntelLog)
  })

  it('runs the formal Hub → Scene → Return → next-day Hub lifecycle and changes the next Scene ID', () => {
    const first = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, launchDependencies).session
    const runtime = getRunSceneRuntime(first, launchDependencies)
    const recharged = resolveSceneBatteryCommand(
      first.scene,
      { batteryInstanceId: 'carried-battery', targetInstanceId: 'equipped-flashlight' },
      runtime.dependencies,
    ).snapshot
    const returned = resolveRunSceneSessionReturn(
      terminalSession(createRunSceneSessionSnapshot({ context: first.context, scene: recharged }, launchDependencies), 'safe-returned'),
      launchDependencies,
    ).currentDayHub
    expect(returned.dailyState.mainSceneUsedToday).toBe(true)
    const settlement = resolveDailySettlement(returned, { kind: 'end-day' }, currentDayHubDependencies)
    expect(settlement.outcome.kind).toBe('next-day-current-day-hub')
    if (settlement.outcome.kind !== 'next-day-current-day-hub') return
    expect(settlement.outcome.snapshot.dailyState.mainSceneUsedToday).toBe(false)
    const second = resolveSceneLaunch(
      settlement.outcome.snapshot,
      { kind: 'launch-main-scene' },
      launchDependencies,
    ).session
    expect(second.scene.sceneInstanceId).not.toBe(first.scene.sceneInstanceId)
  })

  it('allows Day 7 launch while preserving the existing final-day settlement guard', () => {
    const launched = resolveSceneLaunch(hub({ day: 7 }), { kind: 'launch-main-scene' }, launchDependencies).session
    expect(launched.context.runReturnCarryForward.continuity.currentDay).toBe(7)
    const returned = resolveRunSceneSessionReturn(terminalSession(launched, 'safe-returned'), launchDependencies)
    expect(() => resolveDailySettlement(
      returned.currentDayHub,
      { kind: 'end-day' },
      currentDayHubDependencies,
    )).toThrowError(expect.objectContaining({ code: 'FINAL_DAY_RESOLUTION_REQUIRED' }))
    expect(() => hub({ day: 8 })).toThrow()
  })

  it('terminates a dead formal session without Return extraction or ledger mutation', () => {
    const launched = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, launchDependencies).session
    const dead = terminalSession(launched, 'dead')
    const result = resolveRunFailureFromSceneSession(dead, terminationDependencies)
    expect(result.snapshot.reason).toBe('health-depleted')
    expect(result.snapshot.source.kind).toBe('scene-defeat')
    if (result.snapshot.source.kind !== 'scene-defeat') return
    expect(result.snapshot.source.context.mainSceneUsedToday).toBe(true)
    expect(result.snapshot.source.context.runReturnCarryForward.returnLedger)
      .toEqual(launched.context.runReturnCarryForward.returnLedger)
    expect(result.snapshot.source.terminalScene.runIntelLog).toEqual(dead.scene.runIntelLog)
    expect(result.snapshot.source.terminalScene.dailyMedicalUsage).toEqual(dead.scene.dailyMedicalUsage)
  })
})
