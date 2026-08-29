import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalSliceV01RuleConfig as config,
} from '../../content'
import { createPlayerCondition } from '../../core/condition'
import {
  createCurrentDayHubSnapshot,
  resolveCurrentDayHubLoadoutCommand,
  type CurrentDayHubSnapshot,
} from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import {
  createEmptyEquipment,
  createEquipmentSnapshot,
  type EquipmentSnapshot,
} from '../../core/equipment'
import type { HubMaintenanceCommand } from '../../core/hub-maintenance'
import {
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import {
  createFullItemState,
  createItemState,
  getItemState,
  type ItemState,
} from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import {
  createRunLoadoutSnapshot,
  createStableRunLoadoutBackpackSplitInstanceId,
  createStableRunLoadoutSplitInstanceId,
  type RunLoadoutCommand,
} from '../../core/run-loadout'
import { resolveRunFailure } from '../../core/run-termination'
import { executeStableRunLifecycleCommand } from '../run-lifecycle'
import {
  hospitalCurrentDayHubDependencies,
  hospitalHubMaintenanceDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  createRunSaveRulesRegistry,
  loadRunPhase,
  saveRunPhase,
  type RunSaveStorage,
  type StableRunPhase,
} from '../run-save'
import { executeStableRunSceneCommand } from '../run-scene'
import {
  createStableRunHubCommand,
  executeStableRunHubCommand,
} from '.'

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({
  instanceId,
  definitionId,
  quantity,
})

const placement = (
  instanceId: string,
  x: number,
  y: number,
  rotated = false,
): BackpackPlacement => ({ instanceId, x, y, rotated })

class TrackedStorage implements RunSaveStorage {
  public writes = 0
  public failWrites = false
  private value: string | null = null

  public read(): string | null { return this.value }
  public write(serialized: string): void {
    this.writes += 1
    if (this.failWrites) throw new Error('intentional storage failure')
    this.value = serialized
  }
  public clear(): void { this.value = null }
  public resetWrites(): void { this.writes = 0 }
}

interface HubInput {
  readonly warehouse?: readonly ItemInstance[]
  readonly taskStorage?: readonly ItemInstance[]
  readonly backpack?: readonly ItemInstance[]
  readonly placements?: readonly BackpackPlacement[]
  readonly equipment?: EquipmentSnapshot
  readonly quickSlots?: readonly (ItemInstance | null)[]
  readonly resources?: Readonly<Record<string, number>>
  readonly health?: number
  readonly bleeding?: boolean
  readonly wounds?: readonly Readonly<{
    id: string
    kind: 'laceration' | 'puncture' | 'bite'
    treatment: 'untreated' | 'treated'
  }>[]
  readonly minorContusions?: number
  readonly pendingExposures?: number
  readonly threatProgress?: number
  readonly satiety?: number
  readonly labor?: number
  readonly mainSceneUsedToday?: boolean
  readonly day?: number
}

function equipment(input: Partial<EquipmentSnapshot> = {}): EquipmentSnapshot {
  return createEquipmentSnapshot({
    weapon: input.weapon ?? null,
    armor: input.armor ?? null,
    utility: input.utility ?? null,
  }, hospitalItemCatalog, hospitalItemEquipmentCatalog)
}

function hub(input: HubInput = {}): CurrentDayHubSnapshot {
  const warehouse = input.warehouse ?? []
  const taskStorage = input.taskStorage ?? []
  const backpack = input.backpack ?? []
  const equipped = input.equipment ?? createEmptyEquipment(
    hospitalItemCatalog,
    hospitalItemEquipmentCatalog,
  )
  const quickSlots = input.quickSlots ?? [null, null]
  const owned = [
    ...warehouse,
    ...taskStorage,
    ...backpack,
    ...[equipped.weapon, equipped.armor, equipped.utility].filter(
      (candidate): candidate is ItemInstance => candidate !== null,
    ),
    ...quickSlots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  const states: ItemState[] = owned.map((candidate) => {
    const profile = hospitalItemResourceCatalog.get(candidate.definitionId)
    const current = input.resources?.[candidate.instanceId]
    if (current === undefined) return createFullItemState(candidate, hospitalItemResourceCatalog)
    if (profile.kind === 'none') throw new Error('无资源物品不能设置资源值')
    return createItemState({
      instanceId: candidate.instanceId,
      definitionId: candidate.definitionId,
      resource: { kind: profile.kind, current },
    }, hospitalItemResourceCatalog)
  })
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: taskStorage },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpack,
      placements: input.placements ?? backpack.map((candidate, index) =>
        placement(candidate.instanceId, index, 0)),
    }, hospitalItemCatalog),
    equipment: equipped,
    quickSlots: createQuickSlotSnapshot(
      quickSlots,
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: { states },
  }, {
    ...hospitalHubMaintenanceDependencies.currentDayHub.returnDependencies.scene,
    lifecycleCatalog:
      hospitalHubMaintenanceDependencies.currentDayHub.returnDependencies.lifecycleCatalog,
    backpackRules: config.backpack,
  })
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'run-hub-router',
        seed: 'run-hub-router-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: input.day ?? 2,
      sceneInstanceId: 'returned-run-hub-scene',
    },
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: input.health ?? config.combat.player.maxHealth,
      bleeding: input.bleeding ?? false,
      openWounds: input.wounds ?? [],
      minorContusions: input.minorContusions ?? 0,
      painkillerActive: false,
      pendingInfectionExposures: input.pendingExposures ?? 0,
    }, config.combat.player),
    runIntelLog: { intelIds: ['hub-router-intel'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: input.labor ?? config.maintenance.dailyBaseLabor.points,
      mainSceneUsedToday: input.mainSceneUsedToday ?? false,
    },
    worldThreat: {
      definitionId: config.worldThreat.definitionId,
      progress: input.threatProgress ?? 0,
    },
    satiety: { current: input.satiety ?? 4 },
    returnLedger: { sceneInstanceIds: ['returned-run-hub-scene'] },
  }, hospitalCurrentDayHubDependencies)
}

function execute(
  snapshot: CurrentDayHubSnapshot,
  command: unknown,
  storage = new TrackedStorage(),
) {
  return executeStableRunHubCommand({
    currentPhase: { kind: 'current-day-hub', payload: snapshot },
    command,
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  })
}

function assertSaved(execution: ReturnType<typeof execute>, storage: TrackedStorage): void {
  expect(storage.writes).toBe(1)
  expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(execution.phase)
}

function resource(snapshot: CurrentDayHubSnapshot, instanceId: string): number {
  const value = getItemState(snapshot.runLoadout.itemStates, instanceId).resource
  if (value.kind === 'none') throw new Error('物品没有可读取资源')
  return value.current
}

describe('strict Stable Run Hub application commands', () => {
  const valid = [
    {
      kind: 'hub-loadout',
      command: {
        kind: 'warehouse-to-backpack',
        instanceId: 'bandage',
        placement: placement('bandage', 0, 0),
      },
    },
    {
      kind: 'hub-medical',
      command: {
        kind: 'use-run-hub-medical-item',
        source: { container: 'warehouse', itemInstanceId: 'bandage' },
      },
    },
    {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-ration',
        source: { container: 'warehouse', itemInstanceId: 'ration' },
      },
    },
    {
      kind: 'hub-maintenance',
      command: {
        kind: 'allocate-base-maintenance-labor',
        allocations: [{
          target: { container: 'warehouse', itemInstanceId: 'pipe' },
          points: 1,
        }],
      },
    },
  ] as const

  it('normalizes and deeply freezes all four application command variants', () => {
    for (const candidate of valid) {
      const normalized = createStableRunHubCommand(candidate)
      expect(normalized).toEqual(candidate)
      expect(Object.isFrozen(normalized)).toBe(true)
      expect(Object.isFrozen(normalized.command)).toBe(true)
    }
  })

  it.each([
    null,
    [],
    { kind: 'unknown', command: {} },
    { kind: 'hub-loadout' },
    { kind: 'hub-loadout', command: valid[0].command, effects: [] },
    { kind: 'hub-loadout', command: { ...valid[0].command, extra: true } },
    { kind: 'hub-medical', command: { ...valid[1].command, result: {} } },
    { kind: 'hub-survival', command: { ...valid[2].command, snapshot: {} } },
    { kind: 'hub-maintenance', command: { ...valid[3].command, savePolicy: 'retry' } },
  ])('rejects malformed or caller-authored result fields: %#', (candidate) => {
    expect(() => createStableRunHubCommand(candidate)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMMAND' }),
    )
  })

  it('rejects class instances and mismatched inner commands', () => {
    class Forged {
      public kind = 'hub-survival'
      public command = valid[2].command
    }
    expect(() => createStableRunHubCommand(new Forged())).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMMAND' }),
    )
    expect(() => createStableRunHubCommand({
      kind: 'hub-medical',
      command: valid[0].command,
    })).toThrowError(expect.objectContaining({ code: 'INVALID_COMMAND' }))
  })
})

describe('all twelve formal Run Loadout commands through the Hub router', () => {
  interface Case {
    readonly name: string
    readonly start: () => CurrentDayHubSnapshot
    readonly command: RunLoadoutCommand
    readonly assert: (snapshot: CurrentDayHubSnapshot) => void
  }
  const pipeA = item('pipe-a', HOSPITAL_ITEM_IDS.metalPipe)
  const pipeB = item('pipe-b', HOSPITAL_ITEM_IDS.metalPipe)
  const bandages = item('bandages', HOSPITAL_ITEM_IDS.bandage, 3)
  const painkiller = item('painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const splitBandages = item('split-bandages', HOSPITAL_ITEM_IDS.bandage, 3)
  const mergeSource = item('merge-source', HOSPITAL_ITEM_IDS.bandage)
  const mergeTarget = item('merge-target', HOSPITAL_ITEM_IDS.bandage)

  const cases: readonly Case[] = [
    {
      name: 'warehouse-to-backpack',
      start: () => hub({ warehouse: [bandages] }),
      command: { kind: 'warehouse-to-backpack', instanceId: bandages.instanceId, placement: placement(bandages.instanceId, 0, 0) },
      assert: (next) => expect(next.runLoadout.backpack.items).toContainEqual(bandages),
    },
    {
      name: 'backpack-to-warehouse',
      start: () => hub({ backpack: [pipeA] }),
      command: { kind: 'backpack-to-warehouse', instanceId: pipeA.instanceId },
      assert: (next) => expect(next.runLoadout.warehouse.items).toContainEqual(pipeA),
    },
    {
      name: 'move-backpack-item',
      start: () => hub({ backpack: [painkiller] }),
      command: { kind: 'move-backpack-item', instanceId: painkiller.instanceId, placement: placement(painkiller.instanceId, 2, 1) },
      assert: (next) => expect(next.runLoadout.backpack.placements).toContainEqual(placement(painkiller.instanceId, 2, 1)),
    },
    {
      name: 'split-backpack-stack',
      start: () => hub({ backpack: [splitBandages] }),
      command: {
        kind: 'split-backpack-stack',
        sourceInstanceId: splitBandages.instanceId,
        quantity: 1,
        placement: { x: 1, y: 0, rotated: false },
      },
      assert: (next) => {
        const splitId = createStableRunLoadoutBackpackSplitInstanceId(
          splitBandages.instanceId,
          splitBandages.quantity,
          1,
        )
        expect(next.runLoadout.backpack.items).toEqual(expect.arrayContaining([
          { ...splitBandages, quantity: 2 },
          { instanceId: splitId, definitionId: splitBandages.definitionId, quantity: 1 },
        ]))
      },
    },
    {
      name: 'merge-backpack-stacks',
      start: () => hub({ backpack: [mergeSource, mergeTarget] }),
      command: {
        kind: 'merge-backpack-stacks',
        sourceInstanceId: mergeSource.instanceId,
        targetInstanceId: mergeTarget.instanceId,
        quantity: 1,
      },
      assert: (next) => {
        expect(next.runLoadout.backpack.items).toContainEqual({ ...mergeTarget, quantity: 2 })
        expect(next.runLoadout.backpack.items.some(
          ({ instanceId }) => instanceId === mergeSource.instanceId,
        )).toBe(false)
      },
    },
    {
      name: 'equip-from-backpack',
      start: () => hub({ backpack: [pipeA] }),
      command: { kind: 'equip-from-backpack', instanceId: pipeA.instanceId, targetSlot: 'weapon' },
      assert: (next) => expect(next.runLoadout.equipment.weapon).toEqual(pipeA),
    },
    {
      name: 'unequip-to-backpack',
      start: () => hub({ equipment: equipment({ weapon: pipeA }) }),
      command: { kind: 'unequip-to-backpack', sourceSlot: 'weapon', placement: placement(pipeA.instanceId, 0, 0) },
      assert: (next) => expect(next.runLoadout.backpack.items).toContainEqual(pipeA),
    },
    {
      name: 'swap-backpack-equipped',
      start: () => hub({ backpack: [pipeB], equipment: equipment({ weapon: pipeA }) }),
      command: { kind: 'swap-backpack-equipped', backpackInstanceId: pipeB.instanceId, targetSlot: 'weapon', displacedPlacement: placement(pipeA.instanceId, 0, 0) },
      assert: (next) => {
        expect(next.runLoadout.equipment.weapon).toEqual(pipeB)
        expect(next.runLoadout.backpack.items).toContainEqual(pipeA)
      },
    },
    {
      name: 'backpack-to-quick-slot',
      start: () => hub({ backpack: [bandages] }),
      command: { kind: 'backpack-to-quick-slot', instanceId: bandages.instanceId, targetSlotIndex: 0 },
      assert: (next) => expect(next.runLoadout.quickSlots.slots[0]?.instanceId)
        .toBe(createStableRunLoadoutSplitInstanceId(bandages.instanceId, 3)),
    },
    {
      name: 'quick-slot-to-backpack',
      start: () => hub({ quickSlots: [painkiller, null] }),
      command: { kind: 'quick-slot-to-backpack', sourceSlotIndex: 0, placement: placement(painkiller.instanceId, 0, 0) },
      assert: (next) => expect(next.runLoadout.backpack.items).toContainEqual(painkiller),
    },
    {
      name: 'move-quick-slot-item',
      start: () => hub({ quickSlots: [painkiller, null] }),
      command: { kind: 'move-quick-slot-item', sourceSlotIndex: 0, targetSlotIndex: 1 },
      assert: (next) => expect(next.runLoadout.quickSlots.slots).toEqual([null, painkiller]),
    },
    {
      name: 'swap-quick-slot-items',
      start: () => hub({ quickSlots: [painkiller, item('bandage-one', HOSPITAL_ITEM_IDS.bandage)] }),
      command: { kind: 'swap-quick-slot-items', firstSlotIndex: 0, secondSlotIndex: 1 },
      assert: (next) => expect(next.runLoadout.quickSlots.slots.map((candidate) => candidate?.instanceId))
        .toEqual(['bandage-one', painkiller.instanceId]),
    },
  ]

  it.each(cases)('$name preserves canonical instances and ItemState through Save', ({ start, command, assert }) => {
    const storage = new TrackedStorage()
    const execution = execute(start(), { kind: 'hub-loadout', command }, storage)
    expect(execution.phase.kind).toBe('current-day-hub')
    if (execution.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    assert(execution.phase.payload)
    for (const candidate of execution.phase.payload.runLoadout.itemStates.states) {
      expect(candidate.definitionId).toBeDefined()
    }
    assertSaved(execution, storage)
  })

  it('resolves split and merge through the direct CurrentDayHub boundary before Stable Run routing', () => {
    const start = hub({ backpack: [splitBandages] })
    const split = resolveCurrentDayHubLoadoutCommand(start, {
      kind: 'split-backpack-stack',
      sourceInstanceId: splitBandages.instanceId,
      quantity: 1,
      placement: { x: 1, y: 0, rotated: false },
    }, hospitalCurrentDayHubDependencies)
    const splitId = createStableRunLoadoutBackpackSplitInstanceId(
      splitBandages.instanceId,
      splitBandages.quantity,
      1,
    )
    const merged = resolveCurrentDayHubLoadoutCommand(split.snapshot, {
      kind: 'merge-backpack-stacks',
      sourceInstanceId: splitId,
      targetInstanceId: splitBandages.instanceId,
      quantity: 1,
    }, hospitalCurrentDayHubDependencies)
    expect(merged.snapshot.runLoadout.backpack.items).toContainEqual(splitBandages)
    expect(merged.snapshot.runLoadout.backpack.items).toHaveLength(1)
    expect(getItemState(merged.snapshot.runLoadout.itemStates, splitBandages.instanceId))
      .toEqual(getItemState(start.runLoadout.itemStates, splitBandages.instanceId))
  })

  it('rejects invalid Stable Run split and merge commands atomically without saving', () => {
    const start = hub({ backpack: [mergeSource, mergeTarget] })
    const storage = new TrackedStorage()
    saveRunPhase(storage, { kind: 'current-day-hub', payload: start }, hospitalRunSaveRulesRegistry)
    const persisted = storage.read()
    storage.resetWrites()
    for (const command of [
      {
        kind: 'hub-loadout' as const,
        command: {
          kind: 'split-backpack-stack' as const,
          sourceInstanceId: mergeSource.instanceId,
          quantity: 1,
          placement: { x: 2, y: 0, rotated: false },
        },
      },
      {
        kind: 'hub-loadout' as const,
        command: {
          kind: 'merge-backpack-stacks' as const,
          sourceInstanceId: mergeSource.instanceId,
          targetInstanceId: mergeTarget.instanceId,
          quantity: 2,
        },
      },
    ]) {
      expect(() => execute(start, command, storage)).toThrowError(
        expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }),
      )
      expect(storage.writes).toBe(0)
      expect(storage.read()).toBe(persisted)
      expect(start.runLoadout.backpack.items).toEqual([mergeSource, mergeTarget])
    }
  })

  it('leaves task storage and all core placement/eligibility/load rules to core with no save', () => {
    const task = item('task-case', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    const coat = item('coat', HOSPITAL_ITEM_IDS.heavyCoat)
    const start = hub({ taskStorage: [task], backpack: [coat] })
    const storage = new TrackedStorage()
    saveRunPhase(storage, { kind: 'current-day-hub', payload: start }, hospitalRunSaveRulesRegistry)
    const before = storage.read()
    storage.resetWrites()
    expect(() => execute(start, {
      kind: 'hub-loadout',
      command: { kind: 'equip-from-backpack', instanceId: coat.instanceId, targetSlot: 'weapon' },
    }, storage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)
    expect(storage.read()).toBe(before)
  })

  it('rejects unauthorized task, invalid placement, ineligible quick item, and cannot-carry inputs without saving', () => {
    const task = item('task-case', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    const metal = item('metal', HOSPITAL_ITEM_IDS.metalParts)
    const heavy = Array.from({ length: 5 }, (_, index) =>
      item(`heavy-${index}`, HOSPITAL_ITEM_IDS.metalParts, 5))
    const incoming = item('incoming', HOSPITAL_ITEM_IDS.metalParts, 5)
    const startsAndCommands = [
      [hub({ taskStorage: [task] }), {
        kind: 'hub-loadout',
        command: { kind: 'task-storage-to-backpack', instanceId: task.instanceId },
      }],
      [hub({ warehouse: [metal] }), {
        kind: 'hub-loadout',
        command: {
          kind: 'warehouse-to-backpack',
          instanceId: metal.instanceId,
          placement: placement(metal.instanceId, -1, 0),
        },
      }],
      [hub({ backpack: [metal] }), {
        kind: 'hub-loadout',
        command: { kind: 'backpack-to-quick-slot', instanceId: metal.instanceId, targetSlotIndex: 0 },
      }],
      [hub({
        warehouse: [incoming],
        backpack: heavy,
        placements: heavy.map((candidate, index) => placement(candidate.instanceId, index, 0)),
      }), {
        kind: 'hub-loadout',
        command: {
          kind: 'warehouse-to-backpack',
          instanceId: incoming.instanceId,
          placement: placement(incoming.instanceId, 5, 0),
        },
      }],
    ] as const
    for (const [start, command] of startsAndCommands) {
      const storage = new TrackedStorage()
      expect(() => execute(start, command, storage)).toThrow()
      expect(storage.writes).toBe(0)
    }
  })
})

describe('Hub medical, survival, and maintenance routing', () => {
  it.each([
    ['warehouse', { container: 'warehouse', itemInstanceId: 'bandage' }],
    ['backpack', { container: 'backpack', itemInstanceId: 'bandage' }],
    ['quick-slot', { container: 'quick-slot', quickSlotIndex: 0 }],
  ] as const)('consumes a real %s medical source and treats only the explicit wound', (_, source) => {
    const bandage = item('bandage', HOSPITAL_ITEM_IDS.bandage)
    const start = hub({
      warehouse: source.container === 'warehouse' ? [bandage] : [],
      backpack: source.container === 'backpack' ? [bandage] : [],
      quickSlots: source.container === 'quick-slot' ? [bandage, null] : [null, null],
      health: 10,
      bleeding: true,
      wounds: [
        { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
        { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
      ],
    })
    const storage = new TrackedStorage()
    const execution = execute(start, {
      kind: 'hub-medical',
      command: {
        kind: 'use-run-hub-medical-item',
        source,
        target: { kind: 'open-wound', woundId: 'wound-a' },
      },
    }, storage)
    if (execution.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    const next = execution.phase.payload
    expect(next.playerCondition.openWounds).toEqual([
      { id: 'wound-a', kind: 'laceration', treatment: 'treated' },
      { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
    ])
    expect(() => getItemState(next.runLoadout.itemStates, bandage.instanceId)).toThrow()
    if (source.container === 'quick-slot') {
      expect(next.runLoadout.quickSlots.slots[0]).toBeNull()
    }
    assertSaved(execution, storage)
  })

  it('routes a minor-contusion painkiller and keeps DailyMedicalUsage canonical', () => {
    const painkiller = item('painkiller', HOSPITAL_ITEM_IDS.painkiller)
    const execution = execute(hub({ warehouse: [painkiller], minorContusions: 1 }), {
      kind: 'hub-medical',
      command: {
        kind: 'use-run-hub-medical-item',
        source: { container: 'warehouse', itemInstanceId: painkiller.instanceId },
      },
    })
    if (execution.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    expect(execution.phase.payload.playerCondition.painkillerActive).toBe(true)
    expect(execution.phase.payload.dailyState.medicalUsage.disinfectantUsesToday).toBe(0)
  })

  it('routes the explicit first-aid minor-contusion target and disinfectant daily usage', () => {
    const firstAid = item('first-aid', HOSPITAL_ITEM_IDS.firstAidKit)
    const firstAidExecution = execute(hub({
      warehouse: [firstAid],
      health: 8,
      minorContusions: 2,
    }), {
      kind: 'hub-medical',
      command: {
        kind: 'use-run-hub-medical-item',
        source: { container: 'warehouse', itemInstanceId: firstAid.instanceId },
        target: { kind: 'minor-contusion' },
      },
    })
    if (firstAidExecution.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    expect(firstAidExecution.phase.payload.playerCondition.minorContusions).toBe(1)

    const disinfectant = item('disinfectant', HOSPITAL_ITEM_IDS.disinfectant)
    const disinfected = execute(hub({
      warehouse: [disinfectant],
      pendingExposures: 2,
    }), {
      kind: 'hub-medical',
      command: {
        kind: 'use-run-hub-medical-item',
        source: { container: 'warehouse', itemInstanceId: disinfectant.instanceId },
      },
    })
    if (disinfected.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    expect(disinfected.phase.payload.playerCondition.pendingInfectionExposures).toBe(1)
    expect(disinfected.phase.payload.dailyState.medicalUsage.disinfectantUsesToday).toBe(1)
  })

  it('leaves unavailable preventive medical use to core and preserves the old save', () => {
    const painkiller = item('preventive-painkiller', HOSPITAL_ITEM_IDS.painkiller)
    const start = hub({ warehouse: [painkiller] })
    const storage = new TrackedStorage()
    saveRunPhase(storage, { kind: 'current-day-hub', payload: start }, hospitalRunSaveRulesRegistry)
    const before = storage.read()
    storage.resetWrites()
    expect(() => execute(start, {
      kind: 'hub-medical',
      command: {
        kind: 'use-run-hub-medical-item',
        source: { container: 'warehouse', itemInstanceId: painkiller.instanceId },
      },
    }, storage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)
    expect(storage.read()).toBe(before)
  })

  it('routes both survival commands and rejects their formal no-effect states without saving', () => {
    const suppressant = item('suppressant', HOSPITAL_ITEM_IDS.infectionSuppressant, 2)
    const ration = item('ration', HOSPITAL_ITEM_IDS.ration)
    const suppressed = execute(hub({ warehouse: [suppressant], pendingExposures: 1 }), {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-infection-suppressant',
        source: { container: 'warehouse', itemInstanceId: suppressant.instanceId },
      },
    })
    if (suppressed.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    const suppressedHub = suppressed.phase.payload
    expect(suppressedHub.dailyState.threatSuppression.usesToday).toBe(1)
    const limitStorage = new TrackedStorage()
    expect(() => execute(suppressedHub, {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-infection-suppressant',
        source: { container: 'warehouse', itemInstanceId: suppressant.instanceId },
      },
    }, limitStorage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(limitStorage.writes).toBe(0)

    const fed = execute(hub({ warehouse: [ration], satiety: 1 }), {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-ration',
        source: { container: 'warehouse', itemInstanceId: ration.instanceId },
      },
    })
    if (fed.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    expect(fed.phase.payload.satiety.current).toBeGreaterThan(1)

    const storage = new TrackedStorage()
    expect(() => execute(hub({ warehouse: [suppressant] }), {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-infection-suppressant',
        source: { container: 'warehouse', itemInstanceId: suppressant.instanceId },
      },
    }, storage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)

    const fullStorage = new TrackedStorage()
    expect(() => execute(hub({
      warehouse: [ration],
      satiety: config.dailySettlement.maxSatiety,
    }), {
      kind: 'hub-survival',
      command: {
        kind: 'use-hub-ration',
        source: { container: 'warehouse', itemInstanceId: ration.instanceId },
      },
    }, fullStorage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(fullStorage.writes).toBe(0)
  })

  interface MaintenanceCase {
    readonly name: string
    readonly start: () => CurrentDayHubSnapshot
    readonly command: HubMaintenanceCommand
    readonly assert: (snapshot: CurrentDayHubSnapshot, effects: readonly unknown[]) => void
  }
  const pipe = item('pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const coat = item('coat', HOSPITAL_ITEM_IDS.heavyCoat)
  const toolkit = item('toolkit', HOSPITAL_ITEM_IDS.toolkit)
  const flashlight = item('flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const metal = item('metal', HOSPITAL_ITEM_IDS.metalParts)
  const fabric = item('fabric', HOSPITAL_ITEM_IDS.fabric)
  const electronics = item('electronics', HOSPITAL_ITEM_IDS.electronicComponents)
  const battery = item('battery', HOSPITAL_ITEM_IDS.standardBattery)
  const warehouseTarget = (itemInstanceId: string) => ({ container: 'warehouse' as const, itemInstanceId })

  const maintenanceCases: readonly MaintenanceCase[] = [
    {
      name: 'base maintenance labor',
      start: () => hub({ warehouse: [pipe], resources: { pipe: 4 }, labor: 2 }),
      command: { kind: 'allocate-base-maintenance-labor', allocations: [{ target: warehouseTarget(pipe.instanceId), points: 2 }] },
      assert: (next) => {
        expect(resource(next, pipe.instanceId)).toBe(6)
        expect(next.dailyState.maintenanceLaborRemaining).toBe(0)
      },
    },
    {
      name: 'metal-parts repair with explicit waste fact',
      start: () => hub({ warehouse: [pipe, metal], resources: { pipe: 4 } }),
      command: { kind: 'repair-with-metal-parts', source: { container: 'warehouse', itemInstanceId: metal.instanceId }, allocations: [{ target: warehouseTarget(pipe.instanceId), points: 5 }] },
      assert: (next, effects) => {
        expect(resource(next, pipe.instanceId)).toBe(6)
        expect(effects).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'maintenance-repair-waste', wastedRepair: 3 })]))
      },
    },
    {
      name: 'fabric repair',
      start: () => hub({ warehouse: [coat, fabric], resources: { coat: 1 } }),
      command: { kind: 'repair-with-fabric', source: { container: 'warehouse', itemInstanceId: fabric.instanceId }, target: warehouseTarget(coat.instanceId) },
      assert: (next) => expect(resource(next, coat.instanceId)).toBe(4),
    },
    {
      name: 'professional toolkit dual-material repair',
      start: () => hub({ warehouse: [toolkit, metal, electronics], resources: { toolkit: 0 } }),
      command: { kind: 'repair-toolkit', target: warehouseTarget(toolkit.instanceId), metalPartsSource: { container: 'warehouse', itemInstanceId: metal.instanceId }, electronicComponentsSource: { container: 'warehouse', itemInstanceId: electronics.instanceId } },
      assert: (next) => {
        expect(resource(next, toolkit.instanceId)).toBe(1)
        expect(next.runLoadout.warehouse.items).toEqual([toolkit])
      },
    },
    {
      name: 'flashlight charge',
      start: () => hub({ warehouse: [flashlight, battery], resources: { flashlight: 0 } }),
      command: { kind: 'charge-flashlight', target: warehouseTarget(flashlight.instanceId), batterySource: { container: 'warehouse', itemInstanceId: battery.instanceId } },
      assert: (next) => expect(resource(next, flashlight.instanceId)).toBe(3),
    },
  ]

  it.each(maintenanceCases)('routes $name through the version-bound maintenance dependency', ({ start, command, assert }) => {
    const storage = new TrackedStorage()
    const execution = execute(start(), { kind: 'hub-maintenance', command }, storage)
    if (execution.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    assert(execution.phase.payload, execution.result.effects)
    assertSaved(execution, storage)
  })

  it('rejects full flashlight and professional/basic eligibility mistakes without saving', () => {
    const start = hub({ warehouse: [flashlight, battery, toolkit], resources: { toolkit: 0 } })
    const storage = new TrackedStorage()
    expect(() => execute(start, {
      kind: 'hub-maintenance',
      command: { kind: 'charge-flashlight', target: warehouseTarget(flashlight.instanceId), batterySource: { container: 'warehouse', itemInstanceId: battery.instanceId } },
    }, storage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)
    expect(() => execute(start, {
      kind: 'hub-maintenance',
      command: { kind: 'allocate-base-maintenance-labor', allocations: [{ target: warehouseTarget(toolkit.instanceId), points: 1 }] },
    }, storage)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)
  })
})

describe('Hub phase, persistence, and lifecycle composition', () => {
  it('rejects a version registry whose maintenance dependency has a different CurrentDayHub owner', () => {
    const formal = hospitalRunSaveRulesRegistry.get(config.metadata.rulesVersion)
    expect(() => createRunSaveRulesRegistry([{
      rulesVersion: config.metadata.rulesVersion,
      dependencies: {
        ...formal,
        hubMaintenance: {
          ...hospitalHubMaintenanceDependencies,
          currentDayHub: { ...hospitalCurrentDayHubDependencies },
        },
      },
    }])).toThrowError(expect.objectContaining({ code: 'UNKNOWN_RULES_VERSION' }))
    const { hubMaintenance: _omitted, ...withoutMaintenance } = formal
    expect(() => createRunSaveRulesRegistry([{
      rulesVersion: config.metadata.rulesVersion,
      dependencies: withoutMaintenance as typeof formal,
    }])).toThrowError(expect.objectContaining({ code: 'UNKNOWN_RULES_VERSION' }))
  })

  it('rejects every Hub mutation in a Scene and delegates RunFailure to the generic terminal guard', () => {
    const start = hub()
    const launched = executeStableRunLifecycleCommand({
      currentPhase: { kind: 'current-day-hub', payload: start },
      command: { kind: 'launch-main-scene' },
      storage: new TrackedStorage(),
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const storage = new TrackedStorage()
    expect(() => executeStableRunHubCommand({
      currentPhase: launched.phase,
      command: {
        kind: 'hub-survival',
        command: { kind: 'use-hub-ration', source: { container: 'warehouse', itemInstanceId: 'ration' } },
      },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'COMMAND_NOT_AVAILABLE' }))
    expect(storage.writes).toBe(0)

    const settlement = resolveDailySettlement(
      hub({ threatProgress: 119, mainSceneUsedToday: true }),
      { kind: 'end-day' },
      hospitalCurrentDayHubDependencies,
    )
    expect(settlement.outcome.kind).toBe('terminal')
    if (settlement.outcome.kind !== 'terminal') throw new Error('expected terminal settlement')
    const failure = resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: settlement.outcome.snapshot,
    }, hospitalRunTerminationDependencies)
    expect(() => executeStableRunHubCommand({
      currentPhase: { kind: 'run-failure', payload: failure.snapshot },
      command: {
        kind: 'hub-survival',
        command: { kind: 'use-hub-ration', source: { container: 'warehouse', itemInstanceId: 'ration' } },
      },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toThrowError(expect.objectContaining({ code: 'TERMINAL_PHASE' }))
    expect(storage.writes).toBe(0)
  })

  it.each(['medical', 'maintenance'] as const)(
    'returns one committed %s mutation after one failed write without double consumption',
    (kind) => {
      const consumable = kind === 'medical'
        ? item('consumable', HOSPITAL_ITEM_IDS.bandage, 2)
        : item('consumable', HOSPITAL_ITEM_IDS.metalParts, 2)
      const pipe = item('repair-target', HOSPITAL_ITEM_IDS.metalPipe)
      const start = hub({
        warehouse: kind === 'medical' ? [consumable] : [consumable, pipe],
        resources: kind === 'maintenance' ? { 'repair-target': 4 } : {},
        health: kind === 'medical' ? 10 : undefined,
      })
      const storage = new TrackedStorage()
      saveRunPhase(storage, { kind: 'current-day-hub', payload: start }, hospitalRunSaveRulesRegistry)
      const persistedBefore = storage.read()
      storage.resetWrites()
      storage.failWrites = true
      const command = kind === 'medical'
        ? {
            kind: 'hub-medical' as const,
            command: {
              kind: 'use-run-hub-medical-item' as const,
              source: { container: 'warehouse' as const, itemInstanceId: consumable.instanceId },
            },
          }
        : {
            kind: 'hub-maintenance' as const,
            command: {
              kind: 'repair-with-metal-parts' as const,
              source: { container: 'warehouse' as const, itemInstanceId: consumable.instanceId },
              allocations: [{
                target: { container: 'warehouse' as const, itemInstanceId: pipe.instanceId },
                points: 2,
              }],
            },
          }
      const execution = execute(start, command, storage)
      expect(execution.kind).toBe('executed-with-save-failure')
      expect(storage.writes).toBe(1)
      expect(storage.read()).toBe(persistedBefore)
      if (execution.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
      expect(execution.phase.payload.runLoadout.warehouse.items.find(
        ({ instanceId }) => instanceId === consumable.instanceId,
      )?.quantity).toBe(1)
    },
  )

  it('chains Hub mutations and End Day using only each canonical execution phase', () => {
    const pipe = item('chain-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const bandage = item('chain-bandage', HOSPITAL_ITEM_IDS.bandage)
    const metal = item('chain-metal', HOSPITAL_ITEM_IDS.metalParts)
    const ration = item('chain-ration', HOSPITAL_ITEM_IDS.ration)
    const storage = new TrackedStorage()
    let phase: StableRunPhase = { kind: 'current-day-hub', payload: hub({
      warehouse: [pipe, bandage, metal, ration],
      resources: { 'chain-pipe': 4 },
      health: 10,
      mainSceneUsedToday: true,
      satiety: 1,
    }) }
    const commands = [
      { kind: 'hub-loadout', command: { kind: 'warehouse-to-backpack', instanceId: pipe.instanceId, placement: placement(pipe.instanceId, 0, 0) } },
      { kind: 'hub-medical', command: { kind: 'use-run-hub-medical-item', source: { container: 'warehouse', itemInstanceId: bandage.instanceId } } },
      { kind: 'hub-maintenance', command: { kind: 'repair-with-metal-parts', source: { container: 'warehouse', itemInstanceId: metal.instanceId }, allocations: [{ target: { container: 'backpack', itemInstanceId: pipe.instanceId }, points: 2 }] } },
      { kind: 'hub-survival', command: { kind: 'use-hub-ration', source: { container: 'warehouse', itemInstanceId: ration.instanceId } } },
    ] as const
    for (const command of commands) {
      storage.resetWrites()
      const execution = executeStableRunHubCommand({ currentPhase: phase, command, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
      phase = execution.phase
      expect(storage.writes).toBe(1)
      expect(loadRunPhase(storage, hospitalRunSaveRulesRegistry)).toEqual(phase)
      expect(phase.kind).toBe('current-day-hub')
      if (phase.kind === 'current-day-hub') {
        expect(phase.payload.continuity.currentDay).toBe(2)
        expect(phase.payload.continuity.runIdentity.runId).toBe('run-hub-router')
      }
    }
    storage.resetWrites()
    const ended = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'end-day' },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(ended.phase.kind).toBe('current-day-hub')
    if (ended.phase.kind === 'current-day-hub') {
      expect(ended.phase.payload.continuity.currentDay).toBe(3)
      expect(ended.phase.payload.continuity.runIdentity.runId).toBe('run-hub-router')
    }
    expect(storage.writes).toBe(1)
  })

  it('chains Scene launch, withdrawal, Return, and a real returned-Hub mutation without rebuilding inventory', () => {
    const stored = item('returned-chain-bandage', HOSPITAL_ITEM_IDS.bandage)
    const storage = new TrackedStorage()
    let phase: StableRunPhase = { kind: 'current-day-hub', payload: hub({ warehouse: [stored] }) }
    phase = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'launch-main-scene' },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    phase = executeStableRunSceneCommand({
      currentPhase: phase,
      command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    expect(phase.kind).toBe('scene-session')
    phase = executeStableRunLifecycleCommand({
      currentPhase: phase,
      command: { kind: 'settle-terminal-scene' },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }).phase
    expect(phase.kind).toBe('current-day-hub')
    const mutated = executeStableRunHubCommand({
      currentPhase: phase,
      command: {
        kind: 'hub-loadout',
        command: {
          kind: 'warehouse-to-backpack',
          instanceId: stored.instanceId,
          placement: placement(stored.instanceId, 0, 0),
        },
      },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    if (mutated.phase.kind !== 'current-day-hub') throw new Error('unexpected phase')
    expect(mutated.phase.payload.runLoadout.backpack.items).toContainEqual(stored)
    expect(getItemState(mutated.phase.payload.runLoadout.itemStates, stored.instanceId).definitionId)
      .toBe(stored.definitionId)
  })
})
