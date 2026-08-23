import {
  HOSPITAL_ENEMY_ACTION_IDS,
  HOSPITAL_ENEMY_IDS,
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
})
