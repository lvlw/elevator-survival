import { describe, expect, it } from 'vitest'
import { createEnemyDefinitionCatalog } from './enemy-definition-catalog'
import { CombatError } from './combat-errors'
import { reduceRiskTier, selectEnemyHealthPhase } from './combat'
import type { EnemyDefinition } from './combat-types'

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
