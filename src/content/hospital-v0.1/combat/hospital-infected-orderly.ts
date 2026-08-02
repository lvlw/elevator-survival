import {
  createEnemyDefinitionCatalog,
  type CombatContentBindings,
  type EnemyDefinition,
} from '../../../core/combat'
import { HOSPITAL_ITEM_IDS } from '../items'
import { hospitalSliceV01RuleConfig } from '../rule-config'

export const HOSPITAL_ENEMY_IDS = Object.freeze({
  infectedOrderly: 'enemy_infected_orderly',
} as const)

export const HOSPITAL_ENEMY_ACTION_IDS = Object.freeze({
  orderlyScratch: 'enemy_action_orderly_scratch',
  orderlyLungeBite: 'enemy_action_orderly_lunge_bite',
} as const)

export const hospitalInfectedOrderlyDefinition = {
  id: HOSPITAL_ENEMY_IDS.infectedOrderly,
  maxHealth: hospitalSliceV01RuleConfig.combat.infectedOrderly.maxHealth,
  tags: ['infected', 'humanoid'],
  weaknessTags: ['blunt-control'],
  actions: [
    { id: HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch, kind: 'scratch' },
    { id: HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite, kind: 'lunge-bite' },
  ],
  actionCycle: [
    HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
    HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite,
  ],
  initialIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
} satisfies EnemyDefinition

export const hospitalEnemyCatalog = createEnemyDefinitionCatalog([
  hospitalInfectedOrderlyDefinition,
])

export const hospitalCombatContentBindings: CombatContentBindings = Object.freeze({
  enemyDefinitionId: HOSPITAL_ENEMY_IDS.infectedOrderly,
  metalPipeDefinitionId: HOSPITAL_ITEM_IDS.metalPipe,
  heavyCoatDefinitionId: HOSPITAL_ITEM_IDS.heavyCoat,
})
