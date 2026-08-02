import { describe, expect, it } from 'vitest'
import {
  applyCombatEffects,
  CombatError,
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
  createFirstCombatEncounter,
  createReentryCombatEncounter,
  getAvailableCombatPlayerActions,
  previewCombatPlayerAction,
  resolveCombatPlayerAction,
  selectEnemyHealthPhase,
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
    const enemy = persistent({ currentHealth: 4 })
    const { snapshot, dependencies } = encounter({ health: 1, bleeding: true, enemy })
    const result = act(snapshot, 'metal-pipe-basic-attack', dependencies).snapshot
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
})
