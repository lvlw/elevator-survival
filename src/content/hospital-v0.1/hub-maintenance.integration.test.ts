import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createCurrentDayHubSnapshot, type CurrentDayHubSnapshot } from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import { createEquipmentSnapshot, type EquipmentSnapshot } from '../../core/equipment'
import {
  applyHubMaintenanceEffects,
  buildHubMaintenanceTransitionPlan,
  getAvailableHubMaintenanceActions,
  resolveHubMaintenanceCommand,
  type HubMaintenanceCommand,
  type HubMaintenanceEffect,
} from '../../core/hub-maintenance'
import {
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState, createItemState, getItemState, type ItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import type { RunReturnDependencies } from '../../core/run-return'
import {
  HOSPITAL_ITEM_IDS,
  hospitalHubMaintenanceContentBindings,
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

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({
  instanceId,
  definitionId,
  quantity,
})

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

const currentDayHubDependencies = {
  returnDependencies,
  medicalBindings: hospitalSceneMedicalContentBindings,
  survivalBindings: hospitalHubSurvivalContentBindings,
  worldThreatCatalog: hospitalWorldThreatCatalog,
}

const dependencies = {
  currentDayHub: currentDayHubDependencies,
  contentBindings: hospitalHubMaintenanceContentBindings,
}

function backpackPlacements(items: readonly ItemInstance[]): readonly BackpackPlacement[] {
  let x = 0
  let y = 0
  let rowHeight = 0
  return items.map((candidate) => {
    const definition = hospitalItemCatalog.get(candidate.definitionId)
    if (x + definition.width > config.backpack.width) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }
    const placement: BackpackPlacement = { instanceId: candidate.instanceId, x, y, rotated: false }
    x += definition.width
    rowHeight = Math.max(rowHeight, definition.height)
    return placement
  })
}

function equipment(input: Partial<EquipmentSnapshot> = {}): EquipmentSnapshot {
  return createEquipmentSnapshot({
    weapon: input.weapon ?? null,
    armor: input.armor ?? null,
    utility: input.utility ?? null,
  }, hospitalItemCatalog, hospitalItemEquipmentCatalog)
}

interface HubInput {
  readonly warehouse?: readonly ItemInstance[]
  readonly taskStorage?: readonly ItemInstance[]
  readonly backpack?: readonly ItemInstance[]
  readonly equipment?: EquipmentSnapshot
  readonly quickSlots?: readonly (ItemInstance | null)[]
  readonly resourceCurrent?: Readonly<Record<string, number>>
  readonly labor?: number
  readonly day?: number
  readonly mainSceneUsedToday?: boolean
}

function hub(input: HubInput = {}): CurrentDayHubSnapshot {
  const warehouse = input.warehouse ?? []
  const taskStorage = input.taskStorage ?? []
  const backpack = input.backpack ?? []
  const equipped = input.equipment ?? equipment()
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
    const override = input.resourceCurrent?.[candidate.instanceId]
    if (override === undefined) return createFullItemState(candidate, hospitalItemResourceCatalog)
    if (profile.kind === 'none') throw new Error(`无状态物品不能设置资源：${candidate.instanceId}`)
    return createItemState({
      instanceId: candidate.instanceId,
      definitionId: candidate.definitionId,
      resource: { kind: profile.kind, current: override },
    }, hospitalItemResourceCatalog)
  })
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: taskStorage },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpack,
      placements: backpackPlacements(backpack),
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
        runId: 'maintenance-run',
        seed: 'maintenance-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: input.day ?? 2,
      sceneInstanceId: 'returned-maintenance-scene',
    },
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: config.combat.player.maxHealth,
      bleeding: false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    runIntelLog: { intelIds: ['maintenance-intel'] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: input.labor ?? config.maintenance.dailyBaseLabor.points,
      mainSceneUsedToday: input.mainSceneUsedToday ?? false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 },
    satiety: { current: 4 },
    returnLedger: { sceneInstanceIds: ['returned-maintenance-scene'] },
  }, currentDayHubDependencies)
}

const warehouseTarget = (itemInstanceId: string) => ({ container: 'warehouse' as const, itemInstanceId })
const backpackTarget = (itemInstanceId: string) => ({ container: 'backpack' as const, itemInstanceId })
const equipmentTarget = (equipmentSlot: 'weapon' | 'armor' | 'utility', itemInstanceId: string) => ({
  container: 'equipment' as const,
  equipmentSlot,
  itemInstanceId,
})

function resolve(snapshot: CurrentDayHubSnapshot, command: HubMaintenanceCommand) {
  return resolveHubMaintenanceCommand(snapshot, command, dependencies)
}

function current(snapshot: CurrentDayHubSnapshot, instanceId: string): number {
  const resource = getItemState(snapshot.runLoadout.itemStates, instanceId).resource
  if (resource.kind === 'none') throw new Error(`物品没有资源：${instanceId}`)
  return resource.current
}

describe('hospital Current-Day Hub maintenance', () => {
  it('allocates base labor to multiple real targets without moving their containers', () => {
    const pipe = item('warehouse-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const coat = item('backpack-coat', HOSPITAL_ITEM_IDS.heavyCoat)
    const start = hub({
      warehouse: [pipe],
      backpack: [coat],
      resourceCurrent: { 'warehouse-pipe': 4, 'backpack-coat': 3 },
      mainSceneUsedToday: true,
    })
    const result = resolve(start, {
      kind: 'allocate-base-maintenance-labor',
      allocations: [
        { target: warehouseTarget(pipe.instanceId), points: 2 },
        { target: backpackTarget(coat.instanceId), points: 1 },
      ],
    })

    expect(current(result.snapshot, pipe.instanceId)).toBe(6)
    expect(current(result.snapshot, coat.instanceId)).toBe(4)
    expect(result.snapshot.dailyState.maintenanceLaborRemaining).toBe(0)
    expect(result.snapshot.dailyState.mainSceneUsedToday).toBe(true)
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([pipe])
    expect(result.snapshot.runLoadout.backpack.items).toEqual([coat])
    expect(result.effects.map(({ kind }) => kind)).toEqual([
      'maintenance-labor-consumed',
      'item-resource-restored',
      'item-resource-restored',
      'hub-maintenance-zero-time-confirmed',
      'current-day-hub-state-committed',
    ])
  })

  it('repairs a zero-durability equipped pipe and preserves equipment identity', () => {
    const pipe = item('equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const start = hub({
      equipment: equipment({ weapon: pipe }),
      resourceCurrent: { 'equipped-pipe': 0 },
      labor: 1,
    })
    const result = resolve(start, {
      kind: 'allocate-base-maintenance-labor',
      allocations: [{ target: equipmentTarget('weapon', pipe.instanceId), points: 1 }],
    })
    expect(current(result.snapshot, pipe.instanceId)).toBe(1)
    expect(result.snapshot.runLoadout.equipment.weapon).toEqual(pipe)
    expect(result.snapshot.runLoadout.backpack.items).toEqual([])
  })

  it('uses one metal stack unit for an explicit five-point mechanical allocation across backpack and equipment', () => {
    const pipe = item('backpack-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const crowbar = item('equipped-crowbar', HOSPITAL_ITEM_IDS.crowbar)
    const metal = item('metal-stack', HOSPITAL_ITEM_IDS.metalParts, 2)
    const start = hub({
      warehouse: [metal],
      backpack: [pipe],
      equipment: equipment({ utility: crowbar }),
      resourceCurrent: { 'backpack-pipe': 2, 'equipped-crowbar': 2 },
    })
    const result = resolve(start, {
      kind: 'repair-with-metal-parts',
      source: { container: 'warehouse', itemInstanceId: metal.instanceId },
      allocations: [
        { target: backpackTarget(pipe.instanceId), points: 4 },
        { target: equipmentTarget('utility', crowbar.instanceId), points: 1 },
      ],
    })
    expect(current(result.snapshot, pipe.instanceId)).toBe(6)
    expect(current(result.snapshot, crowbar.instanceId)).toBe(3)
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([
      item(metal.instanceId, HOSPITAL_ITEM_IDS.metalParts, 1),
    ])
    expect(result.snapshot.runLoadout.backpack.items).toEqual([pipe])
    expect(result.snapshot.runLoadout.equipment.utility).toEqual(crowbar)
    expect(result.effects.find(({ kind }) => kind === 'maintenance-repair-waste'))
      .toMatchObject({ generatedRepair: 5, actualRepair: 5, wastedRepair: 0 })
  })

  it('records metal repair waste rather than storing unallocated or capped repair points', () => {
    const pipe = item('pipe-needs-three', HOSPITAL_ITEM_IDS.metalPipe)
    const metal = item('metal-stack', HOSPITAL_ITEM_IDS.metalParts, 3)
    const otherMetal = item('other-metal', HOSPITAL_ITEM_IDS.metalParts)
    const start = hub({
      warehouse: [metal],
      backpack: [pipe, otherMetal],
      resourceCurrent: { 'pipe-needs-three': 3 },
    })
    const result = resolve(start, {
      kind: 'repair-with-metal-parts',
      source: { container: 'warehouse', itemInstanceId: metal.instanceId },
      allocations: [{ target: backpackTarget(pipe.instanceId), points: 5 }],
    })
    expect(current(result.snapshot, pipe.instanceId)).toBe(6)
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([
      item(metal.instanceId, HOSPITAL_ITEM_IDS.metalParts, 2),
    ])
    expect(result.snapshot.runLoadout.backpack.items).toEqual(expect.arrayContaining([pipe, otherMetal]))
    expect(result.effects.find(({ kind }) => kind === 'maintenance-repair-waste'))
      .toMatchObject({ generatedRepair: 5, actualRepair: 3, wastedRepair: 2 })
  })

  it('uses fabric once, caps a coat at four integrity, and reports textile waste', () => {
    const coat = item('warehouse-coat', HOSPITAL_ITEM_IDS.heavyCoat)
    const fabric = item('fabric', HOSPITAL_ITEM_IDS.fabric)
    const start = hub({
      warehouse: [coat, fabric],
      resourceCurrent: { 'warehouse-coat': 2 },
    })
    const result = resolve(start, {
      kind: 'repair-with-fabric',
      source: { container: 'warehouse', itemInstanceId: fabric.instanceId },
      target: warehouseTarget(coat.instanceId),
    })
    expect(current(result.snapshot, coat.instanceId)).toBe(4)
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([coat])
    expect(() => getItemState(result.snapshot.runLoadout.itemStates, fabric.instanceId)).toThrow()
    expect(result.effects.find(({ kind }) => kind === 'maintenance-repair-waste'))
      .toMatchObject({ generatedRepair: 4, actualRepair: 2, wastedRepair: 2 })
  })

  it('repairs a zero-durability toolkit atomically with its two explicit materials', () => {
    const toolkit = item('equipped-toolkit', HOSPITAL_ITEM_IDS.toolkit)
    const metal = item('toolkit-metal', HOSPITAL_ITEM_IDS.metalParts)
    const electronics = item('toolkit-electronics', HOSPITAL_ITEM_IDS.electronicComponents)
    const start = hub({
      warehouse: [metal, electronics],
      equipment: equipment({ utility: toolkit }),
      resourceCurrent: { 'equipped-toolkit': 0 },
    })
    const result = resolve(start, {
      kind: 'repair-toolkit',
      target: equipmentTarget('utility', toolkit.instanceId),
      metalPartsSource: { container: 'warehouse', itemInstanceId: metal.instanceId },
      electronicComponentsSource: { container: 'warehouse', itemInstanceId: electronics.instanceId },
    })
    expect(current(result.snapshot, toolkit.instanceId)).toBe(1)
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([])
    expect(result.snapshot.runLoadout.equipment.utility).toEqual(toolkit)
    expect(result.effects.filter(({ kind }) => kind === 'maintenance-material-consumed')).toHaveLength(2)
  })

  it('repairs a toolkit by exactly one point per explicit material pair', () => {
    const toolkit = item('toolkit-at-one', HOSPITAL_ITEM_IDS.toolkit)
    const metal = item('toolkit-metal-at-one', HOSPITAL_ITEM_IDS.metalParts)
    const electronics = item('toolkit-electronics-at-one', HOSPITAL_ITEM_IDS.electronicComponents)
    const start = hub({
      warehouse: [toolkit, metal, electronics],
      resourceCurrent: { [toolkit.instanceId]: 1 },
    })
    const result = resolve(start, {
      kind: 'repair-toolkit',
      target: warehouseTarget(toolkit.instanceId),
      metalPartsSource: { container: 'warehouse', itemInstanceId: metal.instanceId },
      electronicComponentsSource: { container: 'warehouse', itemInstanceId: electronics.instanceId },
    })
    expect(current(result.snapshot, toolkit.instanceId)).toBe(2)
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([toolkit])
  })

  it('rejects toolkit repair without both materials or at maximum without consuming either source', () => {
    const toolkit = item('toolkit', HOSPITAL_ITEM_IDS.toolkit)
    const electronics = item('electronics', HOSPITAL_ITEM_IDS.electronicComponents)
    const missingMetal = hub({
      warehouse: [electronics],
      equipment: equipment({ utility: toolkit }),
      resourceCurrent: { toolkit: 0 },
    })
    const command: HubMaintenanceCommand = {
      kind: 'repair-toolkit',
      target: equipmentTarget('utility', toolkit.instanceId),
      metalPartsSource: { container: 'warehouse', itemInstanceId: 'missing-metal' },
      electronicComponentsSource: { container: 'warehouse', itemInstanceId: electronics.instanceId },
    }
    expect(() => resolve(missingMetal, command)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(missingMetal.runLoadout.warehouse.items).toEqual([electronics])

    const metal = item('metal', HOSPITAL_ITEM_IDS.metalParts)
    const full = hub({
      warehouse: [metal, electronics],
      equipment: equipment({ utility: toolkit }),
      resourceCurrent: { toolkit: 2 },
    })
    expect(() => resolve(full, {
      ...command,
      metalPartsSource: { container: 'warehouse', itemInstanceId: metal.instanceId },
    })).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(full.runLoadout.warehouse.items).toEqual(expect.arrayContaining([metal, electronics]))
  })

  it.each([[0, 3], [1, 3], [2, 3]] as const)(
    'charges flashlight from %i to %i using one explicit battery in the Hub',
    (before, after) => {
      const flashlight = item(`flashlight-${before}`, HOSPITAL_ITEM_IDS.flashlight)
      const battery = item(`battery-${before}`, HOSPITAL_ITEM_IDS.standardBattery)
      const start = hub({
        warehouse: [battery],
        equipment: equipment({ utility: flashlight }),
        resourceCurrent: { [flashlight.instanceId]: before },
      })
      const result = resolve(start, {
        kind: 'charge-flashlight',
        target: equipmentTarget('utility', flashlight.instanceId),
        batterySource: { container: 'warehouse', itemInstanceId: battery.instanceId },
      })
      expect(current(result.snapshot, flashlight.instanceId)).toBe(after)
      expect(result.snapshot.runLoadout.warehouse.items).toEqual([])
      expect(() => getItemState(result.snapshot.runLoadout.itemStates, battery.instanceId)).toThrow()
      expect(result.effects.find(({ kind }) => kind === 'item-resource-restored'))
        .toMatchObject({ requestedRecovery: 3, resourceBefore: before, resourceAfter: after })
    },
  )

  it('does not consume a battery when the flashlight is already full', () => {
    const flashlight = item('full-flashlight', HOSPITAL_ITEM_IDS.flashlight)
    const battery = item('battery', HOSPITAL_ITEM_IDS.standardBattery)
    const start = hub({ warehouse: [battery], equipment: equipment({ utility: flashlight }) })
    expect(() => resolve(start, {
      kind: 'charge-flashlight',
      target: equipmentTarget('utility', flashlight.instanceId),
      batterySource: { container: 'warehouse', itemInstanceId: battery.instanceId },
    })).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(start.runLoadout.warehouse.items).toEqual([battery])
  })

  it('never infers maintenance eligibility from a resource kind: fire axe and other excluded targets fail', () => {
    const fireAxe = item('fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const flashlight = item('flashlight', HOSPITAL_ITEM_IDS.flashlight)
    const toolkit = item('toolkit', HOSPITAL_ITEM_IDS.toolkit)
    const metal = item('metal', HOSPITAL_ITEM_IDS.metalParts)
    const start = hub({
      warehouse: [fireAxe, toolkit, metal],
      equipment: equipment({ utility: flashlight }),
      resourceCurrent: { 'fire-axe': 0, flashlight: 0, toolkit: 0 },
    })
    const base = (target: ReturnType<typeof warehouseTarget> | ReturnType<typeof equipmentTarget>): HubMaintenanceCommand => ({
      kind: 'allocate-base-maintenance-labor',
      allocations: [{ target, points: 1 }],
    })
    expect(() => resolve(start, base(warehouseTarget(fireAxe.instanceId))))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(() => resolve(start, base(equipmentTarget('utility', flashlight.instanceId))))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(() => resolve(start, base(warehouseTarget(toolkit.instanceId))))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(() => resolve(start, {
      kind: 'repair-with-metal-parts',
      source: { container: 'warehouse', itemInstanceId: metal.instanceId },
      allocations: [{ target: warehouseTarget(fireAxe.instanceId), points: 1 }],
    })).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(current(start, fireAxe.instanceId)).toBe(0)
    expect(start.runLoadout.warehouse.items).toEqual([fireAxe, metal, toolkit])
  })

  it('returns only configured, currently deficient maintenance targets and explicit material sources', () => {
    const fireAxe = item('fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const pipe = item('pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const metal = item('metal', HOSPITAL_ITEM_IDS.metalParts)
    const start = hub({
      warehouse: [fireAxe, pipe, metal],
      resourceCurrent: { 'fire-axe': 0, pipe: 5 },
    })
    const actions = getAvailableHubMaintenanceActions(start, dependencies)
    const base = actions.find(({ kind }) => kind === 'allocate-base-maintenance-labor')
    const mechanical = actions.find(({ kind }) => kind === 'repair-with-metal-parts')
    expect(base?.targets.map(({ instanceId }) => instanceId)).toEqual(['pipe'])
    expect(mechanical?.targets.map(({ instanceId }) => instanceId)).toEqual(['pipe'])
    expect(mechanical?.materialSources).toEqual([{
      material: 'metal-parts',
      source: { container: 'warehouse', itemInstanceId: metal.instanceId },
      instanceId: metal.instanceId,
      definitionId: HOSPITAL_ITEM_IDS.metalParts,
      quantity: 1,
    }])
    expect(JSON.stringify(actions)).not.toContain(fireAxe.instanceId)
  })

  it('rejects malformed, duplicate, over-capacity, task-storage, and no-effect labor allocations without mutation', () => {
    const pipe = item('pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const start = hub({ warehouse: [pipe], resourceCurrent: { pipe: 5 }, labor: 1 })
    const before = structuredClone(start)
    const target = warehouseTarget(pipe.instanceId)
    const invalidCommands: readonly Readonly<{ expectedCode: string; command: HubMaintenanceCommand }>[] = [
      {
        expectedCode: 'ACTION_NOT_AVAILABLE',
        command: {
        kind: 'allocate-base-maintenance-labor',
        allocations: [{ target, points: 2 }],
      },
      },
      {
        expectedCode: 'INVALID_INPUT',
        command: {
        kind: 'allocate-base-maintenance-labor',
        allocations: [{ target, points: 1 }, { target, points: 1 }],
      },
      },
    ]
    for (const { command, expectedCode } of invalidCommands) {
      expect(() => resolve(start, command)).toThrowError(expect.objectContaining({
        code: expectedCode,
      }))
    }
    expect(() => resolve(start, {
      kind: 'allocate-base-maintenance-labor',
      allocations: [{ target: { container: 'task-storage', itemInstanceId: pipe.instanceId } as never, points: 1 }],
    } as never)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(start).toEqual(before)
  })

  it('uses the sole daily labor state and resets it only through the existing successful daily settlement', () => {
    const pipe = item('pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const start = hub({
      warehouse: [pipe],
      resourceCurrent: { pipe: 5 },
      labor: 1,
      mainSceneUsedToday: true,
    })
    const repaired = resolve(start, {
      kind: 'allocate-base-maintenance-labor',
      allocations: [{ target: warehouseTarget(pipe.instanceId), points: 1 }],
    }).snapshot
    const settlement = resolveDailySettlement(repaired, { kind: 'end-day' }, currentDayHubDependencies)
    expect(settlement.outcome.kind).toBe('next-day-current-day-hub')
    if (settlement.outcome.kind !== 'next-day-current-day-hub') throw new Error('expected next day')
    expect(settlement.outcome.snapshot.dailyState.maintenanceLaborRemaining).toBe(3)
    expect(current(settlement.outcome.snapshot, pipe.instanceId)).toBe(6)
  })

  it('allows maintenance on Day 7 and central CurrentDayHub restoration rejects Day 8', () => {
    const pipe = item('day-seven-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const daySeven = hub({ warehouse: [pipe], resourceCurrent: { [pipe.instanceId]: 5 }, day: 7 })
    expect(resolve(daySeven, {
      kind: 'allocate-base-maintenance-labor',
      allocations: [{ target: warehouseTarget(pipe.instanceId), points: 1 }],
    }).snapshot.continuity.currentDay).toBe(7)

    const expired = {
      ...daySeven,
      continuity: { ...daySeven.continuity, currentDay: 8 },
    } as CurrentDayHubSnapshot
    expect(() => resolve(expired, {
      kind: 'allocate-base-maintenance-labor',
      allocations: [{ target: warehouseTarget(pipe.instanceId), points: 1 }],
    })).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects every meaningful maintenance Effect mutation atomically', () => {
    const pipe = item('pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const metal = item('metal', HOSPITAL_ITEM_IDS.metalParts)
    const start = hub({ warehouse: [pipe, metal], resourceCurrent: { pipe: 3 } })
    const command: HubMaintenanceCommand = {
      kind: 'repair-with-metal-parts',
      source: { container: 'warehouse', itemInstanceId: metal.instanceId },
      allocations: [{ target: warehouseTarget(pipe.instanceId), points: 5 }],
    }
    const plan = buildHubMaintenanceTransitionPlan(start, command, dependencies)
    const before = structuredClone(start)
    const mutations: readonly (readonly HubMaintenanceEffect[])[] = [
      plan.effects.map((effect) => effect.kind === 'maintenance-material-consumed'
        ? { ...effect, source: { container: 'backpack' as const, itemInstanceId: metal.instanceId } }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-material-consumed'
        ? { ...effect, instanceId: 'other-metal' }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-material-consumed'
        ? { ...effect, definitionId: HOSPITAL_ITEM_IDS.fabric }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-material-consumed'
        ? { ...effect, quantityBefore: 2 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-material-consumed'
        ? { ...effect, quantityAfter: 1 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, target: warehouseTarget('other-pipe') }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, definitionId: HOSPITAL_ITEM_IDS.crowbar }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, resourceKind: 'integrity' as never }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, resourceBefore: 0 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, requestedRecovery: 4 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, actualRecovery: 4 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, resourceAfter: 5 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, unusedRecovery: 1 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-repair-waste'
        ? { ...effect, wastedRepair: 0 }
        : effect),
      plan.effects.filter((effect) => effect.kind !== 'maintenance-material-consumed'),
      [...plan.effects, plan.effects[0]],
      plan.effects.map((effect) => effect.kind === 'hub-maintenance-zero-time-confirmed'
        ? { ...effect, hubSceneTime: 1 as never }
        : effect),
      plan.effects.map((effect) => effect.kind === 'current-day-hub-state-committed'
        ? { ...effect, snapshot: { ...effect.snapshot, dailyState: { ...effect.snapshot.dailyState, maintenanceLaborRemaining: 2 } } }
        : effect),
      [...plan.effects].reverse(),
    ]
    for (const effects of mutations) {
      expect(() => applyHubMaintenanceEffects(start, command, effects, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    }
    expect(start).toEqual(before)
  })

  it('locks base-labor allocation order and labor accounting in the canonical Effect plan', () => {
    const pipe = item('labor-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const coat = item('labor-coat', HOSPITAL_ITEM_IDS.heavyCoat)
    const start = hub({
      warehouse: [pipe, coat],
      resourceCurrent: { [pipe.instanceId]: 4, [coat.instanceId]: 3 },
      labor: 3,
    })
    const command: HubMaintenanceCommand = {
      kind: 'allocate-base-maintenance-labor',
      allocations: [
        { target: warehouseTarget(pipe.instanceId), points: 2 },
        { target: warehouseTarget(coat.instanceId), points: 1 },
      ],
    }
    const plan = buildHubMaintenanceTransitionPlan(start, command, dependencies)
    const restoredIndexes = plan.effects
      .map((effect, index) => effect.kind === 'item-resource-restored' ? index : -1)
      .filter((index) => index >= 0)
    const swappedAllocationEffects = [...plan.effects]
    const first = restoredIndexes[0]
    const second = restoredIndexes[1]
    if (first === undefined || second === undefined) throw new Error('expected two resource restoration effects')
    ;[swappedAllocationEffects[first], swappedAllocationEffects[second]] = [
      swappedAllocationEffects[second]!,
      swappedAllocationEffects[first]!,
    ]
    const mutations: readonly (readonly HubMaintenanceEffect[])[] = [
      plan.effects.map((effect) => effect.kind === 'maintenance-labor-consumed'
        ? { ...effect, before: 2 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-labor-consumed'
        ? { ...effect, used: 2 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'maintenance-labor-consumed'
        ? { ...effect, after: 1 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'item-resource-restored'
        ? { ...effect, requestedRecovery: 1 }
        : effect),
      swappedAllocationEffects,
    ]
    for (const effects of mutations) {
      expect(() => applyHubMaintenanceEffects(start, command, effects, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    }
  })

  it('locks both toolkit materials and flashlight charge in their own canonical Effect plans', () => {
    const toolkit = item('tamper-toolkit', HOSPITAL_ITEM_IDS.toolkit)
    const metal = item('tamper-metal', HOSPITAL_ITEM_IDS.metalParts)
    const electronics = item('tamper-electronics', HOSPITAL_ITEM_IDS.electronicComponents)
    const toolkitStart = hub({
      warehouse: [toolkit, metal, electronics],
      resourceCurrent: { [toolkit.instanceId]: 0 },
    })
    const toolkitCommand: HubMaintenanceCommand = {
      kind: 'repair-toolkit',
      target: warehouseTarget(toolkit.instanceId),
      metalPartsSource: { container: 'warehouse', itemInstanceId: metal.instanceId },
      electronicComponentsSource: { container: 'warehouse', itemInstanceId: electronics.instanceId },
    }
    const toolkitPlan = buildHubMaintenanceTransitionPlan(toolkitStart, toolkitCommand, dependencies)
    const toolkitMutations: readonly (readonly HubMaintenanceEffect[])[] = [
      toolkitPlan.effects.filter((effect, index) => index !== 0),
      toolkitPlan.effects.map((effect) => effect.kind === 'maintenance-material-consumed' &&
          effect.material === 'electronic-components'
        ? { ...effect, definitionId: HOSPITAL_ITEM_IDS.metalParts }
        : effect),
    ]
    for (const effects of toolkitMutations) {
      expect(() => applyHubMaintenanceEffects(toolkitStart, toolkitCommand, effects, dependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    }

    const flashlight = item('tamper-flashlight', HOSPITAL_ITEM_IDS.flashlight)
    const battery = item('tamper-battery', HOSPITAL_ITEM_IDS.standardBattery)
    const flashlightStart = hub({
      warehouse: [flashlight, battery],
      resourceCurrent: { [flashlight.instanceId]: 1 },
    })
    const flashlightCommand: HubMaintenanceCommand = {
      kind: 'charge-flashlight',
      target: warehouseTarget(flashlight.instanceId),
      batterySource: { container: 'warehouse', itemInstanceId: battery.instanceId },
    }
    const flashlightPlan = buildHubMaintenanceTransitionPlan(flashlightStart, flashlightCommand, dependencies)
    const flashlightEffects = flashlightPlan.effects.map((effect) => effect.kind === 'item-resource-restored'
      ? { ...effect, resourceAfter: 2 }
      : effect)
    expect(() => applyHubMaintenanceEffects(
      flashlightStart,
      flashlightCommand,
      flashlightEffects,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
  })
})
