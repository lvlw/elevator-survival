import { deepFreeze } from '../config'
import type { BackpackSnapshot, ItemCatalog } from '../inventory'
import type { SceneGraph } from '../scene-graph'

export type SceneEdgeAccessProfile = Readonly<{
  edgeId: string
  kind: 'backpack-item-permission'
  requiredDefinitionId: string
}>

export interface SceneEdgeAccessCatalog {
  readonly edgeIds: readonly string[]
  readonly profiles: readonly SceneEdgeAccessProfile[]
  has(edgeId: string): boolean
  get(edgeId: string): SceneEdgeAccessProfile
}

export type SceneAccessErrorCode =
  | 'INVALID_ACCESS_PROFILE'
  | 'DUPLICATE_ACCESS_PROFILE'
  | 'UNKNOWN_ACCESS_PROFILE'

export class SceneAccessError extends Error {
  readonly code: SceneAccessErrorCode
  constructor(code: SceneAccessErrorCode, message: string) {
    super(message)
    this.name = 'SceneAccessError'
    this.code = code
  }
}

export function createSceneEdgeAccessCatalog(
  profiles: readonly SceneEdgeAccessProfile[],
  graph: SceneGraph,
  itemCatalog: ItemCatalog,
): SceneEdgeAccessCatalog {
  const byId = new Map<string, SceneEdgeAccessProfile>()
  const graphEdges = new Set(graph.edges.map(({ id }) => id))
  for (const input of profiles) {
    if (
      !input ||
      typeof input !== 'object' ||
      Object.keys(input).sort().join('|') !==
        'edgeId|kind|requiredDefinitionId' ||
      input.kind !== 'backpack-item-permission' ||
      typeof input.edgeId !== 'string' ||
      input.edgeId.trim().length === 0 ||
      !graphEdges.has(input.edgeId) ||
      typeof input.requiredDefinitionId !== 'string' ||
      input.requiredDefinitionId.trim().length === 0 ||
      !itemCatalog.has(input.requiredDefinitionId)
    ) {
      throw new SceneAccessError('INVALID_ACCESS_PROFILE', '场景边权限档案无效')
    }
    if (byId.has(input.edgeId)) {
      throw new SceneAccessError('DUPLICATE_ACCESS_PROFILE', `场景边权限重复：${input.edgeId}`)
    }
    byId.set(input.edgeId, deepFreeze({ ...input }))
  }
  const edgeIds = [...byId.keys()].sort()
  return deepFreeze({
    edgeIds,
    profiles: edgeIds.map((id) => byId.get(id)!),
    has: (edgeId: string) => byId.has(edgeId),
    get: (edgeId: string) => {
      const profile = byId.get(edgeId)
      if (!profile) throw new SceneAccessError('UNKNOWN_ACCESS_PROFILE', `未知边权限：${edgeId}`)
      return profile
    },
  })
}

export function getEffectiveEnabledEdgeIds(
  snapshot: Readonly<{
    enabledEdgeIds: readonly string[]
    backpack: BackpackSnapshot
  }>,
  catalog?: SceneEdgeAccessCatalog,
): readonly string[] {
  const enabled = new Set(snapshot.enabledEdgeIds)
  if (catalog) {
    for (const profile of catalog.profiles) {
      if (
        snapshot.backpack.items.some(
          ({ definitionId }) => definitionId === profile.requiredDefinitionId,
        )
      ) {
        enabled.add(profile.edgeId)
      }
    }
  }
  return deepFreeze([...enabled].sort())
}
