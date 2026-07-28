import { describe, expect, it } from 'vitest'
import {
  activatePainkiller,
  addMinorContusion,
  addUntreatedOpenWound,
  applyHealthLoss,
  calculateEscapeWoundCtbModifier,
  clearPainkiller,
  createInitialPlayerCondition,
  createPlayerCondition,
  hasActiveMinorContusionTravelPenalty,
  removeOneTreatedOpenWound,
  restoreHealth,
  startBleeding,
  stopBleeding,
  treatOneOpenWound,
} from '../../core/condition'
import { calculateAdjustedTravelTime } from '../../core/load'
import { resolveTimedSceneAction } from '../../core/scene'
import { getRuleConfig } from '../rule-config-registry'
import { HOSPITAL_SLICE_RULES_VERSION } from './rule-config'

const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)
const healthRules = config.combat.player
const escapeRules = {
  escape: config.combat.escape,
  painkiller: config.medical.painkiller,
}

describe('hospital player condition values', () => {
  it('creates the confirmed initial condition from registered config', () => {
    expect(createInitialPlayerCondition(healthRules)).toEqual({
      currentHealth: 12,
      bleeding: false,
      untreatedOpenWounds: 0,
      treatedOpenWounds: 0,
      minorContusions: 0,
      painkillerActive: false,
    })
  })

  it('resolves the confirmed health loss examples', () => {
    const initial = createInitialPlayerCondition(healthRules)
    expect(applyHealthLoss(initial, 4, healthRules).healthAfter).toBe(8)
    expect(
      applyHealthLoss(
        createPlayerCondition({ ...initial, currentHealth: 2 }, healthRules),
        5,
        healthRules,
      ),
    ).toMatchObject({ actualLoss: 2, healthAfter: 0 })
  })

  it('resolves the confirmed capped recovery example', () => {
    const initial = createInitialPlayerCondition(healthRules)
    expect(
      restoreHealth(
        createPlayerCondition({ ...initial, currentHealth: 10 }, healthRules),
        4,
        healthRules,
      ),
    ).toMatchObject({
      actualRecovery: 2,
      unusedRecovery: 2,
      healthAfter: 12,
    })
  })

  it('moves one wound to treated without stopping bleeding', () => {
    const wounded = addUntreatedOpenWound(
      startBleeding(createInitialPlayerCondition(healthRules)),
    )
    const treated = treatOneOpenWound(wounded)
    expect(treated).toMatchObject({
      bleeding: true,
      untreatedOpenWounds: 0,
      treatedOpenWounds: 1,
    })
    expect(removeOneTreatedOpenWound(treated).treatedOpenWounds).toBe(0)
  })

  it('stopping bleeding leaves untreated wounds intact', () => {
    const wounded = addUntreatedOpenWound(
      startBleeding(createInitialPlayerCondition(healthRules)),
    )
    expect(stopBleeding(wounded)).toMatchObject({
      bleeding: false,
      untreatedOpenWounds: 1,
    })
  })

  it('painkiller suppresses but does not remove a contusion', () => {
    const contused = addMinorContusion(
      createInitialPlayerCondition(healthRules),
    )
    expect(hasActiveMinorContusionTravelPenalty(contused)).toBe(true)
    const suppressed = activatePainkiller(contused)
    expect(suppressed.minorContusions).toBe(1)
    expect(hasActiveMinorContusionTravelPenalty(suppressed)).toBe(false)
    expect(
      hasActiveMinorContusionTravelPenalty(clearPainkiller(suppressed)),
    ).toBe(true)
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
    '%s untreated wounds with painkiller=%s produces %s escape CTB',
    (untreatedOpenWounds, painkillerActive, expected) => {
      const initial = createInitialPlayerCondition(healthRules)
      const state = createPlayerCondition(
        {
          ...initial,
          untreatedOpenWounds,
          treatedOpenWounds: 4,
          painkillerActive,
        },
        healthRules,
      )
      expect(
        calculateEscapeWoundCtbModifier(state, escapeRules).finalWoundCtb,
      ).toBe(expected)
    },
  )
})

describe('condition integration with travel and scene transaction', () => {
  it('passes the active contusion boolean to produce overloaded return 42', () => {
    const state = addMinorContusion(
      createInitialPlayerCondition(healthRules),
    )
    expect(
      calculateAdjustedTravelTime(
        {
          baseTime: 30,
          totalWeight: 28,
          hasMinorContusion:
            hasActiveMinorContusionTravelPenalty(state),
          analgesiaActive: state.painkillerActive,
        },
        config,
      ).finalTime,
    ).toBe(42)
  })

  it('passes painkiller suppression to produce overloaded return 38', () => {
    const state = activatePainkiller(
      addMinorContusion(createInitialPlayerCondition(healthRules)),
    )
    expect(
      calculateAdjustedTravelTime(
        {
          baseTime: 30,
          totalWeight: 28,
          hasMinorContusion:
            hasActiveMinorContusionTravelPenalty(state),
          analgesiaActive: state.painkillerActive,
        },
        config,
      ).finalTime,
    ).toBe(38)
  })

  it('rebuilds condition from one scene bleeding settlement without double damage', () => {
    const state = createPlayerCondition(
      {
        ...createInitialPlayerCondition(healthRules),
        currentHealth: 2,
        bleeding: true,
        untreatedOpenWounds: 1,
      },
      healthRules,
    )
    const outcome = resolveTimedSceneAction(
      { remainingTime: 100 },
      {
        currentHealth: state.currentHealth,
        maxHealth: healthRules.maxHealth,
        bleeding: state.bleeding,
      },
      {
        timeCost: 10,
        healthAfterPrimaryEffect: state.currentHealth,
        bleedingAfterPrimaryEffect: state.bleeding,
        estimatedReturnTimeAfterAction: 10,
        reachesElevatorSafety: false,
      },
      config.forcedReturn,
    )
    const rebuilt = createPlayerCondition(
      {
        ...state,
        currentHealth: outcome.vitals.currentHealth,
        bleeding: outcome.vitals.bleeding,
      },
      healthRules,
    )
    expect(outcome.postActionBleedingDamage).toBe(1)
    expect(rebuilt).toMatchObject({
      currentHealth: 1,
      bleeding: true,
      untreatedOpenWounds: 1,
    })
  })

  it('keeps health recovery independent from bleeding in formal config', () => {
    const bleeding = createPlayerCondition(
      {
        ...createInitialPlayerCondition(healthRules),
        currentHealth: 10,
        bleeding: true,
      },
      healthRules,
    )
    expect(restoreHealth(bleeding, 2, healthRules).state.bleeding).toBe(true)
  })
})
