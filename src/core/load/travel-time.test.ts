import { describe, expect, it } from 'vitest'
import { deepFreeze, type FrozenRuleConfig } from '../config'
import {
  LoadRuleError,
  calculateAdjustedTravelTime,
  getBaseEscapeCtbForLoad,
} from '.'

const TEST_CONFIG = deepFreeze({
  backpack: {
    width: 6,
    height: 4,
    totalCells: 24,
    weightBands: {
      normal: { min: 0, max: 16, timeIncreasePercent: 0 },
      loaded: { min: 17, max: 24, timeIncreasePercent: 10 },
      overloaded: { min: 25, max: 28, timeIncreasePercent: 25 },
      cannotCarryFrom: 29,
    },
  },
  scene: {
    travelTimeModifiers: {
      minorContusionTimeIncreasePercent: 10,
    },
  },
  medical: {
    painkiller: {
      suppressesMinorContusionMovementPenalty: true,
    },
  },
  combat: {
    escape: {
      baseCtb: {
        normal: 80,
        loaded: 80,
        overloaded: 110,
      },
    },
  },
}) as unknown as FrozenRuleConfig

function travel(
  baseTime: number,
  totalWeight: number,
  hasMinorContusion = false,
  analgesiaActive = false,
  config = TEST_CONFIG,
) {
  return calculateAdjustedTravelTime(
    {
      baseTime,
      totalWeight,
      hasMinorContusion,
      analgesiaActive,
    },
    config,
  )
}

describe('adjusted travel time', () => {
  it.each([
    [10, 0, false, false, 10],
    [10, 17, false, false, 11],
    [10, 25, false, false, 13],
    [30, 25, false, false, 38],
    [30, 0, true, false, 33],
    [30, 0, true, true, 30],
    [30, 0, false, true, 30],
  ] as const)(
    'adjusts base %i, weight %i, contusion %s, analgesia %s to %i',
    (baseTime, totalWeight, contusion, analgesia, expected) => {
      expect(travel(baseTime, totalWeight, contusion, analgesia).finalTime).toBe(
        expected,
      )
    },
  )

  it.each([
    [30, 25, 42],
    [10, 17, 13],
    [10, 25, 14],
  ])(
    'multiplies load and contusion modifiers before one final ceiling',
    (baseTime, totalWeight, expected) => {
      const result = travel(baseTime, totalWeight, true)

      expect(result.finalTime).toBe(expected)
      expect(result.minorContusionModifierApplied).toBe(true)
    },
  )

  it('does not round separately between modifiers', () => {
    expect(travel(1, 17, true).finalTime).toBe(2)
  })

  it('returns the ratios needed to explain a preview', () => {
    expect(travel(30, 25, true)).toMatchObject({
      baseTime: 30,
      loadTier: 'overloaded',
      loadTimeIncreasePercent: 25,
      loadModifier: { numerator: 125, denominator: 100 },
      minorContusionModifierApplied: true,
      minorContusionTimeIncreasePercent: 10,
      minorContusionModifier: { numerator: 110, denominator: 100 },
      finalTime: 42,
    })
  })

  it('freezes the result and nested ratios', () => {
    const result = travel(30, 25, true)

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.loadModifier)).toBe(true)
    expect(Object.isFrozen(result.minorContusionModifier)).toBe(true)
  })
})

describe('escape base CTB by load tier', () => {
  it.each([
    ['normal', 80],
    ['loaded', 80],
    ['overloaded', 110],
  ] as const)('returns %i for %s', (tier, expected) => {
    expect(getBaseEscapeCtbForLoad(tier, TEST_CONFIG.combat)).toBe(expected)
  })

  it('does not provide escape CTB for cannot-carry', () => {
    expect(() =>
      getBaseEscapeCtbForLoad('cannot-carry', TEST_CONFIG.combat),
    ).toThrow(LoadRuleError)
  })
})

describe('travel input and calculation errors', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid base time %s',
    (baseTime) => {
      expect(() => travel(baseTime, 0)).toThrow(LoadRuleError)
    },
  )

  it('rejects cannot-carry movement and return calculations', () => {
    expect(() => travel(10, 29)).toThrow(LoadRuleError)
  })

  it('rejects a negative configured modifier', () => {
    const config = {
      ...TEST_CONFIG,
      scene: {
        ...TEST_CONFIG.scene,
        travelTimeModifiers: {
          minorContusionTimeIncreasePercent: -1,
        },
      },
    } as FrozenRuleConfig

    expect(() => travel(10, 0, true, false, config)).toThrow(LoadRuleError)
  })

  it('rejects an invalid configured escape CTB', () => {
    const combat = {
      ...TEST_CONFIG.combat,
      escape: {
        ...TEST_CONFIG.combat.escape,
        baseCtb: {
          ...TEST_CONFIG.combat.escape.baseCtb,
          loaded: 0,
        },
      },
    } as FrozenRuleConfig['combat']

    expect(() => getBaseEscapeCtbForLoad('loaded', combat)).toThrow(
      LoadRuleError,
    )
  })

  it('rejects a final result beyond the safe integer range', () => {
    expect(() => travel(Number.MAX_SAFE_INTEGER, 25)).toThrow(LoadRuleError)
  })
})
