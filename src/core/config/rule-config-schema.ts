import { z } from 'zod'

const nonNegativeInteger = z.number().int().nonnegative()
const positiveInteger = z.number().int().positive()
const safeNonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const safePositiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const nonEmptyString = z.string().trim().min(1)
const percent = z.number().int().min(0).max(100)
const riskTier = z.enum(['none', 'low', 'medium', 'high', 'very-high'])
const dailyRecoveryModifier = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('fixed-penalty'),
    amount: safeNonNegativeInteger,
  }),
  z.strictObject({
    kind: z.literal('blocked'),
  }),
])

export const ruleConfigSchema = z
  .strictObject({
    metadata: z.strictObject({
      rulesVersion: nonEmptyString,
      displayVersion: nonEmptyString,
      name: nonEmptyString,
    }),
    scene: z.strictObject({
      totalTime: positiveInteger,
      postActionBleedingDamage: positiveInteger,
      movementEdgeTime: positiveInteger,
      searchTime: z.strictObject({
        withFlashlight: positiveInteger,
        withoutFlashlight: positiveInteger,
        flashlightChargeCost: positiveInteger,
      }),
      fireDoor: z.strictObject({
        accessCardTime: positiveInteger,
        crowbarTime: positiveInteger,
        toolkitTime: positiveInteger,
        fireAxeTime: positiveInteger,
        forceEntryTime: positiveInteger,
        equippedItemResourceCost: positiveInteger,
        impactProtectionIntegrityCost: positiveInteger,
        forceEntryInjuryRiskPercent: percent,
        protectedForceEntryInjuryRiskPercent: percent,
      }),
      batteryUseTime: positiveInteger,
      extractionTime: z.strictObject({
        direct: positiveInteger,
        cautious: positiveInteger,
      }),
      pathogenCaseRetrieval: z.strictObject({
        directContaminationRiskPercent: percent,
        cautiousContaminationRiskPercent: percent,
        protectedDirectContaminationRiskPercent: percent,
        protectedCautiousContaminationRiskPercent: percent,
        impactProtectionIntegrityCost: positiveInteger,
        exposureOnRiskSuccess: positiveInteger,
      }),
      travelTimeModifiers: z.strictObject({
        minorContusionTimeIncreasePercent: nonNegativeInteger,
      }),
    }),
    forcedReturn: z.strictObject({
      effectiveTimePerBaseDamage: positiveInteger,
      baseDamageCap: positiveInteger,
      bleedingExtraDamage: positiveInteger,
      bleedingExtraDamageCountsTowardBaseCap: z.literal(false),
    }),
    backpack: z.strictObject({
      width: positiveInteger,
      height: positiveInteger,
      totalCells: positiveInteger,
      quickSlotCount: positiveInteger,
      weightBands: z.strictObject({
        normal: z.strictObject({
          min: nonNegativeInteger,
          max: nonNegativeInteger,
          timeIncreasePercent: nonNegativeInteger,
        }),
        loaded: z.strictObject({
          min: nonNegativeInteger,
          max: nonNegativeInteger,
          timeIncreasePercent: nonNegativeInteger,
        }),
        overloaded: z.strictObject({
          min: nonNegativeInteger,
          max: nonNegativeInteger,
          timeIncreasePercent: nonNegativeInteger,
        }),
        cannotCarryFrom: positiveInteger,
      }),
    }),
    combat: z.strictObject({
      sceneTimeConversion: z.strictObject({
        minimumSceneTime: positiveInteger,
        ctbPerStep: positiveInteger,
        sceneTimePerStep: positiveInteger,
      }),
      postPlayerActionBleedingDamage: positiveInteger,
      riskTiers: z.strictObject({
        none: percent,
        low: percent,
        medium: percent,
        high: percent,
        'very-high': percent,
      }),
      player: z.strictObject({
        maxHealth: positiveInteger,
      }),
      infectedOrderly: z.strictObject({
        maxHealth: positiveInteger,
        firstActionTime: z.strictObject({
          unaware: positiveInteger,
          alerted: positiveInteger,
          reentry: positiveInteger,
        }),
        actions: z.strictObject({
          scratch: z.strictObject({
            ctb: positiveInteger,
            damage: nonNegativeInteger,
            injuryRiskTier: riskTier,
            exposureRiskTier: riskTier,
          }),
          lungeBite: z.strictObject({
            ctb: positiveInteger,
            damage: nonNegativeInteger,
            injuryRiskTier: riskTier,
            exposureRiskTier: riskTier,
          }),
        }),
      }),
      heavyCoat: z.strictObject({
        directDamageReduction: nonNegativeInteger,
        injuryRiskTierReduction: nonNegativeInteger,
        exposureRiskTierReduction: nonNegativeInteger,
        integrityCostPerAttack: positiveInteger,
      }),
      metalPipe: z.strictObject({
        maxDurability: positiveInteger,
        basicAttack: z.strictObject({
          damage: nonNegativeInteger,
          ctb: positiveInteger,
          durabilityCost: nonNegativeInteger,
        }),
        chargedStrike: z.strictObject({
          damage: nonNegativeInteger,
          ctb: positiveInteger,
          durabilityCost: nonNegativeInteger,
          enemyActionDelay: nonNegativeInteger,
          maxUsesPerExploration: positiveInteger,
        }),
      }),
      defend: z.strictObject({
        ctb: positiveInteger,
        remainingDamagePercent: percent,
        injuryRiskTierReduction: nonNegativeInteger,
      }),
      temporaryAttack: z.strictObject({
        damage: nonNegativeInteger,
        ctb: positiveInteger,
        durabilityCost: nonNegativeInteger,
        actionDelay: nonNegativeInteger,
      }),
      escape: z.strictObject({
        baseCtb: z.strictObject({
          normal: positiveInteger,
          loaded: positiveInteger,
          overloaded: positiveInteger,
        }),
        ctbPerUntreatedOpenWound: nonNegativeInteger,
        woundCtbBonusCap: nonNegativeInteger,
      }),
    }),
    medical: z.strictObject({
      bandage: z.strictObject({
        combatCtb: positiveInteger,
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        healthRecovery: nonNegativeInteger,
        stopsBleeding: z.boolean(),
        treatsOpenWound: z.boolean(),
      }),
      painkiller: z.strictObject({
        combatCtb: positiveInteger,
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        stopsBleeding: z.boolean(),
        suppressesMinorContusionMovementPenalty: z.boolean(),
        escapeWoundCtbReduction: nonNegativeInteger,
        minorInjuryRecoveryPenaltyReduction: nonNegativeInteger,
        stacks: z.boolean(),
      }),
      disinfectant: z.strictObject({
        usableInCombat: z.literal(false),
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        pendingExposureReduction: nonNegativeInteger,
        maxUsesPerDay: positiveInteger,
        reducesExistingInfectionProgress: z.boolean(),
        stopsBleeding: z.boolean(),
      }),
      firstAidKit: z.strictObject({
        usableInCombat: z.literal(false),
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        healthRecovery: nonNegativeInteger,
        minorInjuriesRemoved: positiveInteger,
        stopsBleedingWhenRemovingLastOpenWound: z.boolean(),
      }),
    }),
    maintenance: z.strictObject({
      itemResourceMaximums: z.strictObject({
        fireAxeDurability: positiveInteger,
        heavyCoatIntegrity: positiveInteger,
        crowbarDurability: positiveInteger,
        toolkitDurability: positiveInteger,
      }),
      dailyBaseLabor: z.strictObject({
        points: nonNegativeInteger,
        recoveryPerPoint: positiveInteger,
      }),
      materialRepair: z.strictObject({
        metalParts: z.strictObject({
          units: positiveInteger,
          mechanicalRepairPoints: positiveInteger,
        }),
        fabric: z.strictObject({
          units: positiveInteger,
          textileRepairPoints: positiveInteger,
        }),
      }),
      toolkitRepair: z.strictObject({
        metalParts: positiveInteger,
        electronicComponents: positiveInteger,
        durabilityRecovery: positiveInteger,
      }),
      flashlightCharge: z.strictObject({
        batteryUnits: positiveInteger,
        chargeRecovery: positiveInteger,
        maxCharge: positiveInteger,
      }),
    }),
    worldThreat: z.strictObject({
      definitionId: nonEmptyString,
      progressPerPendingExposure: safeNonNegativeInteger,
      stages: z.array(z.strictObject({
        id: nonEmptyString,
        minProgress: safeNonNegativeInteger,
        dailyBaseIncrease: safeNonNegativeInteger,
        dailyRecoveryModifier,
      })).min(1),
      terminal: z.strictObject({
        stageId: nonEmptyString,
        minProgress: safePositiveInteger,
      }),
      suppressant: z.strictObject({
        dailyReduction: safeNonNegativeInteger,
        maxUsesPerDay: safePositiveInteger,
        hubSceneTime: safeNonNegativeInteger,
      }),
    }),
    dailySettlement: z.strictObject({
      maxSatiety: safePositiveInteger,
      newRunInitialSatiety: safeNonNegativeInteger,
      dailySatietyCost: safeNonNegativeInteger,
      rationRecovery: safePositiveInteger,
      rationHubSceneTime: safeNonNegativeInteger,
      unresolvedBleedingHealthLoss: nonNegativeInteger,
      baseHealthRecovery: safeNonNegativeInteger,
      deprivationHealthLoss: safeNonNegativeInteger,
      satietyRecoveryCaps: z.array(z.strictObject({
        min: safeNonNegativeInteger,
        max: safeNonNegativeInteger,
        maxHealthRecovery: safeNonNegativeInteger,
        deprived: z.boolean(),
      })).min(1),
      minorContusionRecoveryPenalty: nonNegativeInteger,
      untreatedOpenWoundRecoveryPenalty: safeNonNegativeInteger,
      minorInjuryRecoveryPenaltyCap: safeNonNegativeInteger,
      finalPlayableDay: safePositiveInteger,
    }),
  })
  .superRefine((config, context) => {
    if (config.backpack.width * config.backpack.height !== config.backpack.totalCells) {
      context.addIssue({
        code: 'custom',
        path: ['backpack', 'totalCells'],
        message: '背包总格数必须等于宽度乘高度',
      })
    }

    const { normal, loaded, overloaded, cannotCarryFrom } =
      config.backpack.weightBands

    if (
      normal.min > normal.max ||
      normal.max + 1 !== loaded.min ||
      loaded.min > loaded.max ||
      loaded.max + 1 !== overloaded.min ||
      overloaded.min > overloaded.max ||
      overloaded.max + 1 !== cannotCarryFrom
    ) {
      context.addIssue({
        code: 'custom',
        path: ['backpack', 'weightBands'],
        message: '负载区间必须连续且按正常、负载、超载、无法携带排序',
      })
    }

    const riskValues = [
      config.combat.riskTiers.none,
      config.combat.riskTiers.low,
      config.combat.riskTiers.medium,
      config.combat.riskTiers.high,
      config.combat.riskTiers['very-high'],
    ]
    if (riskValues.some((value, index) => index > 0 && value < riskValues[index - 1])) {
      context.addIssue({
        code: 'custom',
        path: ['combat', 'riskTiers'],
        message: '战斗风险层级百分比必须单调不下降',
      })
    }

    const sceneTimes = [
      config.scene.movementEdgeTime,
      config.scene.searchTime.withFlashlight,
      config.scene.searchTime.withoutFlashlight,
      config.scene.batteryUseTime,
      config.scene.extractionTime.direct,
      config.scene.extractionTime.cautious,
      config.medical.bandage.sceneTime,
      config.medical.painkiller.sceneTime,
      config.medical.disinfectant.sceneTime,
      config.medical.firstAidKit.sceneTime,
      config.scene.fireDoor.accessCardTime,
      config.scene.fireDoor.crowbarTime,
      config.scene.fireDoor.toolkitTime,
      config.scene.fireDoor.fireAxeTime,
      config.scene.fireDoor.forceEntryTime,
    ]

    if (sceneTimes.some((time) => time >= config.scene.totalTime)) {
      context.addIssue({
        code: 'custom',
        path: ['scene', 'totalTime'],
        message: '场景总时间必须大于每个单项基础场景时间',
      })
    }

    if (
      config.scene.fireDoor.protectedForceEntryInjuryRiskPercent >
      config.scene.fireDoor.forceEntryInjuryRiskPercent
    ) {
      context.addIssue({
        code: 'custom',
        path: [
          'scene',
          'fireDoor',
          'protectedForceEntryInjuryRiskPercent',
        ],
        message: '防护后的撞门伤势风险不得高于无防护风险',
      })
    }

    if (
      config.scene.pathogenCaseRetrieval.protectedDirectContaminationRiskPercent >
        config.scene.pathogenCaseRetrieval.directContaminationRiskPercent ||
      config.scene.pathogenCaseRetrieval.protectedCautiousContaminationRiskPercent >
        config.scene.pathogenCaseRetrieval.cautiousContaminationRiskPercent
    ) {
      context.addIssue({
        code: 'custom',
        path: ['scene', 'pathogenCaseRetrieval'],
        message: '防护后的样本箱污染风险不得高于无防护风险',
      })
    }

    const stages = config.worldThreat.stages
    if (
      stages[0]?.minProgress !== 0 ||
      stages.some((stage, index) =>
        index > 0 && stage.minProgress <= stages[index - 1].minProgress,
      ) ||
      new Set(stages.map(({ id }) => id)).size !== stages.length ||
      stages.some(({ id }) => id === config.worldThreat.terminal.stageId) ||
      config.worldThreat.terminal.minProgress <= stages[stages.length - 1].minProgress
    ) {
      context.addIssue({
        code: 'custom',
        path: ['worldThreat'],
        message: '世界威胁阶段必须从0开始、阈值递增、ID唯一且终末阈值位于普通阶段之后',
      })
    }

    if (config.dailySettlement.newRunInitialSatiety > config.dailySettlement.maxSatiety) {
      context.addIssue({
        code: 'custom',
        path: ['dailySettlement', 'newRunInitialSatiety'],
        message: '新Run初始饱食不得超过饱食上限',
      })
    }

    const satietyCaps = config.dailySettlement.satietyRecoveryCaps
    if (
      satietyCaps[0]?.min !== 0 ||
      satietyCaps.some((band, index) =>
        band.min > band.max ||
        band.max > config.dailySettlement.maxSatiety ||
        (index > 0 && satietyCaps[index - 1].max + 1 !== band.min),
      ) ||
      satietyCaps[satietyCaps.length - 1]?.max !== config.dailySettlement.maxSatiety
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dailySettlement', 'satietyRecoveryCaps'],
        message: '饱食恢复上限区间必须连续覆盖0到饱食上限',
      })
    }
  })

export type RuleConfigInput = z.input<typeof ruleConfigSchema>
export type RuleConfig = z.output<typeof ruleConfigSchema>
