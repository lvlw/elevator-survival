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
      firstActionTime: { unaware: 70, alerted: 50, reentry: 50 },
      actions: {
        scratch: { ctb: 100, damage: 3, injuryRiskTier: 'high', exposureRiskTier: 'none' },
        lungeBite: { ctb: 140, damage: 7, injuryRiskTier: 'very-high', exposureRiskTier: 'high' },
      },
    })
    expect(config.combat.postPlayerActionBleedingDamage).toBe(1)
    expect(config.combat.riskTiers).toEqual({ none: 0, low: 20, medium: 40, high: 60, 'very-high': 80 })
    expect(config.combat.heavyCoat).toEqual({
      directDamageReduction: 1,
      injuryRiskTierReduction: 2,
      exposureRiskTierReduction: 1,
      integrityCostPerAttack: 1,
    })
    expect(config.combat.defend).toEqual({ ctb: 80, remainingDamagePercent: 50, injuryRiskTierReduction: 1 })
    expect(Object.isFrozen(config.combat.riskTiers)).toBe(true)
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

  it('contains the frozen world-threat and satiety values', () => {
    expect(hospitalSliceV01RuleConfig.worldThreat).toEqual({
      definitionId: 'world_threat_hospital_infection',
      progressPerPendingExposure: 20,
      stages: [
        { id: 'none', minProgress: 0, dailyBaseIncrease: 0 },
        { id: 'latent', minProgress: 1, dailyBaseIncrease: 5 },
        { id: 'infected', minProgress: 30, dailyBaseIncrease: 10 },
        { id: 'worsening', minProgress: 60, dailyBaseIncrease: 15 },
        { id: 'critical', minProgress: 90, dailyBaseIncrease: 20 },
      ],
      terminal: { stageId: 'terminal', minProgress: 120 },
      suppressant: { dailyReduction: 15, maxUsesPerDay: 1, hubSceneTime: 0 },
    })
    expect(hospitalSliceV01RuleConfig.dailySettlement).toEqual({
      maxSatiety: 6,
      newRunInitialSatiety: 6,
      dailySatietyCost: 2,
      rationRecovery: 2,
      rationHubSceneTime: 0,
      unresolvedBleedingHealthLoss: 2,
      minorContusionRecoveryPenalty: 1,
    })
  })
})

describe('ruleConfigSchema', () => {
  it('rejects nonascending, duplicate, and nonzero-first threat stage boundaries', () => {
    for (const stages of [
      [
        { id: 'a', minProgress: 0, dailyBaseIncrease: 0 },
        { id: 'b', minProgress: 0, dailyBaseIncrease: 1 },
      ],
      [
        { id: 'a', minProgress: 1, dailyBaseIncrease: 0 },
      ],
      [
        { id: 'a', minProgress: 0, dailyBaseIncrease: 0 },
        { id: 'a', minProgress: 1, dailyBaseIncrease: 1 },
      ],
    ]) {
      const invalid = mutableConfigCopy()
      invalid.worldThreat.stages = stages
      expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
    }
  })

  it('rejects terminal overlap, unsafe integers, and unknown threat fields', () => {
    const overlap = mutableConfigCopy()
    overlap.worldThreat.terminal.minProgress = 90
    expect(ruleConfigSchema.safeParse(overlap).success).toBe(false)
    const unsafe = mutableConfigCopy()
    unsafe.worldThreat.progressPerPendingExposure = Number.MAX_SAFE_INTEGER + 1
    expect(ruleConfigSchema.safeParse(unsafe).success).toBe(false)
    const unknown = mutableConfigCopy()
    ;(unknown.worldThreat as typeof unknown.worldThreat & Record<string, unknown>).extra = true
    expect(ruleConfigSchema.safeParse(unknown).success).toBe(false)
  })

  it('rejects non-monotonic combat risk tiers', () => {
    const invalid = mutableConfigCopy()
    invalid.combat.riskTiers.medium = 10
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects an unknown combat risk tier in an action', () => {
    const invalid = mutableConfigCopy()
    ;(invalid.combat.infectedOrderly.actions.scratch as unknown as Record<string, unknown>).injuryRiskTier = 'extreme'
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
  })

  it.each([-1, 101, 1.5])('rejects invalid defense percent %s', (value) => {
    const invalid = mutableConfigCopy()
    invalid.combat.defend.remainingDamagePercent = value
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
  })
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
    ['bandage', (config: RuleConfigInput) => { config.medical.bandage.sceneTime = config.scene.totalTime }],
    ['painkiller', (config: RuleConfigInput) => { config.medical.painkiller.sceneTime = config.scene.totalTime }],
    ['disinfectant', (config: RuleConfigInput) => { config.medical.disinfectant.sceneTime = config.scene.totalTime }],
    ['first-aid-kit', (config: RuleConfigInput) => { config.medical.firstAidKit.sceneTime = config.scene.totalTime }],
  ])('rejects %s scene medical time at or above total scene time', (_name, mutate) => {
    const invalid = mutableConfigCopy()
    mutate(invalid)
    expect(ruleConfigSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects the removed duplicate scene medical time configuration', () => {
    const invalid = mutableConfigCopy()
    ;(invalid.scene as typeof invalid.scene & Record<string, unknown>).medicalTime = {
      bandage: 10,
      painkiller: 10,
      disinfectant: 10,
      firstAidKit: 20,
    }
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
