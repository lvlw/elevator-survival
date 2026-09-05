import { deepFreeze } from '../config'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { calculateAdjustedTravelTime } from '../load'
import { hasMinorContusions } from '../condition'
import { getKnownTraversableEdgeIds, findPlayerKnownReturnRoute } from './scene-navigation-return'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { previewSceneWithdrawalCommand } from './scene-withdrawal-resolution'
import type { SceneExplorationDependencies, SceneExplorationSnapshot } from './scene-exploration-types'

export interface PlayerVisibleNavigationNode {
  readonly name: string
  readonly state: 'current' | 'visited' | 'known-unvisited'
  readonly searchState: 'not-available' | 'available' | 'completed' | null
}

export interface PlayerVisibleNavigationRoute {
  readonly endpointNames: readonly string[]
  readonly traversal: 'traversable' | 'blocked'
  readonly movementTime: number
}

export interface PlayerVisibleNavigationReturn {
  readonly availability: 'available' | 'unavailable'
  readonly estimatedReturnTime: number | null
  readonly estimatedRemainingTimeAfterReturn: number | null
  readonly risk: 'safe-returned' | 'forced-returned' | 'dead' | 'unavailable'
  readonly routeNodeNames: readonly string[]
}

export interface PlayerVisibleSceneNavigation {
  readonly currentNodeName: string
  readonly nodes: readonly PlayerVisibleNavigationNode[]
  readonly routes: readonly PlayerVisibleNavigationRoute[]
  readonly return: PlayerVisibleNavigationReturn
}

function searchStateFor(snapshot: SceneExplorationSnapshot, nodeId: string) {
  if (!snapshot.navigationKnowledge.visitedNodeIds.includes(nodeId)) return null
  const state = snapshot.searchState.nodeStates.find((entry) => entry.nodeId === nodeId)
  if (!state || state.kind === 'not-available') return 'not-available' as const
  return state.kind === 'searched' ? 'completed' as const : 'available' as const
}

export function getPlayerVisibleSceneNavigation(
  input: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
): PlayerVisibleSceneNavigation {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  const names = new Map(dependencies.graph.nodes.map(({ id, name }) => [id, name]))
  const knownTraversable = new Set(getKnownTraversableEdgeIds(snapshot, dependencies))
  const weight = calculateBackpackWeightSubtotal(snapshot.backpack, dependencies.physicalCatalog)
  const nodes = snapshot.navigationKnowledge.discoveredNodeIds.map((nodeId) => ({
    name: names.get(nodeId)!,
    state: nodeId === snapshot.currentNodeId
      ? 'current' as const
      : snapshot.navigationKnowledge.visitedNodeIds.includes(nodeId)
        ? 'visited' as const
        : 'known-unvisited' as const,
    searchState: searchStateFor(snapshot, nodeId),
  })).sort((a, b) => a.name.localeCompare(b.name))
  const routes = snapshot.navigationKnowledge.knownEdgeIds.map<PlayerVisibleNavigationRoute>((edgeId) => {
    const edge = dependencies.graph.edges.find(({ id }) => id === edgeId)!
    const movement = calculateAdjustedTravelTime({
      baseTime: edge.baseTravelTime,
      totalWeight: weight,
      hasMinorContusion: hasMinorContusions(snapshot.condition),
      analgesiaActive: snapshot.condition.painkillerActive,
    }, dependencies.config)
    const endpointNames: readonly [string, string] = [
      names.get(edge.from)!,
      names.get(edge.to)!,
    ]
    return deepFreeze<PlayerVisibleNavigationRoute>({
      endpointNames,
      traversal: knownTraversable.has(edgeId) ? 'traversable' as const : 'blocked' as const,
      movementTime: movement.finalTime,
    })
  }).sort((a, b) => a.endpointNames.join('\u0000').localeCompare(b.endpointNames.join('\u0000')))

  let returnProjection: PlayerVisibleNavigationReturn
  try {
    const route = findPlayerKnownReturnRoute(snapshot, dependencies)
    const preview = previewSceneWithdrawalCommand(snapshot, { kind: 'withdraw-from-scene' }, dependencies)
    if (!preview.canExecute) throw new Error('withdrawal unavailable')
    const risk = preview.result.snapshot.status
    if (risk !== 'safe-returned' && risk !== 'forced-returned' && risk !== 'dead') {
      throw new Error('withdrawal result is not terminal')
    }
    returnProjection = {
      availability: 'available',
      estimatedReturnTime: route.estimatedReturnTime,
      estimatedRemainingTimeAfterReturn: preview.result.sceneOutcome?.clock.remainingTime ?? snapshot.remainingTime,
      risk,
      routeNodeNames: route.nodeIds.map((id) => names.get(id)!),
    }
  } catch {
    returnProjection = {
      availability: 'unavailable',
      estimatedReturnTime: null,
      estimatedRemainingTimeAfterReturn: null,
      risk: 'unavailable',
      routeNodeNames: [],
    }
  }
  return deepFreeze<PlayerVisibleSceneNavigation>({
    currentNodeName: names.get(snapshot.currentNodeId)!,
    nodes,
    routes,
    return: returnProjection,
  })
}
