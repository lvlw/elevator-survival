import {
  HOSPITAL_ENEMY_ACTION_IDS,
  HOSPITAL_ENEMY_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_OBSTACLE_IDS,
  HOSPITAL_SCENE_DEFINITION_ID,
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
})
