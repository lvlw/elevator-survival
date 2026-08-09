import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createEmptyEquipment, createEquipmentSnapshot } from '../../core/equipment'
import {
  createBackpackSnapshot,
  createEmptyBackpack,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import { createEmptyQuickSlots } from '../../core/quick-slot'
import {
  applyRunLoadoutEffects,
  buildRunLoadoutTransitionPlan,
  createRunLoadoutDependenciesFromReturn,
  createRunLoadoutSnapshot,
  createRunLoadoutSnapshotFromReturn,
  projectRunStoredInventoryFromRunLoadout,
  createStableRunLoadoutSplitInstanceId,
  resolveRunLoadoutCommand,
  type RunLoadoutCommand,
} from '../../core/run-loadout'
import { createRunReturnSnapshot, type RunReturnDependencies } from '../../core/run-return'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemQuickSlotProfiles,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

const placement = (
  instanceId: string,
  x: number,
  y: number,
  rotated = false,
): BackpackPlacement => ({ instanceId, x, y, rotated })

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

const loadoutDependencies = createRunLoadoutDependenciesFromReturn(returnDependencies)

function stateFor(candidate: ItemInstance) {
  if (candidate.definitionId === HOSPITAL_ITEM_IDS.metalPipe) {
    return createItemState({
      ...candidate,
      resource: { kind: 'durability', current: 2 },
    }, hospitalItemResourceCatalog)
  }
  if (candidate.definitionId === HOSPITAL_ITEM_IDS.crowbar) {
    return createItemState({
      ...candidate,
      resource: { kind: 'durability', current: 1 },
    }, hospitalItemResourceCatalog)
  }
  return createFullItemState(candidate, hospitalItemResourceCatalog)
}

function loadout(input: Readonly<{
  warehouse?: readonly ItemInstance[]
  taskStorage?: readonly ItemInstance[]
  backpackItems?: readonly ItemInstance[]
  placements?: readonly BackpackPlacement[]
  equipment?: ReturnType<typeof createEmptyEquipment>
  quickSlots?: ReturnType<typeof createEmptyQuickSlots>
}> = {}) {
  const warehouse = input.warehouse ?? [
    item('warehouse-bandages', HOSPITAL_ITEM_IDS.bandage, 3),
    item('warehouse-pipe', HOSPITAL_ITEM_IDS.metalPipe),
    item('warehouse-crowbar', HOSPITAL_ITEM_IDS.crowbar),
    item('warehouse-painkiller', HOSPITAL_ITEM_IDS.painkiller),
  ]
  const taskStorage = input.taskStorage ?? [
    item('returned-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase),
  ]
  const backpackItems = input.backpackItems ?? []
  const backpack = createBackpackSnapshot({
    width: config.backpack.width,
    height: config.backpack.height,
    items: backpackItems,
    placements: input.placements ?? [],
  }, hospitalItemCatalog)
  const equipment = input.equipment ?? createEmptyEquipment(
    hospitalItemCatalog,
    hospitalItemEquipmentCatalog,
  )
  const quickSlots = input.quickSlots ?? createEmptyQuickSlots(
    config.backpack.quickSlotCount,
    hospitalItemCatalog,
    hospitalItemQuickSlotCatalog,
  )
  const items = [
    ...warehouse,
    ...taskStorage,
    ...backpackItems,
    ...Object.values(equipment).filter((candidate): candidate is ItemInstance => candidate !== null),
    ...quickSlots.slots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  return createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: taskStorage },
    backpack,
    equipment,
    quickSlots,
    itemStates: { states: items.map(stateFor) },
  }, loadoutDependencies)
}

function returnSnapshot() {
  const source = loadout()
  return createRunReturnSnapshot({
    continuity: {
      runIdentity: {
        runId: 'loadout-run',
        seed: 'loadout-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: 2,
      sceneInstanceId: 'loadout-return-scene',
    },
    warehouse: source.warehouse,
    taskStorage: source.taskStorage,
    player: {
      backpack: createEmptyBackpack(
        config.backpack.width,
        config.backpack.height,
        hospitalItemCatalog,
      ),
      equipment: source.equipment,
      quickSlots: source.quickSlots,
      condition: createPlayerCondition({
        currentHealth: config.combat.player.maxHealth,
        bleeding: false,
        openWounds: [],
        minorContusions: 0,
        painkillerActive: false,
        pendingInfectionExposures: 0,
      }, config.combat.player),
    },
    itemStates: source.itemStates,
    runIntelLog: { intelIds: [] },
    dailyMedicalUsage: { disinfectantUsesToday: 0 },
    returnLedger: { sceneInstanceIds: ['loadout-return-scene'] },
  }, returnDependencies)
}

describe('Run loadout stored-inventory projection', () => {
  it('derives only warehouse and task storage ItemState without caller filtering', () => {
    const pipe = item('equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const painkiller = item('quick-painkiller', HOSPITAL_ITEM_IDS.painkiller)
    const snapshot = loadout({
      equipment: createEquipmentSnapshot({ weapon: pipe, armor: null, utility: null }, hospitalItemCatalog, hospitalItemEquipmentCatalog),
      quickSlots: createEmptyQuickSlots(config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
    })
    const withQuickSlot = createRunLoadoutSnapshot({
      ...snapshot,
      quickSlots: { slots: [painkiller, null] },
      itemStates: { states: [...snapshot.itemStates.states, createFullItemState(painkiller, hospitalItemResourceCatalog)] },
    }, loadoutDependencies)
    const projection = projectRunStoredInventoryFromRunLoadout(withQuickSlot, loadoutDependencies)
    expect(projection.warehouse.items).toEqual(withQuickSlot.warehouse.items)
    expect(projection.taskStorage.items).toEqual(withQuickSlot.taskStorage.items)
    expect(projection.itemStates.states.map(({ instanceId }) => instanceId))
      .not.toContain('equipped-pipe')
    expect(projection.itemStates.states.map(({ instanceId }) => instanceId))
      .not.toContain('quick-painkiller')
  })
})

function resolve(
  snapshot: ReturnType<typeof loadout>,
  command: RunLoadoutCommand,
) {
  return resolveRunLoadoutCommand(snapshot, command, loadoutDependencies)
}

describe('hospital Run loadout inventory management', () => {
  it('enters loadout from a Run return without changing instances, quantities, or resources', () => {
    const returned = returnSnapshot()
    const before = structuredClone(returned)
    const snapshot = createRunLoadoutSnapshotFromReturn(returned, returnDependencies)

    expect(snapshot.warehouse).toEqual(returned.warehouse)
    expect(snapshot.taskStorage).toEqual(returned.taskStorage)
    expect(snapshot.itemStates).toEqual(returned.itemStates)
    expect(snapshot.backpack).toMatchObject({ width: 6, height: 4, items: [] })
    expect(snapshot.itemStates.states.find(({ instanceId }) => instanceId === 'warehouse-crowbar')?.resource)
      .toEqual({ kind: 'durability', current: 1 })
    expect(returned).toEqual(before)
    expect(Object.isFrozen(snapshot)).toBe(true)
  })

  it('keeps every hospital stackable quick-slot item on the resource:none split boundary', () => {
    for (const profile of hospitalItemQuickSlotProfiles) {
      if (profile.kind !== 'eligible') continue
      const definition = hospitalItemCatalog.get(profile.definitionId)
      if (definition.stacking.kind !== 'stackable') continue
      expect(hospitalItemResourceCatalog.get(profile.definitionId).kind).toBe('none')
    }
  })

  it('moves complete warehouse instances to and from the backpack without merging or restoring state', () => {
    const start = loadout()
    const toBackpack = resolve(start, {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-bandages',
      placement: placement('warehouse-bandages', 0, 0),
    }).snapshot
    expect(toBackpack.warehouse.items.some(({ instanceId }) => instanceId === 'warehouse-bandages')).toBe(false)
    expect(toBackpack.backpack.items).toEqual([
      expect.objectContaining({ instanceId: 'warehouse-bandages', quantity: 3 }),
    ])
    expect(toBackpack.itemStates.states.find(({ instanceId }) => instanceId === 'warehouse-bandages')?.resource)
      .toEqual({ kind: 'none' })

    const crowbarInBackpack = resolve(toBackpack, {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-crowbar',
      placement: placement('warehouse-crowbar', 1, 0),
    }).snapshot
    const returned = resolve(crowbarInBackpack, {
      kind: 'backpack-to-warehouse',
      instanceId: 'warehouse-crowbar',
    }).snapshot
    expect(returned.warehouse.items.find(({ instanceId }) => instanceId === 'warehouse-crowbar'))
      .toMatchObject({ definitionId: HOSPITAL_ITEM_IDS.crowbar })
    expect(returned.itemStates.states.find(({ instanceId }) => instanceId === 'warehouse-crowbar')?.resource)
      .toEqual({ kind: 'durability', current: 1 })
  })

  it('rejects full backpacks and cannot-carry transfers atomically', () => {
    const fullItems = Array.from({ length: 24 }, (_, index) =>
      item(`full-${index}`, HOSPITAL_ITEM_IDS.metalParts),
    )
    const fullStart = loadout({
      warehouse: [item('warehouse-first-aid', HOSPITAL_ITEM_IDS.firstAidKit)],
      taskStorage: [],
      backpackItems: fullItems,
      placements: fullItems.map(({ instanceId }, index) => placement(instanceId, index % 6, Math.floor(index / 6))),
    })
    const fullBefore = structuredClone(fullStart)
    expect(() => resolve(fullStart, {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-first-aid',
      placement: placement('warehouse-first-aid', 0, 0),
    })).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(fullStart).toEqual(fullBefore)

    const overloadedStacks = Array.from({ length: 5 }, (_, index) =>
      item(`heavy-stack-${index}`, HOSPITAL_ITEM_IDS.metalParts, 5),
    )
    const overloadedStart = loadout({
      warehouse: [item('over-limit', HOSPITAL_ITEM_IDS.metalParts, 5)],
      taskStorage: [],
      backpackItems: overloadedStacks,
      placements: overloadedStacks.map(({ instanceId }, index) => placement(instanceId, index, 0)),
    })
    const overloadedBefore = structuredClone(overloadedStart)
    expect(() => resolve(overloadedStart, {
      kind: 'warehouse-to-backpack',
      instanceId: 'over-limit',
      placement: placement('over-limit', 5, 0),
    })).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
    expect(overloadedStart).toEqual(overloadedBefore)
  })

  it('uses the formal equipment primitives with explicit backpack placements', () => {
    const withPipe = resolve(loadout(), {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-pipe',
      placement: placement('warehouse-pipe', 0, 0),
    }).snapshot
    const equipped = resolve(withPipe, {
      kind: 'equip-from-backpack',
      instanceId: 'warehouse-pipe',
      targetSlot: 'weapon',
    }).snapshot
    expect(equipped.equipment.weapon).toMatchObject({ instanceId: 'warehouse-pipe' })
    expect(equipped.itemStates.states.find(({ instanceId }) => instanceId === 'warehouse-pipe')?.resource)
      .toEqual({ kind: 'durability', current: 2 })

    const unequipped = resolve(equipped, {
      kind: 'unequip-to-backpack',
      sourceSlot: 'weapon',
      placement: placement('warehouse-pipe', 0, 0),
    }).snapshot
    expect(unequipped.equipment.weapon).toBeNull()
    expect(unequipped.backpack.items.find(({ instanceId }) => instanceId === 'warehouse-pipe'))
      .toMatchObject({ definitionId: HOSPITAL_ITEM_IDS.metalPipe })

    const firstPipe = item('first-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const secondPipe = item('second-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const swapStart = loadout({ warehouse: [firstPipe, secondPipe], taskStorage: [] })
    const firstInBackpack = resolve(swapStart, {
      kind: 'warehouse-to-backpack',
      instanceId: firstPipe.instanceId,
      placement: placement(firstPipe.instanceId, 0, 0),
    }).snapshot
    const bothInBackpack = resolve(firstInBackpack, {
      kind: 'warehouse-to-backpack',
      instanceId: secondPipe.instanceId,
      placement: placement(secondPipe.instanceId, 1, 0),
    }).snapshot
    const firstEquipped = resolve(bothInBackpack, {
      kind: 'equip-from-backpack',
      instanceId: firstPipe.instanceId,
      targetSlot: 'weapon',
    }).snapshot
    const swapped = resolve(firstEquipped, {
      kind: 'swap-backpack-equipped',
      backpackInstanceId: secondPipe.instanceId,
      targetSlot: 'weapon',
      displacedPlacement: placement(firstPipe.instanceId, 0, 0),
    }).snapshot
    expect(swapped.equipment.weapon).toMatchObject({ instanceId: secondPipe.instanceId })
    expect(swapped.backpack.items.some(({ instanceId }) => instanceId === firstPipe.instanceId)).toBe(true)
  })

  it('rejects an unequip that would exceed the formal backpack carrying boundary', () => {
    const heavyStacks = [
      ...Array.from({ length: 5 }, (_, index) =>
        item(`equipped-heavy-${index}`, HOSPITAL_ITEM_IDS.metalParts, 5),
      ),
      item('equipped-heavy-bandages', HOSPITAL_ITEM_IDS.bandage, 3),
    ]
    const start = loadout({
      warehouse: [],
      taskStorage: [],
      backpackItems: heavyStacks,
      placements: heavyStacks.map(({ instanceId }, index) => placement(instanceId, index, 0)),
      equipment: createEquipmentSnapshot({
        weapon: item('overweight-equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe),
        armor: null,
        utility: null,
      }, hospitalItemCatalog, hospitalItemEquipmentCatalog),
    })
    const before = structuredClone(start)
    expect(() => resolve(start, {
      kind: 'unequip-to-backpack',
      sourceSlot: 'weapon',
      placement: placement('overweight-equipped-pipe', 0, 1),
    })).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
    expect(start).toEqual(before)
  })

  it('moves one quick-slot item as the same instance and splits stackable items deterministically', () => {
    const withPainkiller = resolve(loadout(), {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-painkiller',
      placement: placement('warehouse-painkiller', 0, 0),
    }).snapshot
    const quickPainkiller = resolve(withPainkiller, {
      kind: 'backpack-to-quick-slot',
      instanceId: 'warehouse-painkiller',
      targetSlotIndex: 0,
    }).snapshot
    expect(quickPainkiller.quickSlots.slots[0]).toMatchObject({
      instanceId: 'warehouse-painkiller',
      quantity: 1,
    })

    const withBandages = resolve(loadout(), {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-bandages',
      placement: placement('warehouse-bandages', 0, 0),
    }).snapshot
    const first = resolve(withBandages, {
      kind: 'backpack-to-quick-slot',
      instanceId: 'warehouse-bandages',
      targetSlotIndex: 0,
    }).snapshot
    const firstId = createStableRunLoadoutSplitInstanceId('warehouse-bandages', 3)
    expect(first.backpack.items.find(({ instanceId }) => instanceId === 'warehouse-bandages')?.quantity).toBe(2)
    expect(first.quickSlots.slots[0]).toMatchObject({ instanceId: firstId, quantity: 1 })
    expect(first.itemStates.states.find(({ instanceId }) => instanceId === firstId)?.resource)
      .toEqual({ kind: 'none' })
    expect(first.itemStates.states.find(({ instanceId }) => instanceId === 'warehouse-bandages')?.resource)
      .toEqual({ kind: 'none' })

    const second = resolve(first, {
      kind: 'backpack-to-quick-slot',
      instanceId: 'warehouse-bandages',
      targetSlotIndex: 1,
    }).snapshot
    const secondId = createStableRunLoadoutSplitInstanceId('warehouse-bandages', 2)
    expect(secondId).not.toBe(firstId)
    expect(second.quickSlots.slots[1]).toMatchObject({ instanceId: secondId, quantity: 1 })
    expect(second.backpack.items.find(({ instanceId }) => instanceId === 'warehouse-bandages')?.quantity).toBe(1)

    const backInBackpack = resolve(second, {
      kind: 'quick-slot-to-backpack',
      sourceSlotIndex: 0,
      placement: placement(firstId, 1, 0),
    }).snapshot
    expect(backInBackpack.quickSlots.slots[0]).toBeNull()
    expect(backInBackpack.backpack.items.find(({ instanceId }) => instanceId === firstId)).toBeDefined()
    expect(backInBackpack.quickSlots.slots[0]).toBeNull()
  })

  it('keeps task storage read-only and rejects unknown convenience commands', () => {
    const start = loadout()
    const before = structuredClone(start)
    expect(() => resolve(start, {
      kind: 'task-storage-to-backpack',
      instanceId: 'returned-sample',
      placement: placement('returned-sample', 0, 0),
    } as never)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(start).toEqual(before)
  })

  it('rejects tampered Effects including transfers, placement, slots, splits, state, and fake merges', () => {
    const start = loadout()
    const warehouseCommand: RunLoadoutCommand = {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-bandages',
      placement: placement('warehouse-bandages', 0, 0),
    }
    const warehousePlan = buildRunLoadoutTransitionPlan(start, warehouseCommand, loadoutDependencies)
    const changedDestination = warehousePlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, destination: 'task-storage' as const } }
        : effect,
    )
    const changedQuantity = warehousePlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, quantity: 2 } }
        : effect,
    )
    const changedPlacement = warehousePlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, placement: placement('warehouse-bandages', 1, 0) } }
        : effect,
    )
    expect(() => applyRunLoadoutEffects(start, warehouseCommand, changedDestination, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(start, warehouseCommand, changedQuantity, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(start, warehouseCommand, changedPlacement, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))

    const equippedStart = resolve(resolve(start, warehouseCommand).snapshot, {
      kind: 'warehouse-to-backpack',
      instanceId: 'warehouse-pipe',
      placement: placement('warehouse-pipe', 1, 0),
    }).snapshot
    const equipCommand: RunLoadoutCommand = {
      kind: 'equip-from-backpack',
      instanceId: 'warehouse-pipe',
      targetSlot: 'weapon',
    }
    const equipPlan = buildRunLoadoutTransitionPlan(equippedStart, equipCommand, loadoutDependencies)
    const changedEquipmentSlot = equipPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, equipmentSlot: 'armor' as const } }
        : effect,
    )
    expect(() => applyRunLoadoutEffects(equippedStart, equipCommand, changedEquipmentSlot, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))

    const splitStart = resolve(start, warehouseCommand).snapshot
    const splitCommand: RunLoadoutCommand = {
      kind: 'backpack-to-quick-slot',
      instanceId: 'warehouse-bandages',
      targetSlotIndex: 0,
    }
    const splitPlan = buildRunLoadoutTransitionPlan(splitStart, splitCommand, loadoutDependencies)
    const splitInstanceId = splitPlan.effects.find(
      (effect) => effect.kind === 'run-loadout-operation-applied',
    )!.operation.splitInstanceId
    const changedQuickSlot = splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, targetQuickSlotIndex: 1 } }
        : effect,
    )
    const changedSplitId = splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, splitInstanceId: 'forged-split-id' } }
        : effect,
    )
    const withoutSplitState = splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-state-committed'
        ? {
            ...effect,
            itemStates: {
              states: effect.itemStates.states.filter(({ instanceId }) =>
                instanceId !== splitInstanceId,
              ),
            },
          }
        : effect,
    )
    const fakeMerge = splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-state-committed'
        ? {
            ...effect,
            snapshot: {
              ...effect.snapshot,
              backpack: {
                ...effect.snapshot.backpack,
                items: effect.snapshot.backpack.items.map((candidate) =>
                  candidate.instanceId === 'warehouse-bandages'
                    ? { ...candidate, quantity: 3 }
                    : candidate,
                ),
              },
            },
          }
        : effect,
    )
    expect(() => applyRunLoadoutEffects(splitStart, splitCommand, changedQuickSlot, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(splitStart, splitCommand, changedSplitId, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(splitStart, splitCommand, withoutSplitState, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(splitStart, splitCommand, fakeMerge, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(
      splitStart,
      splitCommand,
      [...splitPlan.effects].reverse(),
      loadoutDependencies,
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
  })
})
