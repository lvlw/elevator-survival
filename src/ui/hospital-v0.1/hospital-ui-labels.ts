import {
  HOSPITAL_ENEMY_ACTION_IDS,
  HOSPITAL_ENEMY_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_OBSTACLE_IDS,
  HOSPITAL_SCENE_DEFINITION_ID,
  HOSPITAL_TASK_EVENT_IDS,
  HOSPITAL_TASK_EVENT_OPTION_IDS,
  hospitalItemCatalog,
} from '../../content'
import type { StableRunUiLabels } from '../presentation'

const worldThreatLabels: Readonly<Record<string, string>> = Object.freeze({
  none: '无感染',
  latent: '潜伏',
  infected: '感染',
  worsening: '恶化',
  critical: '危急',
  terminal: '感染终末',
})

const obstacleOptionLabels: Readonly<Record<string, string>> = Object.freeze({
  [HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard]: '使用门禁卡',
  [HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar]: '使用撬棍',
  [HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit]: '使用工具箱',
  [HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe]: '使用消防斧',
  [HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry]: '强行撞门',
  [HOSPITAL_FIRE_DOOR_OPTION_IDS.decline]: '放弃处理',
})

const taskEventOptionLabels: Readonly<Record<string, string>> = Object.freeze({
  [HOSPITAL_TASK_EVENT_OPTION_IDS.cautiousExtraction]: '谨慎检查并提取',
  [HOSPITAL_TASK_EVENT_OPTION_IDS.directExtraction]: '直接取出',
  [HOSPITAL_TASK_EVENT_OPTION_IDS.decline]: '放弃提取',
})

const itemHelp: Readonly<Record<string, Readonly<{
  role: string
  summary: string
  usageHints: readonly string[]
}>>> = Object.freeze({
  [HOSPITAL_ITEM_IDS.metalPipe]: Object.freeze({ role: '均衡钝击武器', summary: '提供稳定伤害与控制，适合常规近战。', usageHints: Object.freeze(['标志性攻击可以延后敌人行动。', '攻击会消耗耐久。']) }),
  [HOSPITAL_ITEM_IDS.fireAxe]: Object.freeze({ role: '重型劈砍武器', summary: '伤害高、行动慢且噪声大，也能处理部分重型障碍。', usageHints: Object.freeze(['适合护甲或坚固目标。', '作为备用物品时占用较多背包空间和负重。']) }),
  [HOSPITAL_ITEM_IDS.heavyCoat]: Object.freeze({ role: '基础防护装备', summary: '降低部分直接伤害、轻度伤势风险及部分污染暴露风险。', usageHints: Object.freeze(['防护会消耗完整度。', '完整度耗尽后仍保留物品身份，但不再提供完整防护。']) }),
  [HOSPITAL_ITEM_IDS.crowbar]: Object.freeze({ role: '破障实用装备', summary: '以相对安静的方式处理部分封闭障碍，并尽量保留物资。', usageHints: Object.freeze(['使用会消耗耐久。']) }),
  [HOSPITAL_ITEM_IDS.flashlight]: Object.freeze({ role: '照明实用装备', summary: '让低照明搜索更快、信息更清楚，不提高掉落数量或稀有度。', usageHints: Object.freeze(['照明搜索消耗电量。', '标准电池可以为手电筒补充电量。']) }),
  [HOSPITAL_ITEM_IDS.toolkit]: Object.freeze({ role: '工程实用装备', summary: '用于精密工程操作和部分设施处理。', usageHints: Object.freeze(['使用会消耗耐久。', '工具方案通常比暴力破障更利于保留资源。']) }),
  [HOSPITAL_ITEM_IDS.bandage]: Object.freeze({ role: '伤口处理消耗品', summary: '用于处理指定的未处理开放伤口并停止相应流血。', usageHints: Object.freeze(['必须由玩家明确选择合法伤口。', '使用真实物品单位，不会自动补充快捷栏。']) }),
  [HOSPITAL_ITEM_IDS.disinfectant]: Object.freeze({ role: '暴露处理消耗品', summary: '用于减少尚未结算的感染暴露。', usageHints: Object.freeze(['它处理的是未结算暴露，不等同于逆转感染进展。']) }),
  [HOSPITAL_ITEM_IDS.firstAidKit]: Object.freeze({ role: '综合医疗消耗品', summary: '提供正式医疗行动中定义的生命与伤口处理。', usageHints: Object.freeze(['具体目标、效果和成本以行动预览为准。']) }),
  [HOSPITAL_ITEM_IDS.painkiller]: Object.freeze({ role: '镇痛消耗品', summary: '在正式允许的伤势状态下启用镇痛。', usageHints: Object.freeze(['不能在无伤势时预防性服用。', '已有镇痛时不能叠加或刷新。']) }),
  [HOSPITAL_ITEM_IDS.ration]: Object.freeze({ role: '生存补给', summary: '在电梯中枢恢复饱食，用于准备每日结算。', usageHints: Object.freeze(['饱食上限与恢复结果来自当前规则版本。']) }),
  [HOSPITAL_ITEM_IDS.infectionSuppressant]: Object.freeze({ role: '感染抑制补给', summary: '降低当日结算中的感染增加。', usageHints: Object.freeze(['它不直接清除未结算感染暴露。', '每日使用限制以正式行动预览为准。']) }),
  [HOSPITAL_ITEM_IDS.standardBattery]: Object.freeze({ role: '设备补给', summary: '为手电筒补充电量。', usageHints: Object.freeze(['实际恢复量和浪费由正式充能预览给出。']) }),
  [HOSPITAL_ITEM_IDS.metalParts]: Object.freeze({ role: '维修材料', summary: '用于正式装备维修操作。', usageHints: Object.freeze(['兼容目标和恢复量以维修预览为准。']) }),
  [HOSPITAL_ITEM_IDS.electronicComponents]: Object.freeze({ role: '维修材料', summary: '用于电子设备维修。', usageHints: Object.freeze(['兼容目标和恢复量以维修预览为准。']) }),
  [HOSPITAL_ITEM_IDS.fabric]: Object.freeze({ role: '维修材料', summary: '用于防护装备维修。', usageHints: Object.freeze(['兼容目标和恢复量以维修预览为准。']) }),
  [HOSPITAL_ITEM_IDS.isolationWardAccessCard]: Object.freeze({ role: '权限物品', summary: '提供医院工作人员通道所需的实体权限。', usageHints: Object.freeze(['放在背包中即可提供权限。', '通行不会消耗门禁卡。']) }),
  [HOSPITAL_ITEM_IDS.sealedPathogenCase]: Object.freeze({ role: '任务物品', summary: '医院行动的主要任务目标，必须安全带回电梯才计入任务进度。', usageHints: Object.freeze(['占用背包空间并计算背包负重。', '取得不等于已经安全入库。']) }),
})

const fallbackItemHelp = Object.freeze({
  role: '行动物品',
  summary: '用于当前行动的正式物品。',
  usageHints: Object.freeze(['具体用途和代价以可执行行动及正式预览为准。']),
})

/** Hospital V1 owns display copy only; it never owns gameplay state or rules. */
export const hospitalV01UiLabels: StableRunUiLabels = Object.freeze({
  sceneName(sceneDefinitionId: string): string {
    return sceneDefinitionId === HOSPITAL_SCENE_DEFINITION_ID
      ? '封锁医院·急诊楼一层'
      : '未知场景'
  },
  itemName(definitionId: string, fallback: string): string {
    return hospitalItemCatalog.has(definitionId)
      ? hospitalItemCatalog.get(definitionId).name
      : fallback
  },
  itemHelp(definitionId: string) {
    return itemHelp[definitionId] ?? fallbackItemHelp
  },
  itemResourceName(
    definitionId: string,
    resourceKind: 'durability' | 'integrity' | 'charge',
  ): string {
    if (definitionId === HOSPITAL_ITEM_IDS.flashlight && resourceKind === 'charge') {
      return '照明'
    }
    return resourceKind === 'durability'
      ? '耐久'
      : resourceKind === 'integrity'
        ? '完整度'
        : '电量'
  },
  sceneRouteName(edgeId: string): string {
    if (edgeId === HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor) {
      return '工作人员通道'
    }
    if (edgeId === HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor) {
      return '隔离区防火门路线'
    }
    return '医院通道'
  },
  sceneRouteAccessReason(requiredDefinitionId: string): string {
    return requiredDefinitionId === HOSPITAL_ITEM_IDS.isolationWardAccessCard
      ? '门禁卡已授权'
      : '当前已获授权'
  },
  primaryMissionBriefing() {
    return Object.freeze({
      objective: '取得密封病原样本箱并安全带回电梯。',
      completion: '取得样本不等于完成任务；安全返回后，样本箱进入任务储存区才计入任务进度。',
    })
  },
  dayScopeNotice(currentDay: number): string | null {
    return currentDay >= 2
      ? '当前版本正式验证的是医院一个完整探索日。第 2 日及之后仍可用于工程回归测试，但完整七日资源供给、世界推进和最终终局尚未实现；当前状态不代表完整七日游戏体验。'
      : null
  },
  enemyName(definitionId: string): string {
    return definitionId === HOSPITAL_ENEMY_IDS.infectedOrderly
      ? '感染护工'
      : '未知敌对目标'
  },
  enemyIntentName(intentId: string): string {
    if (intentId === HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch) return '抓挠'
    if (intentId === HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite) return '扑咬'
    return '未知意图'
  },
  worldThreatStageName(stageId: string): string {
    return worldThreatLabels[stageId] ?? '未知威胁阶段'
  },
  failureReason(reason: string): string {
    return reason === 'health-depleted' ? '生命耗尽' : '世界威胁终末'
  },
  obstacleName(obstacleId: string): string {
    return obstacleId === HOSPITAL_OBSTACLE_IDS.isolationFireDoor
      ? '隔离区防火门'
      : '未知障碍'
  },
  obstacleOptionName(optionId: string): string {
    return obstacleOptionLabels[optionId] ?? '未知处理方案'
  },
  taskEventName(eventId: string): string {
    return eventId === HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval
      ? '密封病原样本箱提取'
      : '未知任务事件'
  },
  taskEventOptionName(optionId: string): string {
    return taskEventOptionLabels[optionId] ?? '未知任务事件选项'
  },
})
