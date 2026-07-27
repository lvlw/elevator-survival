import { describe, expect, it } from 'vitest'
import {
  calculateAdjustedTravelTime,
  classifyLoad,
  getBaseEscapeCtbForLoad,
} from '../../core/load'
import { resolveTimedSceneAction } from '../../core/scene'
import { getRuleConfig } from '../rule-config-registry'
import { HOSPITAL_SLICE_RULES_VERSION } from './rule-config'

const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)
const bands = config.backpack.weightBands

describe('hospital load rules integration', () => {
  it.each([
    [bands.normal.max, 'normal'],
    [bands.loaded.min, 'loaded'],
    [bands.loaded.max, 'loaded'],
    [bands.overloaded.min, 'overloaded'],
    [bands.overloaded.max, 'overloaded'],
    [bands.cannotCarryFrom, 'cannot-carry'],
  ] as const)('classifies formal boundary %i as %s', (weight, tier) => {
    expect(classifyLoad(weight, config.backpack).tier).toBe(tier)
  })

  it.each([
    [bands.normal.min, false, false, 10],
    [bands.loaded.min, false, false, 11],
    [bands.overloaded.min, false, false, 13],
    [bands.normal.min, true, false, 11],
    [bands.loaded.min, true, false, 13],
    [bands.overloaded.min, true, false, 14],
    [bands.overloaded.min, true, true, 13],
  ] as const)(
    'calculates formal base-edge result for weight %i',
    (totalWeight, hasMinorContusion, analgesiaActive, expected) => {
      expect(
        calculateAdjustedTravelTime(
          {
            baseTime: config.scene.movementEdgeTime,
            totalWeight,
            hasMinorContusion,
            analgesiaActive,
          },
          config,
        ).finalTime,
      ).toBe(expected)
    },
  )

  it('calculates the formal overloaded contusion return example as 42', () => {
    expect(
      calculateAdjustedTravelTime(
        {
          baseTime: 3 * config.scene.movementEdgeTime,
          totalWeight: bands.overloaded.min,
          hasMinorContusion: true,
          analgesiaActive: false,
        },
        config,
      ).finalTime,
    ).toBe(42)
  })

  it('reads formal escape base CTB values from configuration', () => {
    expect(getBaseEscapeCtbForLoad('normal', config.combat)).toBe(
      config.combat.escape.baseCtb.normal,
    )
    expect(getBaseEscapeCtbForLoad('loaded', config.combat)).toBe(
      config.combat.escape.baseCtb.loaded,
    )
    expect(getBaseEscapeCtbForLoad('overloaded', config.combat)).toBe(
      config.combat.escape.baseCtb.overloaded,
    )
  })

  it('composes adjusted return time with the scene transaction', () => {
    const adjustedReturnTime = calculateAdjustedTravelTime(
      {
        baseTime: 3 * config.scene.movementEdgeTime,
        totalWeight: bands.overloaded.min,
        hasMinorContusion: true,
        analgesiaActive: false,
      },
      config,
    ).finalTime
    const outcome = resolveTimedSceneAction(
      { remainingTime: 5 },
      {
        currentHealth: config.combat.player.maxHealth,
        maxHealth: config.combat.player.maxHealth,
        bleeding: false,
      },
      {
        timeCost: config.scene.extractionTime.cautious,
        healthAfterPrimaryEffect: config.combat.player.maxHealth,
        bleedingAfterPrimaryEffect: false,
        estimatedReturnTimeAfterAction: adjustedReturnTime,
        reachesElevatorSafety: false,
      },
      config.forcedReturn,
    )

    expect(adjustedReturnTime).toBe(42)
    expect(outcome.overtimeDebt).toBe(25)
    expect(outcome.effectiveEmergencyReturnTime).toBe(67)
    expect(outcome.forcedReturnBaseDamage).toBe(4)
  })
})
