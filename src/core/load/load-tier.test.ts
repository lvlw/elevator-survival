import { describe, expect, it } from 'vitest'
import type { BackpackRules } from '.'
import { LoadRuleError, classifyLoad } from '.'

const BACKPACK_RULES: BackpackRules = Object.freeze({
  width: 6,
  height: 4,
  totalCells: 24,
  weightBands: Object.freeze({
    normal: Object.freeze({
      min: 0,
      max: 16,
      timeIncreasePercent: 0,
    }),
    loaded: Object.freeze({
      min: 17,
      max: 24,
      timeIncreasePercent: 10,
    }),
    overloaded: Object.freeze({
      min: 25,
      max: 28,
      timeIncreasePercent: 25,
    }),
    cannotCarryFrom: 29,
  }),
})

describe('load tier boundaries', () => {
  it.each([
    [0, 'normal', true],
    [16, 'normal', true],
    [17, 'loaded', true],
    [24, 'loaded', true],
    [25, 'overloaded', true],
    [28, 'overloaded', true],
    [29, 'cannot-carry', false],
    [100, 'cannot-carry', false],
  ] as const)(
    'classifies weight %i as %s',
    (totalWeight, tier, canCarry) => {
      const result = classifyLoad(totalWeight, BACKPACK_RULES)

      expect(result.tier).toBe(tier)
      expect(result.canCarry).toBe(canCarry)
    },
  )

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid total weight %s',
    (totalWeight) => {
      expect(() => classifyLoad(totalWeight, BACKPACK_RULES)).toThrow(
        LoadRuleError,
      )
    },
  )

  it('freezes its result without modifying configuration', () => {
    const before = structuredClone(BACKPACK_RULES)
    const result = classifyLoad(17, BACKPACK_RULES)

    expect(result).toMatchObject({
      totalWeight: 17,
      tier: 'loaded',
      canCarry: true,
      timeIncreasePercent: 10,
      hasBaseEscapeCtb: true,
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(BACKPACK_RULES).toEqual(before)
  })
})

describe('load configuration validation', () => {
  it.each([
    {
      ...BACKPACK_RULES,
      weightBands: {
        ...BACKPACK_RULES.weightBands,
        normal: { ...BACKPACK_RULES.weightBands.normal, min: 1 },
      },
    },
    {
      ...BACKPACK_RULES,
      weightBands: {
        ...BACKPACK_RULES.weightBands,
        loaded: { ...BACKPACK_RULES.weightBands.loaded, min: 16 },
      },
    },
    {
      ...BACKPACK_RULES,
      weightBands: {
        ...BACKPACK_RULES.weightBands,
        overloaded: {
          ...BACKPACK_RULES.weightBands.overloaded,
          timeIncreasePercent: -1,
        },
      },
    },
    {
      ...BACKPACK_RULES,
      weightBands: {
        ...BACKPACK_RULES.weightBands,
        cannotCarryFrom: 30,
      },
    },
  ] as BackpackRules[])('rejects invalid band configuration %#', (rules) => {
    expect(() => classifyLoad(10, rules)).toThrow(LoadRuleError)
  })
})
