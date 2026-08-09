import { describe, expect, it } from 'vitest'
import {
  previewTimedSceneAction,
  resolveTimedSceneAction,
} from '../../core/scene'
import { getRuleConfig } from '../rule-config-registry'
import { HOSPITAL_SLICE_RULES_VERSION } from './rule-config'

const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)
const vitals = Object.freeze({
  currentHealth: config.combat.player.maxHealth,
  maxHealth: config.combat.player.maxHealth,
  bleeding: false,
})

function resolveExtraction(
  remainingTime: number,
  timeCost: number,
  returnTime: number,
  bleedingAfterPrimaryEffect = false,
) {
  return resolveTimedSceneAction(
    { remainingTime },
    vitals,
    {
      timeCost,
      healthAfterPrimaryEffect: vitals.currentHealth,
      bleedingAfterPrimaryEffect,
      estimatedReturnTimeAfterAction: returnTime,
      endsExplorationAtSafety: false,
      isAtSafetyAfterAction: false,
    },
    {
      postActionBleedingDamage: config.scene.postActionBleedingDamage,
      forcedReturn: config.forcedReturn,
    },
  )
}

describe('hospital scene resolution integration', () => {
  it('resolves direct extraction overtime from registered configuration', () => {
    const outcome = resolveExtraction(
      5,
      config.scene.extractionTime.direct,
      30,
    )

    expect(outcome.overtimeDebt).toBe(5)
    expect(outcome.effectiveEmergencyReturnTime).toBe(35)
    expect(outcome.forcedReturnBaseDamage).toBe(2)
  })

  it('resolves cautious extraction overtime from registered configuration', () => {
    const outcome = resolveExtraction(
      5,
      config.scene.extractionTime.cautious,
      30,
    )

    expect(outcome.overtimeDebt).toBe(25)
    expect(outcome.effectiveEmergencyReturnTime).toBe(55)
    expect(outcome.forcedReturnBaseDamage).toBe(3)
  })

  it('accepts an already-calculated overloaded and contused return time', () => {
    const outcome = resolveExtraction(
      5,
      config.scene.extractionTime.cautious,
      42,
      true,
    )

    expect(outcome.overtimeDebt).toBe(25)
    expect(outcome.effectiveEmergencyReturnTime).toBe(67)
    expect(outcome.forcedReturnBaseDamage).toBe(4)
    expect(outcome.forcedReturnBleedingDamage).toBe(1)
    expect(outcome.forcedReturnTotalDamage).toBe(5)
  })

  it('applies primary medical effects before the bleeding check', () => {
    const bandage = resolveTimedSceneAction(
      { remainingTime: config.scene.totalTime },
      { ...vitals, currentHealth: 6, bleeding: true },
      {
        timeCost: config.medical.bandage.sceneTime,
        healthAfterPrimaryEffect:
          6 + config.medical.bandage.healthRecovery,
        bleedingAfterPrimaryEffect: !config.medical.bandage.stopsBleeding,
        estimatedReturnTimeAfterAction: 0,
        endsExplorationAtSafety: false,
        isAtSafetyAfterAction: false,
      },
      {
        postActionBleedingDamage: config.scene.postActionBleedingDamage,
        forcedReturn: config.forcedReturn,
      },
    )
    const painkillerAction = {
      timeCost: config.medical.painkiller.sceneTime,
      healthAfterPrimaryEffect: 6,
      bleedingAfterPrimaryEffect: true,
      estimatedReturnTimeAfterAction: 0,
      endsExplorationAtSafety: false,
      isAtSafetyAfterAction: false,
    }
    const painkillerPreview = previewTimedSceneAction(
      { remainingTime: config.scene.totalTime },
      { ...vitals, currentHealth: 6, bleeding: true },
      painkillerAction,
      {
        postActionBleedingDamage: config.scene.postActionBleedingDamage,
        forcedReturn: config.forcedReturn,
      },
    )

    expect(bandage.postActionBleedingDamage).toBe(0)
    expect(bandage.vitals.currentHealth).toBe(7)
    expect(painkillerPreview.canStart).toBe(true)
    if (painkillerPreview.canStart) {
      expect(painkillerPreview.outcome.postActionBleedingDamage).toBe(1)
      expect(painkillerPreview.outcome.vitals.currentHealth).toBe(5)
    }
  })
})
