import { describe, expect, it } from 'vitest'
import { createEnemyDefinitionCatalog } from './enemy-definition-catalog'
import { CombatError } from './combat-errors'
import { reduceRiskTier, selectEnemyHealthPhase } from './combat'
import {
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
} from './enemy-persistent-state'
import {
  createCombatPlayerActionCommand,
  createTemporaryDefenseSnapshot,
} from './combat-validation'
import type {
  CombatDependencies,
  EnemyDefinition,
  EnemyPersistentCombatState,
} from './combat-types'

const definition: EnemyDefinition = {
  id: 'enemy',
  maxHealth: 14,
  tags: ['infected'],
  weaknessTags: ['blunt-control'],
  actions: [
    { id: 'scratch', kind: 'scratch' },
    { id: 'bite', kind: 'lunge-bite' },
  ],
  actionCycle: ['scratch', 'bite'],
  initialIntentActionId: 'scratch',
}

const enemyState = (
  changes: Partial<EnemyPersistentCombatState> = {},
) => ({
  enemyInstanceId: 'enemy-1',
  definitionId: 'enemy',
  currentHealth: 14,
  currentIntentActionId: 'scratch',
  nextCycleIndex: 1,
  resolvedActionCount: 0,
  hasBeenEncountered: false,
  defeated: false,
  ...changes,
})

describe('enemy definition catalog', () => {
  it('creates a deeply frozen strict catalog', () => {
    const catalog = createEnemyDefinitionCatalog([definition])
    expect(catalog.get('enemy')).toEqual(definition)
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.get('enemy').actions)).toBe(true)
    expect(Object.isFrozen(catalog.get('enemy').actions[0])).toBe(true)
  })

  it('does not mutate or freeze caller input', () => {
    const input = structuredClone(definition)
    createEnemyDefinitionCatalog([input])
    expect(input).toEqual(definition)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it.each([
    ['unknown kind', (value: EnemyDefinition) => { (value.actions[0] as { kind: string }).kind = 'other' }],
    ['duplicate action', (value: EnemyDefinition) => { (value.actions[1] as { id: string }).id = 'scratch' }],
    ['unknown cycle action', (value: EnemyDefinition) => { (value.actionCycle as string[])[0] = 'missing' }],
    ['unknown initial intent', (value: EnemyDefinition) => { (value as { initialIntentActionId: string }).initialIntentActionId = 'missing' }],
    ['extra field', (value: EnemyDefinition) => { (value as EnemyDefinition & Record<string, unknown>).extra = true }],
  ])('rejects %s', (_label, mutate) => {
    const input = structuredClone(definition)
    mutate(input)
    expect(() => createEnemyDefinitionCatalog([input])).toThrow(CombatError)
  })

  it('rejects duplicate enemies and unknown lookup', () => {
    expect(() => createEnemyDefinitionCatalog([definition, definition])).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_ENEMY_DEFINITION' }),
    )
    expect(() => createEnemyDefinitionCatalog([definition]).get('missing')).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_ENEMY_DEFINITION' }),
    )
  })
})

describe('combat risk and phase selectors', () => {
  it.each([
    ['very-high', 1, 'high'],
    ['high', 2, 'low'],
    ['low', 5, 'none'],
    ['none', 1, 'none'],
  ] as const)('reduces %s by %s to %s', (tier, amount, expected) => {
    expect(reduceRiskTier(tier, amount)).toBe(expected)
  })

  it('rejects invalid risk reduction', () => {
    expect(() => reduceRiskTier('high', -1)).toThrow(CombatError)
  })

  it('locks the infected orderly phase boundaries', () => {
    expect([14, 11, 10, 7, 6, 3, 2, 1, 0].map((health) =>
      selectEnemyHealthPhase(health, 14),
    )).toEqual([
      'healthy', 'healthy', 'wounded', 'wounded', 'severely-wounded',
      'severely-wounded', 'critical', 'critical', 'incapacitated',
    ])
  })
})

describe('strict combat runtime facts', () => {
  it('locks intent and next cycle position to resolved action count', () => {
    expect(createEnemyPersistentCombatState(enemyState(), definition))
      .toEqual(enemyState())
    expect(createEnemyPersistentCombatState(enemyState({
      hasBeenEncountered: true,
      currentHealth: 9,
      currentIntentActionId: 'bite',
      nextCycleIndex: 0,
      resolvedActionCount: 1,
    }), definition)).toMatchObject({
      currentIntentActionId: 'bite',
      nextCycleIndex: 0,
      resolvedActionCount: 1,
    })
    expect(createEnemyPersistentCombatState(enemyState({
      hasBeenEncountered: true,
      currentHealth: 8,
      resolvedActionCount: 4,
    }), definition)).toMatchObject({
      currentIntentActionId: 'scratch',
      nextCycleIndex: 1,
      resolvedActionCount: 4,
    })
  })

  it.each([
    ['unknown field', { extra: true }],
    ['damaged before encounter', { currentHealth: 13 }],
    ['advanced before encounter', { resolvedActionCount: 1 }],
    ['intent mismatch', { hasBeenEncountered: true, resolvedActionCount: 1 }],
    ['cycle mismatch', { hasBeenEncountered: true, nextCycleIndex: 0 }],
    ['defeated before encounter', { currentHealth: 0, defeated: true }],
  ])('rejects enemy state with %s', (_label, changes) => {
    expect(() => createEnemyPersistentCombatState(
      enemyState(changes as never),
      definition,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_ENEMY_STATE' }))
  })

  it('strictly normalizes temporary defense', () => {
    const input = {
      activatedAtCtb: 10,
      expiresAtPlayerActionCtb: 90,
      availableDirectAttackUses: 1 as const,
    }
    const result = createTemporaryDefenseSnapshot(input)
    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(() => createTemporaryDefenseSnapshot({ ...input, extra: true } as never))
      .toThrowError(expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }))
    expect(() => createTemporaryDefenseSnapshot({
      ...input,
      availableDirectAttackUses: 0,
    } as never)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
  })

  it.each([
    'metal-pipe-basic-attack',
    'metal-pipe-charged-strike',
    'defend',
    'temporary-attack',
    'escape',
  ] as const)('accepts exact command %s', (kind) => {
    expect(createCombatPlayerActionCommand({ kind })).toEqual({ kind })
  })

  it.each([
    [
      { kind: 'use-quick-slot-item', quickSlotIndex: 0 },
      { kind: 'use-quick-slot-item', quickSlotIndex: 0 },
    ],
    [
      {
        kind: 'use-quick-slot-item',
        quickSlotIndex: 1,
        targetOpenWoundId: 'wound-1',
      },
      {
        kind: 'use-quick-slot-item',
        quickSlotIndex: 1,
        targetOpenWoundId: 'wound-1',
      },
    ],
  ] as const)('accepts and copies exact quick-slot command %o', (input, expected) => {
    const command = createCombatPlayerActionCommand(input)
    expect(command).toEqual(expected)
    expect(command).not.toBe(input)
    expect(Object.isFrozen(command)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it.each([
    { kind: 'use-quick-slot-item', quickSlotIndex: -1 },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0.5 },
    { kind: 'use-quick-slot-item', quickSlotIndex: Number.MAX_SAFE_INTEGER + 1 },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, targetOpenWoundId: '' },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, targetOpenWoundId: ' ' },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, definitionId: 'bandage' },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, ctb: 80 },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, damage: 1 },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, resourceCost: 1 },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, result: {} },
    { kind: 'use-quick-slot-item', quickSlotIndex: 0, effects: [] },
  ])('rejects malformed quick-slot command %o', (command) => {
    expect(() => createCombatPlayerActionCommand(command as never)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_COMMAND' }),
    )
  })

  it.each([
    null,
    [],
    new Date(),
    Object.assign(Object.create({}), {
      kind: 'use-quick-slot-item',
      quickSlotIndex: 0,
    }),
    Object.assign(Object.create(null), {
      kind: 'use-quick-slot-item',
      quickSlotIndex: 0,
    }),
    new (class CombatCommand {
      public readonly kind = 'use-quick-slot-item'
      public readonly quickSlotIndex = 0
    })(),
  ])(
    'rejects non-plain quick-slot command %o',
    (command) => {
      expect(() => createCombatPlayerActionCommand(command as never)).toThrowError(
        expect.objectContaining({ code: 'INVALID_COMBAT_COMMAND' }),
      )
    },
  )

  it.each([
    null,
    [],
    {},
    { kind: 'unknown' },
    { kind: 'defend', damage: 1 },
    { kind: 'defend', ctb: 1 },
    { kind: 'defend', target: 'enemy' },
    { kind: 'defend', resourceCost: 1 },
    { kind: 'defend', result: {} },
    { kind: 'defend', effects: [] },
    new (class CombatCommand {
      public readonly kind = 'defend'
    })(),
  ])('rejects malformed command %o', (command) => {
    expect(() => createCombatPlayerActionCommand(command as never)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_COMMAND' }),
    )
  })

  it('rejects extra exploration usage fields', () => {
    const config = {
      combat: {
        metalPipe: { chargedStrike: { maxUsesPerExploration: 1 } },
      },
    } as CombatDependencies['config']
    expect(() => createExplorationCombatUsage({
      metalPipeChargedStrikeUses: 0,
      extra: true,
    } as never, config)).toThrowError(
      expect.objectContaining({ code: 'INVALID_COMBAT_SNAPSHOT' }),
    )
  })
})
