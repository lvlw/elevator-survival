import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState, getItemState } from '../../core/item-state'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  getPlayerVisibleSceneTaskEvents,
  previewPlayerVisibleSceneTaskEventCommand,
  previewSceneTaskEventCommand,
  resolveSceneInventoryCommand,
  resolveSceneTaskEventCommand,
  type PerformSceneTaskEventCommand,
} from '../../core/scene-exploration'
import {
  createSceneSearchState,
  revealPreparedMainSearchOutcome,
} from '../../core/scene-search'
import {
  createSceneTaskEventCatalog,
  getSceneTaskEventOptionPrimaryMetadata,
} from '../../core/scene-task-event'
import {
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_INTEL_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_TASK_EVENT_IDS,
  createHospitalSceneCombatDependencies,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalItemResourceCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneCombatEncounterCatalog,
  hospitalSceneEdgeAccessCatalog,
  hospitalSceneTaskEventCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const SCENE_ID = 'pathogen-case-test-scene'
const EVENT_ID = HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval

function dependencies(runSeed = 'pathogen-case-seed') {
  return {
    graph: hospitalSliceV01SceneGraph,
    physicalCatalog: hospitalItemCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
    quickSlotCatalog: hospitalItemQuickSlotCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
    config,
    edgeAccessCatalog: hospitalSceneEdgeAccessCatalog,
    taskEventCatalog: hospitalSceneTaskEventCatalog,
    sceneCombat: createHospitalSceneCombatDependencies(runSeed, SCENE_ID),
    runSeed,
  }
}

function scene(input: Readonly<{
  runSeed?: string
  coatIntegrity?: number | null
  defeated?: boolean
  remainingTime?: number
  bleeding?: boolean
  currentHealth?: number
  minorContusions?: number
  materialWeight?: number
}> = {}) {
  const deps = dependencies(input.runSeed)
  const coat = input.coatIntegrity === null
    ? null
    : { instanceId: 'equipped-heavy-coat', definitionId: HOSPITAL_ITEM_IDS.heavyCoat, quantity: 1 }
  const states = coat
    ? [createItemState({ ...coat, resource: { kind: 'integrity', current: input.coatIntegrity ?? 4 } }, hospitalItemResourceCatalog)]
    : []
  const materialItems = materialStackItems(input.materialWeight ?? 0)
  const initial = createInitialSceneExplorationSnapshot({
    sceneInstanceId: SCENE_ID,
    searchState: createSceneSearchState({
      runSeed: input.runSeed ?? 'pathogen-case-seed', sceneInstanceId: SCENE_ID,
      graph: hospitalSliceV01SceneGraph, searchCatalog: hospitalMainSearchCatalog,
      itemCatalog: hospitalItemCatalog, itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    currentNodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
    remainingTime: input.remainingTime ?? config.scene.totalTime,
    enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
    backpack: createBackpackSnapshot({
      width: 6,
      height: 4,
      items: materialItems,
      placements: materialItems.map((item, index) => ({
        instanceId: item.instanceId,
        x: index,
        y: 0,
        rotated: false,
      })),
    }, hospitalItemCatalog),
    equipment: { weapon: null, armor: coat, utility: null },
    quickSlots: { slots: [null, null] },
    itemStates: {
      states: [
        ...states,
        ...materialItems.map((item) => createFullItemState(item, hospitalItemResourceCatalog)),
      ],
    },
    dailyMedicalUsage: { disinfectantUsesToday: 0 },
    runIntelLog: { intelIds: [] },
    condition: createPlayerCondition({
      currentHealth: input.currentHealth ?? 12,
      bleeding: input.bleeding ?? false,
      openWounds: [], minorContusions: input.minorContusions ?? 0, painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
  }, deps)
  const encounter = initial.combatState.encounters[0]
  if (!encounter || encounter.kind !== 'dormant') throw new Error('expected dormant orderly encounter')
  const defeated = createSceneExplorationSnapshot({
    ...initial,
    combatState: {
      ...initial.combatState,
      encounters: [{
        ...encounter,
        enemy: input.defeated === false
          ? encounter.enemy
          : { ...encounter.enemy, currentHealth: 0, defeated: true, hasBeenEncountered: true },
      }],
    },
  }, deps)
  return { deps, snapshot: defeated }
}

function materialStackItems(totalWeight: number): readonly ItemInstance[] {
  if (!Number.isSafeInteger(totalWeight) || totalWeight < 0 || totalWeight > 25) {
    throw new Error('material test weight must be an integer from 0 through 25')
  }
  const items: ItemInstance[] = []
  let remaining = totalWeight
  while (remaining > 0) {
    const quantity = Math.min(remaining, 5)
    items.push({
      instanceId: `material-${items.length}`,
      definitionId: HOSPITAL_ITEM_IDS.metalParts,
      quantity,
    })
    remaining -= quantity
  }
  return items
}

function command(optionId: string, placement = { x: 0, y: 0, rotated: false }): PerformSceneTaskEventCommand {
  return optionId === 'decline' ? { eventId: EVENT_ID, optionId } : { eventId: EVENT_ID, optionId, placement }
}

describe('hospital pathogen case retrieval', () => {
  it('extracts the same stable task instance through direct and cautious choices, then records origin intel', () => {
    const direct = scene({ coatIntegrity: null })
    const cautious = scene({ coatIntegrity: null })
    const directResult = resolveSceneTaskEventCommand(direct.snapshot, command('direct-extraction'), direct.deps)
    const cautiousResult = resolveSceneTaskEventCommand(cautious.snapshot, command('cautious-extraction'), cautious.deps)
    const directItem = directResult.snapshot.backpack.items[0]
    expect(directItem).toMatchObject({ definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase, quantity: 1 })
    expect(cautiousResult.snapshot.backpack.items[0]?.instanceId).toBe(directItem?.instanceId)
    expect(directResult.snapshot.itemStates.states[0]?.resource).toEqual({ kind: 'none' })
    expect(directResult.snapshot.runIntelLog.intelIds).toEqual([HOSPITAL_INTEL_IDS.pathogenCaseOrigin])
    expect(directResult.snapshot.taskEvents.entries).toEqual([{ eventId: EVENT_ID, status: 'completed' }])
    expect(directResult.result.effects.map(({ kind }) => kind)).toContain('scene-task-risk-resolved')
  })

  it('requires explicit quest confirmation to leave the extracted case at the current node', () => {
    const start = scene({ coatIntegrity: null })
    const extracted = resolveSceneTaskEventCommand(
      start.snapshot,
      command('cautious-extraction'),
      start.deps,
    ).snapshot
    const caseId = extracted.backpack.items[0]!.instanceId
    expect(() => resolveSceneInventoryCommand(
      extracted,
      { kind: 'drop-scene-backpack-item', instanceId: caseId },
      start.deps,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const dropped = resolveSceneInventoryCommand(
      extracted,
      { kind: 'confirm-drop-scene-quest-item', instanceId: caseId },
      start.deps,
    ).snapshot
    expect(dropped.backpack.items).toEqual([])
    expect(dropped.itemStates.states).toEqual([])
    expect(dropped.sceneItems.nodeStates.find(
      ({ nodeId }) => nodeId === HOSPITAL_NODE_IDS.specimenColdRoom,
    )?.items).toContainEqual(expect.objectContaining({
      item: expect.objectContaining({ instanceId: caseId, definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase }),
    }))
  })

  it('uses the coat once whenever it actually lowers risk, including the protected cautious zero-risk path', () => {
    const start = scene({ coatIntegrity: 1 })
    const resolved = resolveSceneTaskEventCommand(start.snapshot, command('cautious-extraction'), start.deps)
    expect(getItemState(resolved.snapshot.itemStates, 'equipped-heavy-coat').resource).toEqual({ kind: 'integrity', current: 0 })
    const trace = resolved.result.riskTrace
    expect(trace).toMatchObject({ rawRiskPercent: 20, effectiveRiskPercent: 0, protectionApplied: true, roll: null, exposureAdded: 0 })
    expect(scene({ coatIntegrity: 0 }).snapshot.equipment.armor).not.toBeNull()
    const exhausted = scene({ coatIntegrity: 0 })
    const unprotected = resolveSceneTaskEventCommand(exhausted.snapshot, command('direct-extraction'), exhausted.deps)
    expect(unprotected.result.riskTrace).toMatchObject({ rawRiskPercent: 60, effectiveRiskPercent: 60, protectionApplied: false })
  })

  it('uses the four confirmed contamination risk results and skips the zero-risk draw', () => {
    const directStart = scene({ coatIntegrity: null })
    const direct = resolveSceneTaskEventCommand(
      directStart.snapshot,
      command('direct-extraction'),
      directStart.deps,
    )
    const protectedDirectStart = scene({ coatIntegrity: 1 })
    const protectedDirect = resolveSceneTaskEventCommand(
      protectedDirectStart.snapshot,
      command('direct-extraction'),
      protectedDirectStart.deps,
    )
    const cautiousStart = scene({ coatIntegrity: null })
    const cautious = resolveSceneTaskEventCommand(
      cautiousStart.snapshot,
      command('cautious-extraction'),
      cautiousStart.deps,
    )
    const protectedCautiousStart = scene({ coatIntegrity: 1 })
    const protectedCautious = resolveSceneTaskEventCommand(
      protectedCautiousStart.snapshot,
      command('cautious-extraction'),
      protectedCautiousStart.deps,
    )
    expect(direct.result.riskTrace).toMatchObject({ rawRiskPercent: 60, effectiveRiskPercent: 60 })
    expect(protectedDirect.result.riskTrace).toMatchObject({ rawRiskPercent: 60, effectiveRiskPercent: 40, protectionApplied: true })
    expect(cautious.result.riskTrace).toMatchObject({ rawRiskPercent: 20, effectiveRiskPercent: 20 })
    expect(protectedCautious.result.riskTrace).toMatchObject({ rawRiskPercent: 20, effectiveRiskPercent: 0, protectionApplied: true, roll: null, drawIndex: null, exposureAdded: 0 })
  })

  it('uses an isolated named contamination stream with repeatable success and failure rolls', () => {
    const success = scene({ runSeed: 'pathogen-case-seed', coatIntegrity: null })
    const replay = scene({ runSeed: 'pathogen-case-seed', coatIntegrity: null })
    const failure = scene({ runSeed: 'beta', coatIntegrity: null })
    const successful = resolveSceneTaskEventCommand(success.snapshot, command('direct-extraction'), success.deps)
    const replayed = resolveSceneTaskEventCommand(replay.snapshot, command('direct-extraction'), replay.deps)
    const failed = resolveSceneTaskEventCommand(failure.snapshot, command('direct-extraction'), failure.deps)
    expect(successful.result.riskTrace).toMatchObject({ algorithmVersion: 'counter32-v1', roll: 26, exposureAdded: 1, rawRiskPercent: 60, effectiveRiskPercent: 60 })
    expect(replayed.result.riskTrace).toEqual(successful.result.riskTrace)
    expect(failed.result.riskTrace).toMatchObject({ roll: 96, exposureAdded: 0 })
    expect(successful.result.riskTrace?.streamId).toContain('scene-task-event')
  })

  it('uses one primary metadata owner for formal resolution and player-safe option projection', () => {
    const start = scene({ coatIntegrity: 1 })
    const metadata = getSceneTaskEventOptionPrimaryMetadata(
      start.snapshot,
      EVENT_ID,
      'direct-extraction',
      start.deps,
    )
    const formal = resolveSceneTaskEventCommand(
      start.snapshot,
      command('direct-extraction'),
      start.deps,
    )
    const visible = getPlayerVisibleSceneTaskEvents(start.snapshot, start.deps)[0]?.options
      .find(({ optionId }) => optionId === 'direct-extraction')
    expect(metadata).toMatchObject({
      rawRiskTier: 'high',
      effectiveRiskTier: 'medium',
      impactProtectionActive: true,
      armorResourceBefore: 1,
      armorResourceAfter: 0,
    })
    expect(formal.result.riskTrace).toMatchObject({
      rawRiskPercent: metadata.rawRiskPercent,
      effectiveRiskPercent: metadata.effectiveRiskPercent,
      protectionApplied: metadata.impactProtectionActive,
    })
    expect(visible).toMatchObject({
      effectiveRiskTier: metadata.effectiveRiskTier,
      impactProtectionActive: metadata.impactProtectionActive,
      impactProtection: {
        integrityBefore: metadata.armorResourceBefore,
        integrityCost: metadata.actualIntegrityConsumed,
        integrityAfter: metadata.armorResourceAfter,
      },
      output: {
        definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
        quantity: 1,
        width: 2,
        height: 2,
        unitWeight: 4,
        canRotate: true,
      },
      possibleExposureAmount: metadata.possibleExposureAmount,
      originIntelWillBeRecorded: true,
    })
    expect(JSON.stringify(visible)).not.toMatch(/riskPercent|roll|streamId|drawIndex|succeeded/)
  })

  it('keeps opposite direct contamination outcomes identical in the player-safe preview', () => {
    const exposed = scene({ runSeed: 'pathogen-case-seed', coatIntegrity: null })
    const clear = scene({ runSeed: 'beta', coatIntegrity: null })
    const exposedFormal = resolveSceneTaskEventCommand(
      exposed.snapshot,
      command('direct-extraction'),
      exposed.deps,
    )
    const clearFormal = resolveSceneTaskEventCommand(
      clear.snapshot,
      command('direct-extraction'),
      clear.deps,
    )
    expect(exposedFormal.result.riskTrace?.exposureAdded).toBe(1)
    expect(clearFormal.result.riskTrace?.exposureAdded).toBe(0)
    const exposedSafe = previewPlayerVisibleSceneTaskEventCommand(
      exposed.snapshot,
      command('direct-extraction'),
      exposed.deps,
    )
    const clearSafe = previewPlayerVisibleSceneTaskEventCommand(
      clear.snapshot,
      command('direct-extraction'),
      clear.deps,
    )
    expect(exposedSafe).toEqual(clearSafe)
    expect(JSON.stringify(exposedSafe)).not.toMatch(
      /riskPercent|roll|streamId|drawIndex|succeeded|exposureAdded|sceneInstanceId|instanceId|randomTrace|effects|snapshot/i,
    )
  })

  it('keeps cautious seed variation hidden and treats protected cautious extraction as deterministic no-risk', () => {
    const first = scene({ runSeed: 'pathogen-case-seed', coatIntegrity: null })
    const second = scene({ runSeed: 'beta', coatIntegrity: null })
    const cautiousExposures = [first, second].map(({ snapshot, deps }) =>
      resolveSceneTaskEventCommand(
        snapshot,
        command('cautious-extraction'),
        deps,
      ).result.riskTrace?.exposureAdded)
    expect(new Set(cautiousExposures)).toEqual(new Set([0, 1]))
    expect(previewPlayerVisibleSceneTaskEventCommand(
      first.snapshot,
      command('cautious-extraction'),
      first.deps,
    )).toEqual(previewPlayerVisibleSceneTaskEventCommand(
      second.snapshot,
      command('cautious-extraction'),
      second.deps,
    ))

    const protectedFirst = scene({ runSeed: 'pathogen-case-seed', coatIntegrity: 1 })
    const protectedSecond = scene({ runSeed: 'beta', coatIntegrity: 1 })
    const firstPreview = previewPlayerVisibleSceneTaskEventCommand(
      protectedFirst.snapshot,
      command('cautious-extraction'),
      protectedFirst.deps,
    )
    const secondPreview = previewPlayerVisibleSceneTaskEventCommand(
      protectedSecond.snapshot,
      command('cautious-extraction'),
      protectedSecond.deps,
    )
    expect(firstPreview).toEqual(secondPreview)
    expect(firstPreview).toMatchObject({
      canExecute: true,
      result: {
        effectiveRiskTier: 'none',
        possibleExposureAmount: 0,
        impactProtection: { active: true, integrityBefore: 1, integrityAfter: 0 },
      },
    })
    expect(resolveSceneTaskEventCommand(
      protectedFirst.snapshot,
      command('cautious-extraction'),
      protectedFirst.deps,
    ).result.riskTrace).toMatchObject({ roll: null, exposureAdded: 0 })
  })

  it('declining remains available and has no time, random, item, intel, or state effect', () => {
    const start = scene()
    const declined = resolveSceneTaskEventCommand(start.snapshot, command('decline'), start.deps)
    expect(declined.result.effects).toEqual([{ kind: 'scene-task-event-declined', eventId: EVENT_ID, optionId: 'decline', nodeId: HOSPITAL_NODE_IDS.specimenColdRoom }])
    expect(declined.snapshot).toEqual(start.snapshot)
    expect(previewSceneTaskEventCommand(declined.snapshot, command('direct-extraction'), start.deps).canExecute).toBe(true)
  })

  it('requires the formally declared orderly encounter to be defeated', () => {
    const start = scene({ defeated: false })
    expect(previewSceneTaskEventCommand(start.snapshot, command('direct-extraction'), start.deps)).toEqual({
      canExecute: false,
      rejectionCode: 'SCENE_TASK_EVENT_QUALIFICATION_FAILED',
    })
  })

  it('projects options only while the formal encounter is defeated and the event is available', () => {
    const unavailable = scene({ defeated: false })
    expect(getPlayerVisibleSceneTaskEvents(unavailable.snapshot, unavailable.deps)).toEqual([{
      eventId: EVENT_ID,
      status: 'available',
      options: [],
    }])
    const available = scene()
    const completed = resolveSceneTaskEventCommand(
      available.snapshot,
      command('direct-extraction'),
      available.deps,
    )
    expect(getPlayerVisibleSceneTaskEvents(completed.snapshot, dependencies())).toEqual([{
      eventId: EVENT_ID,
      status: 'completed',
      options: [],
    }])
  })

  it('binds the hospital task event to its formal combat encounter and rejects unknown encounter IDs', () => {
    const definition = hospitalSceneTaskEventCatalog.get(EVENT_ID)
    expect(hospitalSceneCombatEncounterCatalog.has(definition.requiredDefeatedEncounterId)).toBe(true)
    expect(() => createSceneTaskEventCatalog(
      [{ ...definition, requiredDefeatedEncounterId: 'encounter-typo' }],
      {
        graph: hospitalSliceV01SceneGraph,
        itemCatalog: hospitalItemCatalog,
        equipmentCatalog: hospitalItemEquipmentCatalog,
        itemResourceCatalog: hospitalItemResourceCatalog,
        encounterCatalog: hospitalSceneCombatEncounterCatalog,
      },
    )).toThrow(/identity/)
  })

  it('rejects a nonempty task event catalog without formal scene combat dependencies', () => {
    const start = scene()
    expect(() => createSceneExplorationSnapshot(
      {
        ...start.snapshot,
        combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
      },
      { ...start.deps, sceneCombat: undefined },
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('keeps search history and completed task origin intel consistent with RunIntel without restricting other sources', () => {
    const start = scene()
    const searched = revealPreparedMainSearchOutcome(
      start.snapshot.searchState,
      HOSPITAL_NODE_IDS.emergencyHall,
    )
    const revealedIntelId = searched.nodeStates.find(
      ({ nodeId }) => nodeId === HOSPITAL_NODE_IDS.emergencyHall,
    )
    if (!revealedIntelId || revealedIntelId.kind !== 'searched') throw new Error('expected searched hall')
    expect(() => createSceneExplorationSnapshot(
      { ...start.snapshot, searchState: searched },
      start.deps,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const withSearchIntel = createSceneExplorationSnapshot(
      { ...start.snapshot, searchState: searched, runIntelLog: { intelIds: [...revealedIntelId.revealedIntelIds] } },
      start.deps,
    )
    expect(withSearchIntel.searchState).toEqual(searched)
    expect(() => createSceneExplorationSnapshot(
      { ...start.snapshot, taskEvents: { entries: [{ eventId: EVENT_ID, status: 'completed' }] } },
      start.deps,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(createSceneExplorationSnapshot(
      {
        ...start.snapshot,
        taskEvents: { entries: [{ eventId: EVENT_ID, status: 'completed' }] },
        runIntelLog: { intelIds: ['intel-from-other-run-source', HOSPITAL_INTEL_IDS.pathogenCaseOrigin] },
      },
      start.deps,
    ).runIntelLog.intelIds).toEqual([
      'intel-from-other-run-source',
      HOSPITAL_INTEL_IDS.pathogenCaseOrigin,
    ])
  })

  it('requires an explicit valid placement before any extraction side effect and locks completed events', () => {
    const start = scene({ coatIntegrity: 4 })
    const invalid = previewSceneTaskEventCommand(start.snapshot, command('direct-extraction', { x: 5, y: 3, rotated: false }), start.deps)
    expect(invalid).toEqual({ canExecute: false, rejectionCode: 'ACTION_NOT_AVAILABLE' })
    expect(start.snapshot).toEqual(scene({ coatIntegrity: 4 }).snapshot)
    const result = resolveSceneTaskEventCommand(start.snapshot, command('direct-extraction'), start.deps)
    expect(previewSceneTaskEventCommand(result.snapshot, command('cautious-extraction'), start.deps)).toEqual({ canExecute: false, rejectionCode: 'SCENE_TASK_EVENT_ALREADY_COMPLETED' })
  })

  it('uses post-acquisition weight for overtime forced return, after primary effects and post-action bleeding', () => {
    const start = scene({ remainingTime: 5, bleeding: true, currentHealth: 12 })
    const resolved = resolveSceneTaskEventCommand(start.snapshot, command('direct-extraction'), start.deps)
    expect(resolved.snapshot.backpack.items).toHaveLength(1)
    expect(resolved.snapshot.remainingTime).toBe(0)
    expect(resolved.snapshot.condition.currentHealth).toBeLessThan(12)
    expect(resolved.snapshot.status).toBe('forced-returned')
    expect(resolved.result.effects.map(({ kind }) => kind)).toContain('scene-time-resolved')
  })

  it('locks the confirmed overtime, return and forced-return damage values after extraction', () => {
    const directStart = scene({ remainingTime: 5 })
    const direct = resolveSceneTaskEventCommand(directStart.snapshot, command('direct-extraction'), directStart.deps)
    expect(direct.result.returnRoute).toMatchObject({ estimatedReturnTime: 30 })
    expect(direct.result.sceneOutcome).toMatchObject({ overtimeDebt: 5, effectiveEmergencyReturnTime: 35, forcedReturnBaseDamage: 2 })
    const cautiousStart = scene({ remainingTime: 5 })
    const cautious = resolveSceneTaskEventCommand(cautiousStart.snapshot, command('cautious-extraction'), cautiousStart.deps)
    expect(cautious.result.returnRoute).toMatchObject({ estimatedReturnTime: 30 })
    expect(cautious.result.sceneOutcome).toMatchObject({ overtimeDebt: 25, effectiveEmergencyReturnTime: 55, forcedReturnBaseDamage: 3 })
    const overloadedStart = scene({ remainingTime: 5, materialWeight: 21, minorContusions: 1 })
    const overloaded = resolveSceneTaskEventCommand(overloadedStart.snapshot, command('cautious-extraction', { x: 0, y: 1, rotated: false }), overloadedStart.deps)
    expect(overloaded.result.returnRoute).toMatchObject({ estimatedReturnTime: 42 })
    expect(overloaded.result.sceneOutcome).toMatchObject({ overtimeDebt: 25, effectiveEmergencyReturnTime: 67, forcedReturnBaseDamage: 4 })
  })

  it('retains completed extraction facts when post-action bleeding kills the player without safe extraction', () => {
    const start = scene({ remainingTime: 20, bleeding: true, currentHealth: 1 })
    const resolved = resolveSceneTaskEventCommand(start.snapshot, command('direct-extraction'), start.deps)
    expect(resolved.snapshot).toMatchObject({
      status: 'dead',
      condition: { currentHealth: 0, pendingInfectionExposures: 1 },
      taskEvents: { entries: [{ eventId: EVENT_ID, status: 'completed' }] },
      runIntelLog: { intelIds: [HOSPITAL_INTEL_IDS.pathogenCaseOrigin] },
    })
    expect(resolved.snapshot.backpack.items).toHaveLength(1)
    expect(resolved.snapshot.status).not.toBe('safe-returned')
  })

  it('retains completed extraction facts when forced-return damage kills the player', () => {
    const start = scene({ remainingTime: 5, currentHealth: 2 })
    const resolved = resolveSceneTaskEventCommand(start.snapshot, command('direct-extraction'), start.deps)
    expect(resolved.snapshot).toMatchObject({
      status: 'dead',
      condition: { currentHealth: 0 },
      taskEvents: { entries: [{ eventId: EVENT_ID, status: 'completed' }] },
      runIntelLog: { intelIds: [HOSPITAL_INTEL_IDS.pathogenCaseOrigin] },
    })
    expect(resolved.snapshot.backpack.items).toHaveLength(1)
    expect(resolved.snapshot.status).not.toBe('safe-returned')
  })

  it('fails cannot-carry atomically before coat cost, risk, exposure, item, intel, or time', () => {
    const start = scene({ coatIntegrity: 4, materialWeight: 25 })
    expect(previewSceneTaskEventCommand(
      start.snapshot,
      command('direct-extraction', { x: 0, y: 1, rotated: false }),
      start.deps,
    )).toEqual({ canExecute: false, rejectionCode: 'ACTION_NOT_AVAILABLE' })
    expect(start.snapshot).toEqual(scene({ coatIntegrity: 4, materialWeight: 25 }).snapshot)
  })

  it('rejects effect tampering atomically and projects only player-visible choice facts', () => {
    const start = scene({ coatIntegrity: 4 })
    const resolved = resolveSceneTaskEventCommand(start.snapshot, command('direct-extraction'), start.deps)
    const withoutItem = resolved.result.effects.filter(({ kind }) => kind !== 'scene-task-item-acquired')
    expect(() => applySceneExplorationEffects(start.snapshot, withoutItem, start.deps)).toThrow(/任务事件/)
    expect(getPlayerVisibleSceneTaskEvents(start.snapshot, start.deps)).toEqual([{
      eventId: EVENT_ID,
      status: 'available',
      options: expect.arrayContaining([
        expect.objectContaining({ optionId: 'direct-extraction', actionTime: 10, effectiveRiskTier: 'medium', impactProtectionActive: true, requiresBackpackPlacement: true }),
        expect.objectContaining({ optionId: 'cautious-extraction', actionTime: 30, effectiveRiskTier: 'none', impactProtectionActive: true, requiresBackpackPlacement: true }),
      ]),
    }])
  })
})
