import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot } from '../../core/inventory'
import { createFullItemState, getItemState } from '../../core/item-state'
import {
  applySceneExplorationEffects,
  createSceneExplorationSnapshot,
  getAvailableSceneMedicalCommands,
  previewSceneMedicalCommand,
  previewPlayerVisibleSceneMedicalCommand,
  resolveMainSearchCommand,
  resolveSceneInventoryCommand,
  resolveSceneMedicalCommand,
  resolveSceneMoveCommand,
  SceneExplorationError,
  type SceneExplorationEffect,
  type SceneExplorationSnapshot,
  type UseSceneMedicalItemCommand,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import { hospitalSceneSurfaceObservationCatalog } from './hospital-scene-navigation'
import { createHospitalTestSceneExplorationSnapshot } from './hospital-scene-navigation.test-support'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalItemResourceCatalog,
  hospitalItemSearchIlluminationCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  navigationCatalog: hospitalSceneSurfaceObservationCatalog,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  config,
  medicalBindings: hospitalSceneMedicalContentBindings,
  lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
}

const searchDependencies = {
  ...dependencies,
  searchCatalog: hospitalMainSearchCatalog,
  searchIlluminationCatalog: hospitalItemSearchIlluminationCatalog,
}

type MedicalDefinition =
  | typeof HOSPITAL_ITEM_IDS.bandage
  | typeof HOSPITAL_ITEM_IDS.painkiller
  | typeof HOSPITAL_ITEM_IDS.disinfectant
  | typeof HOSPITAL_ITEM_IDS.firstAidKit

function item(instanceId: string, definitionId: MedicalDefinition, quantity = 1) {
  return { instanceId, definitionId, quantity }
}

function snapshot(input: Readonly<{
  readonly backpackItems?: readonly ReturnType<typeof item>[]
  readonly quickSlots?: readonly (MedicalDefinition | null)[]
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
  readonly remainingTime?: number
  readonly currentNodeId?: string
}> = {}): SceneExplorationSnapshot {
  const backpackItems = input.backpackItems ?? []
  const quickItems = (input.quickSlots ?? [null, null]).map((definitionId, index) =>
    definitionId ? item(`quick-${index}`, definitionId) : null,
  )
  const carried = [...backpackItems, ...quickItems.filter((candidate): candidate is ReturnType<typeof item> => candidate !== null)]
  return createHospitalTestSceneExplorationSnapshot({
    sceneInstanceId: 'hospital-scene-medical',
    searchState: createSceneSearchState({
      runSeed: 'hospital-scene-medical-seed',
      sceneInstanceId: 'hospital-scene-medical',
      graph: hospitalSliceV01SceneGraph,
      searchCatalog: hospitalMainSearchCatalog,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    currentNodeId: input.currentNodeId ?? HOSPITAL_NODE_IDS.emergencyHall,
    remainingTime: input.remainingTime ?? config.scene.totalTime,
    enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: backpackItems.map((candidate, index) => ({
        instanceId: candidate.instanceId,
        x: index * 2,
        y: 0,
        rotated: false,
      })),
    }, hospitalItemCatalog),
    equipment: { weapon: null, armor: null, utility: null },
    quickSlots: { slots: quickItems },
    itemStates: {
      states: carried.map((candidate) =>
        createFullItemState(candidate, hospitalItemResourceCatalog),
      ),
    },
    dailyMedicalUsage: { disinfectantUsesToday: input.disinfectantUsesToday ?? 0 },
    runIntelLog: { intelIds: [] },
    condition: createPlayerCondition({
      currentHealth: input.currentHealth ?? config.combat.player.maxHealth,
      bleeding: input.bleeding ?? false,
      openWounds: input.wounds ?? [],
      minorContusions: input.minorContusions ?? 0,
      painkillerActive: input.painkillerActive ?? false,
      pendingInfectionExposures: input.pendingInfectionExposures ?? 0,
    }, config.combat.player),
  }, dependencies)
}

function backpackCommand(
  itemInstanceId: string,
  target?: UseSceneMedicalItemCommand['target'],
): UseSceneMedicalItemCommand {
  return target
    ? { source: { container: 'backpack', itemInstanceId }, target }
    : { source: { container: 'backpack', itemInstanceId } }
}

function quickSlotCommand(
  quickSlotIndex: number,
  target?: UseSceneMedicalItemCommand['target'],
): UseSceneMedicalItemCommand {
  return target
    ? { source: { container: 'quick-slot', quickSlotIndex }, target }
    : { source: { container: 'quick-slot', quickSlotIndex } }
}

function resolve(start: SceneExplorationSnapshot, command: UseSceneMedicalItemCommand) {
  return resolveSceneMedicalCommand(start, command, dependencies)
}

function effectKinds(effects: readonly SceneExplorationEffect[]) {
  return effects.map(({ kind }) => kind)
}

describe('hospital non-combat scene medical', () => {
  it('projects formal medical, container, target, and timed facts without identities or raw plans', () => {
    const start = snapshot({
      backpackItems: [
        item('hidden-bandage-a', HOSPITAL_ITEM_IDS.bandage, 2),
        item('hidden-bandage-b', HOSPITAL_ITEM_IDS.bandage),
      ],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      currentHealth: config.combat.player.maxHealth,
      bleeding: true,
      wounds: [
        { id: 'hidden-a-treated-wound', kind: 'laceration', treatment: 'treated' },
        { id: 'hidden-b-target-wound', kind: 'laceration', treatment: 'untreated' },
      ],
    })
    const preview = previewPlayerVisibleSceneMedicalCommand(
      start,
      backpackCommand('hidden-bandage-b', {
        kind: 'open-wound',
        woundId: 'hidden-b-target-wound',
      }),
      dependencies,
    )
    expect(preview).toMatchObject({
      canExecute: true,
      result: {
        medicalItem: 'bandage',
        source: { container: 'backpack', column: 3, row: 1 },
        target: {
          kind: 'open-wound',
          woundKind: 'laceration',
          treatment: 'untreated',
          ordinal: 2,
        },
        quantityBefore: 1,
        quantityAfter: 0,
        actualHealthRecovery: 0,
        bleedingBefore: true,
        bleedingAfterPrimaryEffect: false,
        woundChange: 'treated',
        postActionBleedingDamage: 0,
        finalSceneStatus: 'active',
      },
    })
    const serialized = JSON.stringify(preview)
    for (const hidden of [
      'hidden-bandage-a',
      'hidden-bandage-b',
      'hidden-a-treated-wound',
      'hidden-b-target-wound',
      'effects',
      'snapshot',
      'transitionPlan',
    ]) expect(serialized).not.toContain(hidden)
  })

  it('separates the medical completion node from the forced-return destination', () => {
    const start = snapshot({
      backpackItems: [item('hidden-forced-bandage', HOSPITAL_ITEM_IDS.bandage)],
      currentHealth: 10,
      remainingTime: 5,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
    const preview = previewPlayerVisibleSceneMedicalCommand(
      start,
      backpackCommand('hidden-forced-bandage'),
      dependencies,
    )
    expect(preview).toMatchObject({
      canExecute: true,
      result: {
        completionNodeName: '急诊大厅',
        finalSceneStatus: 'forced-returned',
        returnContinuation: {
          kind: 'terminal-returned',
          terminalStatus: 'forced-returned',
          destinationNodeName: '电梯前室',
        },
      },
    })
    const resolved = resolve(start, backpackCommand('hidden-forced-bandage'))
    expect(resolved.snapshot).toMatchObject({
      status: 'forced-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    })
  })

  it('does not project a return continuation after positive-time post-action bleeding death', () => {
    const preview = previewPlayerVisibleSceneMedicalCommand(snapshot({
      backpackItems: [item('hidden-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      currentHealth: 1,
      bleeding: true,
      wounds: [{ id: 'hidden-bleeding-wound', kind: 'puncture', treatment: 'untreated' }],
      pendingInfectionExposures: 1,
      remainingTime: 100,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    }), backpackCommand('hidden-disinfectant'), dependencies)
    expect(preview).toMatchObject({
      canExecute: true,
      result: {
        medicalItem: 'disinfectant',
        infectionExposureBefore: 1,
        actualInfectionExposureReduction: 1,
        infectionExposureAfter: 0,
        disinfectantUsesBefore: 0,
        disinfectantUsesAfter: 1,
        actionTime: 10,
        remainingTimeBefore: 100,
        remainingTimeAfter: 90,
        postActionBleedingDamage: 1,
        finalHealth: 0,
        finalSceneStatus: 'dead',
        completionNodeName: '急诊大厅',
        returnContinuation: { kind: 'unavailable-due-to-death' },
        sceneOutcome: {
          kind: 'death',
          overtimeDebt: 0,
          isDead: true,
        },
      },
    })
    const resolved = resolve(snapshot({
      backpackItems: [item('positive-time-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      currentHealth: 1,
      bleeding: true,
      wounds: [{ id: 'positive-time-wound', kind: 'puncture', treatment: 'untreated' }],
      pendingInfectionExposures: 1,
      remainingTime: 100,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    }), backpackCommand('positive-time-disinfectant'))
    expect(resolved.snapshot).toMatchObject({
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
      remainingTime: 90,
      condition: { currentHealth: 0, pendingInfectionExposures: 0 },
    })
  })

  it('uses one manually split quick-slot unit, never auto-refills, and requires a second explicit transfer', () => {
    const start = snapshot({
      backpackItems: [item('bandage-stack', HOSPITAL_ITEM_IDS.bandage, 2)],
      currentHealth: 10,
      bleeding: true,
      wounds: [{ id: 'manual-refill-wound', kind: 'laceration', treatment: 'untreated' }],
    })
    const slotted = resolveSceneInventoryCommand(start, {
      kind: 'scene-backpack-to-quick-slot',
      instanceId: 'bandage-stack',
      targetSlotIndex: 0,
    }, dependencies).snapshot
    const firstUnit = slotted.quickSlots.slots[0]!
    expect(firstUnit).toMatchObject({ definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 })
    expect(firstUnit.instanceId).not.toBe('bandage-stack')
    expect(slotted.backpack.items).toContainEqual({
      instanceId: 'bandage-stack',
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      quantity: 1,
    })

    const used = resolve(slotted, quickSlotCommand(0, {
      kind: 'open-wound',
      woundId: 'manual-refill-wound',
    })).snapshot
    expect(used.quickSlots.slots[0]).toBeNull()
    expect(used.backpack.items).toContainEqual(expect.objectContaining({
      instanceId: 'bandage-stack',
      quantity: 1,
    }))
    expect(used.itemStates.states.some(({ instanceId }) => instanceId === firstUnit.instanceId)).toBe(false)

    const manuallyRefilled = resolveSceneInventoryCommand(used, {
      kind: 'scene-backpack-to-quick-slot',
      instanceId: 'bandage-stack',
      targetSlotIndex: 0,
    }, dependencies).snapshot
    expect(manuallyRefilled.backpack.items).toEqual([])
    expect(manuallyRefilled.quickSlots.slots[0]).toEqual({
      instanceId: 'bandage-stack',
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      quantity: 1,
    })
  })

  it('rejects a quest item forged into the formal medical bindings', () => {
    expect(() => getAvailableSceneMedicalCommands(snapshot(), {
      ...dependencies,
      medicalBindings: {
        ...hospitalSceneMedicalContentBindings,
        bandageDefinitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
      },
    })).toThrowError(expect.objectContaining<Partial<SceneExplorationError>>({
      code: 'INVALID_SCENE_MEDICAL_BINDINGS',
    }))
  })

  it('rejects a missing lifecycle catalog instead of weakening medical binding validation', () => {
    const missingLifecycle = { ...dependencies } as {
      lifecycleCatalog?: unknown
    } & Omit<typeof dependencies, 'lifecycleCatalog'>
    delete missingLifecycle.lifecycleCatalog
    expect(() => getAvailableSceneMedicalCommands(snapshot(), missingLifecycle as never))
      .toThrowError(expect.objectContaining<Partial<SceneExplorationError>>({
        code: 'INVALID_SCENE_MEDICAL_BINDINGS',
      }))
  })

  it('applies the confirmed bandage, painkiller, disinfectant, and first-aid-kit routes from versioned rules', () => {
    const bandageStart = snapshot({
      backpackItems: [item('bandage-stack', HOSPITAL_ITEM_IDS.bandage)],
      currentHealth: 10,
      bleeding: true,
      wounds: [{ id: 'wound-a', kind: 'laceration', treatment: 'untreated' }],
    })
    const bandage = resolve(bandageStart, backpackCommand('bandage-stack', { kind: 'open-wound', woundId: 'wound-a' }))
    expect(bandage.snapshot.condition).toMatchObject({ currentHealth: 11, bleeding: false })
    expect(bandage.snapshot.condition.openWounds).toEqual([
      { id: 'wound-a', kind: 'laceration', treatment: 'treated' },
    ])
    expect(bandage.snapshot.navigationKnowledge).toEqual(bandageStart.navigationKnowledge)
    expect(bandage.snapshot.backpack.items).toEqual([])
    expect(() => getItemState(bandage.snapshot.itemStates, 'bandage-stack')).toThrow()
    expect(effectKinds(bandage.result.effects)).toEqual([
      'scene-medical-item-consumed',
      'scene-health-restored',
      'scene-bleeding-changed',
      'scene-open-wound-treated',
      'scene-time-resolved',
    ])

    const painkiller = resolve(snapshot({
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
      minorContusions: 1,
    }), quickSlotCommand(0))
    expect(painkiller.snapshot.condition).toMatchObject({ painkillerActive: true, minorContusions: 1 })
    expect(painkiller.snapshot.quickSlots.slots[0]).toBeNull()
    expect(effectKinds(painkiller.result.effects)).toEqual([
      'scene-medical-item-consumed',
      'scene-painkiller-changed',
      'scene-time-resolved',
    ])

    const disinfectant = resolve(snapshot({
      backpackItems: [item('disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 2,
    }), backpackCommand('disinfectant'))
    expect(disinfectant.snapshot.condition.pendingInfectionExposures).toBe(1)
    expect(disinfectant.snapshot.dailyMedicalUsage.disinfectantUsesToday).toBe(1)
    expect(effectKinds(disinfectant.result.effects)).toEqual([
      'scene-medical-item-consumed',
      'scene-infection-exposure-reduced',
      'daily-medical-usage-changed',
      'scene-time-resolved',
    ])

    const firstAid = resolve(snapshot({
      backpackItems: [item('first-aid-quick-slot-corrective', HOSPITAL_ITEM_IDS.firstAidKit)],
      currentHealth: 8,
      bleeding: true,
      wounds: [{ id: 'wound-b', kind: 'bite', treatment: 'untreated' }],
    }), backpackCommand('first-aid-quick-slot-corrective', { kind: 'open-wound', woundId: 'wound-b' }))
    expect(firstAid.snapshot.condition).toMatchObject({ currentHealth: 12, bleeding: false, openWounds: [] })
    expect(firstAid.snapshot.backpack.items).toEqual([])
    expect(firstAid.result.actionTime).toBe(config.medical.firstAidKit.sceneTime)

    const firstAidContusion = resolve(snapshot({
      backpackItems: [item('first-aid', HOSPITAL_ITEM_IDS.firstAidKit)],
      minorContusions: 1,
    }), backpackCommand('first-aid', { kind: 'minor-contusion' }))
    expect(firstAidContusion.snapshot.condition).toMatchObject({
      currentHealth: config.combat.player.maxHealth,
      minorContusions: 0,
    })
  })

  it('keeps regular medical active at the elevator anteroom while time remains', () => {
    const result = resolve(snapshot({
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 200,
      currentHealth: 10,
      backpackItems: [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
    }), backpackCommand('bandage'))

    expect(result.snapshot).toMatchObject({
      status: 'active',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 190,
    })
    expect(resolveSceneMoveCommand(result.snapshot, {
      edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
    }, dependencies).snapshot).toMatchObject({
      status: 'active',
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
  })

  it('resolves zero-distance medical at the anteroom by debt, not normal safe return', () => {
    const exact = resolve(snapshot({
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 10,
      currentHealth: 10,
      backpackItems: [item('bandage-exact', HOSPITAL_ITEM_IDS.bandage)],
    }), backpackCommand('bandage-exact'))
    expect(exact.snapshot).toMatchObject({
      status: 'safe-returned',
      remainingTime: 0,
    })
    expect(exact.result.sceneOutcome).toMatchObject({
      overtimeDebt: 0,
      forcedReturnTotalDamage: 0,
    })

    const overtime = resolve(snapshot({
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 5,
      currentHealth: 10,
      backpackItems: [item('bandage-overtime', HOSPITAL_ITEM_IDS.bandage)],
    }), backpackCommand('bandage-overtime'))
    expect(overtime.snapshot).toMatchObject({
      status: 'forced-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 0,
      condition: { currentHealth: 10 },
    })
    expect(overtime.result.sceneOutcome).toMatchObject({
      overtimeDebt: 5,
      effectiveEmergencyReturnTime: 5,
      forcedReturnBaseDamage: 1,
    })
  })

  it('requires an explicit legal wound target and affects only that target', () => {
    const start = snapshot({
      backpackItems: [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
      wounds: [
        { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
        { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
      ],
    })
    expect(previewSceneMedicalCommand(start, backpackCommand('bandage'), dependencies)).toEqual({
      canExecute: false,
      rejectionCode: 'SCENE_MEDICAL_NOT_AVAILABLE',
    })
    const result = resolve(start, backpackCommand('bandage', { kind: 'open-wound', woundId: 'wound-b' }))
    expect(result.snapshot.condition.openWounds).toEqual([
      { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
      { id: 'wound-b', kind: 'puncture', treatment: 'treated' },
    ])
    expect(previewSceneMedicalCommand(
      snapshot({
        backpackItems: [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
        wounds: [{ id: 'treated', kind: 'bite', treatment: 'treated' }],
      }),
      backpackCommand('bandage', { kind: 'open-wound', woundId: 'treated' }),
      dependencies,
    )).toEqual({ canExecute: false, rejectionCode: 'SCENE_MEDICAL_NOT_AVAILABLE' })
  })

  it('uses only the selected real container item, preserves a remaining stack state, and never auto-refills', () => {
    const start = snapshot({
      backpackItems: [item('backpack-bandages', HOSPITAL_ITEM_IDS.bandage, 2)],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      currentHealth: 10,
    })
    const backpackUse = resolve(start, backpackCommand('backpack-bandages'))
    expect(backpackUse.snapshot.backpack.items).toEqual([
      item('backpack-bandages', HOSPITAL_ITEM_IDS.bandage, 1),
    ])
    expect(getItemState(backpackUse.snapshot.itemStates, 'backpack-bandages')).toMatchObject({
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      resource: { kind: 'none' },
    })
    expect(backpackUse.snapshot.quickSlots.slots[0]).toEqual(item('quick-0', HOSPITAL_ITEM_IDS.bandage))

    const quickUse = resolve(start, quickSlotCommand(0))
    expect(quickUse.snapshot.quickSlots.slots[0]).toBeNull()
    expect(quickUse.snapshot.backpack.items).toEqual([
      item('backpack-bandages', HOSPITAL_ITEM_IDS.bandage, 2),
    ])
  })

  it('uses post-medical state for bleeding, forced return, and death priority', () => {
    const forcedStart = snapshot({
      backpackItems: [item('disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 1,
      bleeding: true,
      wounds: [{ id: 'wound', kind: 'laceration', treatment: 'untreated' }],
      remainingTime: 5,
    })
    const forced = resolve(forcedStart, backpackCommand('disinfectant'))
    expect(forced.snapshot).toMatchObject({ status: 'forced-returned', remainingTime: 0 })
    expect(effectKinds(forced.result.effects)).toEqual([
      'scene-medical-item-consumed',
      'scene-infection-exposure-reduced',
      'daily-medical-usage-changed',
      'scene-time-resolved',
      'health-lost',
      'health-lost',
      'health-lost',
      'scene-node-changed',
      'scene-status-changed',
    ])
    expect((forced.result.effects[4] as Extract<SceneExplorationEffect, { kind: 'health-lost' }>).source).toBe('post-action-bleeding')

    const deathStart = snapshot({
      backpackItems: [item('disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 1,
      currentHealth: 1,
      bleeding: true,
      wounds: [{ id: 'wound', kind: 'laceration', treatment: 'untreated' }],
      remainingTime: 5,
    })
    const death = resolve(deathStart, backpackCommand('disinfectant'))
    expect(death.snapshot).toMatchObject({ status: 'dead', remainingTime: 0, condition: { pendingInfectionExposures: 0 } })
    expect(death.snapshot.backpack.items).toEqual([])
    expect(effectKinds(death.result.effects)).toEqual([
      'scene-medical-item-consumed',
      'scene-infection-exposure-reduced',
      'daily-medical-usage-changed',
      'scene-time-resolved',
      'health-lost',
      'scene-status-changed',
    ])
  })

  it('does not allow preventive or repeated painkiller/disinfectant use and exposes only legal commands', () => {
    expect(getAvailableSceneMedicalCommands(snapshot({
      backpackItems: [
        item('painkiller', HOSPITAL_ITEM_IDS.painkiller),
        item('disinfectant', HOSPITAL_ITEM_IDS.disinfectant),
      ],
    }), dependencies)).toEqual([])
    expect(getAvailableSceneMedicalCommands(snapshot({
      backpackItems: [item('disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 1,
      disinfectantUsesToday: 1,
    }), dependencies)).toEqual([])
    expect(getAvailableSceneMedicalCommands(snapshot({
      backpackItems: [item('painkiller', HOSPITAL_ITEM_IDS.painkiller)],
      minorContusions: 1,
      painkillerActive: true,
    }), dependencies)).toEqual([])
  })

  it('carries daily disinfectant usage through later movement and search without resetting it', () => {
    const disinfected = resolve(snapshot({
      backpackItems: [item('daily-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
      pendingInfectionExposures: 1,
    }), backpackCommand('daily-disinfectant')).snapshot
    expect(disinfected.dailyMedicalUsage).toEqual({ disinfectantUsesToday: 1 })

    const moved = resolveSceneMoveCommand(disinfected, {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
    }, dependencies).snapshot
    expect(moved.dailyMedicalUsage).toEqual({ disinfectantUsesToday: 1 })

    const searched = resolveMainSearchCommand(moved, {
      illumination: 'search-without-flashlight',
    }, searchDependencies).snapshot
    expect(searched.dailyMedicalUsage).toEqual({ disinfectantUsesToday: 1 })
    expect(getAvailableSceneMedicalCommands(
      createSceneExplorationSnapshot({
        ...searched,
        backpack: createBackpackSnapshot({
          ...searched.backpack,
          items: [item('second-disinfectant', HOSPITAL_ITEM_IDS.disinfectant)],
          placements: [{ instanceId: 'second-disinfectant', x: 0, y: 0, rotated: false }],
        }, hospitalItemCatalog),
        itemStates: {
          states: [createFullItemState(
            item('second-disinfectant', HOSPITAL_ITEM_IDS.disinfectant),
            hospitalItemResourceCatalog,
          )],
        },
        condition: createPlayerCondition({
          ...searched.condition,
          pendingInfectionExposures: 1,
        }, config.combat.player),
      }, dependencies),
      dependencies,
    )).toEqual([])
  })

  it('rejects tampered consumption, targets, effects, time, bleeding, and forced-return facts atomically', () => {
    const start = snapshot({
      backpackItems: [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
      currentHealth: 10,
      bleeding: true,
      wounds: [
        { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
        { id: 'wound-b', kind: 'puncture', treatment: 'untreated' },
      ],
      remainingTime: 5,
    })
    const effects = resolve(start, backpackCommand('bandage', { kind: 'open-wound', woundId: 'wound-a' })).result.effects
    const altered = [
      effects.slice(1),
      effects.map((effect) => effect.kind === 'scene-open-wound-treated' ? { ...effect, woundId: 'wound-b' } : effect),
      effects.map((effect) => effect.kind === 'scene-health-restored' ? { ...effect, requestedRecovery: 99 } : effect),
      effects.map((effect) => effect.kind === 'scene-time-resolved' ? { ...effect, actionTimeCost: 99 } : effect),
      effects.filter((effect) => effect.kind !== 'scene-bleeding-changed'),
      effects.map((effect) => effect.kind === 'scene-node-changed' ? { ...effect, toNodeId: HOSPITAL_NODE_IDS.securityOffice } : effect),
    ]
    for (const candidate of altered) {
      expect(() => applySceneExplorationEffects(start, candidate, dependencies)).toThrow()
    }
    expect(start.backpack.items).toEqual([item('bandage', HOSPITAL_ITEM_IDS.bandage)])
    expect(start.condition.openWounds.map(({ id }) => id)).toEqual(['wound-a', 'wound-b'])
  })

  it('rejects non-active exploration states without adding a second medical path', () => {
    const active = snapshot({
      backpackItems: [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
      currentHealth: 10,
    })
    const returned = createSceneExplorationSnapshot({
      ...active,
      status: 'forced-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 0,
    }, dependencies)
    expect(previewSceneMedicalCommand(returned, backpackCommand('bandage'), dependencies)).toEqual({
      canExecute: false,
      rejectionCode: 'SCENE_NOT_ACTIVE',
    })
    expect(previewSceneMedicalCommand(
      active,
      { source: { container: 'backpack', itemInstanceId: 'bandage' }, timeCost: 1 } as never,
      dependencies,
    )).toEqual({ canExecute: false, rejectionCode: 'INVALID_SCENE_MEDICAL_COMMAND' })
  })
})
