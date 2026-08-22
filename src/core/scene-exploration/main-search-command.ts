import { deepFreeze } from '../config'
import { hasMinorContusions } from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import {
  getItemState,
  previewCommittedResourceAction,
} from '../item-state'
import { classifyLoad } from '../load'
import {
  findReturnRoute,
  SceneGraphError,
} from '../scene-graph'
import { resolveTimedSceneAction } from '../scene'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  MainSearchCommandDependencies,
  MainSearchEvaluation,
  MainSearchPreview,
  MainSearchResolution,
  MainSearchTransitionPlan,
  PerformMainSearchCommand,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
} from './scene-exploration-types'

function exactCommand(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createPerformMainSearchCommand(
  input: unknown,
): PerformMainSearchCommand {
  if (
    !exactCommand(input, ['illumination']) ||
    (
      input.illumination !== 'use-equipped-flashlight' &&
      input.illumination !== 'search-without-flashlight'
    )
  ) {
    throw new SceneExplorationError(
      'INVALID_ILLUMINATION_CHOICE',
      '主要搜索命令必须只包含正式照明选择',
    )
  }
  return deepFreeze({ illumination: input.illumination })
}

function graphFailure(error: unknown): never {
  if (!(error instanceof SceneGraphError)) throw error
  throw new SceneExplorationError(
    error.code === 'NO_RETURN_ROUTE'
      ? 'NO_RETURN_ROUTE'
      : 'INVALID_INPUT',
    error.message,
  )
}

function addHealthEffect(
  effects: SceneExplorationEffect[],
  source:
    | 'post-action-bleeding'
    | 'forced-return-base'
    | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  if (requestedLoss === 0) return healthBefore
  const actualLoss = Math.min(healthBefore, requestedLoss)
  const healthAfter = healthBefore - actualLoss
  if (actualLoss > 0) {
    effects.push({
      kind: 'health-lost',
      source,
      requestedLoss,
      actualLoss,
      healthBefore,
      healthAfter,
    })
  }
  return healthAfter
}

function summarizeItems(
  items: readonly Readonly<{
    definitionId: string
    quantity: number
  }>[],
): readonly Readonly<{ definitionId: string; quantity: number }>[] {
  const quantities = new Map<string, number>()
  for (const item of items) {
    quantities.set(
      item.definitionId,
      (quantities.get(item.definitionId) ?? 0) + item.quantity,
    )
  }
  return [...quantities.entries()]
    .map(([definitionId, quantity]) => ({ definitionId, quantity }))
    .sort((left, right) => left.definitionId.localeCompare(right.definitionId))
}

function evaluate(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: MainSearchCommandDependencies,
): MainSearchTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const command = createPerformMainSearchCommand(commandInput)
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '场景已终止')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能搜索')
  }
  if (snapshot.remainingTime === 0) {
    throw new SceneExplorationError(
      'SCENE_TIME_EXHAUSTED',
      '场景时间已耗尽',
    )
  }
  if (!dependencies.searchCatalog.has(snapshot.currentNodeId)) {
    throw new SceneExplorationError(
      'MAIN_SEARCH_NOT_AVAILABLE',
      '当前节点没有主要搜索定义',
    )
  }
  const nodeSearchState = snapshot.searchState.nodeStates.find(
    (node) => node.nodeId === snapshot.currentNodeId,
  )
  if (!nodeSearchState || nodeSearchState.kind === 'not-available') {
    throw new SceneExplorationError(
      'MAIN_SEARCH_NOT_AVAILABLE',
      '当前节点不可执行主要搜索',
    )
  }
  if (nodeSearchState.kind === 'searched') {
    throw new SceneExplorationError(
      'MAIN_SEARCH_ALREADY_COMPLETED',
      '当前节点已经完成主要搜索',
    )
  }

  const definition = dependencies.searchCatalog.get(snapshot.currentNodeId)
  if (
    nodeSearchState.preparedOutcome.nodeId !== snapshot.currentNodeId ||
    definition.nodeId !== snapshot.currentNodeId ||
    definition.searchOrdinal !==
    nodeSearchState.preparedOutcome.searchOrdinal
  ) {
    throw new SceneExplorationError(
      'INVALID_INPUT',
      '搜索定义、预定结果与当前节点元数据不一致',
    )
  }

  const backpackWeight = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  const load = classifyLoad(backpackWeight, dependencies.config.backpack)
  if (!load.canCarry) {
    throw new SceneExplorationError(
      'CANNOT_CARRY',
      '无法携带状态不能执行搜索',
    )
  }
  let returnRoute
  const effectiveEnabledEdgeIds = getEffectiveEnabledEdgeIds(
    snapshot,
    dependencies.edgeAccessCatalog,
  )
  try {
    returnRoute = findReturnRoute(
      {
        graph: dependencies.graph,
        currentNodeId: snapshot.currentNodeId,
        availability: { enabledEdgeIds: effectiveEnabledEdgeIds },
        totalWeight: backpackWeight,
        hasMinorContusion: hasMinorContusions(snapshot.condition),
        analgesiaActive: snapshot.condition.painkillerActive,
      },
      dependencies.config,
    )
  } catch (error) {
    graphFailure(error)
  }

  const usesFlashlight =
    command.illumination === 'use-equipped-flashlight'
  const actionTime = usesFlashlight
    ? dependencies.config.scene.searchTime.withFlashlight
    : dependencies.config.scene.searchTime.withoutFlashlight
  const effects: SceneExplorationEffect[] = []
  let flashlightInstanceId: string | null = null

  if (usesFlashlight) {
    const utility = snapshot.equipment.utility
    if (!utility) {
      throw new SceneExplorationError(
        'ILLUMINATION_PROVIDER_NOT_EQUIPPED',
        '实用装备位没有照明提供者',
      )
    }
    const profile = dependencies.searchIlluminationCatalog.get(
      utility.definitionId,
    )
    if (profile.kind !== 'low-light-provider') {
      throw new SceneExplorationError(
        'INVALID_ILLUMINATION_PROVIDER',
        '当前实用装备不能提供低照明搜索能力',
      )
    }
    const state = getItemState(snapshot.itemStates, utility.instanceId)
    if (
      state.definitionId !== utility.definitionId ||
      state.resource.kind !== 'charge'
    ) {
      throw new SceneExplorationError(
        'INVALID_ILLUMINATION_PROVIDER',
        '照明提供者缺少合法电量状态',
      )
    }
    const cost =
      dependencies.config.scene.searchTime.flashlightChargeCost
    const preview = previewCommittedResourceAction(state, cost)
    if (!preview.allowed || preview.kind !== 'charge') {
      throw new SceneExplorationError(
        'INSUFFICIENT_ILLUMINATION_CHARGE',
        '照明提供者电量不足',
      )
    }
    flashlightInstanceId = utility.instanceId
    effects.push({
      kind: 'item-resource-consumed',
      source: 'main-search-illumination',
      equipmentSlot: 'utility',
      instanceId: utility.instanceId,
      definitionId: utility.definitionId,
      resourceKind: preview.kind,
      currentBefore: preview.currentBefore,
      requestedCost: preview.requestedCost,
      consumed: preview.consumed,
      currentAfter: preview.currentAfter,
      depleted: preview.depleted,
    })
  }

  const prepared = nodeSearchState.preparedOutcome
  effects.push({
    kind: 'scene-main-search-revealed',
    nodeId: snapshot.currentNodeId,
    searchOrdinal: prepared.searchOrdinal,
    revealedItemInstanceIds: prepared.revealedItems.map(
      ({ item }) => item.instanceId,
    ),
    revealedItemSummary: summarizeItems(
      prepared.revealedItems.map(({ item }) => item),
    ),
    revealedIntelIds: [...prepared.revealedIntelIds],
  })
  for (const intelId of prepared.revealedIntelIds) {
    if (!snapshot.runIntelLog.intelIds.includes(intelId)) {
      effects.push({ kind: 'run-intel-added', intelId })
    }
  }

  const currentIsSafetyNode = dependencies.graph.nodes.some(
    (node) =>
      node.id === snapshot.currentNodeId && node.isReturnSafetyNode,
  )
  const sceneOutcome = resolveTimedSceneAction(
    { remainingTime: snapshot.remainingTime },
    {
      currentHealth: snapshot.condition.currentHealth,
      maxHealth: dependencies.config.combat.player.maxHealth,
      bleeding: snapshot.condition.bleeding,
    },
    {
      timeCost: actionTime,
      healthAfterPrimaryEffect: snapshot.condition.currentHealth,
      bleedingAfterPrimaryEffect: snapshot.condition.bleeding,
      estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime,
      endsExplorationAtSafety: false,
      isAtSafetyAfterAction: currentIsSafetyNode,
    },
    {
      postActionBleedingDamage:
        dependencies.config.scene.postActionBleedingDamage,
      forcedReturn: dependencies.config.forcedReturn,
    },
  )
  effects.push({
    kind: 'scene-time-resolved',
    remainingTimeBefore: snapshot.remainingTime,
    actionTimeCost: actionTime,
    remainingTimeAfter: sceneOutcome.clock.remainingTime,
    overtimeDebt: sceneOutcome.overtimeDebt,
  })

  let effectHealth = snapshot.condition.currentHealth
  effectHealth = addHealthEffect(
    effects,
    'post-action-bleeding',
    sceneOutcome.postActionBleedingDamage,
    effectHealth,
  )
  effectHealth = addHealthEffect(
    effects,
    'forced-return-base',
    sceneOutcome.forcedReturnBaseDamage,
    effectHealth,
  )
  addHealthEffect(
    effects,
    'forced-return-bleeding',
    sceneOutcome.forcedReturnBleedingDamage,
    effectHealth,
  )

  const status: SceneExplorationStatus =
    sceneOutcome.kind === 'death'
      ? 'dead'
      : sceneOutcome.kind === 'safe-return'
        ? 'safe-returned'
        : sceneOutcome.kind === 'forced-return'
          ? 'forced-returned'
          : 'active'
  if (status === 'forced-returned') {
    effects.push({
      kind: 'scene-node-changed',
      reason: 'forced-return',
      fromNodeId: snapshot.currentNodeId,
      toNodeId: returnRoute.safetyNodeId,
      routeNodeIds: [...returnRoute.nodeIds],
      routeEdgeIds: [...returnRoute.edgeIds],
    })
  }
  if (status !== snapshot.status) {
    effects.push({
      kind: 'scene-status-changed',
      fromStatus: snapshot.status,
      toStatus: status,
      reason:
        status === 'dead'
          ? 'death'
          : status === 'safe-returned'
            ? 'safe-return'
            : 'forced-return',
    })
  }

  return deepFreeze({
    command: { ...command },
    metadata: {
      nodeId: snapshot.currentNodeId,
      searchOrdinal: definition.searchOrdinal,
      illumination: command.illumination,
      lightingOutcome: usesFlashlight ? 'illuminated' : 'low-light',
      actionTime,
      flashlightInstanceId,
      backpackWeight,
      loadTier: load.tier,
      returnRoute,
      sceneOutcome,
    },
    effects,
  })
}

function materializeEvaluation(
  initialSnapshot: SceneExplorationSnapshot,
  plan: MainSearchTransitionPlan,
  dependencies: MainSearchCommandDependencies,
): MainSearchEvaluation {
  const snapshot = applySceneExplorationEffects(
    initialSnapshot,
    plan.effects,
    dependencies,
  )
  return deepFreeze({
    ...plan.metadata,
    effects: plan.effects,
    snapshot,
  })
}

export function previewMainSearchCommand(
  snapshot: SceneExplorationSnapshot,
  command: unknown,
  dependencies: MainSearchCommandDependencies,
): MainSearchPreview {
  try {
    const initialSnapshot = createSceneExplorationSnapshot(
      snapshot,
      dependencies,
    )
    const plan = evaluate(initialSnapshot, command, dependencies)
    return deepFreeze({
      canExecute: true,
      result: materializeEvaluation(initialSnapshot, plan, dependencies),
    })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}

export function resolveMainSearchCommand(
  snapshot: SceneExplorationSnapshot,
  command: unknown,
  dependencies: MainSearchCommandDependencies,
): MainSearchResolution {
  const initialSnapshot = createSceneExplorationSnapshot(
    snapshot,
    dependencies,
  )
  const plan = evaluate(initialSnapshot, command, dependencies)
  const result = materializeEvaluation(
    initialSnapshot,
    plan,
    dependencies,
  )
  return deepFreeze({ result, snapshot: result.snapshot })
}
