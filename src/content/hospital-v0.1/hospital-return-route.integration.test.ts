import { describe, expect, it } from 'vitest'
import { getRuleConfig } from '../rule-config-registry'
import { resolveTimedSceneAction } from '../../core/scene'
import { findReturnRoute } from '../../core/scene-graph'
import {
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import { HOSPITAL_SLICE_RULES_VERSION } from './rule-config'

const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)

function hospitalReturn(
  totalWeight: number,
  hasMinorContusion = false,
  analgesiaActive = false,
) {
  return findReturnRoute(
    {
      graph: hospitalSliceV01SceneGraph,
      currentNodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
      availability: { enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS },
      totalWeight,
      hasMinorContusion,
      analgesiaActive,
    },
    config,
  )
}

describe('hospital return route integration', () => {
  it.each([
    ['normal', config.backpack.weightBands.normal.min, false, false, 30],
    ['loaded', config.backpack.weightBands.loaded.min, false, false, 33],
    ['overloaded', config.backpack.weightBands.overloaded.min, false, false, 38],
    ['overloaded contusion', config.backpack.weightBands.overloaded.min, true, false, 42],
    ['overloaded analgesia', config.backpack.weightBands.overloaded.min, true, true, 38],
  ])(
    'uses registered configuration for %s return',
    (_label, totalWeight, hasMinorContusion, analgesiaActive, expected) => {
      const result = hospitalReturn(
        totalWeight,
        hasMinorContusion,
        analgesiaActive,
      )
      expect(result.baseReturnTime).toBe(30)
      expect(result.estimatedReturnTime).toBe(expected)
    },
  )

  it('rejects the registered cannot-carry threshold on a non-zero route', () => {
    expect(() =>
      hospitalReturn(config.backpack.weightBands.cannotCarryFrom),
    ).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
  })

  it('passes the calculated 42 to the scene transaction exactly once', () => {
    const route = hospitalReturn(
      config.backpack.weightBands.overloaded.min,
      true,
      false,
    )
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
        estimatedReturnTimeAfterAction: route.estimatedReturnTime,
        reachesElevatorSafety: false,
      },
      config.forcedReturn,
    )

    expect(route.estimatedReturnTime).toBe(42)
    expect(outcome).toMatchObject({
      overtimeDebt: 25,
      effectiveEmergencyReturnTime: 67,
      forcedReturnBaseDamage: 4,
    })
  })
})
