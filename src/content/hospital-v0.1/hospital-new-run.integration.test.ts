import { describe, expect, it } from 'vitest'
import { createCurrentDayHubSnapshot, resolveCurrentDayHubLoadoutCommand } from '../../core/current-day-hub'
import { deriveSceneInstanceIdFromRunFacts } from '../../core/domain'
import { getItemState } from '../../core/item-state'
import { loadRunPhase, MemoryRunSaveStorage, saveRunPhase } from '../../state/run-save'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
} from '../../state/run-save'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS,
  HOSPITAL_SCENE_DEFINITION_ID,
  HOSPITAL_SLICE_RULES_VERSION,
  createHospitalNewRunInitialCurrentDayHub,
  hospitalItemResourceCatalog,
} from '..'

const identity = (suffix: string) => ({
  runId: `new-run-${suffix}`,
  seed: `new-seed-${suffix}`,
  rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
})

const createInitial = (
  suffix = 'a',
  utilityDefinitionId: typeof HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS[number] = HOSPITAL_ITEM_IDS.crowbar,
) => createHospitalNewRunInitialCurrentDayHub({
  runIdentity: identity(suffix),
  utilityDefinitionId,
}, hospitalCurrentDayHubDependencies)

describe('hospital one-day formal New Run initial Hub', () => {
  it.each(HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS)(
    'constructs the complete initial loadout for %s',
    (utilityDefinitionId) => {
      const hub = createInitial(utilityDefinitionId, utilityDefinitionId)
      expect(hub).toMatchObject({
        continuity: { currentDay: 1 },
        playerCondition: {
          currentHealth: 12,
          bleeding: false,
          openWounds: [],
          minorContusions: 0,
          painkillerActive: false,
          pendingInfectionExposures: 0,
        },
        dailyState: {
          medicalUsage: { disinfectantUsesToday: 0 },
          threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
          maintenanceLaborRemaining: 3,
          mainSceneUsedToday: false,
        },
        worldThreat: { progress: 0 },
        satiety: { current: 6 },
        runIntelLog: { intelIds: [] },
        returnLedger: { sceneInstanceIds: [] },
      })
      expect(hub.continuity.sceneInstanceId).toBe(deriveSceneInstanceIdFromRunFacts({
        runIdentity: hub.continuity.runIdentity,
        currentDay: 1,
        sceneDefinitionId: HOSPITAL_SCENE_DEFINITION_ID,
      }))
      expect(hub.runLoadout.backpack.items).toEqual([])
      expect(hub.runLoadout.warehouse.items).toEqual([])
      expect(hub.runLoadout.taskStorage.items).toEqual([])
      expect(hub.runLoadout.equipment.weapon?.definitionId).toBe(HOSPITAL_ITEM_IDS.metalPipe)
      expect(hub.runLoadout.equipment.armor?.definitionId).toBe(HOSPITAL_ITEM_IDS.heavyCoat)
      expect(hub.runLoadout.equipment.utility?.definitionId).toBe(utilityDefinitionId)
      expect(hub.runLoadout.quickSlots.slots[0]?.definitionId).toBe(HOSPITAL_ITEM_IDS.bandage)
      expect(hub.runLoadout.quickSlots.slots[1]).toBeNull()

      const owned = [
        ...Object.values(hub.runLoadout.equipment),
        ...hub.runLoadout.quickSlots.slots,
      ].filter((item): item is NonNullable<typeof item> => item !== null)
      expect(new Set(owned.map(({ instanceId }) => instanceId)).size).toBe(4)
      expect(hub.runLoadout.itemStates.states).toHaveLength(4)
      for (const item of owned) {
        const state = getItemState(hub.runLoadout.itemStates, item.instanceId)
        const profile = hospitalItemResourceCatalog.get(item.definitionId)
        expect(state.definitionId).toBe(item.definitionId)
        expect(state.resource).toEqual(profile.kind === 'none'
          ? { kind: 'none' }
          : { kind: profile.kind, current: profile.maximum })
      }
      expect(JSON.stringify(hub)).not.toContain('specialization')
      expect(JSON.stringify(hub)).not.toContain('profession')
    },
  )

  it('is deterministic for the same identity and choice', () => {
    expect(createInitial('repeat', HOSPITAL_ITEM_IDS.toolkit)).toEqual(
      createInitial('repeat', HOSPITAL_ITEM_IDS.toolkit),
    )
  })

  it('changes every initial physical identity and the Scene identity for another Run', () => {
    const first = createInitial('first', HOSPITAL_ITEM_IDS.flashlight)
    const second = createInitial('second', HOSPITAL_ITEM_IDS.flashlight)
    const ids = (hub: typeof first) => [
      ...Object.values(hub.runLoadout.equipment),
      ...hub.runLoadout.quickSlots.slots,
    ].filter((item): item is NonNullable<typeof item> => item !== null)
      .map(({ instanceId }) => instanceId)
    expect(first.continuity.sceneInstanceId).not.toBe(second.continuity.sceneInstanceId)
    expect(ids(first).every((id) => !ids(second).includes(id))).toBe(true)
  })

  it('keeps fixed identities stable while changing only the selected utility facts', () => {
    const crowbar = createInitial('same', HOSPITAL_ITEM_IDS.crowbar)
    const toolkit = createInitial('same', HOSPITAL_ITEM_IDS.toolkit)
    expect(crowbar.continuity).toEqual(toolkit.continuity)
    expect(crowbar.runLoadout.equipment.weapon).toEqual(toolkit.runLoadout.equipment.weapon)
    expect(crowbar.runLoadout.equipment.armor).toEqual(toolkit.runLoadout.equipment.armor)
    expect(crowbar.runLoadout.quickSlots).toEqual(toolkit.runLoadout.quickSlots)
    expect(crowbar.runLoadout.equipment.utility).not.toEqual(toolkit.runLoadout.equipment.utility)
  })

  it('strictly restores the only legal Day 1 empty-ledger form', () => {
    const initial = createInitial()
    expect(createCurrentDayHubSnapshot(initial, hospitalCurrentDayHubDependencies)).toEqual(initial)
  })

  it.each([
    ['wrong prebound ID', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      continuity: { ...hub.continuity, sceneInstanceId: 'wrong-scene-id' },
    })],
    ['sentinel prebound ID', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      continuity: { ...hub.continuity, sceneInstanceId: 'pending' },
    })],
    ['empty prebound ID', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      continuity: { ...hub.continuity, sceneInstanceId: '' },
    })],
    ['null prebound ID', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      continuity: { ...hub.continuity, sceneInstanceId: null },
    })],
    ['pre-filled return ledger', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      returnLedger: { sceneInstanceIds: [hub.continuity.sceneInstanceId] },
    })],
    ['used Day 1 with empty ledger', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      dailyState: { ...hub.dailyState, mainSceneUsedToday: true },
    })],
    ['Day 2 with empty ledger', (hub: ReturnType<typeof createInitial>) => ({
      ...hub,
      continuity: { ...hub.continuity, currentDay: 2 },
    })],
  ] as const)('rejects %s without repairing the input', (_label, forge) => {
    const initial = createInitial('strict')
    const forged = forge(initial)
    const before = JSON.stringify(forged)
    expect(() => createCurrentDayHubSnapshot(
      forged,
      hospitalCurrentDayHubDependencies,
    )).toThrow()
    expect(JSON.stringify(forged)).toBe(before)
  })

  it('rejects an old-Run prebound identity even when a forged ledger contains it', () => {
    const current = createInitial('current')
    const old = createInitial('old')
    const forged = {
      ...current,
      continuity: {
        ...current.continuity,
        sceneInstanceId: old.continuity.sceneInstanceId,
      },
      returnLedger: { sceneInstanceIds: [old.continuity.sceneInstanceId] },
    }
    expect(() => createCurrentDayHubSnapshot(
      forged,
      hospitalCurrentDayHubDependencies,
    )).toThrow()
  })

  it('keeps the ordinary returned-Hub ledger invariant', () => {
    const initial = createInitial('returned')
    const returned = createCurrentDayHubSnapshot({
      ...initial,
      dailyState: { ...initial.dailyState, mainSceneUsedToday: true },
      returnLedger: { sceneInstanceIds: [initial.continuity.sceneInstanceId] },
    }, hospitalCurrentDayHubDependencies)
    expect(returned.returnLedger.sceneInstanceIds).toEqual([
      initial.continuity.sceneInstanceId,
    ])
    expect(() => createCurrentDayHubSnapshot({
      ...returned,
      returnLedger: { sceneInstanceIds: [] },
    }, hospitalCurrentDayHubDependencies)).toThrow()
  })

  it('preserves the initial-Hub branch through a legal Hub mutation and strict reload', () => {
    const initial = createInitial('mutation')
    const bandage = initial.runLoadout.quickSlots.slots[0]!
    const mutated = resolveCurrentDayHubLoadoutCommand(initial, {
      kind: 'quick-slot-to-backpack',
      sourceSlotIndex: 0,
      placement: { instanceId: bandage.instanceId, x: 0, y: 0, rotated: false },
    }, hospitalCurrentDayHubDependencies).snapshot
    expect(mutated.continuity).toEqual(initial.continuity)
    expect(mutated.dailyState.mainSceneUsedToday).toBe(false)
    expect(mutated.returnLedger.sceneInstanceIds).toEqual([])
    const storage = new MemoryRunSaveStorage()
    saveRunPhase(storage, { kind: 'current-day-hub', payload: mutated }, hospitalRunSaveRulesRegistry)
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual({
      kind: 'current-day-hub',
      payload: mutated,
    })
  })
})
