import { deepFreeze } from '../config'
import { hasExactObjectKeys } from '../combat/combat-validation'
import { SceneCombatError } from './scene-combat-errors'
import type {
  CreateSceneCombatEncounterCatalogDependencies,
  SceneCombatEncounterCatalog,
  SceneCombatEncounterDefinition,
} from './scene-combat-types'

const KEYS = ['enemyDefinitionId', 'eventId', 'id', 'nodeId', 'triggerKind']

export function createSceneCombatEncounterCatalog(
  definitions: readonly SceneCombatEncounterDefinition[],
  dependencies: CreateSceneCombatEncounterCatalogDependencies,
): SceneCombatEncounterCatalog {
  const byId = new Map<string, Readonly<SceneCombatEncounterDefinition>>()
  const byNode = new Map<string, Readonly<SceneCombatEncounterDefinition>>()
  for (const input of definitions) {
    if (
      !hasExactObjectKeys(input, KEYS) ||
      [input.id, input.eventId, input.nodeId, input.enemyDefinitionId]
        .some((value) => typeof value !== 'string' || value.trim().length === 0) ||
      input.triggerKind !== 'enter-node-while-enemy-present' ||
      !dependencies.graph.nodes.some(({ id }) => id === input.nodeId) ||
      !dependencies.enemyCatalog.has(input.enemyDefinitionId)
    ) {
      throw new SceneCombatError(
        'INVALID_ENCOUNTER_DEFINITION',
        '场景战斗遭遇定义无效',
      )
    }
    if (byId.has(input.id)) {
      throw new SceneCombatError('DUPLICATE_ENCOUNTER_DEFINITION', `遭遇ID重复：${input.id}`)
    }
    if (byNode.has(input.nodeId)) {
      throw new SceneCombatError('DUPLICATE_ENCOUNTER_NODE', `节点存在多个自动遭遇：${input.nodeId}`)
    }
    const definition = deepFreeze({ ...input })
    byId.set(definition.id, definition)
    byNode.set(definition.nodeId, definition)
  }
  const ids = [...byId.keys()].sort()
  return deepFreeze({
    definitionIds: ids,
    has: (id: string) => byId.has(id),
    get: (id: string) => {
      const value = byId.get(id)
      if (!value) throw new SceneCombatError('UNKNOWN_ENCOUNTER_DEFINITION', `未知遭遇：${id}`)
      return value
    },
    getByNodeId: (nodeId: string) => byNode.get(nodeId) ?? null,
  })
}
