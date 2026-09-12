import {
  HOSPITAL_ENEMY_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_OBSTACLE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_TASK_EVENT_IDS,
} from '../../content'
import type {
  PresentationVisualKey,
  StableRunUiPresentationAssets,
} from '../presentation/presentation-assets'

const itemKeys: Readonly<Record<string, PresentationVisualKey>> = Object.freeze({
  [HOSPITAL_ITEM_IDS.metalPipe]: 'metal-pipe',
  [HOSPITAL_ITEM_IDS.heavyCoat]: 'heavy-coat',
  [HOSPITAL_ITEM_IDS.flashlight]: 'flashlight',
  [HOSPITAL_ITEM_IDS.bandage]: 'bandage',
  [HOSPITAL_ITEM_IDS.isolationWardAccessCard]: 'isolation-access-card',
  [HOSPITAL_ITEM_IDS.sealedPathogenCase]: 'sealed-pathogen-case',
})

const enemyStageKeys: Readonly<Record<string, PresentationVisualKey>> = Object.freeze({
  healthy: 'infected-orderly-pristine',
  wounded: 'infected-orderly-wounded',
  'severely-wounded': 'infected-orderly-heavy-wounded',
  critical: 'infected-orderly-critical',
  incapacitated: 'infected-orderly-disabled',
})

/** Hospital content owns the ID allow-list; generic UI only receives safe keys. */
export const hospitalV01PresentationAssets: StableRunUiPresentationAssets = Object.freeze({
  hubBackgroundKey: 'hub-elevator',
  itemVisualKey(definitionId: string) {
    return itemKeys[definitionId] ?? null
  },
  enemyVisualKey(definitionId: string, healthStage: keyof typeof enemyStageKeys) {
    return definitionId === HOSPITAL_ENEMY_IDS.infectedOrderly
      ? enemyStageKeys[healthStage] ?? null
      : null
  },
  sceneNodeVisualKey(nodeId: string) {
    if (nodeId === HOSPITAL_NODE_IDS.emergencyHall) return 'emergency-hall'
    if (nodeId === HOSPITAL_NODE_IDS.isolationCorridor) return 'isolation-corridor'
    return null
  },
  obstacleVisualKey(obstacleId: string) {
    return obstacleId === HOSPITAL_OBSTACLE_IDS.isolationFireDoor
      ? 'isolation-fire-door'
      : null
  },
  taskEventVisualKey(eventId: string) {
    return eventId === HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval
      ? 'pathogen-case-objective'
      : null
  },
  isAccessCardObstacleOption(obstacleId: string, optionId: string) {
    return obstacleId === HOSPITAL_OBSTACLE_IDS.isolationFireDoor &&
      optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard
  },
})
