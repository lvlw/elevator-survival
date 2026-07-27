import { describe, expect, it } from 'vitest'
import {
  deepFreeze,
  ruleConfigSchema,
  type RuleConfigInput,
} from '../../core/config'
import {
  HOSPITAL_SLICE_RULES_VERSION,
  hospitalSliceV01RuleConfig,
} from './rule-config'

function mutableConfigCopy(): RuleConfigInput {
  return structuredClone(hospitalSliceV01RuleConfig) as RuleConfigInput
}

describe('hospitalSliceV01RuleConfig', () => {
  it('contains the frozen scene, backpack, combat and return values', () => {
    const config = hospitalSliceV01RuleConfig

    expect(config.metadata.rulesVersion).toBe(HOSPITAL_SLICE_RULES_VERSION)
    expect(config.scene.totalTime).toBe(200)
    expect(config.scene.travelTimeModifiers).toEqual({
      minorContusionTimeIncreasePercent: 10,
    })
    expect(config.backpack).toMatchObject({
      width: 6,
      height: 4,
      totalCells: 24,
    })
    expect(config.combat.player.maxHealth).toBe(12)
    expect(config.combat.infectedOrderly).toMatchObject({
      maxHealth: 14,
      firstActionTime: { unaware: 70, alerted: 50 },
    })
    expect(config.combat.metalPipe).toMatchObject({
      maxDurability: 6,
      basicAttack: { damage: 4, ctb: 100, durabilityCost: 1 },
      chargedStrike: {
        damage: 6,
        ctb: 180,
        durabilityCost: 3,
        enemyActionDelay: 200,
      },
    })
    expect(config.combat.temporaryAttack).toMatchObject({
      damage: 2,
      ctb: 140,
    })
    expect(config.forcedReturn).toEqual({
      effectiveTimePerBaseDamage: 20,
      baseDamageCap: 4,
      bleedingExtraDamage: 1,
      bleedingExtraDamageCountsTowardBaseCap: false,
    })
  })

  it('contains the frozen maintenance values', () => {
    expect(hospitalSliceV01RuleConfig.maintenance).toMatchObject({
      itemResourceMaximums: {
        fireAxeDurability: 2,
        heavyCoatIntegrity: 4,
        crowbarDurability: 3,
        toolkitDurability: 2,
      },
      dailyBaseLabor: { points: 3, recoveryPerPoint: 1 },
      materialRepair: {
        metalParts: { units: 1, mechanicalRepairPoints: 5 },
        fabric: { units: 1, textileRepairPoints: 4 },
      },
      flashlightCharge: {
        batteryUnits: 1,
        chargeRecovery: 3,
        maxCharge: 3,
      },
    })
  })
})

describe('ruleConfigSchema', () => {
  it.each([
    [
      'invalid fire axe durability maximum',
      (config: RuleConfigInput) => {
        config.maintenance.itemResourceMaximums.fireAxeDurability = 0
      },
    ],
    [
      'invalid item resource maximum',
      (config: RuleConfigInput) => {
        config.maintenance.itemResourceMaximums.crowbarDurability = 0
      },
    ],
    [
      'mismatched backpack cells',
      (config: RuleConfigInput) => {
        config.backpack.totalCells = 23
      },
    ],
    [
      'invalid weight band ordering',
      (config: RuleConfigInput) => {
        config.backpack.weightBands.loaded.min = 16
      },
    ],
    [
      'negative damage',
      (config: RuleConfigInput) => {
        config.combat.metalPipe.basicAttack.damage = -1
      },
    ],
    [
      'empty rules version',
      (config: RuleConfigInput) => {
        config.metadata.rulesVersion = ''
      },
    ],
    [
      'negative daily maintenance labor',
      (config: RuleConfigInput) => {
        config.maintenance.dailyBaseLabor.points = -1
      },
    ],
    [
      'negative minor contusion travel modifier',
      (config: RuleConfigInput) => {
        config.scene.travelTimeModifiers.minorContusionTimeIncreasePercent = -1
      },
    ],
  ])('rejects %s', (_name, mutate) => {
    const invalidConfig = mutableConfigCopy()
    mutate(invalidConfig)

    expect(ruleConfigSchema.safeParse(invalidConfig).success).toBe(false)
  })
})

describe('deepFreeze', () => {
  it('freezes roots, nested objects and arrays recursively', () => {
    const frozen = deepFreeze({
      nested: { value: 1 },
      values: [{ value: 2 }],
    })

    expect(Object.isFrozen(frozen)).toBe(true)
    expect(Object.isFrozen(frozen.nested)).toBe(true)
    expect(Object.isFrozen(frozen.values)).toBe(true)
    expect(Object.isFrozen(frozen.values[0])).toBe(true)
    expect(() => {
      ;(frozen.nested as { value: number }).value = 9
    }).toThrow(TypeError)
    expect(frozen.nested.value).toBe(1)
  })
})
