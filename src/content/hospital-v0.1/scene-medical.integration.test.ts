import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot } from '../../core/inventory'
import { createFullItemState, getItemState } from '../../core/item-state'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  getAvailableSceneMedicalCommands,
  previewSceneMedicalCommand,
  resolveSceneMedicalCommand,
  type SceneExplorationEffect,
  type SceneExplorationSnapshot,
  type UseSceneMedicalItemCommand,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneMedicalContentBindings,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  config,
  medicalBindings: hospitalSceneMedicalContentBindings,
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
}> = {}): SceneExplorationSnapshot {
  const backpackItems = input.backpackItems ?? []
  const quickItems = (input.quickSlots ?? [null, null]).map((definitionId, index) =>
    definitionId ? item(`quick-${index}`, definitionId) : null,
  )
  const carried = [...backpackItems, ...quickItems.filter((candidate): candidate is ReturnType<typeof item> => candidate !== null)]
  return createInitialSceneExplorationSnapshot({
    sceneInstanceId: 'hospital-scene-medical',
    searchState: createSceneSearchState({
      runSeed: 'hospital-scene-medical-seed',
      sceneInstanceId: 'hospital-scene-medical',
      graph: hospitalSliceV01SceneGraph,
      searchCatalog: hospitalMainSearchCatalog,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
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
    medicalUsage: { disinfectantUsesToday: input.disinfectantUsesToday ?? 0 },
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
    expect(disinfectant.snapshot.medicalUsage.disinfectantUsesToday).toBe(1)
    expect(effectKinds(disinfectant.result.effects)).toEqual([
      'scene-medical-item-consumed',
      'scene-infection-exposure-reduced',
      'scene-medical-usage-changed',
      'scene-time-resolved',
    ])

    const firstAid = resolve(snapshot({
      quickSlots: [HOSPITAL_ITEM_IDS.firstAidKit, null],
      currentHealth: 8,
      bleeding: true,
      wounds: [{ id: 'wound-b', kind: 'bite', treatment: 'untreated' }],
    }), quickSlotCommand(0, { kind: 'open-wound', woundId: 'wound-b' }))
    expect(firstAid.snapshot.condition).toMatchObject({ currentHealth: 12, bleeding: false, openWounds: [] })
    expect(firstAid.snapshot.quickSlots.slots[0]).toBeNull()
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
      'scene-medical-usage-changed',
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
      'scene-medical-usage-changed',
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
