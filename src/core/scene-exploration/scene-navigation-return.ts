import { hasMinorContusions, type PlayerConditionSnapshot } from '../condition'
import { calculateBackpackWeightSubtotal, type BackpackSnapshot } from '../inventory'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, type ReturnRouteResult } from '../scene-graph'
import { intersectKnownEdgeIds, type PlayerNavigationKnowledgeSnapshot } from '../scene-navigation'
import type { SceneExplorationDependencies, SceneExplorationSnapshot } from './scene-exploration-types'

export interface PlayerKnownReturnRouteOverrides {
  readonly currentNodeId?: string
  readonly backpack?: BackpackSnapshot
  readonly condition?: PlayerConditionSnapshot
  readonly navigationKnowledge?: PlayerNavigationKnowledgeSnapshot
  readonly additionallyEnabledEdgeIds?: readonly string[]
}

export function getKnownTraversableEdgeIds(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
  overrides: PlayerKnownReturnRouteOverrides = {},
): readonly string[] {
  const backpack = overrides.backpack ?? snapshot.backpack
  const effective = getEffectiveEnabledEdgeIds(
    {
      enabledEdgeIds: [
        ...snapshot.enabledEdgeIds,
        ...(overrides.additionallyEnabledEdgeIds ?? []),
      ],
      backpack,
    },
    dependencies.edgeAccessCatalog,
  )
  return intersectKnownEdgeIds(
    overrides.navigationKnowledge ?? snapshot.navigationKnowledge,
    [...new Set(effective)],
  )
}

export function findPlayerKnownReturnRoute(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
  overrides: PlayerKnownReturnRouteOverrides = {},
): ReturnRouteResult {
  const backpack = overrides.backpack ?? snapshot.backpack
  const condition = overrides.condition ?? snapshot.condition
  return findReturnRoute({
    graph: dependencies.graph,
    currentNodeId: overrides.currentNodeId ?? snapshot.currentNodeId,
    availability: {
      enabledEdgeIds: getKnownTraversableEdgeIds(snapshot, dependencies, overrides),
    },
    totalWeight: calculateBackpackWeightSubtotal(backpack, dependencies.physicalCatalog),
    hasMinorContusion: hasMinorContusions(condition),
    analgesiaActive: condition.painkillerActive,
  }, dependencies.config)
}
