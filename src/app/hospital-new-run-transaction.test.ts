import { describe, expect, it, vi } from 'vitest'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS,
  HOSPITAL_SLICE_RULES_VERSION,
  createHospitalNewRunInitialCurrentDayHub,
} from '../content'
import { createPlayerCondition } from '../core/condition'
import {
  createCurrentDayHubSnapshot,
  resolveCurrentDayHubLoadoutCommand,
} from '../core/current-day-hub'
import { resolveDailySettlement } from '../core/daily-settlement'
import { resolveRunFailure } from '../core/run-termination'
import { resolveSceneLaunch } from '../core/scene-launch'
import {
  createRunSaveRulesRegistry,
  canonicalizeStableRunPhase,
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  hospitalSceneLaunchDependencies,
  loadRunPhase,
  saveRunPhase,
  serializeRunSave,
  type RunSaveStorage,
  type StableRunPhase,
} from '../state/run-save'
import { createStableRunStore, createStableRunStoreFromStorage } from '../state/run-store'
import { createStableRunPlayerViewModel } from '../ui/presentation'
import { productionPresentationDependencies } from './production-composition'
import {
  HospitalNewRunTransactionError,
  executeHospitalNewRunTransaction,
  type HospitalNewRunTransactionDependencies,
} from './hospital-new-run-transaction'
import { createProductionRunIdentityMaterialSource } from './run-identity-material'

class TrackedStorage implements RunSaveStorage {
  public reads = 0
  public writes = 0
  public clears = 0
  public failWrites = false
  public value: string | null

  public constructor(value: string | null = null) { this.value = value }
  public read(): string | null { this.reads += 1; return this.value }
  public write(serialized: string): void {
    this.writes += 1
    if (this.failWrites) throw new Error('write denied')
    this.value = serialized
  }
  public clear(): void { this.clears += 1; this.value = null }
}

function initial(runId = 'old-run', seed = 'old-seed') {
  return createHospitalNewRunInitialCurrentDayHub({
    runIdentity: { runId, seed, rulesVersion: HOSPITAL_SLICE_RULES_VERSION },
    utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar,
  }, hospitalCurrentDayHubDependencies)
}

function failurePhase(): Extract<StableRunPhase, { kind: 'run-failure' }> {
  const start = initial('old-run-id', 'old-seed')
  const returned = createCurrentDayHubSnapshot({
    ...start,
    playerCondition: createPlayerCondition({
      ...start.playerCondition,
      currentHealth: 1,
      bleeding: true,
      pendingInfectionExposures: 1,
    }, hospitalCurrentDayHubDependencies.returnDependencies.scene.config.combat.player),
    runIntelLog: { intelIds: ['old-intel'] },
    dailyState: { ...start.dailyState, mainSceneUsedToday: true },
    worldThreat: { ...start.worldThreat, progress: 10 },
    satiety: { current: 2 },
    returnLedger: { sceneInstanceIds: [start.continuity.sceneInstanceId] },
  }, hospitalCurrentDayHubDependencies)
  const settlement = resolveDailySettlement(
    returned,
    { kind: 'end-day' },
    hospitalCurrentDayHubDependencies,
  )
  if (settlement.outcome.kind !== 'terminal') throw new Error('expected terminal')
  return {
    kind: 'run-failure',
    payload: resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: settlement.outcome.snapshot,
    }, hospitalRunTerminationDependencies).snapshot,
  }
}

function transactionHarness(options: Readonly<{
  material?: Readonly<{ runId: string; seed: string }>
  identityMaterialSource?: HospitalNewRunTransactionDependencies['identityMaterialSource']
  storage?: TrackedStorage
  createInitialPhase?: NonNullable<HospitalNewRunTransactionDependencies['createInitialPhase']>
  createStore?: NonNullable<HospitalNewRunTransactionDependencies['createStore']>
}> = {}) {
  const counters = { identity: 0, constructor: 0, stores: 0, dispatches: 0 }
  const storage = options.storage ?? new TrackedStorage()
  const dependencies: HospitalNewRunTransactionDependencies = {
    identityMaterialSource: {
      generateRunIdentityMaterial: () => {
        counters.identity += 1
        return options.identityMaterialSource?.generateRunIdentityMaterial() ??
          options.material ?? { runId: 'new-run-id', seed: 'new-seed' }
      },
    },
    rulesRegistry: hospitalRunSaveRulesRegistry,
    storage,
    rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
    createInitialPhase: (input, currentDayHubDependencies) => {
      counters.constructor += 1
      return (options.createInitialPhase ?? createHospitalNewRunInitialCurrentDayHub)(
        input,
        currentDayHubDependencies,
      )
    },
    createStore: (input) => {
      counters.stores += 1
      const store = (options.createStore ?? createStableRunStore)(input)
      return Object.freeze({
        ...store,
        dispatch: (command: unknown) => {
          counters.dispatches += 1
          return store.dispatch(command)
        },
      })
    },
  }
  return { counters, dependencies, storage }
}

function execute(
  origin: unknown,
  harness = transactionHarness(),
  utilityDefinitionId: typeof HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS[number] = HOSPITAL_ITEM_IDS.flashlight,
) {
  return {
    ...harness,
    result: executeHospitalNewRunTransaction({
      origin,
      setup: { utilityDefinitionId },
      dependencies: harness.dependencies,
    }),
  }
}

describe('Headless atomic hospital New Run transaction', () => {
  it('creates and saves one complete Run from no-run with exact side-effect counts', () => {
    const { result, counters, storage } = execute({ kind: 'no-run' })
    expect(result.kind).toBe('created-and-saved')
    expect(result.phase.kind).toBe('current-day-hub')
    expect(result.store.getState().phase).toBe(result.phase)
    expect(counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 0, writes: 1, clears: 0 })
    expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(result.phase)
  })

  it('strictly accepts RunFailure, directly overwrites it, and inherits no old Run facts', () => {
    const failure = failurePhase()
    const previous = serializeRunSave(failure, hospitalRunSaveRulesRegistry)
    const storage = new TrackedStorage(previous)
    const harness = transactionHarness({ storage })
    const { result, counters } = execute(failure, harness, HOSPITAL_ITEM_IDS.toolkit)
    expect(result.kind).toBe('created-and-saved')
    expect(counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 0, writes: 1, clears: 0 })
    const serialized = JSON.stringify(result.phase)
    for (const oldFact of [
      'old-run-id', 'old-seed', 'old-intel',
    ]) expect(serialized).not.toContain(oldFact)
    expect(result.phase.payload.runLoadout.equipment.utility?.definitionId)
      .toBe(HOSPITAL_ITEM_IDS.toolkit)
  })

  it.each([
    ['active Hub', () => ({ kind: 'current-day-hub', payload: initial() })],
    ['active Scene', () => ({
      kind: 'scene-session',
      payload: resolveSceneLaunch(
        initial(),
        { kind: 'launch-main-scene' },
        hospitalSceneLaunchDependencies,
      ).session,
    })],
  ] as const)('rejects %s before entropy, construction, Store, or persistence', (_label, makeOrigin) => {
    const harness = transactionHarness()
    expect(() => executeHospitalNewRunTransaction({
      origin: makeOrigin(),
      setup: { utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar },
      dependencies: harness.dependencies,
    })).toThrowError(expect.objectContaining({ code: 'ORIGIN_NOT_AVAILABLE' }))
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it('rejects invalid utility and malformed Failure before consuming entropy', () => {
    const invalidChoice = transactionHarness()
    expect(() => executeHospitalNewRunTransaction({
      origin: { kind: 'no-run' },
      setup: { utilityDefinitionId: HOSPITAL_ITEM_IDS.fireAxe },
      dependencies: invalidChoice.dependencies,
    })).toThrow()
    expect(invalidChoice.counters).toEqual({
      identity: 0,
      constructor: 0,
      stores: 0,
      dispatches: 0,
    })
    expect(invalidChoice.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
    const invalidFailure = transactionHarness()
    expect(() => executeHospitalNewRunTransaction({
      origin: { kind: 'run-failure', payload: {} },
      setup: { utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar },
      dependencies: invalidFailure.dependencies,
    })).toThrow()
    expect(invalidFailure.counters).toEqual({
      identity: 0,
      constructor: 0,
      stores: 0,
      dispatches: 0,
    })
    expect(invalidFailure.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it.each([
    { runId: 'old-run-id', seed: 'fresh-seed' },
    { runId: 'fresh-run', seed: 'old-seed' },
  ])('rejects old identity material once without redraw or persistence', (material) => {
    const harness = transactionHarness({ material })
    expect(() => executeHospitalNewRunTransaction({
      origin: failurePhase(),
      setup: { utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar },
      dependencies: harness.dependencies,
    })).toThrowError(expect.objectContaining({ code: 'IDENTITY_REUSED' }))
    expect(harness.counters).toEqual({ identity: 1, constructor: 0, stores: 0, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it.each([
    { runId: ' old-run-id ', seed: 'fresh-seed' },
    { runId: 'fresh-run', seed: ' old-seed ' },
  ])('rejects whitespace-wrapped old identity after canonicalization', (material) => {
    const harness = transactionHarness({ material })
    expect(() => executeHospitalNewRunTransaction({
      origin: failurePhase(),
      setup: { utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar },
      dependencies: harness.dependencies,
    })).toThrowError(expect.objectContaining({ code: 'IDENTITY_REUSED' }))
    expect(harness.counters).toEqual({ identity: 1, constructor: 0, stores: 0, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it('rejects runId and seed that become equal only after canonicalization', () => {
    const harness = transactionHarness({ material: { runId: 'same ', seed: 'same' } })
    expect(() => executeHospitalNewRunTransaction({
      origin: { kind: 'no-run' },
      setup: { utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar },
      dependencies: harness.dependencies,
    })).toThrowError(expect.objectContaining({ code: 'IDENTITY_UNAVAILABLE' }))
    expect(harness.counters).toEqual({ identity: 1, constructor: 0, stores: 0, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it('canonicalizes legal whitespace identity material before construction and saving', () => {
    const harness = transactionHarness({
      material: { runId: ' new-run-id ', seed: ' new-seed ' },
    })
    const { result } = execute({ kind: 'no-run' }, harness)
    expect(result.phase.payload.continuity.runIdentity).toEqual({
      runId: 'new-run-id',
      seed: 'new-seed',
      rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
    })
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 1, clears: 0 })
  })

  it('rejects a legal initial factory phase whose identity differs from the generated identity', () => {
    const harness = transactionHarness({
      createInitialPhase: (_input, dependencies) =>
        createHospitalNewRunInitialCurrentDayHub({
          runIdentity: {
            runId: 'factory-run-c',
            seed: 'factory-seed-c',
            rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
          },
          utilityDefinitionId: HOSPITAL_ITEM_IDS.flashlight,
        }, dependencies),
    })
    let caught: unknown
    try {
      execute({ kind: 'no-run' }, harness)
    } catch (error) {
      caught = error
    }
    expect(caught).toMatchObject({ code: 'OUTPUT_IDENTITY_MISMATCH' })
    expect(caught).toBeInstanceOf(HospitalNewRunTransactionError)
    expect(String(caught)).not.toContain('factory-run-c')
    expect(String(caught)).not.toContain('factory-seed-c')
    expect(String(caught)).not.toContain('new-run-id')
    expect(String(caught)).not.toContain('new-seed')
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 0, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it('rejects a Store that holds a legal phase with a different identity before saving', () => {
    const harness = transactionHarness({
      createStore: (input) => createStableRunStore({
        ...input,
        initialPhase: {
          kind: 'current-day-hub',
          payload: createHospitalNewRunInitialCurrentDayHub({
            runIdentity: {
              runId: 'store-run-c',
              seed: 'store-seed-c',
              rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
            },
            utilityDefinitionId: HOSPITAL_ITEM_IDS.flashlight,
          }, hospitalCurrentDayHubDependencies),
        },
      }),
    })
    let caught: unknown
    try {
      execute({ kind: 'no-run' }, harness)
    } catch (error) {
      caught = error
    }
    expect(caught).toMatchObject({ code: 'OUTPUT_IDENTITY_MISMATCH' })
    expect(String(caught)).not.toContain('store-run-c')
    expect(String(caught)).not.toContain('store-seed-c')
    expect(String(caught)).not.toContain('new-run-id')
    expect(String(caught)).not.toContain('new-seed')
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it('rejects a Store with the same identity but a different legal Hub payload', () => {
    const harness = transactionHarness({
      createStore: (input) => {
        const phase = canonicalizeStableRunPhase(input.initialPhase, input.rulesRegistry)
        if (phase.kind !== 'current-day-hub') throw new Error('expected Hub')
        const bandage = phase.payload.runLoadout.quickSlots.slots[0]
        if (!bandage) throw new Error('expected initial bandage')
        const mutated = resolveCurrentDayHubLoadoutCommand(
          phase.payload,
          {
            kind: 'quick-slot-to-backpack',
            sourceSlotIndex: 0,
            placement: {
              instanceId: bandage.instanceId,
              x: 0,
              y: 0,
              rotated: false,
            },
          },
          hospitalCurrentDayHubDependencies,
        ).snapshot
        return createStableRunStore({
          ...input,
          initialPhase: { kind: 'current-day-hub', payload: mutated },
        })
      },
    })
    expect(() => execute({ kind: 'no-run' }, harness))
      .toThrowError(expect.objectContaining({ code: 'OUTPUT_IDENTITY_MISMATCH' }))
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(harness.storage).toMatchObject({ reads: 0, writes: 0, clears: 0 })
  })

  it('keeps the committed in-memory Store when the sole first save fails', () => {
    const failure = failurePhase()
    const oldSave = serializeRunSave(failure, hospitalRunSaveRulesRegistry)
    const storage = new TrackedStorage(oldSave)
    storage.failWrites = true
    const harness = transactionHarness({ storage })
    const { result, counters } = execute(failure, harness)
    expect(result.kind).toBe('created-with-save-failure')
    expect(result.store.getState().phase).toBe(result.phase)
    expect(result.phase.kind).toBe('current-day-hub')
    expect(counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 0, writes: 1, clears: 0, value: oldSave })
  })

  it('strictly reloads the same identity, anchor, items, state, and empty ledger', () => {
    const { result, storage } = execute({ kind: 'no-run' })
    const restored = createStableRunStoreFromStorage({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(restored?.getState().phase).toEqual(result.phase)
    expect(restored?.getState().phase.kind).toBe('current-day-hub')
  })

  it('consumes the Production Web Crypto adapter exactly once inside the real transaction', () => {
    let draws = 0
    const identityMaterialSource = createProductionRunIdentityMaterialSource(() => ({
      getRandomValues<T extends Exclude<BufferSource, ArrayBuffer>>(array: T): T {
        draws += 1
        const bytes = array as unknown as Uint8Array
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = index
        return array
      },
    }))
    const harness = transactionHarness({ identityMaterialSource })
    const { result } = execute({ kind: 'no-run' }, harness)
    expect(result.kind).toBe('created-and-saved')
    expect(draws).toBe(1)
    expect(harness.counters).toEqual({
      identity: 1,
      constructor: 1,
      stores: 1,
      dispatches: 0,
    })
  })

  it('runs New Run → reload → Hub mutation → reload → Launch → Withdraw → Return', () => {
    const created = execute({ kind: 'no-run' })
    const initialAnchor = created.result.phase.payload.continuity.sceneInstanceId
    let store = createStableRunStoreFromStorage({
      storage: created.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })!
    const initialPhase = store.getState().phase
    const bandage = initialPhase.kind === 'current-day-hub'
      ? initialPhase.payload.runLoadout.quickSlots.slots[0]!
      : null
    if (!bandage) throw new Error('expected initial bandage')
    store.dispatch({
      kind: 'hub',
      command: {
        kind: 'hub-loadout',
        command: {
          kind: 'quick-slot-to-backpack',
          sourceSlotIndex: 0,
          placement: { instanceId: bandage.instanceId, x: 0, y: 0, rotated: false },
        },
      },
    })
    store = createStableRunStoreFromStorage({
      storage: created.storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })!
    const beforeLaunch = store.getState().phase
    expect(beforeLaunch.kind).toBe('current-day-hub')
    if (beforeLaunch.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(beforeLaunch.payload.continuity.sceneInstanceId).toBe(initialAnchor)
    expect(beforeLaunch.payload.returnLedger.sceneInstanceIds).toEqual([])
    const launched = store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'launch-main-scene' },
    }).phase
    expect(launched.kind).toBe('scene-session')
    if (launched.kind !== 'scene-session') throw new Error('expected Scene')
    expect(launched.payload.scene.sceneInstanceId).toBe(initialAnchor)
    expect(launched.payload.context.runReturnCarryForward.returnLedger.sceneInstanceIds).toEqual([])
    const withdrawn = store.dispatch({
      kind: 'scene',
      command: {
        kind: 'scene-withdraw',
        command: { kind: 'withdraw-from-scene' },
      },
    }).phase
    expect(withdrawn.kind).toBe('scene-session')
    if (withdrawn.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(withdrawn.payload.scene.sceneInstanceId).toBe(initialAnchor)
    const settled = store.dispatch({
      kind: 'lifecycle',
      command: { kind: 'settle-terminal-scene' },
    }).phase
    expect(settled.kind).toBe('current-day-hub')
    if (settled.kind !== 'current-day-hub') throw new Error('expected returned Hub')
    expect(settled.payload.continuity.sceneInstanceId).toBe(initialAnchor)
    expect(settled.payload.returnLedger.sceneInstanceIds).toEqual([initialAnchor])
    expect(settled.payload.dailyState.mainSceneUsedToday).toBe(true)
    expect(created.storage).toMatchObject({ reads: 2, writes: 5, clears: 0 })
  })

  it('keeps internal Run, Scene, ledger, and item identities out of ordinary player projection', () => {
    const { result } = execute({ kind: 'no-run' })
    const model = createStableRunPlayerViewModel(
      result.phase,
      productionPresentationDependencies,
    )
    const serialized = JSON.stringify(model)
    const internalIds = [
      result.phase.payload.continuity.runIdentity.runId,
      result.phase.payload.continuity.runIdentity.seed,
      result.phase.payload.continuity.runIdentity.rulesVersion,
      result.phase.payload.continuity.sceneInstanceId,
      ...result.phase.payload.runLoadout.itemStates.states.map(({ instanceId }) => instanceId),
    ]
    for (const id of internalIds) expect(serialized).not.toContain(id)
  })

  it('rejects a registry whose Hub and Launch use different Scene definitions', () => {
    const formal = hospitalRunSaveRulesRegistry.get(HOSPITAL_SLICE_RULES_VERSION)
    expect(() => createRunSaveRulesRegistry([{
      rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
      dependencies: {
        ...formal,
        currentDayHub: {
          ...formal.currentDayHub,
          mainSceneDefinitionId: 'scene-other',
        },
      },
    }])).toThrow()
  })
})
