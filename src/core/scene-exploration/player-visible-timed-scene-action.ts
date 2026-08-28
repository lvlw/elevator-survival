import { deepFreeze } from '../config'
import type { ReturnRouteResult } from '../scene-graph'
import { previewSceneWithdrawalCommand } from './scene-withdrawal-resolution'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

export type PlayerVisibleTimedSceneReturnContinuation =
  | Readonly<{
      kind: 'available'
      estimatedReturnTime: number
      estimatedRemainingTimeAfterReturn: number
    }>
  | Readonly<{
      kind: 'terminal-returned'
      terminalStatus: 'safe-returned' | 'forced-returned'
      estimatedReturnTime: number
      destinationNodeName: string
    }>
  | Readonly<{ kind: 'unavailable-due-to-death' }>

export interface PlayerVisibleTimedSceneActionProjection {
  readonly completionNodeName: string
  readonly returnContinuation: PlayerVisibleTimedSceneReturnContinuation
}

export function getPlayerVisibleSceneNodeName(
  nodeId: string,
  dependencies: SceneExplorationDependencies,
): string {
  const node = dependencies.graph.nodes.find(({ id }) => id === nodeId)
  if (!node) throw new Error('正式场景行动结果引用未知节点')
  return node.name
}

/**
 * Shared player-safe projection for positive-time Scene actions. The action's
 * completion node is the original node; a forced-return destination is a
 * separate continuation fact. Death never fabricates a return destination.
 */
export function projectPlayerVisibleTimedSceneAction(
  initialSnapshot: SceneExplorationSnapshot,
  resultingSnapshot: SceneExplorationSnapshot,
  returnRoute: ReturnRouteResult,
  dependencies: SceneExplorationDependencies,
): PlayerVisibleTimedSceneActionProjection {
  let returnContinuation: PlayerVisibleTimedSceneReturnContinuation
  if (resultingSnapshot.status === 'dead') {
    returnContinuation = deepFreeze({ kind: 'unavailable-due-to-death' })
  } else if (
    resultingSnapshot.status === 'safe-returned' ||
    resultingSnapshot.status === 'forced-returned'
  ) {
    returnContinuation = deepFreeze({
      kind: 'terminal-returned',
      terminalStatus: resultingSnapshot.status,
      estimatedReturnTime: returnRoute.estimatedReturnTime,
      destinationNodeName: getPlayerVisibleSceneNodeName(
        returnRoute.safetyNodeId,
        dependencies,
      ),
    })
  } else {
    const withdrawal = previewSceneWithdrawalCommand(
      resultingSnapshot,
      { kind: 'withdraw-from-scene' },
      dependencies,
    )
    if (!withdrawal.canExecute) {
      throw new Error('正式场景行动后的活动场景缺少返程预览')
    }
    returnContinuation = deepFreeze({
      kind: 'available',
      estimatedReturnTime: withdrawal.result.returnRoute.estimatedReturnTime,
      estimatedRemainingTimeAfterReturn: withdrawal.result.snapshot.remainingTime,
    })
  }
  return deepFreeze({
    completionNodeName: getPlayerVisibleSceneNodeName(
      initialSnapshot.currentNodeId,
      dependencies,
    ),
    returnContinuation,
  })
}
