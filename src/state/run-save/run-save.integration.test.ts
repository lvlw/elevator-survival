import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
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
  projectRunReturnCarryForwardFromCurrentDayHub,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import {
  resolveRunFailure,
  summarizeRunFailure,
  type RunFailureSnapshot,
} from '../../core/run-termination'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
  resolveRunSceneSessionReturn,
  resolveRunSceneSessionWithdrawal,
  resolveSceneLaunch,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import {
  resolveMainSearchCommand,
  createSceneExplorationSnapshot,
  resolveNodeItemPickupCommand,
  resolveSceneCombatPlayerAction,
  resolveSceneInventoryCommand,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import {
  createBrowserRunSaveStorage,
  deserializeRunSave,
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  hospitalSceneLaunchDependencies,
  loadRunPhase,
  MemoryRunSaveStorage,
  RUN_SAVE_FORMAT_VERSION,
  RunSaveError,
  saveRunPhase,
  serializeRunSave,
  type RunSaveEnvelope,
  type StableRunPhase,
} from '.'

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({
  instanceId,
  definitionId,
  quantity,
})

function hub(overrides: Readonly<{
  condition?: CurrentDayHubSnapshot['playerCondition']
  day?: number
}> = {}): CurrentDayHubSnapshot {
  const warehouse = item('stored-ration', HOSPITAL_ITEM_IDS.ration)
  const bandage = item('carried-bandages', HOSPITAL_ITEM_IDS.bandage, 2)
  const battery = item('carried-battery', HOSPITAL_ITEM_IDS.standardBattery)
  const card = item('carried-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
  const pipe = item('equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const flashlight = item('equipped-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const painkiller = item('quick-painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const allItems = [warehouse, bandage, battery, card, pipe, flashlight, painkiller]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: [warehouse] },
    taskStorage: { items: [] },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [bandage, battery, card],
      placements: [
        { instanceId: bandage.instanceId, x: 0, y: 0, rotated: false },
        { instanceId: battery.instanceId, x: 1, y: 0, rotated: false },
        { instanceId: card.instanceId, x: 2, y: 0, rotated: false },
      ],
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: null, utility: flashlight },
    quickSlots: createQuickSlotSnapshot(
      [painkiller, null],
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: {
      states: allItems.map((candidate) =>
        candidate.instanceId === flashlight.instanceId
          ? createItemState({
              ...candidate,
              resource: { kind: 'charge', current: 1 },
            }, hospitalItemResourceCatalog)
          : candidate.instanceId === pipe.instanceId
            ? createItemState({
                ...candidate,
                resource: { kind: 'durability', current: 5 },
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
  const previousSceneId = `returned-before-save-day-${overrides.day ?? 2}`
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-save-integration',
        seed: 'run-save-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: overrides.day ?? 2,
      sceneInstanceId: previousSceneId,
    },
    runLoadout,
    playerCondition: overrides.condition ?? createPlayerCondition({
      currentHealth: 10,
      bleeding: false,
      openWounds: [{ id: 'treated-before-save', kind: 'laceration', treatment: 'treated' }],
      minorContusions: 1,
      painkillerActive: true,
      pendingInfectionExposures: 1,
    }, config.combat.player),
    runIntelLog: { intelIds: ['intel-before-save'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 1 },
      threatSuppression: { usesToday: 1, suppressionAmountToday: 15 },
      maintenanceLaborRemaining: 2,
      mainSceneUsedToday: false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 20 },
    satiety: { current: 5 },
    returnLedger: { sceneInstanceIds: [previousSceneId] },
  }, hospitalCurrentDayHubDependencies)
}

function roundTrip(phase: StableRunPhase): StableRunPhase {
  const storage = new MemoryRunSaveStorage()
  saveRunPhase(storage, phase, hospitalRunSaveRulesRegistry)
  const loaded = loadRunPhase(storage, hospitalRunSaveRulesRegistry)
  if (!loaded) throw new Error('expected one saved Run phase')
  return loaded
}

function activeSceneWithInventoryHistory(): Readonly<{
  session: RunSceneSessionSnapshot
  splitInstanceId: string
}> {
  const launched = resolveSceneLaunch(
    hub(),
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
  const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
  const hall = resolveSceneMoveCommand(
    launched.scene,
    { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
    runtime.dependencies,
  ).snapshot
  const searched = resolveMainSearchCommand(
    hall,
    { illumination: 'search-without-flashlight' },
    runtime.dependencies,
  ).snapshot
  const split = resolveSceneInventoryCommand(searched, {
    kind: 'split-scene-backpack-stack',
    sourceInstanceId: 'carried-bandages',
    quantity: 1,
    placement: { x: 3, y: 0, rotated: false },
  }, runtime.dependencies).snapshot
  const splitInstanceId = split.backpack.items.find(
    ({ instanceId }) => instanceId !== 'carried-bandages' &&
      instanceId.startsWith('scene-backpack-split:'),
  )!.instanceId
  const dropped = resolveSceneInventoryCommand(split, {
    kind: 'drop-scene-backpack-item',
    instanceId: splitInstanceId,
  }, runtime.dependencies).snapshot
  return {
    splitInstanceId,
    session: createRunSceneSessionSnapshot({
      context: launched.context,
      scene: dropped,
    }, hospitalSceneLaunchDependencies),
  }
}

function combatSession(): RunSceneSessionSnapshot {
  const launched = resolveSceneLaunch(
    hub(),
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
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
  const entered = resolveSceneMoveCommand(
    security,
    { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor },
    runtime.dependencies,
  ).snapshot
  const afterBasic = resolveSceneCombatPlayerAction(
    entered,
    { kind: 'metal-pipe-basic-attack' },
    runtime.dependencies,
  ).snapshot
  const afterCharged = resolveSceneCombatPlayerAction(
    afterBasic,
    { kind: 'metal-pipe-charged-strike' },
    runtime.dependencies,
  ).snapshot
  return createRunSceneSessionSnapshot({
    context: launched.context,
    scene: afterCharged,
  }, hospitalSceneLaunchDependencies)
}

function dailyFailure(): RunFailureSnapshot {
  const fatalCondition = createPlayerCondition({
    currentHealth: 1,
    bleeding: true,
    openWounds: [{ id: 'fatal-wound', kind: 'laceration', treatment: 'untreated' }],
    minorContusions: 0,
    painkillerActive: false,
    pendingInfectionExposures: 0,
  }, config.combat.player)
  const settlement = resolveDailySettlement(
    hub({ condition: fatalCondition }),
    { kind: 'end-day' },
    hospitalCurrentDayHubDependencies,
  )
  if (settlement.outcome.kind !== 'terminal') throw new Error('expected fatal settlement')
  return resolveRunFailure({
    kind: 'daily-settlement-terminal',
    terminalSnapshot: settlement.outcome.snapshot,
  }, hospitalRunTerminationDependencies).snapshot
}

function mutateSerialized(
  envelope: RunSaveEnvelope,
  mutate: (draft: Record<string, unknown>) => void,
): string {
  const draft = structuredClone(envelope) as unknown as Record<string, unknown>
  mutate(draft)
  return JSON.stringify(draft)
}

describe('stable Run Save IO', () => {
  it('round-trips a complete CurrentDayHub and can continue into formal Scene Launch', () => {
    const start = hub()
    const restored = roundTrip({ kind: 'current-day-hub', payload: start })
    expect(restored).toEqual({ kind: 'current-day-hub', payload: start })
    expect(Object.isFrozen(restored)).toBe(true)
    if (restored.kind !== 'current-day-hub') throw new Error('expected Hub phase')
    expect(resolveSceneLaunch(
      restored.payload,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session.scene.status).toBe('active')
  })

  it('round-trips irreversible search and 047 split/drop ownership, then continues deterministically', () => {
    const { session, splitInstanceId } = activeSceneWithInventoryHistory()
    const restored = roundTrip({ kind: 'scene-session', payload: session })
    expect(restored).toEqual({ kind: 'scene-session', payload: session })
    if (restored.kind !== 'scene-session') throw new Error('expected Scene phase')
    expect(restored.payload.scene.sceneInstanceId).toBe(session.scene.sceneInstanceId)
    expect(restored.payload.scene.currentNodeId).toBe(session.scene.currentNodeId)
    expect(restored.payload.scene.remainingTime).toBe(session.scene.remainingTime)
    expect(restored.payload.scene.searchState).toEqual(session.scene.searchState)
    expect(restored.payload.scene.sceneItems).toEqual(session.scene.sceneItems)
    expect(restored.payload.scene.combatState).toEqual(session.scene.combatState)
    expect(restored.payload.scene.taskEvents).toEqual(session.scene.taskEvents)
    expect(restored.payload.scene.runIntelLog).toEqual(session.scene.runIntelLog)
    expect(restored.payload.scene.dailyMedicalUsage).toEqual(session.scene.dailyMedicalUsage)
    expect(restored.payload.context).toEqual(session.context)
    expect(restored.payload.scene.backpack.items.some(
      ({ instanceId }) => instanceId === splitInstanceId,
    )).toBe(false)
    expect(restored.payload.scene.itemStates.states.some(
      ({ instanceId }) => instanceId === splitInstanceId,
    )).toBe(false)
    const groundMatches = restored.payload.scene.sceneItems.nodeStates.flatMap(
      ({ items }) => items,
    ).filter(({ item: candidate }) => candidate.instanceId === splitInstanceId)
    expect(groundMatches).toHaveLength(1)
    const runtime = getRunSceneRuntime(restored.payload, hospitalSceneLaunchDependencies)
    const pickup = {
      nodeItemInstanceId: splitInstanceId,
      quantity: 1,
      placement: { x: 3, y: 0, rotated: false },
    }
    expect(resolveNodeItemPickupCommand(
      restored.payload.scene,
      pickup,
      runtime.dependencies,
    )).toEqual(resolveNodeItemPickupCommand(
      session.scene,
      pickup,
      runtime.dependencies,
    ))
  })

  it('round-trips formal combat without healing, intent refresh, RNG redraw, or CTB reset', () => {
    const session = combatSession()
    expect(session.scene.status).toBe('combat')
    const restored = roundTrip({ kind: 'scene-session', payload: session })
    if (restored.kind !== 'scene-session') throw new Error('expected combat Scene phase')
    expect(restored.payload).toEqual(session)
    const active = restored.payload.scene.combatState.encounters[0]
    if (!active || active.kind !== 'active') throw new Error('expected active combat')
    expect(active.combat).toMatchObject({
      currentCtb: 280,
      playerNextActionCtb: 280,
      enemyNextActionCtb: 370,
      enemy: {
        currentHealth: 4,
        resolvedActionCount: 1,
      },
    })
    expect(restored.payload.scene.combatState.usage.metalPipeChargedStrikeUses).toBe(1)
    expect(restored.payload.scene.itemStates.states.find(
      ({ instanceId }) => instanceId === 'equipped-pipe',
    )?.resource).toEqual({ kind: 'durability', current: 1 })
    const runtime = getRunSceneRuntime(restored.payload, hospitalSceneLaunchDependencies)
    const command = { kind: 'metal-pipe-basic-attack' } as const
    expect(resolveSceneCombatPlayerAction(
      restored.payload.scene,
      command,
      runtime.dependencies,
    )).toEqual(resolveSceneCombatPlayerAction(
      session.scene,
      command,
      runtime.dependencies,
    ))
  })

  it.each(['safe-returned', 'forced-returned', 'dead'] as const)(
    'round-trips a strict stable Scene Session with status %s',
    (status) => {
      const launched = resolveSceneLaunch(
        hub(),
        { kind: 'launch-main-scene' },
        hospitalSceneLaunchDependencies,
      ).session
      const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
      let terminal: RunSceneSessionSnapshot
      if (status === 'safe-returned') {
        terminal = resolveRunSceneSessionWithdrawal(
          launched,
          { kind: 'withdraw-from-scene' },
          hospitalSceneLaunchDependencies,
        ).session
      } else if (status === 'forced-returned') {
        const hall = resolveSceneMoveCommand(
          launched.scene,
          { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
          runtime.dependencies,
        ).snapshot
        const overtimeStart = createSceneExplorationSnapshot({
          ...hall,
          remainingTime: 5,
        }, runtime.dependencies)
        terminal = resolveRunSceneSessionWithdrawal(
          createRunSceneSessionSnapshot({
            context: launched.context,
            scene: overtimeStart,
          }, hospitalSceneLaunchDependencies),
          { kind: 'withdraw-from-scene' },
          hospitalSceneLaunchDependencies,
        ).session
      } else {
        const deadScene = createSceneExplorationSnapshot({
          ...launched.scene,
          status: 'dead',
          condition: createPlayerCondition({
            ...launched.scene.condition,
            currentHealth: 0,
          }, config.combat.player),
        }, runtime.dependencies)
        terminal = createRunSceneSessionSnapshot({
          context: launched.context,
          scene: deadScene,
        }, hospitalSceneLaunchDependencies)
      }
      expect(terminal.scene.status).toBe(status)
      expect(roundTrip({ kind: 'scene-session', payload: terminal }))
        .toEqual({ kind: 'scene-session', payload: terminal })
    },
  )

  it('round-trips Return to Hub without restoring the daily Scene use or permitting repeat Return', () => {
    const launched = resolveSceneLaunch(
      hub(),
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    const terminal = resolveRunSceneSessionWithdrawal(
      launched,
      { kind: 'withdraw-from-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    const returned = resolveRunSceneSessionReturn(
      terminal,
      hospitalSceneLaunchDependencies,
    ).currentDayHub
    const restored = roundTrip({ kind: 'current-day-hub', payload: returned })
    if (restored.kind !== 'current-day-hub') throw new Error('expected returned Hub')
    expect(restored.payload.dailyState.mainSceneUsedToday).toBe(true)
    expect(restored.payload.returnLedger.sceneInstanceIds).toContain(terminal.scene.sceneInstanceId)
    expect(restored.payload.runLoadout.warehouse.items).toContainEqual(
      expect.objectContaining({ instanceId: 'carried-bandages' }),
    )
    expect(() => resolveSceneLaunch(
      restored.payload,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    )).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    const returnedLedgerContext = {
      ...terminal.context,
      runReturnCarryForward: {
        ...terminal.context.runReturnCarryForward,
        returnLedger: restored.payload.returnLedger,
      },
    }
    expect(() => resolveRunSceneSessionReturn({
      context: returnedLedgerContext,
      scene: terminal.scene,
    }, hospitalSceneLaunchDependencies)).toThrow()
  })

  it('round-trips only the already committed next-day settlement result', () => {
    const settlement = resolveDailySettlement(
      hub(),
      { kind: 'end-day' },
      hospitalCurrentDayHubDependencies,
    )
    if (settlement.outcome.kind !== 'next-day-current-day-hub') {
      throw new Error('expected successful next day')
    }
    const restored = roundTrip({
      kind: 'current-day-hub',
      payload: settlement.outcome.snapshot,
    })
    if (restored.kind !== 'current-day-hub') throw new Error('expected next-day Hub')
    expect(restored.payload.continuity.currentDay).toBe(3)
    expect(restored.payload.dailyState.mainSceneUsedToday).toBe(false)
    expect(restored.payload.dailyState.medicalUsage).toEqual({ disinfectantUsesToday: 0 })
    expect(restored.payload.dailyState.maintenanceLaborRemaining)
      .toBe(config.maintenance.dailyBaseLabor.points)
    expect(restored.payload.playerCondition).toMatchObject({
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    })
  })

  it('round-trips a terminal RunFailure and only regenerates its derived summary', () => {
    const failure = dailyFailure()
    const beforeSummary = summarizeRunFailure(failure, hospitalRunTerminationDependencies)
    const restored = roundTrip({ kind: 'run-failure', payload: failure })
    expect(restored).toEqual({ kind: 'run-failure', payload: failure })
    if (restored.kind !== 'run-failure') throw new Error('expected failure phase')
    expect(summarizeRunFailure(restored.payload, hospitalRunTerminationDependencies))
      .toEqual(beforeSummary)
    expect(restored.payload.source.kind).toBe('daily-settlement-terminal')
    expect(() => createCurrentDayHubSnapshot(
      restored.payload,
      hospitalCurrentDayHubDependencies,
    )).toThrow()
    expect(() => createRunSceneSessionSnapshot(
      restored.payload as never,
      hospitalSceneLaunchDependencies,
    )).toThrow()
  })

  it('uses one exact versioned envelope without caches or parallel phase fields', () => {
    const envelope = JSON.parse(serializeRunSave(
      { kind: 'current-day-hub', payload: hub() },
      hospitalRunSaveRulesRegistry,
    )) as Record<string, unknown>
    expect(Object.keys(envelope).sort()).toEqual([
      'kind', 'payload', 'rulesVersion', 'runIdentity', 'saveFormatVersion',
    ])
    expect(envelope).toMatchObject({
      saveFormatVersion: RUN_SAVE_FORMAT_VERSION,
      kind: 'current-day-hub',
      rulesVersion: config.metadata.rulesVersion,
      runIdentity: {
        runId: 'run-save-integration',
        seed: 'run-save-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
    })
    expect(envelope).not.toHaveProperty('effects')
    expect(envelope).not.toHaveProperty('preview')
    expect(envelope).not.toHaveProperty('profile')
    expect(envelope).not.toHaveProperty('loadTier')
  })

  it('rejects malformed JSON and every envelope-level corruption without repair', () => {
    const base = JSON.parse(serializeRunSave(
      { kind: 'current-day-hub', payload: hub() },
      hospitalRunSaveRulesRegistry,
    )) as RunSaveEnvelope
    expect(() => deserializeRunSave('{', hospitalRunSaveRulesRegistry))
      .toThrowError(expect.objectContaining<Partial<RunSaveError>>({ code: 'INVALID_JSON' }))
    const corruptions: readonly ((draft: Record<string, unknown>) => void)[] = [
      (draft) => { delete draft.payload },
      (draft) => { draft.extra = true },
      (draft) => { draft.kind = 'unknown-phase' },
      (draft) => { draft.saveFormatVersion = 2 },
      (draft) => { draft.rulesVersion = 'unknown-rules' },
      (draft) => {
        ;(draft.runIdentity as Record<string, unknown>).runId = 'forged-run'
      },
      (draft) => {
        const payload = draft.payload as Record<string, unknown>
        const continuity = payload.continuity as Record<string, unknown>
        ;(continuity.runIdentity as Record<string, unknown>).rulesVersion = 'unknown-rules'
      },
    ]
    for (const mutate of corruptions) {
      expect(() => deserializeRunSave(
        mutateSerialized(base, mutate),
        hospitalRunSaveRulesRegistry,
      )).toThrowError(RunSaveError)
    }
  })

  it('rejects forged Scene provenance, returned-current-Scene collision, and combat corruption', () => {
    const scene = activeSceneWithInventoryHistory().session
    const sceneEnvelope = JSON.parse(serializeRunSave(
      { kind: 'scene-session', payload: scene },
      hospitalRunSaveRulesRegistry,
    )) as RunSaveEnvelope
    expect(() => deserializeRunSave(mutateSerialized(sceneEnvelope, (draft) => {
      const payload = draft.payload as Record<string, unknown>
      ;(payload.scene as Record<string, unknown>).sceneInstanceId = 'forged-scene'
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)
    expect(() => deserializeRunSave(mutateSerialized(sceneEnvelope, (draft) => {
      const payload = draft.payload as Record<string, unknown>
      ;(payload.scene as Record<string, unknown>).remainingTime = 0
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)
    expect(() => deserializeRunSave(mutateSerialized(sceneEnvelope, (draft) => {
      const payload = draft.payload as Record<string, unknown>
      const context = payload.context as Record<string, unknown>
      const carryForward = context.runReturnCarryForward as Record<string, unknown>
      const ledger = carryForward.returnLedger as Record<string, unknown>
      ledger.sceneInstanceIds = [
        ...(ledger.sceneInstanceIds as string[]),
        scene.scene.sceneInstanceId,
      ].sort()
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)

    const combat = combatSession()
    const combatEnvelope = JSON.parse(serializeRunSave(
      { kind: 'scene-session', payload: combat },
      hospitalRunSaveRulesRegistry,
    )) as RunSaveEnvelope
    expect(() => deserializeRunSave(mutateSerialized(combatEnvelope, (draft) => {
      const payload = draft.payload as Record<string, unknown>
      const scenePayload = payload.scene as Record<string, unknown>
      const combatState = scenePayload.combatState as Record<string, unknown>
      const encounter = (combatState.encounters as Record<string, unknown>[])[0]!
      const active = encounter.combat as Record<string, unknown>
      ;(active.enemy as Record<string, unknown>).currentHealth = 999
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)
  })

  it('rejects duplicate physical identity, orphan ItemState, and failure forged as active Hub', () => {
    const hubEnvelope = JSON.parse(serializeRunSave(
      { kind: 'current-day-hub', payload: hub() },
      hospitalRunSaveRulesRegistry,
    )) as RunSaveEnvelope
    expect(() => deserializeRunSave(mutateSerialized(hubEnvelope, (draft) => {
      const payload = draft.payload as Record<string, unknown>
      const loadout = payload.runLoadout as Record<string, unknown>
      const warehouse = loadout.warehouse as Record<string, unknown>
      const backpack = loadout.backpack as Record<string, unknown>
      ;(warehouse.items as unknown[]).push(structuredClone((backpack.items as unknown[])[0]))
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)
    expect(() => deserializeRunSave(mutateSerialized(hubEnvelope, (draft) => {
      const payload = draft.payload as Record<string, unknown>
      const loadout = payload.runLoadout as Record<string, unknown>
      const itemStates = loadout.itemStates as Record<string, unknown>
      ;(itemStates.states as unknown[]).push({
        instanceId: 'orphan-state',
        definitionId: HOSPITAL_ITEM_IDS.bandage,
        resource: { kind: 'none' },
      })
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)

    const failureEnvelope = JSON.parse(serializeRunSave(
      { kind: 'run-failure', payload: dailyFailure() },
      hospitalRunSaveRulesRegistry,
    )) as RunSaveEnvelope
    expect(() => deserializeRunSave(mutateSerialized(failureEnvelope, (draft) => {
      draft.kind = 'current-day-hub'
    }), hospitalRunSaveRulesRegistry)).toThrowError(RunSaveError)
  })

  it('keeps the previous stable single value when the next storage write throws', () => {
    const storage = new MemoryRunSaveStorage()
    const start = hub()
    saveRunPhase(
      storage,
      { kind: 'current-day-hub', payload: start },
      hospitalRunSaveRulesRegistry,
    )
    const previous = storage.read()
    const scene = resolveSceneLaunch(
      start,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    storage.failNextWrite()
    expect(() => saveRunPhase(
      storage,
      { kind: 'scene-session', payload: scene },
      hospitalRunSaveRulesRegistry,
    )).toThrowError(expect.objectContaining<Partial<RunSaveError>>({
      code: 'STORAGE_WRITE_FAILED',
    }))
    expect(storage.read()).toBe(previous)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry))
      .toEqual({ kind: 'current-day-hub', payload: start })
  })

  it('rejects a corrupt stored value without replacing it or falling back to a new Run', () => {
    const storage = new MemoryRunSaveStorage('{')
    expect(() => loadRunPhase(storage, hospitalRunSaveRulesRegistry))
      .toThrowError(expect.objectContaining<Partial<RunSaveError>>({ code: 'INVALID_JSON' }))
    expect(storage.read()).toBe('{')
  })

  it('offers an optional browser adapter backed by one logical key', () => {
    const values = new Map<string, string>()
    const browserStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    }
    const storage = createBrowserRunSaveStorage(browserStorage)
    saveRunPhase(
      storage,
      { kind: 'current-day-hub', payload: hub() },
      hospitalRunSaveRulesRegistry,
    )
    expect(values.size).toBe(1)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)?.kind)
      .toBe('current-day-hub')
  })
})
