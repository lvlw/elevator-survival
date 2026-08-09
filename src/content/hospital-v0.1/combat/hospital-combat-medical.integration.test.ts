import { describe, expect, it } from 'vitest'
import {
  applyCombatEffects,
  createCombatEncounterSnapshot,
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
  createFirstCombatEncounter,
  createPlayerVisibleCombatSnapshot,
  getAvailableCombatPlayerCommands,
  previewCombatPlayerAction,
  resolveCombatPlayerAction,
  validateCombatDependencies,
  type CombatDependencies,
  type CombatEncounterSnapshot,
  type CombatPlayerActionCommand,
} from '../../../core/combat'
import {
  createOpenWoundSnapshot,
  createPlayerCondition,
  type OpenWoundSnapshot,
} from '../../../core/condition'
import {
  createBackpackSnapshot,
  type ItemInstance,
} from '../../../core/inventory'
import {
  createFullItemState,
  createItemResourceCatalog,
  getItemState,
  type ItemResourceProfile,
} from '../../../core/item-state'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemResourceProfiles,
} from '../items'
import { hospitalSliceV01RuleConfig as config } from '../rule-config'
import {
  HOSPITAL_ENEMY_ACTION_IDS,
  HOSPITAL_ENEMY_IDS,
  hospitalCombatContentBindings,
  hospitalEnemyCatalog,
} from './hospital-infected-orderly'

const baseDependencies = {
  runSeed: 'medical-combat-seed',
  sceneInstanceId: 'hospital-combat-scene',
  config,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  enemyCatalog: hospitalEnemyCatalog,
  bindings: hospitalCombatContentBindings,
} satisfies CombatDependencies

type Setup = Readonly<{
  health?: number
  bleeding?: boolean
  openWounds?: readonly OpenWoundSnapshot[]
  minorContusions?: number
  painkillerActive?: boolean
  pendingInfectionExposures?: number
  quickSlots?: readonly (string | null)[]
  backpackDefinitions?: readonly string[]
  currentCtb?: number
  enemyNextActionCtb?: number
  runSeed?: string
}>

function createMedicalEncounter(setup: Setup = {}) {
  const pipe: ItemInstance = {
    instanceId: 'pipe-equipped',
    definitionId: HOSPITAL_ITEM_IDS.metalPipe,
    quantity: 1,
  }
  const quickItems = (setup.quickSlots ?? [null, null]).map(
    (definitionId, index): ItemInstance | null => definitionId
      ? { instanceId: `quick-${index}`, definitionId, quantity: 1 }
      : null,
  )
  const backpackItems = (setup.backpackDefinitions ?? []).map(
    (definitionId, index): ItemInstance => ({
      instanceId: `backpack-${index}`,
      definitionId,
      quantity: 1,
    }),
  )
  const carried = [
    pipe,
    ...quickItems.filter((item): item is ItemInstance => item !== null),
    ...backpackItems,
  ]
  const dependencies = {
    ...baseDependencies,
    runSeed: setup.runSeed ?? baseDependencies.runSeed,
  }
  const initial = createFirstCombatEncounter({
    playerCondition: createPlayerCondition({
      currentHealth: setup.health ?? config.combat.player.maxHealth,
      bleeding: setup.bleeding ?? false,
      openWounds: setup.openWounds ?? [],
      minorContusions: setup.minorContusions ?? 0,
      painkillerActive: setup.painkillerActive ?? false,
      pendingInfectionExposures: setup.pendingInfectionExposures ?? 0,
    }, config.combat.player),
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: backpackItems.map(({ instanceId }, index) => ({
        instanceId,
        x: index,
        y: 0,
        rotated: false,
      })),
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: null, utility: null },
    quickSlots: { slots: quickItems },
    itemStates: {
      states: carried.map((item) => createFullItemState(item, hospitalItemResourceCatalog)),
    },
    enemy: createEnemyPersistentCombatState({
      enemyInstanceId: 'orderly-1',
      definitionId: HOSPITAL_ENEMY_IDS.infectedOrderly,
      currentHealth: config.combat.infectedOrderly.maxHealth,
      currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
      nextCycleIndex: 1,
      resolvedActionCount: 0,
      hasBeenEncountered: false,
      defeated: false,
    }, hospitalEnemyCatalog.get(HOSPITAL_ENEMY_IDS.infectedOrderly)),
    usage: createExplorationCombatUsage({ metalPipeChargedStrikeUses: 0 }, config),
  }, 'unalerted', dependencies)

  const currentCtb = setup.currentCtb ?? initial.currentCtb
  return {
    dependencies,
    snapshot: createCombatEncounterSnapshot({
      ...initial,
      currentCtb,
      playerNextActionCtb: currentCtb,
      enemyNextActionCtb: setup.enemyNextActionCtb ?? initial.enemyNextActionCtb,
    }, dependencies),
  }
}

const wound = (
  id: string,
  kind: OpenWoundSnapshot['kind'] = 'laceration',
  treatment: OpenWoundSnapshot['treatment'] = 'untreated',
) => createOpenWoundSnapshot({ id, kind, treatment })

const useQuick = (
  quickSlotIndex: number,
  targetOpenWoundId?: string,
): CombatPlayerActionCommand => targetOpenWoundId
  ? { kind: 'use-quick-slot-item', quickSlotIndex, targetOpenWoundId }
  : { kind: 'use-quick-slot-item', quickSlotIndex }

describe('hospital combat medical content binding', () => {
  it('binds formal bandage and painkiller and locks the configured values', () => {
    expect(() => validateCombatDependencies(baseDependencies)).not.toThrow()
    expect(hospitalCombatContentBindings).toMatchObject({
      bandageDefinitionId: HOSPITAL_ITEM_IDS.bandage,
      painkillerDefinitionId: HOSPITAL_ITEM_IDS.painkiller,
    })
    expect(config.medical.bandage).toMatchObject({
      combatCtb: 80,
      healthRecovery: 1,
      stopsBleeding: true,
      treatsOpenWound: true,
    })
    expect(config.medical.painkiller).toMatchObject({
      combatCtb: 80,
      stopsBleeding: false,
      escapeWoundCtbReduction: 10,
      stacks: false,
    })
  })

  it.each([
    ['unknown bandage', { bandageDefinitionId: 'missing' }],
    ['unknown painkiller', { painkillerDefinitionId: 'missing' }],
    ['same binding', { painkillerDefinitionId: HOSPITAL_ITEM_IDS.bandage }],
    ['not quick-slot eligible', { bandageDefinitionId: HOSPITAL_ITEM_IDS.metalParts }],
  ])('rejects %s', (_label, change) => {
    expect(() => validateCombatDependencies({
      ...baseDependencies,
      bindings: { ...hospitalCombatContentBindings, ...change },
    })).toThrowError(expect.objectContaining({
      code: 'COMBAT_CONTENT_BINDING_MISMATCH',
    }))
  })

  it('rejects a medical binding whose formal resource profile is not none', () => {
    const profiles = hospitalItemResourceProfiles.map((profile) =>
      profile.definitionId === HOSPITAL_ITEM_IDS.bandage
        ? {
            definitionId: profile.definitionId,
            kind: 'durability' as const,
            maximum: 1,
          }
        : profile) satisfies readonly ItemResourceProfile[]
    const itemResourceCatalog = createItemResourceCatalog(
      profiles,
      hospitalItemCatalog.definitionIds,
    )
    expect(() => validateCombatDependencies({
      ...baseDependencies,
      itemResourceCatalog,
    })).toThrowError(expect.objectContaining({
      code: 'COMBAT_CONTENT_BINDING_MISMATCH',
    }))
  })
})

describe('hospital combat medical command eligibility', () => {
  it('returns one concrete bandage command per untreated wound and exposes wound IDs', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      openWounds: [wound('wound-b', 'bite'), wound('wound-a', 'puncture')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, HOSPITAL_ITEM_IDS.painkiller],
    })
    const commands = getAvailableCombatPlayerCommands(snapshot, dependencies)
    expect(commands.filter(({ kind }) => kind === 'use-quick-slot-item')).toEqual([
      useQuick(0, 'wound-a'),
      useQuick(0, 'wound-b'),
      useQuick(1),
    ])
    const visible = createPlayerVisibleCombatSnapshot(snapshot, {
      encounterId: 'encounter-visible',
      nodeId: 'node-visible',
      engagement: 'first-entry',
    }, dependencies)
    expect(visible.player.wounds).toEqual([
      { id: 'wound-a', kind: 'puncture', treatment: 'untreated' },
      { id: 'wound-b', kind: 'bite', treatment: 'untreated' },
    ])
    expect(visible.quickSlots[0]).toMatchObject({
      slotIndex: 0,
      empty: false,
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      canUseInCombat: true,
    })
    expect(visible.legalActions).toEqual(
      [...new Set(visible.legalCommands.map(({ kind }) => kind))].sort(),
    )
    expect(Object.isFrozen(visible.legalCommands)).toBe(true)
  })

  it('allows a targetless bandage only when no untreated wound exists', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 10,
      openWounds: [wound('treated', 'bite', 'treated')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
    })
    expect(getAvailableCombatPlayerCommands(snapshot, dependencies)).toContainEqual(useQuick(0))
    expect(() => resolveCombatPlayerAction(
      snapshot,
      useQuick(0, 'treated'),
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
  })

  it.each([
    ['healthy targetless bandage', { quickSlots: [HOSPITAL_ITEM_IDS.bandage, null] }, useQuick(0)],
    ['empty slot', { health: 10, quickSlots: [null, null] }, useQuick(0)],
    ['out of range', { health: 10, quickSlots: [HOSPITAL_ITEM_IDS.bandage, null] }, useQuick(2)],
    ['backpack bandage', { health: 10, backpackDefinitions: [HOSPITAL_ITEM_IDS.bandage] }, useQuick(0)],
    ['backpack painkiller', {
      minorContusions: 1,
      backpackDefinitions: [HOSPITAL_ITEM_IDS.painkiller],
    }, useQuick(0)],
    ['non-medical quick item', { health: 10, quickSlots: [HOSPITAL_ITEM_IDS.disinfectant, null] }, useQuick(0)],
    ['missing wound target', {
      openWounds: [wound('wound-a')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
    }, useQuick(0)],
    ['unknown wound target', {
      openWounds: [wound('wound-a')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
    }, useQuick(0, 'missing')],
    ['treated wound target', {
      health: 10,
      openWounds: [wound('treated', 'bite', 'treated')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
    }, useQuick(0, 'treated')],
    ['painkiller target field', {
      openWounds: [wound('wound-a')],
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
    }, useQuick(0, 'wound-a')],
  ] as const)('rejects unavailable state: %s', (_label, setup, command) => {
    const { snapshot, dependencies } = createMedicalEncounter(setup)
    const before = structuredClone(snapshot)
    expect(() => resolveCombatPlayerAction(snapshot, command, dependencies)).toThrowError(
      expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }),
    )
    expect(snapshot).toEqual(before)
  })

  it.each([
    HOSPITAL_ITEM_IDS.disinfectant,
    HOSPITAL_ITEM_IDS.firstAidKit,
    HOSPITAL_ITEM_IDS.infectionSuppressant,
    HOSPITAL_ITEM_IDS.ration,
    HOSPITAL_ITEM_IDS.standardBattery,
  ])('does not expose the quick-slot eligible noncombat item %s', (definitionId) => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 10,
      bleeding: true,
      minorContusions: 1,
      quickSlots: [definitionId, null],
    })
    expect(getAvailableCombatPlayerCommands(snapshot, dependencies)).not.toContainEqual(useQuick(0))
    expect(() => resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)).toThrowError(
      expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }),
    )
    expect(snapshot.quickSlots.slots[0]).not.toBeNull()
  })

  it('does not expose preventive painkiller use without a confirmed injury', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
    })
    expect(getAvailableCombatPlayerCommands(snapshot, dependencies)).not.toContainEqual(useQuick(0))
  })
})

describe('hospital combat bandage resolution', () => {
  it('atomically consumes the actual unit, heals, stops bleeding, and treats only the target', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 8,
      bleeding: true,
      openWounds: [wound('target'), wound('other', 'bite')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, HOSPITAL_ITEM_IDS.ration],
      backpackDefinitions: [HOSPITAL_ITEM_IDS.bandage],
      enemyNextActionCtb: 80,
      pendingInfectionExposures: 2,
      minorContusions: 1,
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0, 'target'), dependencies)
    expect(result.plan.effects.slice(0, 4).map(({ kind }) => kind)).toEqual([
      'combat-quick-slot-item-consumed',
      'player-health-restored',
      'bleeding-changed',
      'open-wound-treated',
    ])
    expect(result.snapshot.quickSlots.slots).toEqual([
      null,
      expect.objectContaining({ definitionId: HOSPITAL_ITEM_IDS.ration }),
    ])
    expect(() => getItemState(result.snapshot.itemStates, 'quick-0')).toThrow()
    expect(result.snapshot.backpack).toEqual(snapshot.backpack)
    expect(result.snapshot.equipment).toEqual(snapshot.equipment)
    expect(result.snapshot.playerCondition).toMatchObject({
      currentHealth: 9,
      bleeding: false,
      painkillerActive: false,
      pendingInfectionExposures: 2,
      minorContusions: 1,
    })
    expect(result.snapshot.playerCondition.openWounds).toEqual([
      wound('other', 'bite'),
      wound('target', 'laceration', 'treated'),
    ])
    expect(result.snapshot.currentCtb).toBe(80)
    expect(result.plan.effects.filter(({ kind }) =>
      kind === 'player-health-lost')).toHaveLength(0)
  })

  it('records zero actual recovery at maximum while preserving other effects', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      bleeding: true,
      openWounds: [wound('target')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      enemyNextActionCtb: 80,
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0, 'target'), dependencies)
    expect(result.plan.effects.find(({ kind }) => kind === 'player-health-restored')).toMatchObject({
      requestedRecovery: 1,
      actualRecovery: 0,
      unusedRecovery: 1,
    })
    expect(result.snapshot.playerCondition).toMatchObject({
      currentHealth: config.combat.player.maxHealth,
      bleeding: false,
    })
    expect(result.snapshot.playerCondition.openWounds[0].treatment).toBe('treated')
  })

  it('commits treatment at CTB 0, lets the enemy act at 70, and does not retroactively treat the new wound', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 10,
      bleeding: true,
      openWounds: [wound('old-wound')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      runSeed: 'risk-2',
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0, 'old-wound'), dependencies)
    expect(result.snapshot.currentCtb).toBe(80)
    expect(result.snapshot.enemy.resolvedActionCount).toBe(1)
    expect(result.snapshot.playerCondition.openWounds.find(({ id }) => id === 'old-wound')?.treatment)
      .toBe('treated')
    const newWounds = result.snapshot.playerCondition.openWounds.filter(({ id }) => id !== 'old-wound')
    expect(newWounds).toHaveLength(1)
    expect(newWounds[0].treatment).toBe('untreated')
  })

  it('keeps player priority when enemy and player are both due at CTB 80', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 10,
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      enemyNextActionCtb: 80,
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)
    expect(result.snapshot.currentCtb).toBe(80)
    expect(result.snapshot.enemy.resolvedActionCount).toBe(0)
    expect(result.snapshot.enemyNextActionCtb).toBe(80)
  })

  it('continues the CTB chain from a nonzero decision point', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 10,
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      currentCtb: 100,
      enemyNextActionCtb: 170,
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)
    expect(result.snapshot.currentCtb).toBe(180)
    expect(result.snapshot.enemy.resolvedActionCount).toBe(1)
  })
})

describe('hospital combat painkiller resolution', () => {
  it('consumes and activates painkiller without healing, stopping bleeding, or treating wounds', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 6,
      bleeding: true,
      openWounds: [wound('wound-a')],
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
      enemyNextActionCtb: 80,
      pendingInfectionExposures: 2,
      minorContusions: 1,
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)
    expect(result.plan.effects.slice(0, 3).map(({ kind }) => kind)).toEqual([
      'combat-quick-slot-item-consumed',
      'painkiller-changed',
      'player-health-lost',
    ])
    expect(result.snapshot.playerCondition).toMatchObject({
      currentHealth: 5,
      bleeding: true,
      painkillerActive: true,
      pendingInfectionExposures: 2,
      minorContusions: 1,
    })
    expect(result.snapshot.playerCondition.openWounds).toEqual([wound('wound-a')])
    expect(result.snapshot.quickSlots.slots[0]).toBeNull()
    expect(result.snapshot.currentCtb).toBe(80)
  })

  it('rejects stacking without consuming the second painkiller', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      minorContusions: 1,
      painkillerActive: true,
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
    })
    expect(() => resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)).toThrowError(
      expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }),
    )
    expect(snapshot.quickSlots.slots[0]).not.toBeNull()
    expect(getItemState(snapshot.itemStates, 'quick-0')).toBeDefined()
  })

  it('persists consumption and activation when post-action bleeding causes defeat', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 1,
      bleeding: true,
      minorContusions: 1,
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
    })
    const result = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)
    expect(result.snapshot.status).toBe('defeat')
    expect(result.snapshot.playerCondition).toMatchObject({
      currentHealth: 0,
      painkillerActive: true,
      bleeding: true,
    })
    expect(result.snapshot.quickSlots.slots[0]).toBeNull()
    expect(() => getItemState(result.snapshot.itemStates, 'quick-0')).toThrow()
    expect(result.snapshot.enemy.resolvedActionCount).toBe(0)
  })

  it('applies the active painkiller to a newly selected escape command', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      openWounds: [wound('wound-a'), wound('wound-b', 'bite')],
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
      enemyNextActionCtb: 1000,
    })
    const medicated = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies).snapshot
    const escaped = resolveCombatPlayerAction(medicated, { kind: 'escape' }, dependencies)
    expect(escaped.plan.effects.find(({ kind }) =>
      kind === 'combat-escape-preparation-locked')).toMatchObject({
        untreatedOpenWoundCount: 2,
        rawWoundCtb: 20,
        painkillerReductionApplied: 10,
        finalWoundCtb: 10,
      })
  })
})

describe('hospital combat medical effect integrity', () => {
  it.each([
    ['remove consumption', (effects: unknown[]) => { effects.splice(0, 1) }],
    ['change slot', (effects: any[]) => { effects[0].quickSlotIndex = 1 }],
    ['change instance', (effects: any[]) => { effects[0].instanceId = 'forged' }],
    ['change definition', (effects: any[]) => { effects[0].definitionId = HOSPITAL_ITEM_IDS.painkiller }],
    ['change recovery', (effects: any[]) => { effects[1].requestedRecovery = 2 }],
    ['change actual recovery', (effects: any[]) => { effects[1].actualRecovery = 2 }],
    ['remove bleeding stop', (effects: any[]) => { effects.splice(2, 1) }],
    ['remove treatment', (effects: any[]) => { effects.splice(3, 1) }],
    ['change CTB', (effects: any[]) => {
      const effect = effects.find(({ kind }: { kind: string }) => kind === 'combat-ctb-position-changed')
      effect.playerNextActionCtbAfter += 1
    }],
    ['add automatic refill', (effects: any[]) => {
      effects.push({ kind: 'automatic-quick-slot-refill', quickSlotIndex: 0 })
    }],
    ['reorder effects', (effects: any[]) => { [effects[0], effects[1]] = [effects[1], effects[0]] }],
  ])('rejects tampering: %s', (_label, mutate) => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 8,
      bleeding: true,
      openWounds: [wound('target')],
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      enemyNextActionCtb: 80,
    })
    const command = useQuick(0, 'target')
    const preview = previewCombatPlayerAction(snapshot, command, dependencies)
    expect(preview.canExecute).toBe(true)
    if (!preview.canExecute) throw new Error('expected executable preview')
    const forged = structuredClone(preview.plan.effects) as unknown[]
    mutate(forged)
    const before = structuredClone(snapshot)
    expect(() => applyCombatEffects(
      snapshot,
      command,
      forged as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_EFFECTS' }))
    expect(snapshot).toEqual(before)
  })

  it.each([
    ['remove activation', (effects: any[]) => { effects.splice(1, 1) }],
    ['add bleeding stop', (effects: any[]) => {
      effects.splice(2, 0, {
        kind: 'bleeding-changed',
        before: true,
        after: false,
        source: 'combat-painkiller',
      })
    }],
    ['remove post-action bleeding', (effects: any[]) => { effects.splice(2, 1) }],
    ['change painkiller CTB', (effects: any[]) => {
      const effect = effects.find(({ kind }: { kind: string }) => kind === 'combat-ctb-position-changed')
      effect.playerNextActionCtbAfter += 1
    }],
  ])('rejects painkiller effect tampering: %s', (_label, mutate) => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 5,
      bleeding: true,
      minorContusions: 1,
      quickSlots: [HOSPITAL_ITEM_IDS.painkiller, null],
      enemyNextActionCtb: 80,
    })
    const command = useQuick(0)
    const preview = previewCombatPlayerAction(snapshot, command, dependencies)
    if (!preview.canExecute) throw new Error('expected executable preview')
    const forged = structuredClone(preview.plan.effects) as unknown[]
    mutate(forged)
    expect(() => applyCombatEffects(
      snapshot,
      command,
      forged as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_EFFECTS' }))
  })

  it('deep-freezes a deterministic plan and final snapshot', () => {
    const { snapshot, dependencies } = createMedicalEncounter({
      health: 10,
      quickSlots: [HOSPITAL_ITEM_IDS.bandage, null],
      enemyNextActionCtb: 80,
    })
    const first = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)
    const second = resolveCombatPlayerAction(snapshot, useQuick(0), dependencies)
    expect(second).toEqual(first)
    expect(Object.isFrozen(first.plan)).toBe(true)
    expect(Object.isFrozen(first.plan.effects)).toBe(true)
    expect(Object.isFrozen(first.snapshot)).toBe(true)
  })
})
