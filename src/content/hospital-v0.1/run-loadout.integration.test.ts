import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createEmptyEquipment, createEquipmentSnapshot } from '../../core/equipment'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  createEmptyBackpack,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import {
  createFullItemState,
  createItemResourceCatalog,
  createItemState,
  getItemState,
} from '../../core/item-state'
import { createEmptyQuickSlots, createQuickSlotSnapshot } from '../../core/quick-slot'
import {
  applyRunLoadoutEffects,
  buildRunLoadoutTransitionPlan,
  createRunLoadoutDependenciesFromReturn,
  createRunLoadoutCommand,
  createRunLoadoutSnapshot,
  createRunLoadoutSnapshotFromReturn,
  previewRunLoadoutCommand,
  previewPlayerVisibleRunLoadoutCommand,
  projectRunStoredInventoryFromRunLoadout,
  createStableRunLoadoutBackpackSplitInstanceId,
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
  hospitalItemResourceProfiles,
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
  it('uses one formal preview truth and projects only player-safe loadout facts', () => {
    const start = loadout()
    const command = {
      kind: 'warehouse-to-backpack' as const,
      instanceId: 'warehouse-bandages',
      placement: placement('warehouse-bandages', 0, 0),
    }
    const formal = previewRunLoadoutCommand(start, command, loadoutDependencies)
    const safe = previewPlayerVisibleRunLoadoutCommand(start, command, loadoutDependencies)
    expect(formal.canExecute).toBe(true)
    expect(safe.canExecute).toBe(true)
    if (!formal.canExecute || !safe.canExecute) throw new Error('expected executable preview')
    expect(safe.result).toMatchObject({
      operationKind: command.kind,
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      source: { container: 'warehouse', ordinal: 1 },
      target: { container: 'backpack', column: 1, row: 1 },
      quantityMoved: 3,
      sourceQuantityBefore: 3,
      sourceQuantityAfter: 0,
      targetQuantityBefore: 0,
      targetQuantityAfter: 3,
    })
    expect(safe.result.backpackWeightAfter).toBe(
      calculateBackpackWeightSubtotal(formal.result.snapshot.backpack, hospitalItemCatalog),
    )
    const serialized = JSON.stringify(safe)
    expect(serialized).not.toContain('warehouse-bandages')
    expect(serialized).not.toContain('effects')
    expect(serialized).not.toContain('snapshot')
    expect(serialized).not.toContain('runId')
    expect(Object.isFrozen(safe)).toBe(true)
    expect(Object.isFrozen(safe.result)).toBe(true)
  })

  it('keeps formal and player-safe rejection codes aligned', () => {
    const start = loadout()
    const invalid = {
      kind: 'warehouse-to-backpack' as const,
      instanceId: 'warehouse-pipe',
      placement: placement('warehouse-pipe', 99, 99),
    }
    expect(previewRunLoadoutCommand(start, invalid, loadoutDependencies)).toEqual({
      canExecute: false,
      rejectionCode: 'ACTION_NOT_AVAILABLE',
    })
    expect(previewPlayerVisibleRunLoadoutCommand(start, invalid, loadoutDependencies)).toEqual({
      canExecute: false,
      rejectionCode: 'ACTION_NOT_AVAILABLE',
    })
  })

  it('rejects an equipment swap whose canonical final backpack enters cannot-carry', () => {
    const incoming = item('cannot-carry-incoming-pipe', HOSPITAL_ITEM_IDS.metalPipe)
    const displaced = item('cannot-carry-equipped-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const materialStacks = [5, 5, 5, 5, 4].map((quantity, index) =>
      item(`cannot-carry-material-${index}`, HOSPITAL_ITEM_IDS.metalParts, quantity),
    )
    const start = loadout({
      warehouse: [], taskStorage: [],
      backpackItems: [...materialStacks, incoming],
      placements: [
        ...materialStacks.map(({ instanceId }, index) => placement(instanceId, index, 0)),
        placement(incoming.instanceId, 5, 0),
      ],
      equipment: createEquipmentSnapshot({ weapon: displaced, armor: null, utility: null }, hospitalItemCatalog, hospitalItemEquipmentCatalog),
    })
    expect(calculateBackpackWeightSubtotal(start.backpack, hospitalItemCatalog)).toBe(27)
    const command = {
      kind: 'swap-backpack-equipped' as const,
      backpackInstanceId: incoming.instanceId,
      targetSlot: 'weapon' as const,
      displacedPlacement: placement(displaced.instanceId, 0, 1),
    }
    expect(previewRunLoadoutCommand(start, command, loadoutDependencies)).toEqual({ canExecute: false, rejectionCode: 'CANNOT_CARRY' })
    expect(previewPlayerVisibleRunLoadoutCommand(start, command, loadoutDependencies)).toEqual({ canExecute: false, rejectionCode: 'CANNOT_CARRY' })
    expect(() => resolve(start, command)).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
  })
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

  it('keeps the existing quick-slot split identity byte-for-byte and uses a separate backpack split scope', () => {
    expect(createStableRunLoadoutSplitInstanceId('warehouse-bandages', 3))
      .toBe('run-loadout-split:18:warehouse-bandages:3')
    expect(createStableRunLoadoutBackpackSplitInstanceId('warehouse-bandages', 3, 1))
      .toBe('run-loadout-backpack-split:18:warehouse-bandages:3')
    expect(createStableRunLoadoutBackpackSplitInstanceId('warehouse-bandages', 3, 2))
      .toBe('run-loadout-backpack-split:18:warehouse-bandages:3:2')
  })

  it('strictly normalizes and freezes explicit backpack split and merge commands', () => {
    const split = createRunLoadoutCommand({
      kind: 'split-backpack-stack',
      sourceInstanceId: 'source',
      quantity: 2,
      placement: { x: 1, y: 2, rotated: false },
    })
    const merge = createRunLoadoutCommand({
      kind: 'merge-backpack-stacks',
      sourceInstanceId: 'source',
      targetInstanceId: 'target',
      quantity: 1,
    })
    expect(Object.isFrozen(split)).toBe(true)
    expect(Object.isFrozen(split.kind === 'split-backpack-stack' ? split.placement : null)).toBe(true)
    expect(Object.isFrozen(merge)).toBe(true)
    for (const invalid of [
      { ...split, extra: true },
      { ...merge, quantity: 0 },
      { ...merge, targetInstanceId: '' },
      { ...split, placement: { ...split.kind === 'split-backpack-stack' ? split.placement : {}, instanceId: 'forged' } },
    ]) {
      expect(() => createRunLoadoutCommand(invalid)).toThrowError(
        expect.objectContaining({ code: 'INVALID_INPUT' }),
      )
    }
  })

  it('splits explicit quantities without changing total quantity, weight, source identity, or source state', () => {
    const source = item('split-source', HOSPITAL_ITEM_IDS.metalParts, 5)
    const start = loadout({
      warehouse: [],
      taskStorage: [],
      backpackItems: [source],
      placements: [placement(source.instanceId, 0, 0)],
    })
    const weightBefore = calculateBackpackWeightSubtotal(start.backpack, hospitalItemCatalog)
    for (const quantity of [1, 2]) {
      const splitId = createStableRunLoadoutBackpackSplitInstanceId(
        source.instanceId,
        source.quantity,
        quantity,
      )
      const result = resolve(start, {
        kind: 'split-backpack-stack',
        sourceInstanceId: source.instanceId,
        quantity,
        placement: { x: quantity, y: 0, rotated: false },
      }).snapshot
      expect(result.backpack.items).toEqual(expect.arrayContaining([
        { ...source, quantity: source.quantity - quantity },
        { instanceId: splitId, definitionId: source.definitionId, quantity },
      ]))
      expect(result.backpack.placements).toEqual(expect.arrayContaining([
        placement(source.instanceId, 0, 0),
        placement(splitId, quantity, 0),
      ]))
      expect(getItemState(result.itemStates, source.instanceId))
        .toEqual(getItemState(start.itemStates, source.instanceId))
      expect(getItemState(result.itemStates, splitId).resource).toEqual({ kind: 'none' })
      expect(result.backpack.items.reduce((sum, candidate) => sum + candidate.quantity, 0)).toBe(5)
      expect(calculateBackpackWeightSubtotal(result.backpack, hospitalItemCatalog)).toBe(weightBefore)
    }
    expect(start.backpack.items).toEqual([source])
  })

  it('rejects invalid split quantities, non-stackable sources, resource-bearing stacks, and occupied placements', () => {
    const source = item('split-invalid-source', HOSPITAL_ITEM_IDS.bandage, 3)
    const blocker = item('split-blocker', HOSPITAL_ITEM_IDS.painkiller)
    const start = loadout({
      warehouse: [],
      taskStorage: [],
      backpackItems: [source, blocker],
      placements: [placement(source.instanceId, 0, 0), placement(blocker.instanceId, 1, 0)],
    })
    for (const command of [
      { kind: 'split-backpack-stack', sourceInstanceId: source.instanceId, quantity: 3, placement: { x: 2, y: 0, rotated: false } },
      { kind: 'split-backpack-stack', sourceInstanceId: source.instanceId, quantity: 1, placement: { x: 1, y: 0, rotated: false } },
      { kind: 'split-backpack-stack', sourceInstanceId: 'pipe', quantity: 1, placement: { x: 2, y: 0, rotated: false } },
    ] as const) {
      const candidate = command.sourceInstanceId === 'pipe'
        ? loadout({
            warehouse: [],
            taskStorage: [],
            backpackItems: [item('pipe', HOSPITAL_ITEM_IDS.metalPipe)],
            placements: [placement('pipe', 0, 0)],
          })
        : start
      expect(() => resolve(candidate, command)).toThrowError(
        expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }),
      )
    }

    const resourceCatalog = createItemResourceCatalog(
      hospitalItemResourceProfiles.map((profile) =>
        profile.definitionId === HOSPITAL_ITEM_IDS.bandage
          ? { definitionId: profile.definitionId, kind: 'durability' as const, maximum: 2 }
          : profile,
      ),
      hospitalItemCatalog.definitionIds,
    )
    const resourceDependencies = { ...loadoutDependencies, itemResourceCatalog: resourceCatalog }
    const resourceSource = item('resource-stack', HOSPITAL_ITEM_IDS.bandage, 3)
    const resourceSnapshot = createRunLoadoutSnapshot({
      warehouse: { items: [] },
      taskStorage: { items: [] },
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: [resourceSource],
        placements: [placement(resourceSource.instanceId, 0, 0)],
      }, hospitalItemCatalog),
      equipment: createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
      quickSlots: createEmptyQuickSlots(config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
      itemStates: { states: [createItemState({
        instanceId: resourceSource.instanceId,
        definitionId: resourceSource.definitionId,
        resource: { kind: 'durability', current: 1 },
      }, resourceCatalog)] },
    }, resourceDependencies)
    expect(() => resolveRunLoadoutCommand(resourceSnapshot, {
      kind: 'split-backpack-stack',
      sourceInstanceId: resourceSource.instanceId,
      quantity: 1,
      placement: { x: 1, y: 0, rotated: false },
    }, resourceDependencies)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
  })

  it.each(['warehouse', 'task-storage', 'backpack', 'equipment', 'quick-slots'] as const)(
    'rejects a deterministic backpack split identity collision in %s',
    (container) => {
      const source = item('collision-source', HOSPITAL_ITEM_IDS.bandage, 3)
      const splitId = createStableRunLoadoutBackpackSplitInstanceId(source.instanceId, 3, 1)
      const collision = container === 'task-storage'
        ? item(splitId, HOSPITAL_ITEM_IDS.sealedPathogenCase)
        : container === 'equipment'
          ? item(splitId, HOSPITAL_ITEM_IDS.metalPipe)
          : container === 'quick-slots'
            ? item(splitId, HOSPITAL_ITEM_IDS.painkiller)
            : item(splitId, HOSPITAL_ITEM_IDS.bandage)
      const start = loadout({
        warehouse: container === 'warehouse' ? [collision] : [],
        taskStorage: container === 'task-storage' ? [collision] : [],
        backpackItems: container === 'backpack' ? [source, collision] : [source],
        placements: container === 'backpack'
          ? [placement(source.instanceId, 0, 0), placement(collision.instanceId, 2, 0)]
          : [placement(source.instanceId, 0, 0)],
        equipment: container === 'equipment'
          ? createEquipmentSnapshot({ weapon: collision, armor: null, utility: null }, hospitalItemCatalog, hospitalItemEquipmentCatalog)
          : undefined,
        quickSlots: container === 'quick-slots'
          ? createQuickSlotSnapshot([collision, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog)
          : undefined,
      })
      const before = structuredClone(start)
      expect(() => resolve(start, {
        kind: 'split-backpack-stack',
        sourceInstanceId: source.instanceId,
        quantity: 1,
        placement: { x: 1, y: 0, rotated: false },
      })).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
      expect(start).toEqual(before)
    },
  )

  it('merges stacks partially and fully while preserving target identity, placement, state, and total weight', () => {
    const source = item('merge-source', HOSPITAL_ITEM_IDS.metalParts, 2)
    const target = item('merge-target', HOSPITAL_ITEM_IDS.metalParts, 2)
    const start = loadout({
      warehouse: [],
      taskStorage: [],
      backpackItems: [source, target],
      placements: [placement(source.instanceId, 0, 0), placement(target.instanceId, 1, 0)],
    })
    const targetState = getItemState(start.itemStates, target.instanceId)
    const weightBefore = calculateBackpackWeightSubtotal(start.backpack, hospitalItemCatalog)
    const partial = resolve(start, {
      kind: 'merge-backpack-stacks',
      sourceInstanceId: source.instanceId,
      targetInstanceId: target.instanceId,
      quantity: 1,
    }).snapshot
    expect(partial.backpack.items).toEqual(expect.arrayContaining([
      { ...source, quantity: 1 },
      { ...target, quantity: 3 },
    ]))
    expect(partial.backpack.placements).toEqual(start.backpack.placements)
    expect(getItemState(partial.itemStates, source.instanceId)).toBeDefined()
    expect(getItemState(partial.itemStates, target.instanceId)).toEqual(targetState)
    expect(calculateBackpackWeightSubtotal(partial.backpack, hospitalItemCatalog)).toBe(weightBefore)

    const full = resolve(partial, {
      kind: 'merge-backpack-stacks',
      sourceInstanceId: source.instanceId,
      targetInstanceId: target.instanceId,
      quantity: 1,
    }).snapshot
    expect(full.backpack.items).toContainEqual({ ...target, quantity: 4 })
    expect(full.backpack.items.some(({ instanceId }) => instanceId === source.instanceId)).toBe(false)
    expect(full.backpack.placements).toEqual([placement(target.instanceId, 1, 0)])
    expect(() => getItemState(full.itemStates, source.instanceId)).toThrow()
    expect(getItemState(full.itemStates, target.instanceId)).toEqual(targetState)
    expect(calculateBackpackWeightSubtotal(full.backpack, hospitalItemCatalog)).toBe(weightBefore)
  })

  it('rejects invalid merge identities, definitions, quantities, maxima, and incompatible ItemState atomically', () => {
    const source = item('merge-invalid-source', HOSPITAL_ITEM_IDS.bandage, 2)
    const target = item('merge-invalid-target', HOSPITAL_ITEM_IDS.bandage, 2)
    const other = item('merge-other', HOSPITAL_ITEM_IDS.painkiller)
    const start = loadout({
      warehouse: [],
      taskStorage: [],
      backpackItems: [source, target, other],
      placements: [placement(source.instanceId, 0, 0), placement(target.instanceId, 1, 0), placement(other.instanceId, 2, 0)],
    })
    const before = structuredClone(start)
    for (const command of [
      { kind: 'merge-backpack-stacks', sourceInstanceId: source.instanceId, targetInstanceId: source.instanceId, quantity: 1 },
      { kind: 'merge-backpack-stacks', sourceInstanceId: source.instanceId, targetInstanceId: other.instanceId, quantity: 1 },
      { kind: 'merge-backpack-stacks', sourceInstanceId: source.instanceId, targetInstanceId: target.instanceId, quantity: 3 },
      { kind: 'merge-backpack-stacks', sourceInstanceId: source.instanceId, targetInstanceId: target.instanceId, quantity: 2 },
    ] as const) {
      expect(() => resolve(start, command)).toThrowError(
        expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }),
      )
      expect(start).toEqual(before)
    }

    const resourceCatalog = createItemResourceCatalog(
      hospitalItemResourceProfiles.map((profile) =>
        profile.definitionId === HOSPITAL_ITEM_IDS.bandage
          ? { definitionId: profile.definitionId, kind: 'durability' as const, maximum: 2 }
          : profile,
      ),
      hospitalItemCatalog.definitionIds,
    )
    const resourceDependencies = { ...loadoutDependencies, itemResourceCatalog: resourceCatalog }
    const incompatible = createRunLoadoutSnapshot({
      ...start,
      itemStates: { states: [
        createItemState({ ...source, resource: { kind: 'durability', current: 1 } }, resourceCatalog),
        createItemState({ ...target, resource: { kind: 'durability', current: 2 } }, resourceCatalog),
        createItemState({ ...other, resource: { kind: 'none' } }, resourceCatalog),
      ] },
    }, resourceDependencies)
    expect(() => resolveRunLoadoutCommand(incompatible, {
      kind: 'merge-backpack-stacks',
      sourceInstanceId: source.instanceId,
      targetInstanceId: target.instanceId,
      quantity: 1,
    }, resourceDependencies)).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
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

  it('binds backpack split and merge Effects to the independent command and exact committed state', () => {
    const source = item('effect-source', HOSPITAL_ITEM_IDS.metalParts, 3)
    const target = item('effect-target', HOSPITAL_ITEM_IDS.metalParts)
    const start = loadout({
      warehouse: [],
      taskStorage: [],
      backpackItems: [source, target],
      placements: [placement(source.instanceId, 0, 0), placement(target.instanceId, 1, 0)],
    })
    const splitCommand: RunLoadoutCommand = {
      kind: 'split-backpack-stack',
      sourceInstanceId: source.instanceId,
      quantity: 1,
      placement: { x: 2, y: 0, rotated: false },
    }
    const splitPlan = buildRunLoadoutTransitionPlan(start, splitCommand, loadoutDependencies)
    const splitId = createStableRunLoadoutBackpackSplitInstanceId(source.instanceId, 3, 1)
    const operationTamper = (changes: Record<string, unknown>) => splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, ...changes } }
        : effect,
    )
    const snapshotTamper = splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-state-committed'
        ? {
            ...effect,
            snapshot: {
              ...effect.snapshot,
              backpack: {
                ...effect.snapshot.backpack,
                items: effect.snapshot.backpack.items.map((candidate) =>
                  candidate.instanceId === splitId
                    ? { ...candidate, quantity: 2 }
                    : candidate,
                ),
              },
            },
          }
        : effect,
    )
    const itemStateTamper = splitPlan.effects.map((effect) =>
      effect.kind === 'run-loadout-state-committed'
        ? {
            ...effect,
            itemStates: {
              states: effect.itemStates.states.filter(
                ({ instanceId }) => instanceId !== splitId,
              ),
            },
          }
        : effect,
    )
    for (const effects of [
      operationTamper({ quantity: 2 }),
      operationTamper({ splitInstanceId: 'forged-split' }),
      operationTamper({ targetInstanceId: 'forged-target' }),
      operationTamper({ placement: placement(splitId, 3, 0) }),
      snapshotTamper,
      itemStateTamper,
    ]) {
      expect(() => applyRunLoadoutEffects(start, splitCommand, effects, loadoutDependencies))
        .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    }
    expect(() => applyRunLoadoutEffects(start, {
      ...splitCommand,
      quantity: 2,
    }, splitPlan.effects, loadoutDependencies)).toThrowError(
      expect.objectContaining({ code: 'EFFECT_MISMATCH' }),
    )

    const split = splitPlan.snapshot
    const mergeCommand: RunLoadoutCommand = {
      kind: 'merge-backpack-stacks',
      sourceInstanceId: splitId,
      targetInstanceId: target.instanceId,
      quantity: 1,
    }
    const mergePlan = buildRunLoadoutTransitionPlan(split, mergeCommand, loadoutDependencies)
    const changedMergeTarget = mergePlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, targetInstanceId: source.instanceId } }
        : effect,
    )
    const changedMergeResult = mergePlan.effects.map((effect) =>
      effect.kind === 'run-loadout-operation-applied'
        ? { ...effect, operation: { ...effect.operation, mergeResult: 'partial' as const } }
        : effect,
    )
    expect(() => applyRunLoadoutEffects(split, mergeCommand, changedMergeTarget, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(split, mergeCommand, changedMergeResult, loadoutDependencies))
      .toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
    expect(() => applyRunLoadoutEffects(split, {
      ...mergeCommand,
      targetInstanceId: source.instanceId,
    }, mergePlan.effects, loadoutDependencies)).toThrowError(
      expect.objectContaining({ code: 'EFFECT_MISMATCH' }),
    )
  })
})
