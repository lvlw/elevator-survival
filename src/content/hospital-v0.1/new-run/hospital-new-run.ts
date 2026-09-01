import { deepFreeze } from '../../../core/config'
import { createInitialPlayerCondition } from '../../../core/condition'
import {
  createRunIdentity,
  createRunPhaseContinuitySnapshot,
  deriveSceneInstanceIdFromRunFacts,
  type RunIdentity,
} from '../../../core/domain'
import { createInitialDailyRunStateSnapshot } from '../../../core/daily-state'
import { createEquipmentSnapshot } from '../../../core/equipment'
import { createBackpackSnapshot, createItemInstance, type ItemInstance } from '../../../core/inventory'
import { createFullItemState } from '../../../core/item-state'
import { createQuickSlotSnapshot } from '../../../core/quick-slot'
import { createInitialRunIntelLogSnapshot } from '../../../core/run-intel'
import { createRunLoadoutDependenciesFromReturn, createRunLoadoutSnapshot } from '../../../core/run-loadout'
import { createInitialSatietySnapshot } from '../../../core/satiety'
import { createWorldThreatSnapshot } from '../../../core/world-threat'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubDependencies,
  type CurrentDayHubSnapshot,
} from '../../../core/current-day-hub'
import { HOSPITAL_ITEM_IDS } from '../items'
import { HOSPITAL_SCENE_DEFINITION_ID } from '../hospital-scene-runtime'
import { HOSPITAL_SLICE_RULES_VERSION } from '../rule-config'

export const HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS = Object.freeze([
  HOSPITAL_ITEM_IDS.crowbar,
  HOSPITAL_ITEM_IDS.flashlight,
  HOSPITAL_ITEM_IDS.toolkit,
] as const)

export type HospitalNewRunUtilityDefinitionId =
  typeof HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS[number]

export interface HospitalNewRunSetup {
  readonly utilityDefinitionId: HospitalNewRunUtilityDefinitionId
}

export interface HospitalNewRunInitialPhaseInput extends HospitalNewRunSetup {
  readonly runIdentity: RunIdentity
}

export class HospitalNewRunError extends Error {
  public readonly code: 'INVALID_SETUP' | 'INVALID_IDENTITY' | 'INVALID_DEPENDENCIES'

  public constructor(code: HospitalNewRunError['code'], message: string) {
    super(message)
    this.name = 'HospitalNewRunError'
    this.code = code
  }
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createHospitalNewRunSetup(input: unknown): HospitalNewRunSetup {
  if (!exact(input, ['utilityDefinitionId']) ||
    !HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS.includes(
      input.utilityDefinitionId as HospitalNewRunUtilityDefinitionId,
    )) {
    throw new HospitalNewRunError('INVALID_SETUP', '医院New Run初始实用装备选择无效')
  }
  return deepFreeze({
    utilityDefinitionId: input.utilityDefinitionId as HospitalNewRunUtilityDefinitionId,
  })
}

type InitialItemRole =
  | 'initial-weapon'
  | 'initial-armor'
  | 'initial-utility'
  | 'initial-quick-slot-0'

/** Stable initial ownership identity; it consumes no gameplay or environment RNG. */
export function deriveHospitalInitialItemInstanceId(input: Readonly<{
  runIdentity: RunIdentity
  role: InitialItemRole
  definitionId: string
}>): string {
  const runIdentity = createRunIdentity(
    input.runIdentity,
    (rulesVersion) => rulesVersion === HOSPITAL_SLICE_RULES_VERSION,
  )
  if (!['initial-weapon', 'initial-armor', 'initial-utility', 'initial-quick-slot-0']
    .includes(input.role) || typeof input.definitionId !== 'string' || !input.definitionId.trim()) {
    throw new HospitalNewRunError('INVALID_IDENTITY', '医院初始物品身份事实无效')
  }
  return [
    'initial-item',
    runIdentity.runId,
    runIdentity.seed,
    runIdentity.rulesVersion,
    input.role,
    input.definitionId,
  ].map((part) => encodeURIComponent(part)).join(':')
}

function initialItem(
  runIdentity: RunIdentity,
  role: InitialItemRole,
  definitionId: string,
  dependencies: CurrentDayHubDependencies,
): Readonly<ItemInstance> {
  return createItemInstance({
    instanceId: deriveHospitalInitialItemInstanceId({ runIdentity, role, definitionId }),
    definitionId,
    quantity: 1,
  }, dependencies.returnDependencies.scene.physicalCatalog)
}

/** Builds the complete version-bound Day 1 initial Hub and no other lifecycle state. */
export function createHospitalNewRunInitialCurrentDayHub(
  input: unknown,
  dependencies: CurrentDayHubDependencies,
): CurrentDayHubSnapshot {
  if (!exact(input, ['runIdentity', 'utilityDefinitionId'])) {
    throw new HospitalNewRunError('INVALID_SETUP', '医院New Run初始状态输入结构无效')
  }
  if (dependencies.mainSceneDefinitionId !== HOSPITAL_SCENE_DEFINITION_ID ||
    dependencies.returnDependencies.scene.config.metadata.rulesVersion !==
      HOSPITAL_SLICE_RULES_VERSION) {
    throw new HospitalNewRunError('INVALID_DEPENDENCIES', '医院New Run依赖与正式内容版本不一致')
  }
  let runIdentity: RunIdentity
  try {
    runIdentity = createRunIdentity(
      input.runIdentity as RunIdentity,
      (rulesVersion) => rulesVersion === HOSPITAL_SLICE_RULES_VERSION,
    )
  } catch (error) {
    throw new HospitalNewRunError(
      'INVALID_IDENTITY',
      error instanceof Error ? error.message : '医院New Run身份无效',
    )
  }
  const setup = createHospitalNewRunSetup({
    utilityDefinitionId: input.utilityDefinitionId,
  })
  const sceneInstanceId = deriveSceneInstanceIdFromRunFacts({
    runIdentity,
    currentDay: 1,
    sceneDefinitionId: HOSPITAL_SCENE_DEFINITION_ID,
  })
  const weapon = initialItem(
    runIdentity,
    'initial-weapon',
    HOSPITAL_ITEM_IDS.metalPipe,
    dependencies,
  )
  const armor = initialItem(
    runIdentity,
    'initial-armor',
    HOSPITAL_ITEM_IDS.heavyCoat,
    dependencies,
  )
  const utility = initialItem(
    runIdentity,
    'initial-utility',
    setup.utilityDefinitionId,
    dependencies,
  )
  const bandage = initialItem(
    runIdentity,
    'initial-quick-slot-0',
    HOSPITAL_ITEM_IDS.bandage,
    dependencies,
  )
  const config = dependencies.returnDependencies.scene.config
  const loadoutDependencies = createRunLoadoutDependenciesFromReturn(
    dependencies.returnDependencies,
  )
  const items = [weapon, armor, utility, bandage]
  const runLoadout = createRunLoadoutSnapshot({
    warehouse: { items: [] },
    taskStorage: { items: [] },
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [],
      placements: [],
    }, dependencies.returnDependencies.scene.physicalCatalog),
    equipment: createEquipmentSnapshot({ weapon, armor, utility },
      dependencies.returnDependencies.scene.physicalCatalog,
      dependencies.returnDependencies.scene.equipmentCatalog),
    quickSlots: createQuickSlotSnapshot(
      [bandage, null],
      config.backpack.quickSlotCount,
      dependencies.returnDependencies.scene.physicalCatalog,
      dependencies.returnDependencies.scene.quickSlotCatalog,
    ),
    itemStates: {
      states: items.map((item) => createFullItemState(
        item,
        dependencies.returnDependencies.scene.itemResourceCatalog,
      )),
    },
  }, loadoutDependencies)

  return createCurrentDayHubSnapshot({
    continuity: createRunPhaseContinuitySnapshot({
      runIdentity,
      currentDay: 1,
      sceneInstanceId,
    }, HOSPITAL_SLICE_RULES_VERSION),
    runLoadout,
    playerCondition: createInitialPlayerCondition(config.combat.player),
    runIntelLog: createInitialRunIntelLogSnapshot(),
    dailyState: createInitialDailyRunStateSnapshot(config),
    worldThreat: createWorldThreatSnapshot({
      definitionId: config.worldThreat.definitionId,
      progress: 0,
    }, dependencies.worldThreatCatalog),
    satiety: createInitialSatietySnapshot(config),
    returnLedger: { sceneInstanceIds: [] },
  }, dependencies)
}
