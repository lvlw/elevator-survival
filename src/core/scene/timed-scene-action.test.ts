import { describe, expect, it } from 'vitest'
import {
  SceneResolutionError,
  calculateForcedReturnDamage,
  previewTimedSceneAction,
  resolveTimedSceneAction,
  type ForcedReturnRules,
  type SceneClockSnapshot,
  type SceneVitalSnapshot,
  type TimedSceneActionInput,
} from '.'

const RULES: ForcedReturnRules = Object.freeze({
  effectiveTimePerBaseDamage: 20,
  baseDamageCap: 4,
  bleedingExtraDamage: 1,
  bleedingExtraDamageCountsTowardBaseCap: false,
})

const VITALS: SceneVitalSnapshot = Object.freeze({
  currentHealth: 12,
  maxHealth: 12,
  bleeding: false,
})

const ACTION: TimedSceneActionInput = Object.freeze({
  timeCost: 10,
  healthAfterPrimaryEffect: 12,
  bleedingAfterPrimaryEffect: false,
  estimatedReturnTimeAfterAction: 0,
  reachesElevatorSafety: false,
})

function resolve(
  remainingTime: number,
  actionOverrides: Partial<TimedSceneActionInput> = {},
  vitalOverrides: Partial<SceneVitalSnapshot> = {},
) {
  return resolveTimedSceneAction(
    { remainingTime },
    { ...VITALS, ...vitalOverrides },
    { ...ACTION, ...actionOverrides },
    RULES,
  )
}

describe('timed scene action eligibility', () => {
  it.each([
    [200, 30],
    [5, 30],
  ])(
    'allows a positive-time action with %i remaining and cost %i',
    (remainingTime, timeCost) => {
      expect(resolve(remainingTime, { timeCost }).kind).toBe(
        remainingTime > timeCost ? 'continue' : 'forced-return',
      )
    },
  )

  it('reports time exhaustion in previews', () => {
    expect(
      previewTimedSceneAction(
        { remainingTime: 0 },
        VITALS,
        ACTION,
        RULES,
      ),
    ).toEqual({
      canStart: false,
      rejectionCode: 'SCENE_TIME_EXHAUSTED',
    })
  })

  it('reports player death in previews', () => {
    expect(
      previewTimedSceneAction(
        { remainingTime: 10 },
        { ...VITALS, currentHealth: 0 },
        ACTION,
        RULES,
      ),
    ).toEqual({
      canStart: false,
      rejectionCode: 'PLAYER_DEAD',
    })
  })

  it('rejects zero-time actions instead of treating them as scene actions', () => {
    expect(() => resolve(10, { timeCost: 0 })).toThrow(SceneResolutionError)
  })
})

describe('scene time and overtime debt', () => {
  it.each([
    [20, 20, 0, 0],
    [10, 10, 0, 0],
    [5, 10, 0, 5],
    [5, 30, 0, 25],
  ])(
    'remaining %i and cost %i produces remaining %i and debt %i',
    (startingTime, timeCost, remainingTime, overtimeDebt) => {
      const outcome = resolve(startingTime, {
        timeCost,
        reachesElevatorSafety: true,
      })

      expect(outcome.clock.remainingTime).toBe(remainingTime)
      expect(outcome.overtimeDebt).toBe(overtimeDebt)
    },
  )

  it('does not mutate the original clock snapshot', () => {
    const clock: SceneClockSnapshot = Object.freeze({ remainingTime: 5 })

    resolveTimedSceneAction(clock, VITALS, { ...ACTION, timeCost: 30 }, RULES)

    expect(clock).toEqual({ remainingTime: 5 })
  })
})

describe('post-action bleeding', () => {
  it('does not damage a player who is no longer bleeding', () => {
    const outcome = resolve(100, {
      healthAfterPrimaryEffect: 7,
      bleedingAfterPrimaryEffect: false,
    })

    expect(outcome.postActionBleedingDamage).toBe(0)
    expect(outcome.vitals.currentHealth).toBe(7)
  })

  it.each([10, 20, 30])(
    'applies exactly one bleeding damage after a %i-time action',
    (timeCost) => {
      const outcome = resolve(100, {
        timeCost,
        healthAfterPrimaryEffect: 7,
        bleedingAfterPrimaryEffect: true,
      })

      expect(outcome.postActionBleedingDamage).toBe(1)
      expect(outcome.vitals.currentHealth).toBe(6)
    },
  )

  it('uses the bleeding state after the primary effect', () => {
    const outcome = resolve(
      100,
      {
        healthAfterPrimaryEffect: 8,
        bleedingAfterPrimaryEffect: false,
      },
      { bleeding: true },
    )

    expect(outcome.postActionBleedingDamage).toBe(0)
    expect(outcome.vitals.currentHealth).toBe(8)
  })

  it('makes bleeding death terminal before a safe return', () => {
    const outcome = resolve(10, {
      healthAfterPrimaryEffect: 1,
      bleedingAfterPrimaryEffect: true,
      reachesElevatorSafety: true,
    })

    expect(outcome.kind).toBe('death')
    expect(outcome.isSafelyReturned).toBe(false)
    expect(outcome.forcedReturnTotalDamage).toBe(0)
  })

  it('allows a primary heal and stop-bleeding effect to preserve life', () => {
    const outcome = resolve(100, {
      healthAfterPrimaryEffect: 2,
      bleedingAfterPrimaryEffect: false,
    })

    expect(outcome.kind).toBe('continue')
    expect(outcome.vitals.currentHealth).toBe(2)
  })
})

describe('forced return damage', () => {
  it.each([
    [0, 0],
    [1, 1],
    [20, 1],
    [21, 2],
    [80, 4],
    [81, 4],
  ])('maps effective time %i to base damage %i', (effectiveTime, damage) => {
    expect(
      calculateForcedReturnDamage(effectiveTime, 0, false, RULES).baseDamage,
    ).toBe(damage)
  })

  it('adds bleeding damage only when effective time is positive', () => {
    expect(
      calculateForcedReturnDamage(0, 0, true, RULES).bleedingExtraDamage,
    ).toBe(0)
    expect(
      calculateForcedReturnDamage(1, 0, true, RULES).bleedingExtraDamage,
    ).toBe(1)
  })

  it('does not count bleeding damage toward the base cap', () => {
    const damage = calculateForcedReturnDamage(100, 0, true, RULES)

    expect(damage.baseDamage).toBe(4)
    expect(damage.bleedingExtraDamage).toBe(1)
    expect(damage.totalDamage).toBe(5)
  })
})

describe('frozen formal examples', () => {
  it.each([
    [10, 30, 5, 35, 2],
    [30, 30, 25, 55, 3],
    [30, 42, 25, 67, 4],
  ])(
    'cost %i and return %i produces debt %i, effective time %i, damage %i',
    (timeCost, returnTime, debt, effectiveTime, baseDamage) => {
      const outcome = resolve(5, {
        timeCost,
        estimatedReturnTimeAfterAction: returnTime,
      })

      expect(outcome.overtimeDebt).toBe(debt)
      expect(outcome.effectiveEmergencyReturnTime).toBe(effectiveTime)
      expect(outcome.forcedReturnBaseDamage).toBe(baseDamage)
    },
  )

  it('allows the 67-time example to reach total damage 5 while bleeding', () => {
    const outcome = resolve(5, {
      timeCost: 30,
      healthAfterPrimaryEffect: 12,
      bleedingAfterPrimaryEffect: true,
      estimatedReturnTimeAfterAction: 42,
    })

    expect(outcome.effectiveEmergencyReturnTime).toBe(67)
    expect(outcome.postActionBleedingDamage).toBe(1)
    expect(outcome.forcedReturnBaseDamage).toBe(4)
    expect(outcome.forcedReturnBleedingDamage).toBe(1)
    expect(outcome.forcedReturnTotalDamage).toBe(5)
    expect(outcome.vitals.currentHealth).toBe(6)
  })
})

describe('zero-distance return boundaries', () => {
  it('returns safely with no damage when debt and distance are both zero', () => {
    const outcome = resolve(10, {
      reachesElevatorSafety: true,
      estimatedReturnTimeAfterAction: 0,
    })

    expect(outcome.kind).toBe('safe-return')
    expect(outcome.effectiveEmergencyReturnTime).toBe(0)
    expect(outcome.forcedReturnTotalDamage).toBe(0)
  })

  it('charges overtime debt even when return distance is zero', () => {
    const outcome = resolve(5, {
      timeCost: 30,
      reachesElevatorSafety: true,
      estimatedReturnTimeAfterAction: 0,
    })

    expect(outcome.overtimeDebt).toBe(25)
    expect(outcome.effectiveEmergencyReturnTime).toBe(25)
    expect(outcome.forcedReturnBaseDamage).toBe(2)
    expect(outcome.kind).toBe('forced-return')
  })

  it('checks post-action bleeding before a zero-distance safe return', () => {
    const outcome = resolve(10, {
      healthAfterPrimaryEffect: 1,
      bleedingAfterPrimaryEffect: true,
      reachesElevatorSafety: true,
    })

    expect(outcome.kind).toBe('death')
  })
})

describe('terminal outcome priority', () => {
  it('continues when time remains and the elevator was not reached', () => {
    expect(resolve(20).kind).toBe('continue')
  })

  it('returns safely when the elevator is reached with time remaining', () => {
    expect(resolve(20, { reachesElevatorSafety: true }).kind).toBe(
      'safe-return',
    )
  })

  it('forces return when time reaches zero away from safety', () => {
    expect(
      resolve(10, { estimatedReturnTimeAfterAction: 20 }).kind,
    ).toBe('forced-return')
  })

  it('makes forced-return damage lethal at zero health', () => {
    const outcome = resolve(
      10,
      { estimatedReturnTimeAfterAction: 20, healthAfterPrimaryEffect: 1 },
      { currentHealth: 1 },
    )

    expect(outcome.kind).toBe('death')
    expect(outcome.isSafelyReturned).toBe(false)
  })

  it('never marks a death outcome as safely returned', () => {
    const outcome = resolve(10, {
      estimatedReturnTimeAfterAction: 80,
      healthAfterPrimaryEffect: 4,
      reachesElevatorSafety: true,
    })

    expect(outcome.kind).toBe('death')
    expect(outcome.isSafelyReturned).toBe(false)
  })
})

describe('preview and runtime immutability', () => {
  it('uses the same authoritative result for preview and resolution', () => {
    const clock = Object.freeze({ remainingTime: 5 })
    const action = Object.freeze({
      ...ACTION,
      timeCost: 30,
      bleedingAfterPrimaryEffect: true,
      estimatedReturnTimeAfterAction: 42,
    })
    const preview = previewTimedSceneAction(clock, VITALS, action, RULES)
    const outcome = resolveTimedSceneAction(clock, VITALS, action, RULES)

    expect(preview.canStart).toBe(true)
    if (preview.canStart) {
      expect(preview.outcome).toEqual(outcome)
    }
  })

  it('is deterministic across repeated calls', () => {
    expect(resolve(5, { timeCost: 30 })).toEqual(
      resolve(5, { timeCost: 30 }),
    )
  })

  it('deep-freezes result objects', () => {
    const outcome = resolve(5, { timeCost: 30 })

    expect(Object.isFrozen(outcome)).toBe(true)
    expect(Object.isFrozen(outcome.clock)).toBe(true)
    expect(Object.isFrozen(outcome.vitals)).toBe(true)
  })
})

describe('scene input errors', () => {
  it.each([
    [{ remainingTime: -1 }, VITALS, ACTION, RULES],
    [{ remainingTime: 1.5 }, VITALS, ACTION, RULES],
    [{ remainingTime: 10 }, { ...VITALS, maxHealth: 0 }, ACTION, RULES],
    [{ remainingTime: 10 }, { ...VITALS, currentHealth: 13 }, ACTION, RULES],
    [{ remainingTime: 10 }, VITALS, { ...ACTION, timeCost: -1 }, RULES],
    [{ remainingTime: 10 }, VITALS, { ...ACTION, timeCost: 1.5 }, RULES],
    [
      { remainingTime: 10 },
      VITALS,
      { ...ACTION, healthAfterPrimaryEffect: 13 },
      RULES,
    ],
    [
      { remainingTime: 10 },
      VITALS,
      { ...ACTION, estimatedReturnTimeAfterAction: -1 },
      RULES,
    ],
  ] as const)(
    'rejects invalid snapshots or action input %#',
    (clock, vitals, action, rules) => {
      expect(() =>
        resolveTimedSceneAction(clock, vitals, action, rules),
      ).toThrow(SceneResolutionError)
    },
  )

  it('throws when a dead player attempts resolution', () => {
    expect(() =>
      resolveTimedSceneAction(
        { remainingTime: 10 },
        { ...VITALS, currentHealth: 0 },
        ACTION,
        RULES,
      ),
    ).toThrow(SceneResolutionError)
  })

  it('throws when a player attempts resolution at zero scene time', () => {
    expect(() =>
      resolveTimedSceneAction(
        { remainingTime: 0 },
        VITALS,
        ACTION,
        RULES,
      ),
    ).toThrow(SceneResolutionError)
  })

  it.each([
    { ...RULES, effectiveTimePerBaseDamage: 0 },
    { ...RULES, baseDamageCap: 0 },
    { ...RULES, bleedingExtraDamage: 0 },
    { ...RULES, bleedingExtraDamageCountsTowardBaseCap: true },
  ])('rejects invalid forced-return configuration %#', (rules) => {
    expect(() =>
      calculateForcedReturnDamage(
        1,
        0,
        false,
        rules as ForcedReturnRules,
      ),
    ).toThrow(SceneResolutionError)
  })

  it('rejects safe-integer overflow in effective return time', () => {
    expect(() =>
      calculateForcedReturnDamage(
        Number.MAX_SAFE_INTEGER,
        1,
        false,
        RULES,
      ),
    ).toThrow(SceneResolutionError)
  })
})
