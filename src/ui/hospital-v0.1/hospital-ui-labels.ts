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
