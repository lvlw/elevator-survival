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
    expect(config.scene.postActionBleedingDamage).toBe(1)
    expect(config.scene.searchTime).toEqual({
      withFlashlight: 20,
      withoutFlashlight: 30,
      flashlightChargeCost: 1,
    })
    expect(config.scene.fireDoor).toEqual({
      accessCardTime: 10,
      crowbarTime: 20,
      toolkitTime: 30,
      fireAxeTime: 10,
      forceEntryTime: 20,
      equippedItemResourceCost: 1,
      impactProtectionIntegrityCost: 1,
      forceEntryInjuryRiskPercent: 60,
      protectedForceEntryInjuryRiskPercent: 20,
    })
    expect([
      config.scene.fireDoor.accessCardTime,
      config.scene.fireDoor.crowbarTime,
      config.scene.fireDoor.toolkitTime,
      config.scene.fireDoor.fireAxeTime,
      config.scene.fireDoor.forceEntryTime,
    ].every((time) => time < config.scene.totalTime)).toBe(true)
    expect(Object.isFrozen(config.scene.fireDoor)).toBe(true)
    expect(config.scene.travelTimeModifiers).toEqual({
      minorContusionTimeIncreasePercent: 10,
    })
    expect(config.backpack).toMatchObject({
      width: 6,
      height: 4,
      totalCells: 24,
      quickSlotCount: 2,
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
  it.each([0, -1, 1.5])('rejects invalid quick slot count %s', (count) => {
    const invalidConfig = mutableConfigCopy()
    invalidConfig.backpack.quickSlotCount = count
    expect(ruleConfigSchema.safeParse(invalidConfig).success).toBe(false)
  })

  it.each([-1, 101, 1.5])('rejects invalid fire-door risk percent %s', (risk) => {
    const invalid = mutableConfigCopy()
    invalid.scene.fireDoor.forceEntryInjuryRiskPercent = risk
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
  })

  it.each([
    [20, 60, true],
    [60, 20, false],
    [60, 60, true],
    [0, 100, true],
  ])(
    'validates protected risk %s against unprotected risk %s',
    (protectedRisk, unprotectedRisk, succeeds) => {
      const input = mutableConfigCopy()
      input.scene.fireDoor.protectedForceEntryInjuryRiskPercent = protectedRisk
      input.scene.fireDoor.forceEntryInjuryRiskPercent = unprotectedRisk
      expect(ruleConfigSchema.safeParse(input).success).toBe(succeeds)
    },
  )

  it.each([0, -1, 1.5])('rejects invalid fire-door resource cost %s', (cost) => {
    const invalid = mutableConfigCopy()
    invalid.scene.fireDoor.equippedItemResourceCost = cost
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
  })

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
    [
      'invalid flashlight search charge cost',
      (config: RuleConfigInput) => {
        config.scene.searchTime.flashlightChargeCost = 0
      },
    ],
  ])('rejects %s', (_name, mutate) => {
    const invalidConfig = mutableConfigCopy()
    mutate(invalidConfig)

    expect(ruleConfigSchema.safeParse(invalidConfig).success).toBe(false)
  })

  it.each([
    [
      'unknown top-level field',
      (config: RuleConfigInput & Record<string, unknown>) => {
        config.unknown = true
      },
    ],
    [
      'unknown scene field',
      (config: RuleConfigInput) => {
        ;(config.scene as typeof config.scene & Record<string, unknown>).unknown =
          true
      },
    ],
    [
      'unknown fire-door field',
      (config: RuleConfigInput) => {
        ;(config.scene.fireDoor as typeof config.scene.fireDoor & Record<string, unknown>).unknown = true
      },
    ],
    [
      'unknown deeply nested player field',
      (config: RuleConfigInput) => {
        ;(
          config.combat.player as typeof config.combat.player &
            Record<string, unknown>
        ).unknown = true
      },
    ],
    [
      'misspelled post-action bleeding field',
      (config: RuleConfigInput) => {
        ;(
          config.scene as typeof config.scene & Record<string, unknown>
        ).postActionBleedingDammage = 1
      },
    ],
  ])('strictly rejects %s', (_name, mutate) => {
    const invalid = mutableConfigCopy() as RuleConfigInput &
      Record<string, unknown>
    mutate(invalid)
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
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
