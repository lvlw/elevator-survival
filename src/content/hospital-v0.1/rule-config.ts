import { parseRuleConfig } from '../../core/config'

export const HOSPITAL_SLICE_RULES_VERSION = 'hospital-slice-v0.1'

export const hospitalSliceV01RuleConfig = parseRuleConfig({
  metadata: {
    rulesVersion: HOSPITAL_SLICE_RULES_VERSION,
    displayVersion: 'v0.1',
    name: '医院纵向切片 v0.1',
  },
  scene: {
    totalTime: 200,
    postActionBleedingDamage: 1,
    movementEdgeTime: 10,
    searchTime: {
      withFlashlight: 20,
      withoutFlashlight: 30,
      flashlightChargeCost: 1,
    },
    fireDoor: {
      accessCardTime: 10,
      crowbarTime: 20,
      toolkitTime: 30,
      fireAxeTime: 10,
      forceEntryTime: 20,
      equippedItemResourceCost: 1,
      impactProtectionIntegrityCost: 1,
      forceEntryInjuryRiskPercent: 60,
      protectedForceEntryInjuryRiskPercent: 20,
    },
    batteryUseTime: 10,
    extractionTime: {
      direct: 10,
      cautious: 30,
    },
    pathogenCaseRetrieval: {
      directContaminationRiskPercent: 60,
      cautiousContaminationRiskPercent: 20,
      protectedDirectContaminationRiskPercent: 40,
      protectedCautiousContaminationRiskPercent: 0,
      impactProtectionIntegrityCost: 1,
      exposureOnRiskSuccess: 1,
    },
    travelTimeModifiers: {
      minorContusionTimeIncreasePercent: 10,
    },
  },
  forcedReturn: {
    effectiveTimePerBaseDamage: 20,
    baseDamageCap: 4,
    bleedingExtraDamage: 1,
    bleedingExtraDamageCountsTowardBaseCap: false,
  },
  backpack: {
    width: 6,
    height: 4,
    totalCells: 24,
    quickSlotCount: 2,
    weightBands: {
      normal: { min: 0, max: 16, timeIncreasePercent: 0 },
      loaded: { min: 17, max: 24, timeIncreasePercent: 10 },
      overloaded: { min: 25, max: 28, timeIncreasePercent: 25 },
      cannotCarryFrom: 29,
    },
  },
  combat: {
    sceneTimeConversion: {
      minimumSceneTime: 10,
      ctbPerStep: 100,
      sceneTimePerStep: 10,
    },
    postPlayerActionBleedingDamage: 1,
    riskTiers: {
      none: 0,
      low: 20,
      medium: 40,
      high: 60,
      'very-high': 80,
    },
    player: {
      maxHealth: 12,
    },
    infectedOrderly: {
      maxHealth: 14,
      firstActionTime: {
        unaware: 70,
        alerted: 50,
        reentry: 50,
      },
      actions: {
        scratch: {
          ctb: 100,
          damage: 3,
          injuryRiskTier: 'high',
          exposureRiskTier: 'none',
        },
        lungeBite: {
          ctb: 140,
          damage: 7,
          injuryRiskTier: 'very-high',
          exposureRiskTier: 'high',
        },
      },
    },
    heavyCoat: {
      directDamageReduction: 1,
      injuryRiskTierReduction: 2,
      exposureRiskTierReduction: 1,
      integrityCostPerAttack: 1,
    },
    metalPipe: {
      maxDurability: 6,
      basicAttack: {
        damage: 4,
        ctb: 100,
        durabilityCost: 1,
      },
      chargedStrike: {
        damage: 6,
        ctb: 180,
        durabilityCost: 3,
        enemyActionDelay: 200,
        maxUsesPerExploration: 1,
      },
    },
    defend: {
      ctb: 80,
      remainingDamagePercent: 50,
      injuryRiskTierReduction: 1,
    },
    temporaryAttack: {
      damage: 2,
      ctb: 140,
      durabilityCost: 0,
      actionDelay: 0,
    },
    escape: {
      baseCtb: {
        normal: 80,
        loaded: 80,
        overloaded: 110,
      },
      ctbPerUntreatedOpenWound: 10,
      woundCtbBonusCap: 20,
    },
  },
  medical: {
    bandage: {
      combatCtb: 80,
      sceneTime: 10,
      hubSceneTime: 0,
      healthRecovery: 1,
      stopsBleeding: true,
      treatsOpenWound: true,
    },
    painkiller: {
      combatCtb: 80,
      sceneTime: 10,
      hubSceneTime: 0,
      stopsBleeding: false,
      suppressesMinorContusionMovementPenalty: true,
      escapeWoundCtbReduction: 10,
      minorInjuryRecoveryPenaltyReduction: 1,
      stacks: false,
    },
    disinfectant: {
      usableInCombat: false,
      sceneTime: 10,
      hubSceneTime: 0,
      pendingExposureReduction: 1,
      maxUsesPerDay: 1,
      reducesExistingInfectionProgress: false,
      stopsBleeding: false,
    },
    firstAidKit: {
      usableInCombat: false,
      sceneTime: 20,
      hubSceneTime: 0,
      healthRecovery: 4,
      minorInjuriesRemoved: 1,
      stopsBleedingWhenRemovingLastOpenWound: true,
    },
  },
  maintenance: {
    itemResourceMaximums: {
      fireAxeDurability: 2,
      heavyCoatIntegrity: 4,
      crowbarDurability: 3,
      toolkitDurability: 2,
    },
    dailyBaseLabor: {
      points: 3,
      recoveryPerPoint: 1,
    },
    materialRepair: {
      metalParts: {
        units: 1,
        mechanicalRepairPoints: 5,
      },
      fabric: {
        units: 1,
        textileRepairPoints: 4,
      },
    },
    toolkitRepair: {
      metalParts: 1,
      electronicComponents: 1,
      durabilityRecovery: 1,
    },
    flashlightCharge: {
      batteryUnits: 1,
      chargeRecovery: 3,
      maxCharge: 3,
    },
  },
  worldThreat: {
    definitionId: 'world_threat_hospital_infection',
    progressPerPendingExposure: 20,
    stages: [
      { id: 'none', minProgress: 0, dailyBaseIncrease: 0, dailyRecoveryModifier: { kind: 'fixed-penalty', amount: 0 } },
      { id: 'latent', minProgress: 1, dailyBaseIncrease: 5, dailyRecoveryModifier: { kind: 'fixed-penalty', amount: 0 } },
      { id: 'infected', minProgress: 30, dailyBaseIncrease: 10, dailyRecoveryModifier: { kind: 'fixed-penalty', amount: 1 } },
      { id: 'worsening', minProgress: 60, dailyBaseIncrease: 15, dailyRecoveryModifier: { kind: 'blocked' } },
      { id: 'critical', minProgress: 90, dailyBaseIncrease: 20, dailyRecoveryModifier: { kind: 'blocked' } },
    ],
    terminal: {
      stageId: 'terminal',
      minProgress: 120,
    },
    suppressant: {
      dailyReduction: 15,
      maxUsesPerDay: 1,
      hubSceneTime: 0,
    },
  },
  dailySettlement: {
    maxSatiety: 6,
    newRunInitialSatiety: 6,
    dailySatietyCost: 2,
    rationRecovery: 2,
    rationHubSceneTime: 0,
    unresolvedBleedingHealthLoss: 2,
    baseHealthRecovery: 2,
    deprivationHealthLoss: 1,
    satietyRecoveryCaps: [
      { min: 0, max: 1, maxHealthRecovery: 0, deprived: true },
      { min: 2, max: 3, maxHealthRecovery: 1, deprived: false },
      { min: 4, max: 6, maxHealthRecovery: 2, deprived: false },
    ],
    minorContusionRecoveryPenalty: 1,
    untreatedOpenWoundRecoveryPenalty: 1,
    minorInjuryRecoveryPenaltyCap: 2,
    finalPlayableDay: 7,
  },
})
