import {
  createCombatEncounterSnapshot,
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
} from '../combat'
import type { EnemyPersistentCombatState } from '../combat'
import { deepFreeze } from '../config'
import { hasExactObjectKeys } from '../combat/combat-validation'
import { SceneCombatError } from './scene-combat-errors'
import type {
  SceneCombatDependencies,
  SceneCombatEncounterSnapshot,
  SceneCombatStateSnapshot,
} from './scene-combat-types'

export function createStableSceneEnemyInstanceId(
  sceneInstanceId: string,
  encounterId: string,
  enemyDefinitionId: string,
): string {
  if ([sceneInstanceId, encounterId, enemyDefinitionId].some((value) => value.trim().length === 0)) {
    throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '稳定敌人实例ID输入不能为空')
  }
  return `scene-enemy:${encodeURIComponent(sceneInstanceId)}:${encodeURIComponent(encounterId)}:${encodeURIComponent(enemyDefinitionId)}`
}

export function createInitialSceneCombatState(
  sceneInstanceId: string,
  dependencies: SceneCombatDependencies,
): SceneCombatStateSnapshot {
  const encounters = dependencies.encounterCatalog.definitionIds.map((id) => {
    const encounter = dependencies.encounterCatalog.get(id)
    const enemyDefinition = dependencies.combat.enemyCatalog.get(encounter.enemyDefinitionId)
    const initialIndex = enemyDefinition.actionCycle.indexOf(enemyDefinition.initialIntentActionId)
    return {
      kind: 'dormant' as const,
      encounterId: encounter.id,
      eventId: encounter.eventId,
      nodeId: encounter.nodeId,
      enemy: createEnemyPersistentCombatState({
        enemyInstanceId: createStableSceneEnemyInstanceId(sceneInstanceId, encounter.id, encounter.enemyDefinitionId),
        definitionId: encounter.enemyDefinitionId,
        currentHealth: enemyDefinition.maxHealth,
        currentIntentActionId: enemyDefinition.initialIntentActionId,
        nextCycleIndex: (initialIndex + 1) % enemyDefinition.actionCycle.length,
        resolvedActionCount: 0,
        hasBeenEncountered: false,
        defeated: false,
      }, enemyDefinition),
    }
  })
  return deepFreeze({
    encounters,
    usage: createExplorationCombatUsage(
      { metalPipeChargedStrikeUses: 0 },
      dependencies.combat.config,
    ),
  })
}

export function createSceneCombatStateSnapshot(
  input: SceneCombatStateSnapshot,
  sceneInstanceId: string,
  dependencies: SceneCombatDependencies,
): SceneCombatStateSnapshot {
  if (!hasExactObjectKeys(input, ['encounters', 'usage']) || !Array.isArray(input.encounters)) {
    throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '场景战斗状态顶层结构无效')
  }
  const usage = createExplorationCombatUsage(input.usage, dependencies.combat.config)
  if (input.encounters.length !== dependencies.encounterCatalog.definitionIds.length) {
    throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '场景战斗状态未完整覆盖遭遇目录')
  }
  let activeCount = 0
  const encounters: SceneCombatEncounterSnapshot[] = []
  for (let index = 0; index < input.encounters.length; index += 1) {
    const value = input.encounters[index]
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      (value.kind !== 'dormant' && value.kind !== 'active')
    ) {
      throw new SceneCombatError(
        'INVALID_SCENE_COMBAT_STATE',
        '遭遇状态元素必须是具有合法kind的普通对象',
      )
    }
    const definition = dependencies.encounterCatalog.get(
      dependencies.encounterCatalog.definitionIds[index],
    )
    if (
      value.encounterId !== definition.id ||
      value.eventId !== definition.eventId ||
      value.nodeId !== definition.nodeId
    ) {
      throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '遭遇状态顺序或身份与目录不一致')
    }
    const expectedInstanceId = createStableSceneEnemyInstanceId(
      sceneInstanceId,
      definition.id,
      definition.enemyDefinitionId,
    )
    if (value.kind === 'dormant') {
      if (!hasExactObjectKeys(value, ['encounterId', 'enemy', 'eventId', 'kind', 'nodeId'])) {
        throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '休眠遭遇字段无效')
      }
      const enemy = createEnemyPersistentCombatState(
        value.enemy as EnemyPersistentCombatState,
        dependencies.combat.enemyCatalog.get(definition.enemyDefinitionId),
      )
      if (enemy.enemyInstanceId !== expectedInstanceId) {
        throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '敌人实例ID与稳定身份不一致')
      }
      encounters.push(deepFreeze({
        kind: 'dormant',
        encounterId: definition.id,
        eventId: definition.eventId,
        nodeId: definition.nodeId,
        enemy,
      }))
    } else if (value.kind === 'active') {
      if (!hasExactObjectKeys(value, [
        'combat',
        'encounterId',
        'engagement',
        'entryEdgeId',
        'eventId',
        'kind',
        'nodeId',
        'returnNodeId',
      ])) {
        throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '活跃遭遇字段无效')
      }
      const combat = createCombatEncounterSnapshot(
        value.combat as import('../combat').CombatEncounterSnapshot,
        dependencies.combat,
      )
      if (
        combat.status !== 'awaiting-player' ||
        combat.enemy.enemyInstanceId !== expectedInstanceId ||
        combat.enemy.definitionId !== definition.enemyDefinitionId ||
        typeof value.returnNodeId !== 'string' ||
        value.returnNodeId.trim().length === 0 ||
        typeof value.entryEdgeId !== 'string' ||
        value.entryEdgeId.trim().length === 0 ||
        (value.engagement !== 'first-entry' && value.engagement !== 'reentry')
      ) {
        throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '活跃遭遇战斗状态无效')
      }
      activeCount += 1
      encounters.push(deepFreeze({
        kind: 'active',
        encounterId: definition.id,
        eventId: definition.eventId,
        nodeId: definition.nodeId,
        returnNodeId: value.returnNodeId,
        entryEdgeId: value.entryEdgeId,
        engagement: value.engagement,
        combat,
      }))
    } else {
      throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '未知遭遇状态')
    }
  }
  if (activeCount > 1) {
    throw new SceneCombatError('INVALID_SCENE_COMBAT_STATE', '同一场景最多一个活跃战斗遭遇')
  }
  return deepFreeze({ encounters, usage })
}
