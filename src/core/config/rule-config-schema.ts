import { z } from 'zod'

const nonNegativeInteger = z.number().int().nonnegative()
const positiveInteger = z.number().int().positive()
const nonEmptyString = z.string().trim().min(1)

export const ruleConfigSchema = z
  .object({
    metadata: z.object({
      rulesVersion: nonEmptyString,
      displayVersion: nonEmptyString,
      name: nonEmptyString,
    }),
    scene: z.object({
      totalTime: positiveInteger,
      movementEdgeTime: positiveInteger,
      searchTime: z.object({
        withFlashlight: positiveInteger,
        withoutFlashlight: positiveInteger,
      }),
      batteryUseTime: positiveInteger,
      extractionTime: z.object({
        direct: positiveInteger,
        cautious: positiveInteger,
      }),
      medicalTime: z.object({
        bandage: positiveInteger,
        painkiller: positiveInteger,
        disinfectant: positiveInteger,
        firstAidKit: positiveInteger,
      }),
      combatTimeConversion: z.object({
        ctbUnit: positiveInteger,
        sceneTimePerUnit: positiveInteger,
        minimumSceneTime: positiveInteger,
      }),
    }),
    forcedReturn: z.object({
      effectiveTimePerBaseDamage: positiveInteger,
      baseDamageCap: positiveInteger,
      bleedingExtraDamage: positiveInteger,
      bleedingExtraDamageCountsTowardBaseCap: z.literal(false),
    }),
    backpack: z.object({
      width: positiveInteger,
      height: positiveInteger,
      totalCells: positiveInteger,
      weightBands: z.object({
        normal: z.object({
          min: nonNegativeInteger,
          max: nonNegativeInteger,
          timeIncreasePercent: nonNegativeInteger,
        }),
        loaded: z.object({
          min: nonNegativeInteger,
          max: nonNegativeInteger,
          timeIncreasePercent: nonNegativeInteger,
        }),
        overloaded: z.object({
          min: nonNegativeInteger,
          max: nonNegativeInteger,
          timeIncreasePercent: nonNegativeInteger,
        }),
        cannotCarryFrom: positiveInteger,
      }),
    }),
    combat: z.object({
      player: z.object({
        maxHealth: positiveInteger,
      }),
      infectedOrderly: z.object({
        maxHealth: positiveInteger,
        firstActionTime: z.object({
          unaware: positiveInteger,
          alerted: positiveInteger,
        }),
        actionInterval: z.object({
          scratch: positiveInteger,
          lungeBite: positiveInteger,
        }),
      }),
      metalPipe: z.object({
        maxDurability: positiveInteger,
        basicAttack: z.object({
          damage: nonNegativeInteger,
          ctb: positiveInteger,
          durabilityCost: nonNegativeInteger,
        }),
        chargedStrike: z.object({
          damage: nonNegativeInteger,
          ctb: positiveInteger,
          durabilityCost: nonNegativeInteger,
          enemyActionDelay: nonNegativeInteger,
          maxUsesPerExploration: positiveInteger,
        }),
      }),
      defend: z.object({
        ctb: positiveInteger,
      }),
      temporaryAttack: z.object({
        damage: nonNegativeInteger,
        ctb: positiveInteger,
        durabilityCost: nonNegativeInteger,
        actionDelay: nonNegativeInteger,
      }),
      escape: z.object({
        baseCtb: z.object({
          normal: positiveInteger,
          loaded: positiveInteger,
          overloaded: positiveInteger,
        }),
        ctbPerUntreatedOpenWound: nonNegativeInteger,
        woundCtbBonusCap: nonNegativeInteger,
      }),
    }),
    medical: z.object({
      bandage: z.object({
        combatCtb: positiveInteger,
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        healthRecovery: nonNegativeInteger,
        stopsBleeding: z.boolean(),
        treatsOpenWound: z.boolean(),
      }),
      painkiller: z.object({
        combatCtb: positiveInteger,
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        stopsBleeding: z.boolean(),
        suppressesMinorContusionMovementPenalty: z.boolean(),
        escapeWoundCtbReduction: nonNegativeInteger,
        minorInjuryRecoveryPenaltyReduction: nonNegativeInteger,
        stacks: z.boolean(),
      }),
      disinfectant: z.object({
        usableInCombat: z.literal(false),
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        pendingExposureReduction: nonNegativeInteger,
        maxUsesPerDay: positiveInteger,
        reducesExistingInfectionProgress: z.boolean(),
        stopsBleeding: z.boolean(),
      }),
      firstAidKit: z.object({
        usableInCombat: z.literal(false),
        sceneTime: positiveInteger,
        hubSceneTime: nonNegativeInteger,
        healthRecovery: nonNegativeInteger,
        minorInjuriesRemoved: positiveInteger,
        stopsBleedingWhenRemovingLastOpenWound: z.boolean(),
      }),
    }),
    maintenance: z.object({
      dailyBaseLabor: z.object({
        points: nonNegativeInteger,
        recoveryPerPoint: positiveInteger,
      }),
      materialRepair: z.object({
        metalParts: z.object({
          units: positiveInteger,
          mechanicalRepairPoints: positiveInteger,
        }),
        fabric: z.object({
          units: positiveInteger,
          textileRepairPoints: positiveInteger,
        }),
      }),
      toolkitRepair: z.object({
        metalParts: positiveInteger,
        electronicComponents: positiveInteger,
        durabilityRecovery: positiveInteger,
      }),
      flashlightCharge: z.object({
        batteryUnits: positiveInteger,
        chargeRecovery: positiveInteger,
        maxCharge: positiveInteger,
      }),
    }),
    dailySettlement: z.object({
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
