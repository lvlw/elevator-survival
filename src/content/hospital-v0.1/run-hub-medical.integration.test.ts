import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createEmptyEquipment } from '../../core/equipment'
import {
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState, getItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import {
  applyRunHubMedicalEffects,
  buildRunHubMedicalTransitionPlan,
  createRunHubMedicalSnapshot,
  getAvailableRunHubMedicalCommands,
  resolveRunHubMedicalCommand,
  type RunHubMedicalSnapshot,
  type UseRunHubMedicalItemCommand,
} from '../../core/run-hub-medical'
import {
  createRunLoadoutDependenciesFromReturn,
  createRunLoadoutSnapshot,
} from '../../core/run-loadout'
import type { RunReturnDependencies } from '../../core/run-return'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({
  instanceId,
  definitionId,
  quantity,
})

const placement = (instanceId: string, x: number, y: number): BackpackPlacement => ({
  instanceId,
  x,
  y,
  rotated: false,
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

const dependencies = {
  runLoadout: createRunLoadoutDependenciesFromReturn(returnDependencies),
  config,
  medicalBindings: hospitalSceneMedicalContentBindings,
}

function hub(input: Readonly<{
  readonly warehouse?: readonly ItemInstance[]
  readonly backpackItems?: readonly ItemInstance[]
  readonly quickSlots?: readonly (ItemInstance | null)[]
  readonly currentHealth?: number
  readonly bleeding?: boolean
  readonly wounds?: readonly Readonly<{
    id: string
    kind: 'laceration' | 'puncture' | 'bite'
    treatment: 'untreated' | 'treated'
  }>[]
  readonly minorContusions?: number
  readonly painkillerActive?: boolean
  readonly pendingInfectionExposures?: number
  readonly disinfectantUsesToday?: number
}> = {}): RunHubMedicalSnapshot {
  const warehouse = input.warehouse ?? []
  const backpackItems = input.backpackItems ?? []
  const quickSlots = input.quickSlots ?? [null, null]
  const equipment = createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog)
  const carried = [
    ...warehouse,
    ...backpackItems,
    ...quickSlots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: warehouse },
    taskStorage: { items: [item('task-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)] },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: backpackItems.map(({ instanceId }, index) => placement(instanceId, index, 0)),
    }, hospitalItemCatalog),
    equipment,
    quickSlots: createQuickSlotSnapshot(
      quickSlots,
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: {
      states: [
        ...carried.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)),
        createFullItemState(item('task-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase), hospitalItemResourceCatalog),
      ],
    },
  }, dependencies.runLoadout)
  return createRunHubMedicalSnapshot({
    runLoadout,
    playerCondition: createPlayerCondition({
      currentHealth: input.currentHealth ?? config.combat.player.maxHealth,
      bleeding: input.bleeding ?? false,
      openWounds: input.wounds ?? [],
      minorContusions: input.minorContusions ?? 0,
      painkillerActive: input.painkillerActive ?? false,
      pendingInfectionExposures: input.pendingInfectionExposures ?? 0,
    }, config.combat.player),
    dailyMedicalUsage: { disinfectantUsesToday: input.disinfectantUsesToday ?? 0 },
  }, dependencies)
}

function command(
  source: UseRunHubMedicalItemCommand['source'],
  target?: UseRunHubMedicalItemCommand['target'],
): UseRunHubMedicalItemCommand {
  return target
    ? { kind: 'use-run-hub-medical-item', source, target }
    : { kind: 'use-run-hub-medical-item', source }
}

function resolve(snapshot: RunHubMedicalSnapshot, action: UseRunHubMedicalItemCommand) {
  return resolveRunHubMedicalCommand(snapshot, action, dependencies)
}

describe('hospital Run hub medical', () => {
  it('consumes one unit from a warehouse bandage stack and retains its ItemState', () => {
    const start = hub({
      warehouse: [item('warehouse-bandage', HOSPITAL_ITEM_IDS.bandage, 3)],
      currentHealth: 10,
      bleeding: true,
      wounds: [{ id: 'wound-a', kind: 'laceration', treatment: 'untreated' }],
    })
    const result = resolve(start, command(
      { container: 'warehouse', itemInstanceId: 'warehouse-bandage' },
      { kind: 'open-wound', woundId: 'wound-a' },
    ))

    expect(result.snapshot.runLoadout.warehouse.items).toEqual([
      item('warehouse-bandage', HOSPITAL_ITEM_IDS.bandage, 2),
    ])
    expect(getItemState(result.snapshot.runLoadout.itemStates, 'warehouse-bandage').resource)
      .toEqual({ kind: 'none' })
    expect(result.snapshot.playerCondition).toMatchObject({ currentHealth: 11, bleeding: false })
    expect(result.snapshot.playerCondition.openWounds).toEqual([
      { id: 'wound-a', kind: 'laceration', treatment: 'treated' },
    ])
    expect(result.effects.map(({ kind }) => kind)).toEqual([
      'run-hub-medical-item-consumed',
      'run-hub-medical-primary-effect-applied',
      'run-hub-medical-primary-effect-applied',
      'run-hub-medical-primary-effect-applied',
      'run-hub-medical-zero-time-confirmed',
      'run-hub-medical-state-committed',
    ])
    expect(result.effects.find(({ kind }) => kind === 'run-hub-medical-zero-time-confirmed'))
      .toMatchObject({ hubSceneTime: 0 })
  })

  it('removes a fully consumed backpack instance, its placement, and its ItemState', () => {
    const start = hub({
      backpackItems: [item('backpack-bandage', HOSPITAL_ITEM_IDS.bandage)],
      currentHealth: 10,
    })
    const result = resolve(start, command({ container: 'backpack', itemInstanceId: 'backpack-bandage' }))

    expect(result.snapshot.runLoadout.backpack.items).toEqual([])
    expect(result.snapshot.runLoadout.backpack.placements).toEqual([])
    expect(() => getItemState(result.snapshot.runLoadout.itemStates, 'backpack-bandage')).toThrow()
  })

  it('uses the selected quick-slot instance and never auto-refills it', () => {
    const start = hub({
      warehouse: [item('warehouse-bandage', HOSPITAL_ITEM_IDS.bandage)],
      quickSlots: [item('quick-bandage', HOSPITAL_ITEM_IDS.bandage), null],
      currentHealth: 10,
    })
    const result = resolve(start, command({ container: 'quick-slot', quickSlotIndex: 0 }))

    expect(result.snapshot.runLoadout.quickSlots.slots).toEqual([null, null])
    expect(result.snapshot.runLoadout.warehouse.items).toEqual([
      item('warehouse-bandage', HOSPITAL_ITEM_IDS.bandage),
    ])
    expect(() => getItemState(result.snapshot.runLoadout.itemStates, 'quick-bandage')).toThrow()
  })

  it('applies painkiller only to formal minor injuries without an action-after bleeding loss', () => {
    const start = hub({
      warehouse: [item('painkiller', HOSPITAL_ITEM_IDS.painkiller)],
      currentHealth: 10,
      bleeding: true,
      minorContusions: 1,
    })
    const result = resolve(start, command({ container: 'warehouse', itemInstanceId: 'painkiller' }))
    expect(result.snapshot.playerCondition).toMatchObject({
      currentHealth: 10,
      bleeding: true,
      minorContusions: 1,
      painkillerActive: true,
    })
    expect(getAvailableRunHubMedicalCommands(result.snapshot, dependencies)).toEqual([])
    expect(() => resolve(hub({
      warehouse: [item('preventive-painkiller', HOSPITAL_ITEM_IDS.painkiller)],
    }), command({ container: 'warehouse', itemInstanceId: 'preventive-painkiller' })))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
  })

  it('shares the daily disinfectant limit across containers and carried-forward scene usage', () => {
    const start = hub({
      warehouse: [item('warehouse-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      backpackItems: [item('backpack-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 2,
    })
    const first = resolve(start, command({ container: 'warehouse', itemInstanceId: 'warehouse-disinfectant' }))
    expect(first.snapshot.playerCondition.pendingInfectionExposures).toBe(1)
    expect(first.snapshot.dailyMedicalUsage).toEqual({ disinfectantUsesToday: 1 })
    expect(() => resolve(first.snapshot, command({ container: 'backpack', itemInstanceId: 'backpack-disinfectant' })))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(() => resolve(hub({
      warehouse: [item('scene-used-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 1,
      disinfectantUsesToday: 1,
    }), command({ container: 'warehouse', itemInstanceId: 'scene-used-disinfectant' })))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))

    const plan = buildRunHubMedicalTransitionPlan(start, command({
      container: 'warehouse',
      itemInstanceId: 'warehouse-disinfectant',
    }), dependencies)
    const altered = plan.effects.map((effect) => {
      if (effect.kind !== 'run-hub-medical-primary-effect-applied') return effect
      if (effect.effect.kind === 'infection-exposure-reduced') {
        return { ...effect, effect: { ...effect.effect, requestedReduction: 99 } }
      }
      if (effect.effect.kind === 'daily-medical-usage-changed') {
        return { ...effect, effect: { ...effect.effect, usesAfter: 0 } }
      }
      return effect
    })
    expect(() => applyRunHubMedicalEffects(
      start,
      command({ container: 'warehouse', itemInstanceId: 'warehouse-disinfectant' }),
      altered as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_MISMATCH' }))
  })

  it('uses first aid with an explicit legal injury target and keeps infection untouched', () => {
    const start = hub({
      warehouse: [item('first-aid', HOSPITAL_ITEM_IDS.firstAidKit)],
      currentHealth: 8,
      bleeding: true,
      pendingInfectionExposures: 2,
      wounds: [{ id: 'bite-a', kind: 'bite', treatment: 'untreated' }],
    })
    expect(() => resolve(start, command({ container: 'warehouse', itemInstanceId: 'first-aid' })))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    const result = resolve(start, command(
      { container: 'warehouse', itemInstanceId: 'first-aid' },
      { kind: 'open-wound', woundId: 'bite-a' },
    ))
    expect(result.snapshot.playerCondition).toMatchObject({
      currentHealth: 12,
      bleeding: false,
      pendingInfectionExposures: 2,
      openWounds: [],
    })
  })

  it('returns each concrete valid source and required wound target in stable form', () => {
    const start = hub({
      warehouse: [item('warehouse-bandage', HOSPITAL_ITEM_IDS.bandage)],
      backpackItems: [item('backpack-bandage', HOSPITAL_ITEM_IDS.bandage)],
      quickSlots: [item('quick-bandage', HOSPITAL_ITEM_IDS.bandage), null],
      wounds: [
        { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
        { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
      ],
    })
    const available = getAvailableRunHubMedicalCommands(start, dependencies)
    expect(available).toHaveLength(6)
    expect(available).toEqual(expect.arrayContaining([
      command({ container: 'warehouse', itemInstanceId: 'warehouse-bandage' }, { kind: 'open-wound', woundId: 'wound-a' }),
      command({ container: 'backpack', itemInstanceId: 'backpack-bandage' }, { kind: 'open-wound', woundId: 'wound-b' }),
      command({ container: 'quick-slot', quickSlotIndex: 0 }, { kind: 'open-wound', woundId: 'wound-a' }),
    ]))
    expect(Object.isFrozen(available)).toBe(true)
  })

  it('rejects task storage, equipment-shaped, malformed, and tampered medical transactions atomically', () => {
    const start = hub({
      warehouse: [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
      currentHealth: 10,
      bleeding: true,
      wounds: [
        { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
        { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
      ],
    })
    const before = structuredClone(start)
    expect(() => resolve(start, {
      kind: 'use-run-hub-medical-item',
      source: { container: 'task-storage', itemInstanceId: 'task-sample' },
    } as never)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolve(start, {
      kind: 'use-run-hub-medical-item',
      source: { container: 'equipment', slot: 'weapon' },
    } as never)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => resolve(hub({
      warehouse: [item('not-medical', HOSPITAL_ITEM_IDS.metalParts)],
      currentHealth: 10,
    }), command({ container: 'warehouse', itemInstanceId: 'not-medical' })))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(() => resolve(start, command({ container: 'quick-slot', quickSlotIndex: 1 })))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(() => resolve(start, {
      kind: 'use-run-hub-medical-item',
      source: { container: 'warehouse', itemInstanceId: 'bandage' },
      target: { kind: 'open-wound', woundId: 'missing' },
      heal: 99,
    } as never)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const action = command(
      { container: 'warehouse', itemInstanceId: 'bandage' },
      { kind: 'open-wound', woundId: 'wound-a' },
    )
    const plan = buildRunHubMedicalTransitionPlan(start, action, dependencies)
    const altered = [
      plan.effects.map((effect) => effect.kind === 'run-hub-medical-item-consumed'
        ? { ...effect, source: { container: 'backpack' as const, itemInstanceId: 'bandage' } }
        : effect),
      plan.effects.map((effect) => effect.kind === 'run-hub-medical-item-consumed'
        ? { ...effect, quantityConsumed: 0 }
        : effect),
      plan.effects.map((effect) => effect.kind === 'run-hub-medical-primary-effect-applied' && effect.effect.kind === 'open-wound-treated'
        ? { ...effect, effect: { ...effect.effect, woundId: 'wound-b' } }
        : effect),
      plan.effects.filter((effect) =>
        effect.kind !== 'run-hub-medical-primary-effect-applied' ||
        effect.effect.kind !== 'bleeding-changed',
      ),
      plan.effects.filter(({ kind }) => kind !== 'run-hub-medical-zero-time-confirmed'),
      plan.effects.map((effect) => effect.kind === 'run-hub-medical-state-committed'
        ? {
            ...effect,
            snapshot: {
              ...effect.snapshot,
              runLoadout: {
                ...effect.snapshot.runLoadout,
                itemStates: { states: [] },
              },
            },
          }
        : effect),
      [...plan.effects].reverse(),
    ]
    for (const effects of altered) {
      expect(() => applyRunHubMedicalEffects(start, action, effects as never, dependencies)).toThrowError(
        expect.objectContaining({ code: 'EFFECT_MISMATCH' }),
      )
    }
    expect(start).toEqual(before)
  })
})
