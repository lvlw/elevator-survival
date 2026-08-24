import { deepFreeze } from '../config'
import { hasMinorContusions } from '../condition'
import {
  calculateBackpackWeightSubtotal,
  getItemDimensions,
} from '../inventory'
import { classifyLoad } from '../load'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, SceneGraphError } from '../scene-graph'
import { createSceneTaskEventPrimaryPlan } from '../scene-task-event'
import { resolveTimedSceneAction } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  PlayerVisibleSceneTaskEventCommandPreview,
  SceneExplorationSnapshot,
  SceneTaskEventCommandDependencies,
} from './scene-exploration-types'

function graphFailure(error: unknown): never {
  if (error instanceof SceneGraphError) {
    throw new SceneExplorationError(
      error.code === 'NO_RETURN_ROUTE' ? 'NO_RETURN_ROUTE' : 'INVALID_INPUT',
      error.message,
    )
  }
  throw error
}

/**
 * Player-safe projection of a formal task-event command. It consumes the same
 * deterministic primary owner as resolution but never returns its risk draw,
 * exact percentages, effects, generated identity, or resulting snapshot.
 */
export function previewPlayerVisibleSceneTaskEventCommand(
  input: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneTaskEventCommandDependencies,
): PlayerVisibleSceneTaskEventCommandPreview {
  try {
    const snapshot = createSceneExplorationSnapshot(input, dependencies)
    const primary = createSceneTaskEventPrimaryPlan(
      snapshot,
      commandInput,
      dependencies,
    )
    const metadata = primary.metadata
    const backpackWeightBefore = calculateBackpackWeightSubtotal(
      snapshot.backpack,
      dependencies.physicalCatalog,
    )
    const load = classifyLoad(primary.backpackWeightAfter, dependencies.config.backpack)
    if (!load.canCarry) {
      throw new SceneExplorationError('ACTION_NOT_AVAILABLE', '取得任务物品后无法携带')
    }
    if (metadata.kind === 'decline') {
      return deepFreeze({
        canExecute: true,
        result: {
          eventId: metadata.eventId,
          optionId: metadata.optionId,
          kind: 'decline',
          extractionMode: null,
          actionTime: 0,
          remainingTimeBefore: snapshot.remainingTime,
          effectiveRiskTier: 'none',
          impactProtection: {
            active: false,
            armorDefinitionId: null,
            integrityBefore: null,
            integrityAfter: null,
          },
          possibleExposureAmount: 0,
          output: null,
          originIntelWillBeRecorded: false,
          completionNodeName: dependencies.graph.nodes.find(
            ({ id }) => id === snapshot.currentNodeId,
          )?.name ?? snapshot.currentNodeId,
          backpackWeightBefore,
          backpackWeightAfter: backpackWeightBefore,
          loadTierAfter: load.tier,
          returnRoute: null,
          sceneOutcome: null,
          estimatedRemainingTimeAfterReturn: null,
          eventRemainsAvailable: true,
        },
      })
    }
    if (!primary.outputItem || metadata.outputDefinitionId === null) {
      throw new SceneExplorationError('INVALID_INPUT', '任务事件提取缺少正式输出')
    }
    let returnRoute
    try {
      returnRoute = findReturnRoute({
        graph: dependencies.graph,
        currentNodeId: snapshot.currentNodeId,
        availability: {
          enabledEdgeIds: getEffectiveEnabledEdgeIds(
            { ...snapshot, backpack: primary.backpackAfter },
            dependencies.edgeAccessCatalog,
          ),
        },
        totalWeight: primary.backpackWeightAfter,
        hasMinorContusion: hasMinorContusions(snapshot.condition),
        analgesiaActive: snapshot.condition.painkillerActive,
      }, dependencies.config)
    } catch (error) {
      graphFailure(error)
    }
    const currentIsSafetyNode = dependencies.graph.nodes.some(
      ({ id, isReturnSafetyNode }) => id === snapshot.currentNodeId && isReturnSafetyNode,
    )
    const sceneOutcome = resolveTimedSceneAction(
      { remainingTime: snapshot.remainingTime },
      {
        currentHealth: snapshot.condition.currentHealth,
        maxHealth: dependencies.config.combat.player.maxHealth,
        bleeding: snapshot.condition.bleeding,
      },
      {
        timeCost: metadata.actionTime,
        healthAfterPrimaryEffect: snapshot.condition.currentHealth,
        bleedingAfterPrimaryEffect: snapshot.condition.bleeding,
        estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime,
        endsExplorationAtSafety: false,
        isAtSafetyAfterAction: currentIsSafetyNode,
      },
      {
        postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage,
        forcedReturn: dependencies.config.forcedReturn,
      },
    )
    const definition = dependencies.physicalCatalog.get(metadata.outputDefinitionId)
    const dimensions = getItemDimensions(
      definition,
      'placement' in primary.command && primary.command.placement.rotated,
    )
    return deepFreeze({
      canExecute: true,
      result: {
        eventId: metadata.eventId,
        optionId: metadata.optionId,
        kind: 'extract',
        extractionMode: metadata.extractionMode,
        actionTime: metadata.actionTime,
        remainingTimeBefore: snapshot.remainingTime,
        effectiveRiskTier: metadata.effectiveRiskTier,
        impactProtection: {
          active: metadata.impactProtectionActive,
          armorDefinitionId: metadata.armorDefinitionId,
          integrityBefore: metadata.armorResourceBefore,
          integrityAfter: metadata.armorResourceAfter,
        },
        possibleExposureAmount: metadata.possibleExposureAmount,
        output: {
          definitionId: metadata.outputDefinitionId,
          quantity: metadata.outputQuantity,
          width: dimensions.width,
          height: dimensions.height,
          unitWeight: definition.unitWeight,
          placementCells: primary.outputPlacementCells,
        },
        originIntelWillBeRecorded: metadata.originIntelId !== null &&
          !snapshot.runIntelLog.intelIds.includes(metadata.originIntelId),
        completionNodeName: dependencies.graph.nodes.find(
          ({ id }) => id === snapshot.currentNodeId,
        )?.name ?? snapshot.currentNodeId,
        backpackWeightBefore,
        backpackWeightAfter: primary.backpackWeightAfter,
        loadTierAfter: load.tier,
        returnRoute,
        sceneOutcome,
        estimatedRemainingTimeAfterReturn: Math.max(
          0,
          sceneOutcome.clock.remainingTime - returnRoute.estimatedReturnTime,
        ),
        eventRemainsAvailable: false,
      },
    })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}
