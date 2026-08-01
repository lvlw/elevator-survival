import { deepFreeze } from '../config'
import type {
  SceneObstacleCatalog,
  SceneObstacleCatalogDependencies,
  SceneObstacleDefinition,
} from './scene-obstacle-types'

export class SceneObstacleError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'SceneObstacleError'
    this.code = code
  }
}

export function createSceneObstacleCatalog(
  definitions: readonly SceneObstacleDefinition[],
  dependencies: SceneObstacleCatalogDependencies,
): SceneObstacleCatalog {
  const byId = new Map<string, SceneObstacleDefinition>()
  const edgeIds = new Set(dependencies.graph.edges.map(({ id }) => id))
  const nodeIds = new Set(dependencies.graph.nodes.map(({ id }) => id))
  for (const definition of definitions) {
    if (
      !definition ||
      typeof definition.id !== 'string' ||
      definition.id.trim().length === 0 ||
      typeof definition.eventId !== 'string' ||
      definition.eventId.trim().length === 0 ||
      !edgeIds.has(definition.edgeId) ||
      !Array.isArray(definition.endpointNodeIds) ||
      definition.endpointNodeIds.length === 0 ||
      definition.endpointNodeIds.some((id) => !nodeIds.has(id)) ||
      new Set(definition.endpointNodeIds).size !== definition.endpointNodeIds.length ||
      !Array.isArray(definition.options) ||
      definition.options.length === 0
    ) {
      throw new SceneObstacleError('INVALID_OBSTACLE', '场景障碍定义无效')
    }
    if (byId.has(definition.id)) {
      throw new SceneObstacleError('DUPLICATE_OBSTACLE', `场景障碍重复：${definition.id}`)
    }
    const optionIds = new Set<string>()
    for (const option of definition.options) {
      if (!option.id || optionIds.has(option.id)) {
        throw new SceneObstacleError('INVALID_OBSTACLE_OPTION', '障碍选项ID无效或重复')
      }
      optionIds.add(option.id)
      if (option.kind === 'backpack-item') {
        if (!dependencies.itemCatalog.has(option.requiredDefinitionId)) {
          throw new SceneObstacleError('INVALID_OBSTACLE_OPTION', '障碍选项物品不存在')
        }
      } else if (option.kind === 'equipped-resource') {
        if (
          !dependencies.itemCatalog.has(option.requiredDefinitionId) ||
          option.spawnGrants.some(
            (grant: (typeof option.spawnGrants)[number]) =>
              !dependencies.itemCatalog.has(grant.definitionId) ||
              !Number.isSafeInteger(grant.quantity) ||
              grant.quantity <= 0,
          )
        ) {
          throw new SceneObstacleError('INVALID_OBSTACLE_OPTION', '装备障碍选项内容无效')
        }
      } else if (
        option.kind === 'force-entry' &&
        !dependencies.itemCatalog.has(option.protectionDefinitionId)
      ) {
        throw new SceneObstacleError('INVALID_OBSTACLE_OPTION', '撞门防护物品不存在')
      }
    }
    byId.set(definition.id, deepFreeze({
      ...definition,
      endpointNodeIds: [...definition.endpointNodeIds].sort(),
      options: definition.options.map((option) => ({
        ...option,
        ...(option.kind === 'equipped-resource'
          ? { spawnGrants: option.spawnGrants.map((grant: (typeof option.spawnGrants)[number]) => ({ ...grant, initialState: { ...grant.initialState } })) }
          : {}),
      })),
    }) as SceneObstacleDefinition)
  }
  const obstacleIds = [...byId.keys()].sort()
  return deepFreeze({
    obstacleIds,
    has: (id: string) => byId.has(id),
    get: (id: string) => {
      const result = byId.get(id)
      if (!result) throw new SceneObstacleError('UNKNOWN_OBSTACLE', `未知障碍：${id}`)
      return result
    },
  })
}
