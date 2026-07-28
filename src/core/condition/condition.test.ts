import { describe, expect, it } from 'vitest'
import {
  activatePainkiller,
  addMinorContusion,
  addUntreatedOpenWound,
  applyHealthLoss,
  calculateEscapeWoundCtbModifier,
  clearPainkiller,
  ConditionError,
  createInitialPlayerCondition,
  createPlayerCondition,
  getTotalOpenWoundCount,
  getTreatedOpenWoundCount,
  getUntreatedOpenWoundCount,
  hasActiveMinorContusionTravelPenalty,
  hasMinorContusions,
  hasUntreatedOpenWounds,
  isDead,
  isPainkillerSuppressingMinorContusion,
  removeOneMinorContusion,
  removeOneTreatedOpenWound,
  restoreHealth,
  setBleeding,
  startBleeding,
  stopBleeding,
  treatOneOpenWound,
  type EscapeWoundCtbRules,
  type PlayerConditionSnapshot,
} from '.'

const healthRules = { maxHealth: 12 }
const escapeRules = {
  escape: {
    ctbPerUntreatedOpenWound: 10,
    woundCtbBonusCap: 20,
  },
  painkiller: {
    escapeWoundCtbReduction: 10,
  },
} as EscapeWoundCtbRules

function condition(
  changes: Partial<PlayerConditionSnapshot> = {},
): PlayerConditionSnapshot {
  return createPlayerCondition(
    {
      currentHealth: 12,
      bleeding: false,
      untreatedOpenWounds: 0,
      treatedOpenWounds: 0,
      minorContusions: 0,
      painkillerActive: false,
      ...changes,
    },
    healthRules,
  )
}

describe('player condition creation', () => {
  it('creates the formal initial shape', () => {
    expect(createInitialPlayerCondition(healthRules)).toEqual({
      currentHealth: 12,
      bleeding: false,
      untreatedOpenWounds: 0,
      treatedOpenWounds: 0,
      minorContusions: 0,
      painkillerActive: false,
    })
  })

  it('accepts an explicit state without deriving fields', () => {
    expect(
      condition({
        currentHealth: 7,
        bleeding: false,
        untreatedOpenWounds: 2,
        painkillerActive: true,
      }),
    ).toMatchObject({
      currentHealth: 7,
      bleeding: false,
      untreatedOpenWounds: 2,
      painkillerActive: true,
    })
  })

  it.each([-1, 13, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid health %s',
    (currentHealth) => {
      expect(() => condition({ currentHealth })).toThrowError(ConditionError)
    },
  )

  it.each([
    ['untreatedOpenWounds', -1],
    ['treatedOpenWounds', -1],
    ['minorContusions', -1],
    ['minorContusions', 1.5],
    ['minorContusions', Number.MAX_SAFE_INTEGER + 1],
  ] as const)('rejects invalid %s count', (field, value) => {
    expect(() => condition({ [field]: value })).toThrowError(ConditionError)
  })

  it('deep-freezes state without modifying input', () => {
    const input = {
      currentHealth: 6,
      bleeding: true,
      untreatedOpenWounds: 1,
      treatedOpenWounds: 1,
      minorContusions: 1,
      painkillerActive: false,
    }
    const before = structuredClone(input)
    const result = createPlayerCondition(input, healthRules)
    expect(input).toEqual(before)
    expect(Object.isFrozen(result)).toBe(true)
  })
})

describe('health operations', () => {
  it('applies normal health loss with a detailed frozen result', () => {
    const original = condition()
    const result = applyHealthLoss(original, 4, healthRules)
    expect(result).toMatchObject({
      requestedLoss: 4,
      actualLoss: 4,
      healthBefore: 12,
      healthAfter: 8,
      depleted: false,
      state: { currentHealth: 8 },
    })
    expect(original.currentHealth).toBe(12)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('clamps excessive loss to zero health', () => {
    expect(applyHealthLoss(condition({ currentHealth: 2 }), 5, healthRules)).toMatchObject({
      actualLoss: 2,
      healthAfter: 0,
      depleted: true,
    })
  })

  it('allows deterministic zero-health loss with actual loss zero', () => {
    expect(applyHealthLoss(condition({ currentHealth: 0 }), 3, healthRules)).toMatchObject({
      actualLoss: 0,
      healthAfter: 0,
      depleted: true,
    })
  })

  it('restores normally without changing bleeding or injuries', () => {
    const result = restoreHealth(
      condition({
        currentHealth: 6,
        bleeding: true,
        untreatedOpenWounds: 1,
        minorContusions: 1,
      }),
      3,
      healthRules,
    )
    expect(result).toMatchObject({
      actualRecovery: 3,
      unusedRecovery: 0,
      healthAfter: 9,
      state: {
        bleeding: true,
        untreatedOpenWounds: 1,
        minorContusions: 1,
      },
    })
  })

  it('caps recovery and reports unused amount', () => {
    expect(restoreHealth(condition({ currentHealth: 10 }), 4, healthRules)).toMatchObject({
      requestedRecovery: 4,
      actualRecovery: 2,
      unusedRecovery: 2,
      healthAfter: 12,
      atMaximum: true,
    })
  })

  it('permits numeric recovery from zero without claiming Run revival', () => {
    expect(restoreHealth(condition({ currentHealth: 0 }), 1, healthRules).healthAfter).toBe(1)
  })

  it.each([0, -1, 1.5])('rejects invalid health change %s', (amount) => {
    expect(() => applyHealthLoss(condition(), amount, healthRules)).toThrowError(
      ConditionError,
    )
    expect(() => restoreHealth(condition(), amount, healthRules)).toThrowError(
      ConditionError,
    )
  })

  it('does not clear conditions when health reaches zero', () => {
    const result = applyHealthLoss(
      condition({
        currentHealth: 1,
        bleeding: true,
        untreatedOpenWounds: 1,
        minorContusions: 1,
      }),
      1,
      healthRules,
    )
    expect(result.state).toMatchObject({
      currentHealth: 0,
      bleeding: true,
      untreatedOpenWounds: 1,
      minorContusions: 1,
    })
  })
})

describe('bleeding and open wounds', () => {
  it('starts, stops and explicitly sets bleeding idempotently', () => {
    const started = startBleeding(condition())
    expect(started.bleeding).toBe(true)
    expect(startBleeding(started)).toEqual(started)
    const stopped = stopBleeding(started)
    expect(stopped.bleeding).toBe(false)
    expect(stopBleeding(stopped)).toEqual(stopped)
    expect(setBleeding(stopped, true).bleeding).toBe(true)
  })

  it('starting bleeding does not add wounds', () => {
    expect(startBleeding(condition()).untreatedOpenWounds).toBe(0)
  })

  it('stopping bleeding does not remove wounds', () => {
    expect(
      stopBleeding(condition({ bleeding: true, untreatedOpenWounds: 2 })),
    ).toMatchObject({ bleeding: false, untreatedOpenWounds: 2 })
  })

  it('adds one or multiple untreated wounds without starting bleeding', () => {
    expect(addUntreatedOpenWound(condition())).toMatchObject({
      untreatedOpenWounds: 1,
      bleeding: false,
    })
    expect(addUntreatedOpenWound(condition(), 3).untreatedOpenWounds).toBe(3)
  })

  it('treats exactly one wound atomically without stopping bleeding or healing', () => {
    const result = treatOneOpenWound(
      condition({
        currentHealth: 8,
        bleeding: true,
        untreatedOpenWounds: 2,
        treatedOpenWounds: 1,
      }),
    )
    expect(result).toMatchObject({
      currentHealth: 8,
      bleeding: true,
      untreatedOpenWounds: 1,
      treatedOpenWounds: 2,
    })
  })

  it('removes exactly one treated wound without other effects', () => {
    expect(
      removeOneTreatedOpenWound(
        condition({ bleeding: true, treatedOpenWounds: 2 }),
      ),
    ).toMatchObject({ bleeding: true, treatedOpenWounds: 1 })
  })

  it('rejects absent wound operations', () => {
    expect(() => treatOneOpenWound(condition())).toThrowError(ConditionError)
    expect(() => removeOneTreatedOpenWound(condition())).toThrowError(
      ConditionError,
    )
  })

  it.each([0, -1, 1.5])('rejects invalid wound addition %s', (amount) => {
    expect(() => addUntreatedOpenWound(condition(), amount)).toThrowError(
      ConditionError,
    )
  })

  it('rejects wound count overflow', () => {
    expect(() =>
      addUntreatedOpenWound(
        condition({ untreatedOpenWounds: Number.MAX_SAFE_INTEGER }),
        1,
      ),
    ).toThrowError(ConditionError)
  })
})

describe('minor contusions and painkiller', () => {
  it('adds and removes minor contusions without changing health', () => {
    const added = addMinorContusion(condition({ currentHealth: 7 }), 2)
    expect(added).toMatchObject({ currentHealth: 7, minorContusions: 2 })
    expect(removeOneMinorContusion(added).minorContusions).toBe(1)
  })

  it('rejects absent removal and invalid additions', () => {
    expect(() => removeOneMinorContusion(condition())).toThrowError(
      ConditionError,
    )
    for (const amount of [0, -1, 1.5]) {
      expect(() => addMinorContusion(condition(), amount)).toThrowError(
        ConditionError,
      )
    }
  })

  it('rejects contusion count overflow', () => {
    expect(() =>
      addMinorContusion(
        condition({ minorContusions: Number.MAX_SAFE_INTEGER }),
        1,
      ),
    ).toThrowError(ConditionError)
  })

  it('activates painkiller without deleting any injury or bleeding', () => {
    const result = activatePainkiller(
      condition({
        bleeding: true,
        untreatedOpenWounds: 1,
        minorContusions: 2,
      }),
    )
    expect(result).toMatchObject({
      painkillerActive: true,
      bleeding: true,
      untreatedOpenWounds: 1,
      minorContusions: 2,
    })
    expect(activatePainkiller(result)).toEqual(result)
  })

  it('clearing painkiller restores the active contusion selector', () => {
    const active = activatePainkiller(condition({ minorContusions: 1 }))
    expect(hasActiveMinorContusionTravelPenalty(active)).toBe(false)
    expect(
      hasActiveMinorContusionTravelPenalty(clearPainkiller(active)),
    ).toBe(true)
  })

  it('multiple contusions produce one boolean travel state', () => {
    expect(
      hasActiveMinorContusionTravelPenalty(
        condition({ minorContusions: 3 }),
      ),
    ).toBe(true)
  })
})

describe('condition selectors and escape wound CTB', () => {
  it('reports death only at zero health', () => {
    expect(isDead(condition({ currentHealth: 0 }))).toBe(true)
    expect(isDead(condition({ currentHealth: 1 }))).toBe(false)
  })

  it('reports wound presence and counts independently', () => {
    const state = condition({
      untreatedOpenWounds: 2,
      treatedOpenWounds: 3,
    })
    expect(hasUntreatedOpenWounds(state)).toBe(true)
    expect(getUntreatedOpenWoundCount(state)).toBe(2)
    expect(getTreatedOpenWoundCount(state)).toBe(3)
    expect(getTotalOpenWoundCount(state)).toBe(5)
  })

  it('reports contusion and suppression states', () => {
    const suppressed = condition({
      minorContusions: 1,
      painkillerActive: true,
    })
    expect(hasMinorContusions(suppressed)).toBe(true)
    expect(isPainkillerSuppressingMinorContusion(suppressed)).toBe(true)
    expect(hasActiveMinorContusionTravelPenalty(suppressed)).toBe(false)
  })

  it.each([
    [0, false, 0],
    [1, false, 10],
    [2, false, 20],
    [3, false, 20],
    [1, true, 0],
    [2, true, 10],
    [3, true, 10],
  ] as const)(
    '%s untreated wounds with painkiller=%s gives %s CTB',
    (untreatedOpenWounds, painkillerActive, expected) => {
      const result = calculateEscapeWoundCtbModifier(
        condition({ untreatedOpenWounds, painkillerActive }),
        escapeRules,
      )
      expect(result.finalWoundCtb).toBe(expected)
      expect(Object.isFrozen(result)).toBe(true)
    },
  )

  it('ignores treated wounds and minor contusions in escape wound CTB', () => {
    expect(
      calculateEscapeWoundCtbModifier(
        condition({ treatedOpenWounds: 5, minorContusions: 3 }),
        escapeRules,
      ).finalWoundCtb,
    ).toBe(0)
  })

  it.each([
    [-1, 20, 10],
    [10, -1, 10],
    [10, 20, -1],
    [1.5, 20, 10],
  ])('rejects invalid escape rules', (perWound, cap, reduction) => {
    expect(() =>
      calculateEscapeWoundCtbModifier(condition(), {
        escape: {
          ...escapeRules.escape,
          ctbPerUntreatedOpenWound: perWound,
          woundCtbBonusCap: cap,
        },
        painkiller: {
          ...escapeRules.painkiller,
          escapeWoundCtbReduction: reduction,
        },
      }),
    ).toThrowError(ConditionError)
  })

  it('rejects escape wound multiplication overflow', () => {
    expect(() =>
      calculateEscapeWoundCtbModifier(
        condition({ untreatedOpenWounds: Number.MAX_SAFE_INTEGER }),
        {
          escape: {
            ...escapeRules.escape,
            ctbPerUntreatedOpenWound: 2,
            woundCtbBonusCap: 20,
          },
          painkiller: escapeRules.painkiller,
        },
      ),
    ).toThrowError(ConditionError)
  })
})
