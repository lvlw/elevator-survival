import { deepFreeze } from '../config'
import { CombatError } from './combat-errors'
import type { EnemyDefinition, EnemyDefinitionCatalog } from './combat-types'

export function createEnemyDefinitionCatalog(
  definitions: readonly EnemyDefinition[],
): EnemyDefinitionCatalog {
  const byId = new Map<string, EnemyDefinition>()
  for (const input of definitions as readonly unknown[]) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new CombatError('INVALID_ENEMY_DEFINITION', '敌人定义无效')
    }
    const definition = input as EnemyDefinition
    if (
      Object.keys(definition).sort().join('|') !==
        'actionCycle|actions|id|initialIntentActionId|maxHealth|tags|weaknessTags' ||
      typeof definition.id !== 'string' || definition.id.trim().length === 0 ||
      !Number.isSafeInteger(definition.maxHealth) || definition.maxHealth <= 0 ||
      !Array.isArray(definition.tags) || !Array.isArray(definition.weaknessTags) ||
      !Array.isArray(definition.actions) || definition.actions.length === 0 ||
      !Array.isArray(definition.actionCycle) || definition.actionCycle.length === 0
    ) throw new CombatError('INVALID_ENEMY_DEFINITION', '敌人定义字段无效')
    if (byId.has(definition.id)) {
      throw new CombatError('DUPLICATE_ENEMY_DEFINITION', `敌人定义重复：${definition.id}`)
    }
    const actionIds = new Set<string>()
    for (const action of definition.actions) {
      if (
        !action || Object.keys(action).sort().join('|') !== 'id|kind' ||
        typeof action.id !== 'string' || action.id.trim().length === 0 ||
        (action.kind !== 'scratch' && action.kind !== 'lunge-bite') ||
        actionIds.has(action.id)
      ) throw new CombatError('INVALID_ENEMY_DEFINITION', '敌人行动定义无效或重复')
      actionIds.add(action.id)
    }
    if (
      !actionIds.has(definition.initialIntentActionId) ||
      definition.actionCycle.some((id) => !actionIds.has(id))
    ) throw new CombatError('INVALID_ENEMY_DEFINITION', '敌人行动循环引用未知行动')
    byId.set(definition.id, deepFreeze({
      ...definition,
      tags: [...definition.tags],
      weaknessTags: [...definition.weaknessTags],
      actions: definition.actions.map((action) => ({ ...action })),
      actionCycle: [...definition.actionCycle],
    }))
  }
  const definitionIds = [...byId.keys()].sort()
  return deepFreeze({
    definitionIds,
    has: (id: string) => byId.has(id),
    get: (id: string) => {
      const value = byId.get(id)
      if (!value) throw new CombatError('UNKNOWN_ENEMY_DEFINITION', `未知敌人：${id}`)
      return value
    },
  })
}
