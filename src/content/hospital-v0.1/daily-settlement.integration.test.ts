import { describe, expect, it } from 'vitest'
import { createPlayerCondition, type OpenWoundSnapshot } from '../../core/condition'
import {
  DailySettlementError,
  applyDailySettlementEffects,
  buildDailySettlementTransitionPlan,
  createDailySettlementTerminalSnapshot,
  createEndDayCommand,
  previewDailySettlement,
  resolveDailySettlement,
  type DailySettlementEffect,
} from '../../core/daily-settlement'
import { createCurrentDayHubSnapshot, type CurrentDayHubSnapshot } from '../../core/current-day-hub'
import { createEmptyEquipment } from '../../core/equipment'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import type { RunReturnDependencies } from '../../core/run-return'
import {
  HOSPITAL_ITEM_IDS,
  hospitalHubSurvivalContentBindings,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
  hospitalWorldThreatCatalog,
} from '..'

const returnDependencies: RunReturnDependencies = {
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

const dependencies = {
  returnDependencies,
  medicalBindings: hospitalSceneMedicalContentBindings,
  survivalBindings: hospitalHubSurvivalContentBindings,
  worldThreatCatalog: hospitalWorldThreatCatalog,
}

interface HubOptions {
  readonly day?: number
  readonly health?: number
  readonly bleeding?: boolean
  readonly wounds?: readonly OpenWoundSnapshot[]
  readonly contusions?: number
  readonly painkiller?: boolean
  readonly exposures?: number
  readonly progress?: number
  readonly satiety?: number
  readonly suppressionUses?: number
  readonly suppressionAmount?: number
  readonly disinfectantUses?: number
  readonly maintenance?: number
  readonly warehouse?: readonly ItemInstance[]
}

function hub(options: HubOptions = {}): CurrentDayHubSnapshot {
  const warehouse = options.warehouse ?? []
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: [] },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [],
      placements: [],
    }, hospitalItemCatalog),
    equipment: createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
    quickSlots: createQuickSlotSnapshot(
      [null, null],
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: {
      states: warehouse.map((item) => createFullItemState(item, hospitalItemResourceCatalog)),
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
        runId: 'run-daily-settlement',
        seed: 'seed-daily-settlement',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: options.day ?? 2,
      sceneInstanceId: 'returned-hospital-scene',
    },
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: options.health ?? 8,
      bleeding: options.bleeding ?? false,
      openWounds: options.wounds ?? [],
      minorContusions: options.contusions ?? 0,
      painkillerActive: options.painkiller ?? false,
      pendingInfectionExposures: options.exposures ?? 0,
    }, config.combat.player),
    runIntelLog: { intelIds: ['intel-hospital-returned'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: options.disinfectantUses ?? 0 },
      threatSuppression: {
        usesToday: options.suppressionUses ?? 0,
        suppressionAmountToday: options.suppressionAmount ?? 0,
      },
      maintenanceLaborRemaining: options.maintenance ?? 1,
    },
    worldThreat: {
      definitionId: config.worldThreat.definitionId,
      progress: options.progress ?? 0,
    },
    satiety: { current: options.satiety ?? 6 },
    returnLedger: { sceneInstanceIds: ['returned-hospital-scene'] },
  }, dependencies)
}

function success(snapshot: CurrentDayHubSnapshot) {
  const result = resolveDailySettlement(snapshot, { kind: 'end-day' }, dependencies)
  expect(result.outcome.kind).toBe('next-day-current-day-hub')
  if (result.outcome.kind !== 'next-day-current-day-hub') throw new Error('expected next day')
  return { result, snapshot: result.outcome.snapshot }
}

describe('hospital daily settlement', () => {
  it('runs the ordinary no-threat baseline from day one to day two', () => {
    const { result, snapshot } = success(hub({
      day: 1,
      health: 8,
      progress: 0,
      exposures: 0,
      satiety: 6,
    }))
    expect(result.summary).toMatchObject({ currentDay: 1, nextDay: 2, terminalReason: null })
    expect(snapshot).toMatchObject({
      continuity: { currentDay: 2 },
      playerCondition: { currentHealth: 10 },
      worldThreat: { progress: 0 },
      satiety: { current: 4 },
    })
  })

  it('resolves the baseline exposure example and creates the next CurrentDayHub', () => {
    const start = hub({ health: 8, exposures: 1, progress: 0, satiety: 6 })
    const { result, snapshot } = success(start)
    expect(snapshot).toMatchObject({
      continuity: { currentDay: 3 },
      playerCondition: { currentHealth: 10, pendingInfectionExposures: 0 },
      worldThreat: { progress: 20 },
      satiety: { current: 4 },
    })
    expect(result.summary.worldThreat).toMatchObject({
      preStageId: 'none', exposureContribution: 20, progressAfter: 20, postStageId: 'latent',
    })
    expect(previewDailySettlement(start, dependencies)).toEqual(result.summary)
  })

  it('applies one contusion penalty, then naturally clears the contusion', () => {
    const { result, snapshot } = success(hub({ health: 8, contusions: 1 }))
    expect(result.summary.recovery).toMatchObject({
      minorContusionPenalty: 1,
      actualRecovery: 1,
    })
    expect(snapshot.playerCondition).toMatchObject({ currentHealth: 9, minorContusions: 0 })
  })

  it('lets painkiller offset one minor-injury penalty and clears it only after success', () => {
    const { result, snapshot } = success(hub({ health: 8, contusions: 1, painkiller: true }))
    expect(result.summary.recovery).toMatchObject({
      cappedMinorInjuryPenalty: 1,
      painkillerPenaltyReduction: 1,
      actualRecovery: 2,
    })
    expect(snapshot.playerCondition).toMatchObject({
      currentHealth: 10,
      minorContusions: 0,
      painkillerActive: false,
    })
  })

  it('settles unresolved bleeding first, keeps it, and blocks recovery for a survivor', () => {
    const wound: OpenWoundSnapshot = { id: 'wound-open', kind: 'laceration', treatment: 'untreated' }
    const { result, snapshot } = success(hub({ health: 3, bleeding: true, wounds: [wound] }))
    expect(result.summary.continuousDanger).toMatchObject({ actualHealthLoss: 2, healthAfter: 1 })
    expect(result.summary.recovery).toMatchObject({ blockedByBleeding: true, actualRecovery: 0 })
    expect(snapshot.playerCondition).toMatchObject({ currentHealth: 1, bleeding: true })
    expect(snapshot.playerCondition.openWounds).toEqual([wound])
  })

  it('stops immediately when unresolved bleeding depletes health and performs no cleanup or reset', () => {
    const wound: OpenWoundSnapshot = { id: 'treated-but-not-cleared', kind: 'laceration', treatment: 'treated' }
    const start = hub({
      health: 2,
      bleeding: true,
      wounds: [wound],
      contusions: 1,
      painkiller: true,
      exposures: 1,
      suppressionUses: 1,
      suppressionAmount: 15,
      disinfectantUses: 1,
      maintenance: 1,
    })
    const result = resolveDailySettlement(start, { kind: 'end-day' }, dependencies)
    expect(result.outcome).toMatchObject({ kind: 'terminal', reason: 'health-depleted' })
    expect(result.effects.map(({ kind }) => kind)).toEqual([
      'daily-continuous-danger-resolved',
      'daily-settlement-terminal-committed',
    ])
    if (result.outcome.kind !== 'terminal') throw new Error('expected terminal')
    expect(result.outcome.snapshot).toMatchObject({
      continuity: { currentDay: 2 },
      playerCondition: {
        currentHealth: 0,
        minorContusions: 1,
        painkillerActive: true,
        pendingInfectionExposures: 1,
      },
      dailyState: start.dailyState,
      satiety: start.satiety,
    })
    expect(result.outcome.snapshot.playerCondition.openWounds).toEqual([wound])
    expect(() => createCurrentDayHubSnapshot(result.outcome.snapshot, dependencies)).toThrow()
    expect(createDailySettlementTerminalSnapshot(result.outcome.snapshot, dependencies))
      .toEqual(result.outcome.snapshot)
    expect(() => createDailySettlementTerminalSnapshot({
      ...result.outcome.snapshot,
      extra: true,
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createDailySettlementTerminalSnapshot({
      ...result.outcome.snapshot,
      terminationReason: 'world-threat-terminal',
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('uses the pre-settlement stage for increase and the post-settlement stage for recovery', () => {
    const { result, snapshot } = success(hub({ health: 8, progress: 29, exposures: 0 }))
    expect(result.summary.worldThreat).toMatchObject({
      preStageId: 'latent', dailyBaseIncrease: 5, exposureContribution: 0,
      progressBefore: 29, progressAfter: 34, postStageId: 'infected',
    })
    expect(result.summary.recovery).toMatchObject({
      threatModifier: { kind: 'fixed-penalty', amount: 1 },
      actualRecovery: 1,
    })
    expect(snapshot.playerCondition.currentHealth).toBe(9)
  })

  it('floors a fully suppressed daily threat increase at zero', () => {
    const { result, snapshot } = success(hub({ progress: 1, suppressionUses: 1, suppressionAmount: 15 }))
    expect(result.summary.worldThreat).toMatchObject({ rawIncrease: -10, appliedIncrease: 0 })
    expect(snapshot.worldThreat.progress).toBe(1)
  })

  it('converts two pending exposures into forty progress and clears exposures', () => {
    const { result, snapshot } = success(hub({ exposures: 2 }))
    expect(result.summary.worldThreat).toMatchObject({
      pendingExposureCount: 2,
      exposureContribution: 40,
      appliedIncrease: 40,
    })
    expect(snapshot.worldThreat.progress).toBe(40)
    expect(snapshot.playerCondition.pendingInfectionExposures).toBe(0)
  })

  it('terminates at infection progress 120 before satiety, recovery, cleanup, reset, or day advance', () => {
    const start = hub({
      progress: 100,
      exposures: 1,
      satiety: 6,
      contusions: 1,
      painkiller: true,
      suppressionUses: 1,
      suppressionAmount: 15,
      disinfectantUses: 1,
      maintenance: 1,
      wounds: [{ id: 'treated-terminal', kind: 'laceration', treatment: 'treated' }],
    })
    const result = resolveDailySettlement(start, { kind: 'end-day' }, dependencies)
    expect(result.outcome).toMatchObject({ kind: 'terminal', reason: 'world-threat-terminal' })
    expect(result.effects.map(({ kind }) => kind)).toEqual([
      'daily-continuous-danger-resolved',
      'daily-world-threat-progressed',
      'daily-pending-exposures-settled',
      'daily-settlement-terminal-committed',
    ])
    if (result.outcome.kind !== 'terminal') throw new Error('expected terminal')
    expect(result.outcome.snapshot).toMatchObject({
      continuity: { currentDay: 2 },
      worldThreat: { progress: 125 },
      satiety: { current: 6 },
      playerCondition: { minorContusions: 1, painkillerActive: true },
      dailyState: start.dailyState,
    })
    expect(result.outcome.snapshot.playerCondition.openWounds).toEqual([
      { id: 'treated-terminal', kind: 'laceration', treatment: 'treated' },
    ])
  })

  it('applies deprivation health loss after satiety consumption and blocks recovery', () => {
    const { result, snapshot } = success(hub({ health: 8, satiety: 2 }))
    expect(result.summary.satiety).toMatchObject({ before: 2, consumed: 2, after: 0 })
    expect(result.summary.deprivation).toMatchObject({
      deprived: true,
      actualHealthLoss: 1,
      recoveryCap: 0,
    })
    expect(result.summary.recovery?.actualRecovery).toBe(0)
    expect(snapshot.playerCondition.currentHealth).toBe(7)
  })

  it('stops on deprivation death while preserving completed threat and satiety phases', () => {
    const start = hub({ health: 1, satiety: 2, contusions: 1, painkiller: true })
    const result = resolveDailySettlement(start, { kind: 'end-day' }, dependencies)
    expect(result.outcome).toMatchObject({ kind: 'terminal', reason: 'health-depleted' })
    expect(result.effects.map(({ kind }) => kind)).toEqual([
      'daily-continuous-danger-resolved',
      'daily-world-threat-progressed',
      'daily-pending-exposures-settled',
      'daily-satiety-consumed',
      'daily-deprivation-consequence-resolved',
      'daily-settlement-terminal-committed',
    ])
    if (result.outcome.kind !== 'terminal') throw new Error('expected terminal')
    expect(result.outcome.snapshot).toMatchObject({
      continuity: { currentDay: 2 },
      satiety: { current: 0 },
      playerCondition: { currentHealth: 0, minorContusions: 1, painkillerActive: true },
      dailyState: start.dailyState,
    })
  })

  it('caps combined contusion and untreated-wound recovery penalties at two', () => {
    const wounds: OpenWoundSnapshot[] = [
      { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
      { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
      { id: 'wound-c', kind: 'bite', treatment: 'untreated' },
    ]
    const { result } = success(hub({ contusions: 1, wounds, painkiller: true }))
    expect(result.summary.recovery).toMatchObject({
      rawMinorInjuryPenalty: 4,
      cappedMinorInjuryPenalty: 2,
      painkillerPenaltyReduction: 1,
      effectiveMinorInjuryPenalty: 1,
      actualRecovery: 1,
    })
  })

  it('counts only untreated wounds, removes treated wounds, and retains untreated wounds', () => {
    const wounds: OpenWoundSnapshot[] = [
      { id: 'treated', kind: 'laceration', treatment: 'treated' },
      { id: 'untreated', kind: 'puncture', treatment: 'untreated' },
    ]
    const { result, snapshot } = success(hub({ wounds }))
    expect(result.summary.recovery).toMatchObject({ untreatedOpenWoundCount: 1 })
    expect(result.summary.cleanup).toMatchObject({
      removedTreatedOpenWoundIds: ['treated'],
      retainedUntreatedOpenWoundIds: ['untreated'],
    })
    expect(snapshot.playerCondition.openWounds).toEqual([wounds[1]])
  })

  it.each([
    [60, 'worsening', 75],
    [90, 'critical', 110],
  ] as const)('blocks recovery in %s-stage progress', (progress, stageId, progressAfter) => {
    const { result, snapshot } = success(hub({ health: 8, progress }))
    expect(result.summary.worldThreat).toMatchObject({ postStageId: stageId, progressAfter })
    expect(result.summary.recovery).toMatchObject({
      threatModifier: { kind: 'blocked' },
      actualRecovery: 0,
    })
    expect(snapshot.playerCondition.currentHealth).toBe(8)
  })

  it('caps recovery at missing health', () => {
    const { result, snapshot } = success(hub({ health: 11 }))
    expect(result.summary.recovery).toMatchObject({ requestedRecovery: 2, actualRecovery: 1 })
    expect(snapshot.playerCondition.currentHealth).toBe(12)
  })

  it('resets daily medical, suppression, and maintenance state only after success', () => {
    const { result, snapshot } = success(hub({
      exposures: 1,
      suppressionUses: 1,
      suppressionAmount: 15,
      disinfectantUses: 1,
      maintenance: 0,
    }))
    expect(result.summary.dailyReset?.before).toEqual({
      medicalUsage: { disinfectantUsesToday: 1 },
      threatSuppression: { usesToday: 1, suppressionAmountToday: 15 },
      maintenanceLaborRemaining: 0,
    })
    expect(snapshot.dailyState).toEqual({
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 3,
    })
  })

  it('advances only the day while preserving all identity and Run-owned facts', () => {
    const ration: ItemInstance = { instanceId: 'stored-ration', definitionId: HOSPITAL_ITEM_IDS.ration, quantity: 1 }
    const start = hub({ warehouse: [ration] })
    const { result, snapshot } = success(start)
    expect(snapshot.continuity).toEqual({ ...start.continuity, currentDay: 3 })
    expect(snapshot.continuity.runIdentity).toEqual(start.continuity.runIdentity)
    expect(snapshot.continuity.sceneInstanceId).toBe(start.continuity.sceneInstanceId)
    expect(snapshot.runLoadout).toEqual(start.runLoadout)
    expect(snapshot.runIntelLog).toEqual(start.runIntelLog)
    expect(snapshot.returnLedger).toEqual(start.returnLedger)
    expect(result.effects.map(({ kind }) => kind)).toEqual([
      'daily-continuous-danger-resolved',
      'daily-world-threat-progressed',
      'daily-pending-exposures-settled',
      'daily-satiety-consumed',
      'daily-deprivation-consequence-resolved',
      'daily-health-recovery-resolved',
      'daily-minor-injury-lifecycle-resolved',
      'daily-run-state-reset',
      'daily-run-day-advanced',
      'daily-settlement-next-day-committed',
    ])
  })

  it('allows day six to advance to day seven', () => {
    expect(success(hub({ day: 6 })).snapshot.continuity.currentDay).toBe(7)
  })

  it('blocks ordinary End Day on day seven before producing effects or day eight', () => {
    const start = hub({ day: 7 })
    const before = JSON.stringify(start)
    expect(() => buildDailySettlementTransitionPlan(start, { kind: 'end-day' }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'FINAL_DAY_RESOLUTION_REQUIRED' }))
    expect(JSON.stringify(start)).toBe(before)
  })

  it('strictly rejects null, unknown fields, and result-bearing End Day commands', () => {
    expect(createEndDayCommand({ kind: 'end-day' })).toEqual({ kind: 'end-day' })
    for (const command of [null, {}, { kind: 'other' }, { kind: 'end-day', result: 'success' }]) {
      expect(() => createEndDayCommand(command)).toThrowError(DailySettlementError)
    }
  })

  it('rejects unsafe exposure contribution without mutating the input', () => {
    const start = hub({ exposures: Number.MAX_SAFE_INTEGER })
    const before = JSON.stringify(start)
    expect(() => buildDailySettlementTransitionPlan(start, { kind: 'end-day' }, dependencies))
      .toThrowError(expect.objectContaining({ code: 'SAFE_INTEGER_OVERFLOW' }))
    expect(JSON.stringify(start)).toBe(before)
  })

  it('rejects every material Effect mutation and leaves the input unchanged', () => {
    const start = hub({
      health: 10,
      bleeding: true,
      wounds: [
        { id: 'treated', kind: 'laceration', treatment: 'treated' },
        { id: 'untreated', kind: 'bite', treatment: 'untreated' },
      ],
      contusions: 1,
      painkiller: true,
      exposures: 1,
      progress: 30,
      satiety: 4,
      suppressionUses: 1,
      suppressionAmount: 15,
      disinfectantUses: 1,
      maintenance: 0,
    })
    const plan = buildDailySettlementTransitionPlan(start, { kind: 'end-day' }, dependencies)
    const before = JSON.stringify(start)
    const mutations: Array<(effects: DailySettlementEffect[]) => void> = [
      (effects) => { (effects[0] as any).actualHealthLoss = 1 },
      (effects) => { (effects[1] as any).dailyBaseIncrease = 999 },
      (effects) => { (effects[1] as any).exposureContribution = 999 },
      (effects) => { (effects[1] as any).suppressionAmount = 0 },
      (effects) => { (effects[1] as any).progressAfter = 999 },
      (effects) => { (effects[2] as any).after = 1 },
      (effects) => { (effects[3] as any).after = 0 },
      (effects) => { (effects[4] as any).deprived = true },
      (effects) => { (effects[5] as any).calculation.actualRecovery = 2 },
      (effects) => { (effects[5] as any).calculation.cappedMinorInjuryPenalty = 0 },
      (effects) => { (effects[5] as any).calculation.threatModifier = { kind: 'blocked' } },
      (effects) => { (effects[6] as any).removedTreatedOpenWoundIds = [] },
      (effects) => { (effects[6] as any).painkillerActiveAfter = true },
      (effects) => { (effects[7] as any).after.medicalUsage.disinfectantUsesToday = 1 },
      (effects) => { (effects[7] as any).after.maintenanceLaborRemaining = 2 },
      (effects) => { (effects[8] as any).after.currentDay = 4 },
      (effects) => { (effects[8] as any).after.runIdentity.runId = 'tampered' },
      (effects) => { (effects[8] as any).after.runIdentity.seed = 'tampered' },
      (effects) => { (effects[8] as any).after.runIdentity.rulesVersion = 'tampered' },
      (effects) => { (effects[8] as any).after.sceneInstanceId = 'tampered' },
      (effects) => { (effects[9] as any).snapshot.satiety.current = 6 },
      (effects) => { effects.splice(1, 1) },
      (effects) => { effects.push(effects[0]) },
      (effects) => { [effects[0], effects[1]] = [effects[1], effects[0]] },
    ]
    for (const mutate of mutations) {
      const effects = JSON.parse(JSON.stringify(plan.effects)) as DailySettlementEffect[]
      mutate(effects)
      expect(() => applyDailySettlementEffects(start, plan.command, effects, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
      expect(JSON.stringify(start)).toBe(before)
    }
  })
})
