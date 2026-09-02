import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NEW_RUN_INITIAL_LOADOUT_DEFINITION,
  HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS,
  createHospitalNewRunSetup,
  hospitalItemCatalog,
  type HospitalNewRunSetup,
} from '../../content'

export type HospitalNewRunUtilityOptionKey = 'crowbar' | 'flashlight' | 'toolkit'

export interface HospitalNewRunSetupViewModel {
  readonly fixedWeaponName: string
  readonly fixedArmorName: string
  readonly quickSlots: readonly Readonly<{
    slotNumber: number
    itemName: string | null
    quantity: number
  }>[]
  readonly backpackSummary: string
  readonly utilityOptions: readonly Readonly<{
    key: HospitalNewRunUtilityOptionKey
    name: string
    purpose: string
    cost: string
    limitation: string
  }>[]
  readonly specializationNotice: string
}

const utilityDefinitions = Object.freeze([
  Object.freeze({
    key: 'crowbar' as const,
    definitionId: HOSPITAL_ITEM_IDS.crowbar,
    purpose: '较安静、可控地处理隔离区防火门。',
    cost: '使用会消耗撬棍耐久。',
    limitation: '属于开门用实用装备，不提供金属管的战斗攻击。',
  }),
  Object.freeze({
    key: 'flashlight' as const,
    definitionId: HOSPITAL_ITEM_IDS.flashlight,
    purpose: '为三个低照明搜索节点提供照明，使搜索更快。',
    cost: '照明搜索会消耗照明次数。',
    limitation: '不会增加物品数量、提高稀有掉落概率或改变搜索随机结果。',
  }),
  Object.freeze({
    key: 'toolkit' as const,
    definitionId: HOSPITAL_ITEM_IDS.toolkit,
    purpose: '处理隔离区防火门，并在成功后揭示电子元件。',
    cost: '操作比撬棍更慢，并消耗工具箱耐久。',
    limitation: '是专业复合工具，不是更快的开门方案。',
  }),
])

if (
  utilityDefinitions.length !== HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS.length ||
  utilityDefinitions.some(({ definitionId }, index) =>
    definitionId !== HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS[index])
) throw new Error('医院New Run UI选项与正式内容不一致')

function itemName(definitionId: string): string {
  return hospitalItemCatalog.get(definitionId).name
}

export function createHospitalNewRunSetupViewModel(): HospitalNewRunSetupViewModel {
  const quickSlots = HOSPITAL_NEW_RUN_INITIAL_LOADOUT_DEFINITION.quickSlotDefinitionIds
    .map((definitionId, index) => Object.freeze({
      slotNumber: index + 1,
      itemName: definitionId === null ? null : itemName(definitionId),
      quantity: definitionId === null ? 0 : 1,
    }))
  return Object.freeze({
    fixedWeaponName: itemName(
      HOSPITAL_NEW_RUN_INITIAL_LOADOUT_DEFINITION.weaponDefinitionId,
    ),
    fixedArmorName: itemName(
      HOSPITAL_NEW_RUN_INITIAL_LOADOUT_DEFINITION.armorDefinitionId,
    ),
    quickSlots: Object.freeze(quickSlots),
    backpackSummary: HOSPITAL_NEW_RUN_INITIAL_LOADOUT_DEFINITION
      .backpackDefinitionIds.length === 0 ? '无额外物品' : '已有初始物品',
    utilityOptions: Object.freeze(utilityDefinitions.map(({
      key, definitionId, purpose, cost, limitation,
    }) => Object.freeze({
      key,
      name: itemName(definitionId),
      purpose,
      cost,
      limitation,
    }))),
    specializationNotice:
      '专长系统在当前医院一日验证版本中暂缓，将在完整七日感染世界里程碑前补回。',
  })
}

export function createHospitalNewRunSetupFromUiSelection(
  key: HospitalNewRunUtilityOptionKey,
): HospitalNewRunSetup {
  const option = utilityDefinitions.find((candidate) => candidate.key === key)
  if (!option) throw new Error('医院New Run UI实用装备选择无效')
  return createHospitalNewRunSetup({ utilityDefinitionId: option.definitionId })
}
