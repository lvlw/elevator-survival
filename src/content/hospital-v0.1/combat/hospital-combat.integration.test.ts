import { describe, expect, it } from 'vitest'
import {
  applyCombatEffects,
  CombatError,
  createCombatEncounterSnapshot,
  createEnemyDefinitionCatalog,
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
  createFirstCombatEncounter,
  createReentryCombatEncounter,
  getAvailableCombatPlayerActions,
  previewCombatPlayerAction,
  resolveCombatPlayerAction,
  selectEnemyHealthPhase,
  validateCombatDependencies,
  type CombatDependencies,
  type CombatEncounterSnapshot,
  type EnemyPersistentCombatState,
} from '../../../core/combat'
import { createPlayerCondition } from '../../../core/condition'
import { calculateEscapeWoundCtbModifier } from '../../../core/condition'
import { createBackpackSnapshot, type ItemInstance } from '../../../core/inventory'
import { createFullItemState, createItemState, getItemState } from '../../../core/item-state'
import {
  HOSPITAL_ENEMY_ACTION_IDS,
  HOSPITAL_ENEMY_IDS,
  hospitalCombatContentBindings,
  hospitalEnemyCatalog,
  hospitalInfectedOrderlyDefinition,
} from './hospital-infected-orderly'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
} from '../items'
import { hospitalSliceV01RuleConfig as config } from '../rule-config'

const baseDependencies = {
  sceneInstanceId: 'hospital-combat-scene',
  config,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  enemyCatalog: hospitalEnemyCatalog,
  bindings: hospitalCombatContentBindings,
}

function persistent(changes: Partial<EnemyPersistentCombatState> = {}) {
  return createEnemyPersistentCombatState({
    enemyInstanceId: 'orderly-1',
    definitionId: HOSPITAL_ENEMY_IDS.infectedOrderly,
    currentHealth: 14,
    currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
    nextCycleIndex: 1,
    resolvedActionCount: 0,
    hasBeenEncountered: false,
    defeated: false,
    ...changes,
  }, hospitalEnemyCatalog.get(HOSPITAL_ENEMY_IDS.infectedOrderly))
}

type Setup = Readonly<{
  runSeed?: string
  alertState?: 'unalerted' | 'alerted'
  pipeDurability?: number | null
  coatIntegrity?: number | null
  health?: number
  bleeding?: boolean
  enemy?: EnemyPersistentCombatState
  backpackSparePipe?: boolean
  pendingExposures?: number
}>

function encounter(setup: Setup = {}) {
  const pipe = setup.pipeDurability === null ? null : {
    instanceId: 'pipe-equipped', definitionId: HOSPITAL_ITEM_IDS.metalPipe, quantity: 1,
  }
  const coat = setup.coatIntegrity === null ? null : {
    instanceId: 'coat-equipped', definitionId: HOSPITAL_ITEM_IDS.heavyCoat, quantity: 1,
  }
  const backpackItems: ItemInstance[] = setup.backpackSparePipe
    ? [{ instanceId: 'pipe-spare', definitionId: HOSPITAL_ITEM_IDS.metalPipe, quantity: 1 }]
    : []
  const carried = [...backpackItems, ...(pipe ? [pipe] : []), ...(coat ? [coat] : [])]
  const dependencies = { ...baseDependencies, runSeed: setup.runSeed ?? 'combat-seed-0' }
  const input = {
    playerCondition: createPlayerCondition({
      currentHealth: setup.health ?? 12,
      bleeding: setup.bleeding ?? false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: setup.pendingExposures ?? 0,
    }, config.combat.player),
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: backpackItems.map(({ instanceId }) => ({ instanceId, x: 0, y: 0, rotated: false })),
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: coat, utility: null },
    quickSlots: { slots: [null, null] },
    itemStates: { states: carried.map((item) => {
      if (item.instanceId === 'pipe-equipped') return createItemState({ ...item, resource: { kind: 'durability', current: setup.pipeDurability ?? 6 } }, hospitalItemResourceCatalog)
      if (item.instanceId === 'coat-equipped') return createItemState({ ...item, resource: { kind: 'integrity', current: setup.coatIntegrity ?? 4 } }, hospitalItemResourceCatalog)
      return createFullItemState(item, hospitalItemResourceCatalog)
    }) },
    enemy: setup.enemy ?? persistent(),
    usage: createExplorationCombatUsage({ metalPipeChargedStrikeUses: 0 }, config),
  }
  return {
    snapshot: createFirstCombatEncounter(input, setup.alertState ?? 'unalerted', dependencies),
    dependencies,
  }
}

function act(
  state: CombatEncounterSnapshot,
  kind: Parameters<typeof resolveCombatPlayerAction>[1]['kind'],
  dependencies: ReturnType<typeof encounter>['dependencies'],
) {
  return resolveCombatPlayerAction(state, { kind }, dependencies)
}

describe('hospital infected orderly combat', () => {
  it.each([
    ['risk-2', true, true],
    ['risk-1', true, false],
    ['risk-6', false, true],
    ['risk-3', false, false],
  ])('locks bite risks for seed %s: injury=%s exposure=%s', (runSeed, injurySucceeded, exposureSucceeded) => {
    const { snapshot, dependencies } = encounter({ runSeed, coatIntegrity: null })
    const afterScratch = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    const bite = act(afterScratch, 'metal-pipe-basic-attack', dependencies)
    const traces = bite.plan.effects.filter(
      (effect): effect is Extract<typeof effect, { kind: 'combat-risk-resolved' }> =>
        effect.kind === 'combat-risk-resolved',
    )
    expect(traces.map((effect) => [effect.purpose, effect.succeeded])).toEqual([
      ['injury', injurySucceeded],
      ['infection-exposure', exposureSucceeded],
    ])
    expect(bite.snapshot.playerCondition.openWounds.some(({ kind }) => kind === 'bite')).toBe(injurySucceeded)
    expect(bite.snapshot.playerCondition.pendingInfectionExposures).toBe(exposureSucceeded ? 1 : 0)
  })

  it.each([
    ['risk-2', true, 51],
    ['risk-0', false, 94],
  ])('locks scratch injury for seed %s', (runSeed, succeeded, roll) => {
    const { snapshot, dependencies } = encounter({ runSeed, coatIntegrity: null })
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies)
    const trace = result.plan.effects.find(({ kind }) => kind === 'combat-risk-resolved')!
    expect(trace).toMatchObject({ purpose: 'injury', roll, riskPercent: 60, succeeded })
    expect(result.snapshot.playerCondition.openWounds.some(({ kind }) => kind === 'laceration')).toBe(succeeded)
  })

  it('applies coat before defense and never reduces exposure with defense', () => {
    const { snapshot, dependencies } = encounter({ runSeed: 'risk-2' })
    const afterScratch = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    const bite = act(afterScratch, 'defend', dependencies)
    const damage = bite.plan.effects.find(({ kind }) => kind === 'player-health-lost')!
    const traces = bite.plan.effects.filter(
      (effect): effect is Extract<typeof effect, { kind: 'combat-risk-resolved' }> =>
        effect.kind === 'combat-risk-resolved',
    )
    expect(damage).toMatchObject({ requestedLoss: 3 })
    expect(traces.map((effect) => [effect.purpose, effect.finalTier, effect.riskPercent])).toEqual([
      ['injury', 'low', 20],
      ['infection-exposure', 'medium', 40],
    ])
    expect(bite.plan.effects.filter(({ kind }) => kind === 'temporary-defense-consumed')).toHaveLength(1)
  })

  it('keeps typed wound identities distinct and escape CTB derived', () => {
    const { snapshot, dependencies } = encounter({ runSeed: 'risk-2', coatIntegrity: null })
    const afterScratch = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    const afterBite = act(afterScratch, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(afterBite.playerCondition.openWounds.map(({ kind }) => kind)).toEqual(['laceration', 'bite'])
    expect(new Set(afterBite.playerCondition.openWounds.map(({ id }) => id)).size).toBe(2)
    expect(calculateEscapeWoundCtbModifier(afterBite.playerCondition, {
      escape: config.combat.escape,
      painkiller: config.medical.painkiller,
    }).finalWoundCtb).toBe(20)
  })

  it('accumulates pending exposure without creating infection progress', () => {
    const { snapshot, dependencies } = encounter({
      runSeed: 'risk-2', coatIntegrity: null, pendingExposures: 1,
    })
    const afterScratch = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    const afterBite = act(afterScratch, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(afterBite.playerCondition.pendingInfectionExposures).toBe(2)
    expect(afterBite.playerCondition).not.toHaveProperty('infectionProgress')
  })
  it('exports the stable enemy, two actions, weakness, and fixed cycle', () => {
    const enemy = hospitalEnemyCatalog.get(HOSPITAL_ENEMY_IDS.infectedOrderly)
    expect(hospitalEnemyCatalog.definitionIds).toEqual([HOSPITAL_ENEMY_IDS.infectedOrderly])
    expect(enemy.actions.map(({ id }) => id)).toEqual([
      HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
      HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite,
    ])
    expect(enemy.actionCycle).toEqual(enemy.actions.map(({ id }) => id))
    expect(enemy.weaknessTags).toContain('blunt-control')
    expect(Object.isFrozen(enemy.actions)).toBe(true)
  })

  it.each([
    [14, 'healthy'], [11, 'healthy'], [10, 'wounded'], [7, 'wounded'],
    [6, 'severely-wounded'], [3, 'severely-wounded'], [2, 'critical'], [1, 'critical'], [0, 'incapacitated'],
  ])('selects health phase at %s', (health, phase) => {
    expect(selectEnemyHealthPhase(health, 14)).toBe(phase)
  })

  it('creates unaware, alerted, and reentry CTB snapshots', () => {
    expect(encounter().snapshot.enemyNextActionCtb).toBe(70)
    expect(encounter({ alertState: 'alerted' }).snapshot.enemyNextActionCtb).toBe(50)
    const first = encounter().snapshot
    const persistentAfter = { ...first.enemy, currentHealth: 9, currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite, nextCycleIndex: 0, resolvedActionCount: 1 }
    const reentry = createReentryCombatEncounter({
      playerCondition: first.playerCondition,
      backpack: first.backpack,
      equipment: first.equipment,
      quickSlots: first.quickSlots,
      itemStates: first.itemStates,
      enemy: persistentAfter,
      usage: { metalPipeChargedStrikeUses: 1 },
    }, encounter().dependencies)
    expect(reentry).toMatchObject({ currentCtb: 0, playerNextActionCtb: 0, enemyNextActionCtb: 50 })
    expect(reentry.enemy).toMatchObject({ currentHealth: 9, currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite, nextCycleIndex: 0, resolvedActionCount: 1 })
    expect(reentry.usage.metalPipeChargedStrikeUses).toBe(1)
  })

  it('runs the unaware four-basic timeline at CTB 300', () => {
    const { snapshot, dependencies } = encounter()
    let current = snapshot
    for (let index = 0; index < 4; index += 1) current = act(current, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(current).toMatchObject({ status: 'victory', currentCtb: 300 })
    expect(current.enemy).toMatchObject({ currentHealth: 0, resolvedActionCount: 2 })
    expect(getItemState(current.itemStates, 'pipe-equipped').resource).toEqual({ kind: 'durability', current: 2 })
  })

  it('runs the alerted four-basic timeline with the CTB 290 third scratch', () => {
    const { snapshot, dependencies } = encounter({ alertState: 'alerted' })
    let current = snapshot
    for (let index = 0; index < 4; index += 1) current = act(current, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(current.status).toBe('victory')
    expect(current.currentCtb).toBe(300)
    expect(current.enemy.resolvedActionCount).toBe(3)
  })

  it.each(['unalerted', 'alerted'] as const)('runs basic-charged-basic at CTB 280 when %s', (alertState) => {
    const { snapshot, dependencies } = encounter({ alertState })
    const first = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    const charged = act(first, 'metal-pipe-charged-strike', dependencies).snapshot
    const result = act(charged, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(result).toMatchObject({ status: 'victory', currentCtb: 280 })
    expect(result.enemy.resolvedActionCount).toBe(1)
    expect(result.usage.metalPipeChargedStrikeUses).toBe(1)
    expect(getItemState(result.itemStates, 'pipe-equipped').resource).toEqual({ kind: 'durability', current: 1 })
  })

  it('runs the formal defense route at CTB 380 and consumes defense once', () => {
    const { snapshot, dependencies } = encounter()
    let current = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    const defended = act(current, 'defend', dependencies)
    expect(defended.plan.effects.filter(({ kind }) => kind === 'temporary-defense-consumed')).toHaveLength(1)
    current = defended.snapshot
    current = act(current, 'metal-pipe-basic-attack', dependencies).snapshot
    current = act(current, 'metal-pipe-basic-attack', dependencies).snapshot
    current = act(current, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(current).toMatchObject({ status: 'victory', currentCtb: 380 })
  })

  it.each([1, 2])('allows charged strike with durability %s and truncates to zero', (durability) => {
    const { snapshot, dependencies } = encounter({ pipeDurability: durability })
    const result = act(snapshot, 'metal-pipe-charged-strike', dependencies).snapshot
    expect(result.enemy.currentHealth).toBe(8)
    expect(getItemState(result.itemStates, 'pipe-equipped').resource).toEqual({ kind: 'durability', current: 0 })
    expect(getAvailableCombatPlayerActions(result, dependencies)).toContain('temporary-attack')
  })

  it('allows the final basic attack at durability one and then opens temporary attack', () => {
    const { snapshot, dependencies } = encounter({ pipeDurability: 1 })
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(getItemState(result.itemStates, 'pipe-equipped').resource).toEqual({ kind: 'durability', current: 0 })
    expect(getAvailableCombatPlayerActions(result, dependencies)).toContain('temporary-attack')
    expect(getAvailableCombatPlayerActions(result, dependencies)).not.toContain('metal-pipe-basic-attack')
  })

  it('opens temporary attack from weapon slot only and ignores a backpack spare', () => {
    const { snapshot, dependencies } = encounter({ pipeDurability: 0, backpackSparePipe: true })
    expect(getAvailableCombatPlayerActions(snapshot, dependencies)).toContain('temporary-attack')
    const beforeSpare = getItemState(snapshot.itemStates, 'pipe-spare')
    const result = act(snapshot, 'temporary-attack', dependencies).snapshot
    expect(getItemState(result.itemStates, 'pipe-spare')).toEqual(beforeSpare)
  })

  it('enforces last-hit bleeding death before victory', () => {
    const { snapshot, dependencies } = encounter({ health: 1, bleeding: true })
    const prepared = createCombatEncounterSnapshot({
      ...snapshot,
      enemy: { ...snapshot.enemy, currentHealth: 4 },
    }, dependencies)
    const result = act(prepared, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(result.enemy.currentHealth).toBe(0)
    expect(result.playerCondition.currentHealth).toBe(0)
    expect(result.status).toBe('defeat')
  })

  it('does not resolve risks or advance intent after direct enemy damage kills', () => {
    const { snapshot, dependencies } = encounter({ health: 1, coatIntegrity: null })
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies)
    expect(result.snapshot.status).toBe('defeat')
    expect(result.snapshot.currentCtb).toBe(70)
    expect(result.plan.effects.some(({ kind }) => kind === 'combat-risk-resolved')).toBe(false)
    expect(result.plan.effects.some(({ kind }) => kind === 'enemy-intent-changed')).toBe(false)
    expect(result.plan.effects.find((effect) =>
      effect.kind === 'combat-ctb-position-changed' &&
      effect.reason === 'enemy-action-terminal')).toMatchObject({
      reason: 'enemy-action-terminal',
      currentCtbBefore: 0,
      currentCtbAfter: 70,
    })
  })

  it('gives the player priority when next CTB ties the enemy', () => {
    const { snapshot, dependencies } = encounter()
    const tied = { ...snapshot, enemyNextActionCtb: 100 }
    const result = act(tied, 'metal-pipe-basic-attack', dependencies).snapshot
    expect(result.currentCtb).toBe(100)
    expect(result.enemy.resolvedActionCount).toBe(0)
  })

  it('expires unused defense at the next player decision point', () => {
    const { snapshot, dependencies } = encounter()
    const quiet = { ...snapshot, enemyNextActionCtb: 100 }
    const result = act(quiet, 'defend', dependencies)
    expect(result.snapshot.temporaryDefense).toBeNull()
    expect(result.plan.effects.some(({ kind }) => kind === 'temporary-defense-expired')).toBe(true)
  })

  it('replays formal Effects and atomically rejects tampering', () => {
    const { snapshot, dependencies } = encounter()
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies)
    expect(applyCombatEffects(snapshot, result.plan.command, result.plan.effects, dependencies)).toEqual(result.snapshot)
    const tampered = structuredClone(result.plan.effects)
    const damage = tampered.find((effect) => effect.kind === 'enemy-health-lost') as Record<string, unknown>
    damage.requestedLoss = 99
    expect(() => applyCombatEffects(snapshot, result.plan.command, tampered, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_EFFECTS' }),
    )
    expect(snapshot.enemy.currentHealth).toBe(14)
  })

  it.each([
    ['coat consumption', (effects: Record<string, unknown>[]) => effects.splice(effects.findIndex(({ kind, source }) => kind === 'item-resource-consumed' && source === 'enemy-direct-attack-protection'), 1)],
    ['risk trace', (effects: Record<string, unknown>[]) => { const effect = effects.find(({ kind }) => kind === 'combat-risk-resolved')!; effect.roll = 1 }],
    ['successful wound', (effects: Record<string, unknown>[]) => effects.splice(effects.findIndex(({ kind }) => kind === 'open-wound-added'), 1)],
    ['intent advance', (effects: Record<string, unknown>[]) => effects.splice(effects.findIndex(({ kind }) => kind === 'enemy-intent-changed'), 1)],
    ['formal CTB', (effects: Record<string, unknown>[]) => { const effect = effects.find(({ kind, reason }) => kind === 'combat-ctb-position-changed' && reason === 'player-action-scheduled')!; effect.playerNextActionCtbAfter = 999 }],
  ])('rejects tampered %s', (_label, mutate) => {
    const { snapshot, dependencies } = encounter({ runSeed: 'risk-2' })
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies)
    const effects = structuredClone(result.plan.effects) as unknown as Record<string, unknown>[]
    mutate(effects)
    expect(() => applyCombatEffects(snapshot, result.plan.command, effects as never, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_EFFECTS' }),
    )
    expect(snapshot.enemy.currentHealth).toBe(14)
  })

  it('rejects a forged wound after a failed risk check', () => {
    const { snapshot, dependencies } = encounter({ runSeed: 'risk-0', coatIntegrity: null })
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies)
    const effects = structuredClone(result.plan.effects) as unknown as Record<string, unknown>[]
    effects.splice(effects.findIndex(({ kind }) => kind === 'combat-risk-resolved') + 1, 0, {
      kind: 'open-wound-added',
      wound: { id: 'forged', kind: 'laceration', treatment: 'untreated' },
    })
    expect(() => applyCombatEffects(snapshot, result.plan.command, effects as never, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_EFFECTS' }),
    )
  })

  it('previews deterministically without changing wound identity', () => {
    const { snapshot, dependencies } = encounter({ runSeed: 'risk-2', coatIntegrity: null })
    const first = previewCombatPlayerAction(snapshot, { kind: 'metal-pipe-basic-attack' }, dependencies)
    const second = previewCombatPlayerAction(snapshot, { kind: 'metal-pipe-basic-attack' }, dependencies)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    if (!first.canExecute || !second.canExecute) throw new Error('固定种子预览必须成功')
    expect(first.snapshot.playerCondition.openWounds[0].id).toBe(second.snapshot.playerCondition.openWounds[0].id)
  })

  it('rejects actions after terminal combat', () => {
    const { snapshot, dependencies } = encounter()
    const terminal = { ...snapshot, status: 'victory' as const, enemy: { ...snapshot.enemy, currentHealth: 0, defeated: true } }
    expect(() => act(terminal, 'defend', dependencies)).toThrow(CombatError)
  })

  it('validates the formal hospital combat bindings against versioned content', () => {
    const { dependencies } = encounter()
    expect(() => validateCombatDependencies(dependencies)).not.toThrow()
    expect(dependencies.enemyCatalog.get(
      dependencies.bindings.enemyDefinitionId,
    ).id).toBe(HOSPITAL_ENEMY_IDS.infectedOrderly)
    expect(dependencies.itemResourceCatalog.get(
      dependencies.bindings.metalPipeDefinitionId,
    )).toEqual({
      definitionId: HOSPITAL_ITEM_IDS.metalPipe,
      kind: 'durability',
      maximum: config.combat.metalPipe.maxDurability,
    })
    expect(dependencies.itemResourceCatalog.get(
      dependencies.bindings.heavyCoatDefinitionId,
    )).toEqual({
      definitionId: HOSPITAL_ITEM_IDS.heavyCoat,
      kind: 'integrity',
      maximum: config.maintenance.itemResourceMaximums.heavyCoatIntegrity,
    })
  })

  it('routes every public combat entry through the shared dependency boundary', () => {
    const { snapshot, dependencies } = encounter()
    const invalid = { ...dependencies, runSeed: '' }
    const common = {
      playerCondition: snapshot.playerCondition,
      backpack: snapshot.backpack,
      equipment: snapshot.equipment,
      quickSlots: snapshot.quickSlots,
      itemStates: snapshot.itemStates,
      usage: snapshot.usage,
    }
    const calls = [
      () => createCombatEncounterSnapshot(snapshot, invalid),
      () => createFirstCombatEncounter({
        ...common,
        enemy: { ...snapshot.enemy, hasBeenEncountered: false },
      }, 'unalerted', invalid),
      () => createReentryCombatEncounter({
        ...common,
        enemy: snapshot.enemy,
      }, invalid),
      () => getAvailableCombatPlayerActions(snapshot, invalid),
      () => resolveCombatPlayerAction(snapshot, { kind: 'defend' }, invalid),
      () => applyCombatEffects(snapshot, { kind: 'defend' }, [], invalid),
    ]
    for (const call of calls) {
      expect(call).toThrowError(expect.objectContaining({
        code: 'INVALID_COMBAT_DEPENDENCIES',
      }))
    }
    expect(previewCombatPlayerAction(snapshot, { kind: 'defend' }, invalid))
      .toEqual({
        canExecute: false,
        errorCode: 'INVALID_COMBAT_DEPENDENCIES',
      })
  })

  it.each([
    ['empty run seed', (dependencies: CombatDependencies) => ({
      ...dependencies,
      runSeed: '',
    })],
    ['empty scene instance', (dependencies: CombatDependencies) => ({
      ...dependencies,
      sceneInstanceId: '',
    })],
    ['extra binding field', (dependencies: CombatDependencies) => ({
      ...dependencies,
      bindings: { ...dependencies.bindings, extra: true },
    })],
  ])('rejects invalid dependencies: %s', (_label, change) => {
    const { dependencies } = encounter()
    expect(() => validateCombatDependencies(change(dependencies) as never))
      .toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_DEPENDENCIES' }))
  })

  it('rejects unknown and semantically invalid content bindings', () => {
    const { dependencies } = encounter()
    const unknownEnemy = {
      ...dependencies,
      bindings: { ...dependencies.bindings, enemyDefinitionId: 'missing-enemy' },
    }
    expect(() => validateCombatDependencies(unknownEnemy)).toThrowError(
      expect.objectContaining({ code: 'COMBAT_CONTENT_BINDING_MISMATCH' }),
    )

    const nonWeaponPipe = {
      ...dependencies,
      bindings: {
        ...dependencies.bindings,
        metalPipeDefinitionId: HOSPITAL_ITEM_IDS.heavyCoat,
      },
    }
    expect(() => validateCombatDependencies(nonWeaponPipe)).toThrowError(
      expect.objectContaining({ code: 'COMBAT_CONTENT_BINDING_MISMATCH' }),
    )

    const nonArmorCoat = {
      ...dependencies,
      bindings: {
        ...dependencies.bindings,
        heavyCoatDefinitionId: HOSPITAL_ITEM_IDS.metalPipe,
      },
    }
    expect(() => validateCombatDependencies(nonArmorCoat)).toThrowError(
      expect.objectContaining({ code: 'COMBAT_CONTENT_BINDING_MISMATCH' }),
    )
  })

  it.each([
    ['pipe resource kind', HOSPITAL_ITEM_IDS.metalPipe, {
      definitionId: HOSPITAL_ITEM_IDS.metalPipe,
      kind: 'integrity',
      maximum: config.combat.metalPipe.maxDurability,
    }],
    ['pipe maximum', HOSPITAL_ITEM_IDS.metalPipe, {
      definitionId: HOSPITAL_ITEM_IDS.metalPipe,
      kind: 'durability',
      maximum: config.combat.metalPipe.maxDurability - 1,
    }],
    ['coat resource kind', HOSPITAL_ITEM_IDS.heavyCoat, {
      definitionId: HOSPITAL_ITEM_IDS.heavyCoat,
      kind: 'durability',
      maximum: config.maintenance.itemResourceMaximums.heavyCoatIntegrity,
    }],
  ])('rejects mismatched %s', (_label, definitionId, replacement) => {
    const { dependencies } = encounter()
    const original = dependencies.itemResourceCatalog
    const changed = {
      ...dependencies,
      itemResourceCatalog: {
        ...original,
        get: (id: string) => id === definitionId ? replacement : original.get(id),
      },
    } as CombatDependencies
    expect(() => validateCombatDependencies(changed)).toThrowError(
      expect.objectContaining({ code: 'COMBAT_CONTENT_BINDING_MISMATCH' }),
    )
  })

  it('rejects enemy configuration mismatch and snapshot binding mismatch', () => {
    const { snapshot, dependencies } = encounter()
    const mismatchedConfig = {
      ...dependencies,
      config: {
        ...config,
        combat: {
          ...config.combat,
          infectedOrderly: {
            ...config.combat.infectedOrderly,
            maxHealth: 13,
          },
        },
      },
    } as CombatDependencies
    expect(() => validateCombatDependencies(mismatchedConfig)).toThrowError(
      expect.objectContaining({ code: 'COMBAT_CONTENT_BINDING_MISMATCH' }),
    )

    const alternateDefinition = {
      ...hospitalInfectedOrderlyDefinition,
      id: 'enemy_other_orderly',
      tags: [...hospitalInfectedOrderlyDefinition.tags],
      weaknessTags: [...hospitalInfectedOrderlyDefinition.weaknessTags],
      actions: hospitalInfectedOrderlyDefinition.actions.map((action) => ({ ...action })),
      actionCycle: [...hospitalInfectedOrderlyDefinition.actionCycle],
    }
    const alternateDependencies = {
      ...dependencies,
      enemyCatalog: createEnemyDefinitionCatalog([
        hospitalInfectedOrderlyDefinition,
        alternateDefinition,
      ]),
      bindings: {
        ...dependencies.bindings,
        enemyDefinitionId: alternateDefinition.id,
      },
    }
    expect(() => createCombatEncounterSnapshot(snapshot, alternateDependencies))
      .toThrowError(expect.objectContaining({
        code: 'COMBAT_CONTENT_BINDING_MISMATCH',
      }))
  })

  it('strictly validates snapshot fields, statuses, and death priority', () => {
    const { snapshot, dependencies } = encounter()
    const deadPlayer = { ...snapshot.playerCondition, currentHealth: 0 }
    const deadEnemy = { ...snapshot.enemy, currentHealth: 0, defeated: true }

    expect(() => createCombatEncounterSnapshot({
      ...snapshot,
      status: 'victory',
      playerCondition: deadPlayer,
      enemy: deadEnemy,
    }, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
    expect(createCombatEncounterSnapshot({
      ...snapshot,
      status: 'defeat',
      playerCondition: deadPlayer,
      enemy: deadEnemy,
    }, dependencies).status).toBe('defeat')
    expect(createCombatEncounterSnapshot({
      ...snapshot,
      status: 'victory',
      enemy: deadEnemy,
    }, dependencies).status).toBe('victory')
    expect(createCombatEncounterSnapshot({
      ...snapshot,
      status: 'defeat',
      playerCondition: deadPlayer,
    }, dependencies).status).toBe('defeat')
    expect(() => createCombatEncounterSnapshot({
      ...snapshot,
      status: 'victory',
    }, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
    expect(() => createCombatEncounterSnapshot({
      ...snapshot,
      status: 'unknown',
    } as never, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
    expect(() => createCombatEncounterSnapshot({
      ...snapshot,
      extra: true,
    } as never, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
  })

  it.each([
    [7, 4, 2],
    [6, 5, 2],
    [100, 100, 2],
    [6, 4, 1],
    [6, 4, 3],
  ])('rejects combat container boundary %sx%s with %s quick slots', (
    width,
    height,
    quickSlotCount,
  ) => {
    const { snapshot, dependencies } = encounter()
    expect(() => createCombatEncounterSnapshot({
      ...snapshot,
      backpack: { ...snapshot.backpack, width, height },
      quickSlots: {
        slots: Array.from({ length: quickSlotCount }, () => null),
      },
    }, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
  })

  it('rejects restored temporary defense and clears defense on bleeding death', () => {
    const { snapshot, dependencies } = encounter()
    expect(() => createCombatEncounterSnapshot({
      ...snapshot,
      temporaryDefense: {
        activatedAtCtb: 0,
        expiresAtPlayerActionCtb: 80,
        availableDirectAttackUses: 1,
      },
    }, dependencies)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )

    const dying = encounter({ health: 1, bleeding: true })
    const result = act(dying.snapshot, 'defend', dying.dependencies)
    expect(result.snapshot.status).toBe('defeat')
    expect(result.snapshot.temporaryDefense).toBeNull()
    expect(result.plan.effects.map(({ kind }) => kind)).toEqual([
      'temporary-defense-activated',
      'player-health-lost',
      'temporary-defense-expired',
      'combat-status-changed',
    ])
  })

  it('distinguishes malformed commands from unavailable legal actions', () => {
    const { snapshot, dependencies } = encounter()
    expect(() => resolveCombatPlayerAction(
      snapshot,
      { kind: 'defend', damage: 9 } as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_COMMAND' }))
    expect(previewCombatPlayerAction(
      snapshot,
      null as never,
      dependencies,
    )).toEqual({ canExecute: false, errorCode: 'INVALID_COMBAT_COMMAND' })
    expect(previewCombatPlayerAction(
      snapshot,
      { kind: 'temporary-attack' },
      dependencies,
    )).toEqual({ canExecute: false, errorCode: 'ACTION_NOT_AVAILABLE' })
  })

  it('rejects a damaged or cycle-advanced first encounter state', () => {
    const { snapshot, dependencies } = encounter()
    const input = {
      playerCondition: snapshot.playerCondition,
      backpack: snapshot.backpack,
      equipment: snapshot.equipment,
      quickSlots: snapshot.quickSlots,
      itemStates: snapshot.itemStates,
      usage: snapshot.usage,
      enemy: {
        ...snapshot.enemy,
        hasBeenEncountered: false,
        currentHealth: 13,
      },
    }
    expect(() => createFirstCombatEncounter(
      input,
      'unalerted',
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_ENEMY_STATE' }))
  })

  it.each([0, 20])('tracks a continuous CTB Effect cursor from enemy start %s', (
    firstEnemyCtb,
  ) => {
    const { snapshot, dependencies } = encounter({ pipeDurability: 0 })
    const prepared = createCombatEncounterSnapshot({
      ...snapshot,
      enemyNextActionCtb: firstEnemyCtb,
    }, dependencies)
    const result = act(prepared, 'temporary-attack', dependencies)
    const positions = result.plan.effects
      .filter((effect): effect is Extract<typeof effect, {
        kind: 'combat-ctb-position-changed'
      }> => effect.kind === 'combat-ctb-position-changed')
      .map(({ currentCtbBefore, currentCtbAfter }) => [
        currentCtbBefore,
        currentCtbAfter,
      ])
    expect(positions).toEqual(firstEnemyCtb === 0
      ? [[0, 0], [0, 0], [0, 100], [100, 140]]
      : [[0, 0], [0, 20], [20, 120], [120, 140]])
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index][0]).toBe(positions[index - 1][1])
    }
    expect(result.snapshot).toMatchObject({ currentCtb: 140 })
    expect(result.snapshot.enemy).toMatchObject({
      currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
      nextCycleIndex: 1,
      resolvedActionCount: 2,
    })
    expect(applyCombatEffects(
      prepared,
      result.plan.command,
      result.plan.effects,
      dependencies,
    )).toEqual(result.snapshot)
  })

  it('rejects CTB cursor tampering and missing intermediate enemy facts atomically', () => {
    const { snapshot, dependencies } = encounter({ pipeDurability: 0 })
    const prepared = createCombatEncounterSnapshot({
      ...snapshot,
      enemyNextActionCtb: 20,
    }, dependencies)
    const result = act(prepared, 'temporary-attack', dependencies)
    const mutateCases = [
      (effects: Record<string, unknown>[]) => {
        const ctb = effects.find(({ kind, reason }) =>
          kind === 'combat-ctb-position-changed' &&
          reason === 'enemy-action-resolved')!
        ctb.currentCtbBefore = 99
      },
      (effects: Record<string, unknown>[]) => {
        const ctb = effects.find(({ kind, reason }) =>
          kind === 'combat-ctb-position-changed' &&
          reason === 'enemy-action-resolved')!
        ctb.currentCtbAfter = 99
      },
      (effects: Record<string, unknown>[]) => {
        const second = effects.findIndex(({ kind, resolvedActionCountAfter }) =>
          kind === 'enemy-intent-changed' && resolvedActionCountAfter === 2)
        effects.splice(second, 1)
      },
    ]
    for (const mutate of mutateCases) {
      const effects = structuredClone(result.plan.effects) as unknown as Record<string, unknown>[]
      mutate(effects)
      expect(() => applyCombatEffects(
        prepared,
        result.plan.command,
        effects as never,
        dependencies,
      )).toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_EFFECTS' }))
      expect(prepared.enemy.resolvedActionCount).toBe(0)
      expect(prepared.currentCtb).toBe(0)
    }
  })

  it('locks escape at selection and resolves escape before an equal-time enemy action', () => {
    const { snapshot, dependencies } = encounter()
    const prepared = createCombatEncounterSnapshot({
      ...snapshot,
      enemyNextActionCtb: 80,
    }, dependencies)
    const result = act(prepared, 'escape', dependencies)
    expect(result.snapshot).toMatchObject({
      status: 'escaped',
      currentCtb: 80,
      playerNextActionCtb: 80,
    })
    expect(result.snapshot.enemy.resolvedActionCount).toBe(0)
    expect(result.plan.effects.map(({ kind }) => kind)).toEqual([
      'combat-escape-preparation-locked',
      'combat-ctb-position-changed',
      'combat-escape-completed',
      'combat-ctb-position-changed',
      'combat-status-changed',
    ])
  })

  it('applies completion bleeding once and makes a lethal bleed defeat instead of escaped', () => {
    const { snapshot, dependencies } = encounter({ health: 1, bleeding: true })
    const prepared = createCombatEncounterSnapshot({
      ...snapshot,
      enemyNextActionCtb: 100,
    }, dependencies)
    const result = act(prepared, 'escape', dependencies)
    expect(result.snapshot).toMatchObject({ status: 'defeat', currentCtb: 80 })
    expect(result.plan.effects.filter((effect) =>
      effect.kind === 'player-health-lost' &&
      effect.source === 'post-player-action-bleeding')).toHaveLength(1)
    expect(result.plan.effects.some(({ kind }) => kind === 'combat-escape-completed')).toBe(true)
  })

  it('audits capped wound time and painkiller reduction in the locked escape Effect', () => {
    const { snapshot, dependencies } = encounter()
    const wounded = createCombatEncounterSnapshot({
      ...snapshot,
      enemyNextActionCtb: 200,
      playerCondition: createPlayerCondition({
        ...snapshot.playerCondition,
        painkillerActive: true,
        openWounds: [0, 1, 2].map((index) => ({
          id: `wound-${index}`,
          kind: 'laceration' as const,
          treatment: 'untreated' as const,
        })),
      }, config.combat.player),
    }, dependencies)
    const result = act(wounded, 'escape', dependencies)
    expect(result.plan.effects[0]).toMatchObject({
      kind: 'combat-escape-preparation-locked',
      loadTier: 'normal',
      baseCtb: 80,
      untreatedOpenWoundCount: 3,
      rawWoundCtb: 20,
      painkillerReductionApplied: 10,
      finalWoundCtb: 10,
      preparationCtb: 90,
      completesAtCtb: 90,
    })
  })

  it('explicitly rejects restored cannot-carry state from starting escape', () => {
    const { snapshot, dependencies } = encounter()
    const materials = Array.from({ length: 6 }, (_, index) => ({
      instanceId: `heavy-stack-${index}`,
      definitionId: HOSPITAL_ITEM_IDS.metalParts,
      quantity: 5,
    }))
    const overweight = createCombatEncounterSnapshot({
      ...snapshot,
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: materials,
        placements: materials.map(({ instanceId }, index) => ({
          instanceId,
          x: index,
          y: 0,
          rotated: false,
        })),
      }, hospitalItemCatalog),
      itemStates: {
        states: [
          ...snapshot.itemStates.states,
          ...materials.map((item) => createFullItemState(item, hospitalItemResourceCatalog)),
        ],
      },
    }, dependencies)
    expect(() => act(overweight, 'escape', dependencies)).toThrowError(
      expect.objectContaining({ code: 'CANNOT_ESCAPE_WHILE_UNCARRYABLE' }),
    )
  })

  it.each([
    [17, 'loaded', 80],
    [25, 'overloaded', 110],
  ] as const)('uses backpack weight %i as %s with base escape CTB %i', (
    targetWeight,
    expectedTier,
    expectedBaseCtb,
  ) => {
    const { snapshot, dependencies } = encounter()
    const quantities: number[] = []
    let remaining = targetWeight
    while (remaining > 0) {
      const quantity = Math.min(5, remaining)
      quantities.push(quantity)
      remaining -= quantity
    }
    const materials = quantities.map((quantity, index) => ({
      instanceId: `load-stack-${index}`,
      definitionId: HOSPITAL_ITEM_IDS.metalParts,
      quantity,
    }))
    const weighted = createCombatEncounterSnapshot({
      ...snapshot,
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: materials,
        placements: materials.map(({ instanceId }, index) => ({
          instanceId,
          x: index,
          y: 0,
          rotated: false,
        })),
      }, hospitalItemCatalog),
      itemStates: {
        states: [
          ...snapshot.itemStates.states,
          ...materials.map((item) => createFullItemState(item, hospitalItemResourceCatalog)),
        ],
      },
      enemyNextActionCtb: 200,
    }, dependencies)
    const result = act(weighted, 'escape', dependencies)
    expect(result.plan.effects[0]).toMatchObject({
      kind: 'combat-escape-preparation-locked',
      backpackWeight: targetWeight,
      loadTier: expectedTier,
      baseCtb: expectedBaseCtb,
    })
  })
})
