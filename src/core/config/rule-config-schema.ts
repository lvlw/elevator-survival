import { z } from 'zod'

const nonNegativeInteger = z.number().int().nonnegative()
const positiveInteger = z.number().int().positive()
const nonEmptyString = z.string().trim().min(1)

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
      }),
      batteryUseTime: positiveInteger,
      extractionTime: z.strictObject({
        direct: positiveInteger,
        cautious: positiveInteger,
      }),
      medicalTime: z.strictObject({
        bandage: positiveInteger,
        painkiller: positiveInteger,
        disinfectant: positiveInteger,
        firstAidKit: positiveInteger,
      }),
      combatTimeConversion: z.strictObject({
        ctbUnit: positiveInteger,
        sceneTimePerUnit: positiveInteger,
        minimumSceneTime: positiveInteger,
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
      player: z.strictObject({
        maxHealth: positiveInteger,
      }),
      infectedOrderly: z.strictObject({
        maxHealth: positiveInteger,
        firstActionTime: z.strictObject({
          unaware: positiveInteger,
          alerted: positiveInteger,
        }),
        actionInterval: z.strictObject({
          scratch: positiveInteger,
          lungeBite: positiveInteger,
        }),
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
    dailySettlement: z.strictObject({
      maxSatiety: positiveInteger,
      dailySatietyCost: nonNegativeInteger,
      unresolvedBleedingHealthLoss: nonNegativeInteger,
      minorContusionRecoveryPenalty: nonNegativeInteger,
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

    const sceneTimes = [
      config.scene.movementEdgeTime,
      config.scene.searchTime.withFlashlight,
      config.scene.searchTime.withoutFlashlight,
      config.scene.batteryUseTime,
      config.scene.extractionTime.direct,
      config.scene.extractionTime.cautious,
      ...Object.values(config.scene.medicalTime),
    ]

    if (sceneTimes.some((time) => time >= config.scene.totalTime)) {
      context.addIssue({
        code: 'custom',
        path: ['scene', 'totalTime'],
        message: '场景总时间必须大于每个单项基础场景时间',
      })
    }
  })

export type RuleConfigInput = z.input<typeof ruleConfigSchema>
export type RuleConfig = z.output<typeof ruleConfigSchema>
