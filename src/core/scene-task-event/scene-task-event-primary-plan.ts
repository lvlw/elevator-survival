import { deepFreeze } from '../config'
import { addPendingInfectionExposure } from '../condition'
import {
  addItemToBackpack,
  calculateBackpackWeightSubtotal,
  createItemInstance,
  getOccupiedCells,
  InventoryError,
  type BackpackSnapshot,
  type ItemInstance,
} from '../inventory'
import {
  consumeCommittedResource,
  createFullItemState,
  getItemState,
} from '../item-state'
import { classifyLoad } from '../load'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { SceneExplorationError } from '../scene-exploration/scene-exploration-errors'
import { createPerformSceneTaskEventCommand } from '../scene-exploration/scene-task-event-validation'
import type {
  PerformSceneTaskEventCommand,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneTaskEventCommandDependencies,
  SceneTaskRiskTier,
} from '../scene-exploration/scene-exploration-types'
import { getSceneTaskEventStatus } from './scene-task-event-state'
import { createStableSceneTaskEventItemInstanceId } from './scene-task-event-state'

export interface SceneTaskEventOptionPrimaryMetadata {
  readonly eventId: string
  readonly optionId: string
  readonly kind: 'extract' | 'decline'
  readonly extractionMode: 'direct' | 'cautious' | null
  readonly actionTime: number
  readonly rawRiskTier: SceneTaskRiskTier
  readonly effectiveRiskTier: SceneTaskRiskTier
  /** Core-only execution fact. Ordinary player projections expose only tiers. */
  readonly rawRiskPercent: number
  /** Core-only execution fact. Ordinary player projections expose only tiers. */
  readonly effectiveRiskPercent: number
  readonly impactProtectionActive: boolean
  readonly armorDefinitionId: string | null
  readonly armorResourceBefore: number | null
  readonly requestedIntegrityCost: number
  readonly actualIntegrityConsumed: number
  readonly armorResourceAfter: number | null
  readonly armorDepleted: boolean
  readonly outputDefinitionId: string | null
  readonly outputQuantity: number
  readonly originIntelId: string | null
  readonly possibleExposureAmount: number
  readonly requiresBackpackPlacement: boolean
}

export interface SceneTaskEventPrimaryPlan {
  readonly command: PerformSceneTaskEventCommand
  readonly metadata: SceneTaskEventOptionPrimaryMetadata
  readonly primaryEffects: readonly SceneExplorationEffect[]
  readonly riskTrace: Extract<SceneExplorationEffect, { readonly kind: 'scene-task-risk-resolved' }> | null
  readonly backpackAfter: BackpackSnapshot
  readonly conditionAfter: SceneExplorationSnapshot['condition']
  readonly outputItem: ItemInstance | null
  readonly outputPlacementCells: readonly Readonly<{ x: number; y: number }> []
  readonly backpackWeightAfter: number
}

function allKnownInstanceIds(snapshot: SceneExplorationSnapshot): Set<string> {
  const ids = new Set<string>()
  for (const item of snapshot.backpack.items) ids.add(item.instanceId)
  for (const item of Object.values(snapshot.equipment)) if (item) ids.add(item.instanceId)
  for (const item of snapshot.quickSlots.slots) if (item) ids.add(item.instanceId)
  for (const node of snapshot.searchState.nodeStates) {
    if (node.kind === 'unsearched') {
      for (const entity of node.preparedOutcome.revealedItems) ids.add(entity.item.instanceId)
    }
  }
  for (const node of snapshot.sceneItems.nodeStates) {
    for (const entity of node.items) ids.add(entity.item.instanceId)
  }
  return ids
}

function riskTierForPercent(
  percent: number,
  dependencies: SceneTaskEventCommandDependencies,
): SceneTaskRiskTier {
  const tiers = dependencies.config.combat.riskTiers
  if (percent === tiers.none) return 'none'
  if (percent === tiers.low) return 'low'
  if (percent === tiers.medium) return 'medium'
  if (percent === tiers.high) return 'high'
  throw new SceneExplorationError(
    'INVALID_INPUT',
    '任务事件风险必须对应版本化配置中的正式相对等级',
  )
}

function validateAndFindOption(
  snapshot: SceneExplorationSnapshot,
  eventId: string,
  optionId: string,
  dependencies: SceneTaskEventCommandDependencies,
) {
  if (snapshot.status !== 'active') {
    throw new SceneExplorationError('SCENE_NOT_ACTIVE', '当前场景状态不能执行任务事件')
  }
  if (snapshot.condition.currentHealth === 0) {
    throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能执行任务事件')
  }
  if (snapshot.remainingTime === 0) {
    throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间耗尽后不能开始任务事件')
  }
  if (!dependencies.taskEventCatalog.has(eventId)) {
    throw new SceneExplorationError('UNKNOWN_SCENE_TASK_EVENT', '未知场景任务事件')
  }
  const definition = dependencies.taskEventCatalog.get(eventId)
  if (definition.nodeId !== snapshot.currentNodeId) {
    throw new SceneExplorationError('SCENE_TASK_EVENT_NOT_AT_CURRENT_NODE', '任务事件不在当前节点')
  }
  if (getSceneTaskEventStatus(snapshot.taskEvents, definition.id) !== 'available') {
    throw new SceneExplorationError('SCENE_TASK_EVENT_ALREADY_COMPLETED', '任务事件已完成')
  }
  const encounter = snapshot.combatState.encounters.find(
    (candidate) => candidate.encounterId === definition.requiredDefeatedEncounterId,
  )
  if (!encounter || encounter.kind !== 'dormant' || !encounter.enemy.defeated) {
    throw new SceneExplorationError(
      'SCENE_TASK_EVENT_QUALIFICATION_FAILED',
      '任务事件要求的遭遇尚未击败',
    )
  }
  const option = definition.options.find(({ id }) => id === optionId)
  if (!option) {
    throw new SceneExplorationError('UNKNOWN_SCENE_TASK_EVENT_OPTION', '未知场景任务事件选项')
  }
  return { definition, option }
}

/**
 * Single owner for deterministic task-event option metadata. Formal
 * transition planning and player-safe queries both consume this result.
 */
export function getSceneTaskEventOptionPrimaryMetadata(
  snapshot: SceneExplorationSnapshot,
  eventId: string,
  optionId: string,
  dependencies: SceneTaskEventCommandDependencies,
): SceneTaskEventOptionPrimaryMetadata {
  const { definition, option } = validateAndFindOption(
    snapshot,
    eventId,
    optionId,
    dependencies,
  )
  if (option.kind === 'decline') {
    return deepFreeze({
      eventId: definition.id,
      optionId: option.id,
      kind: 'decline',
      extractionMode: null,
      actionTime: 0,
      rawRiskTier: 'none',
      effectiveRiskTier: 'none',
      rawRiskPercent: 0,
      effectiveRiskPercent: 0,
      impactProtectionActive: false,
      armorDefinitionId: null,
      armorResourceBefore: null,
      requestedIntegrityCost: 0,
      actualIntegrityConsumed: 0,
      armorResourceAfter: null,
      armorDepleted: false,
      outputDefinitionId: null,
      outputQuantity: 0,
      originIntelId: null,
      possibleExposureAmount: 0,
      requiresBackpackPlacement: false,
    })
  }

  const rules = dependencies.config.scene.pathogenCaseRetrieval
  const direct = option.extractionMode === 'direct'
  const rawRiskPercent = direct
    ? rules.directContaminationRiskPercent
    : rules.cautiousContaminationRiskPercent
  const protectedRiskPercent = direct
    ? rules.protectedDirectContaminationRiskPercent
    : rules.protectedCautiousContaminationRiskPercent
  const armor = snapshot.equipment[definition.impactProtection.equipmentSlot]
  const armorState = armor?.definitionId === definition.impactProtection.definitionId
    ? getItemState(snapshot.itemStates, armor.instanceId)
    : null
  const impactProtectionActive = armorState?.resource.kind === 'integrity' &&
    armorState.resource.current >= 1 && protectedRiskPercent < rawRiskPercent
  const effectiveRiskPercent = impactProtectionActive
    ? protectedRiskPercent
    : rawRiskPercent
  const resource = impactProtectionActive && armorState?.resource.kind === 'integrity'
    ? consumeCommittedResource(
        armorState,
        rules.impactProtectionIntegrityCost,
      )
    : null
  return deepFreeze({
    eventId: definition.id,
    optionId: option.id,
    kind: 'extract',
    extractionMode: option.extractionMode,
    actionTime: direct
      ? dependencies.config.scene.extractionTime.direct
      : dependencies.config.scene.extractionTime.cautious,
    rawRiskTier: riskTierForPercent(rawRiskPercent, dependencies),
    effectiveRiskTier: riskTierForPercent(effectiveRiskPercent, dependencies),
    rawRiskPercent,
    effectiveRiskPercent,
    impactProtectionActive,
    armorDefinitionId: impactProtectionActive && armor ? armor.definitionId : null,
    armorResourceBefore: resource?.currentBefore ?? null,
    requestedIntegrityCost: resource?.requestedCost ?? 0,
    actualIntegrityConsumed: resource?.consumed ?? 0,
    armorResourceAfter: resource?.currentAfter ?? null,
    armorDepleted: resource?.depleted ?? false,
    outputDefinitionId: definition.outputDefinitionId,
    outputQuantity: 1,
    originIntelId: definition.originIntelId,
    possibleExposureAmount: effectiveRiskPercent === 0
      ? 0
      : rules.exposureOnRiskSuccess,
    requiresBackpackPlacement: true,
  })
}

export function createSceneTaskEventPrimaryPlan(
  snapshot: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneTaskEventCommandDependencies,
): SceneTaskEventPrimaryPlan {
  const command = createPerformSceneTaskEventCommand(commandInput)
  const metadata = getSceneTaskEventOptionPrimaryMetadata(
    snapshot,
    command.eventId,
    command.optionId,
    dependencies,
  )
  if (metadata.kind === 'decline') {
    if ('placement' in command) {
      throw new SceneExplorationError(
        'INVALID_SCENE_TASK_EVENT_COMMAND',
        '放弃任务事件不得携带背包放置',
      )
    }
    return deepFreeze({
      command,
      metadata,
      primaryEffects: [{
        kind: 'scene-task-event-declined',
        eventId: metadata.eventId,
        optionId: metadata.optionId,
        nodeId: snapshot.currentNodeId,
      }],
      riskTrace: null,
      backpackAfter: snapshot.backpack,
      conditionAfter: snapshot.condition,
      outputItem: null,
      outputPlacementCells: [],
      backpackWeightAfter: calculateBackpackWeightSubtotal(
        snapshot.backpack,
        dependencies.physicalCatalog,
      ),
    })
  }
  if (!('placement' in command)) {
    throw new SceneExplorationError(
      'INVALID_SCENE_TASK_EVENT_COMMAND',
      '成功提取必须明确指定背包放置',
    )
  }

  const definition = dependencies.taskEventCatalog.get(metadata.eventId)
  const outputInstanceId = createStableSceneTaskEventItemInstanceId(
    snapshot.sceneInstanceId,
    definition.id,
    definition.outputIndex,
  )
  if (allKnownInstanceIds(snapshot).has(outputInstanceId)) {
    throw new SceneExplorationError(
      'SCENE_TASK_EVENT_ALREADY_COMPLETED',
      '样本箱稳定实例已存在',
    )
  }
  const outputItem = createItemInstance({
    instanceId: outputInstanceId,
    definitionId: definition.outputDefinitionId,
    quantity: 1,
  }, dependencies.physicalCatalog)
  let backpackAfter: BackpackSnapshot
  try {
    backpackAfter = addItemToBackpack(
      snapshot.backpack,
      outputItem,
      { instanceId: outputInstanceId, ...command.placement },
      dependencies.physicalCatalog,
    )
  } catch (error) {
    if (error instanceof InventoryError) {
      throw new SceneExplorationError('ACTION_NOT_AVAILABLE', error.message)
    }
    throw error
  }
  const backpackWeightAfter = calculateBackpackWeightSubtotal(
    backpackAfter,
    dependencies.physicalCatalog,
  )
  if (!classifyLoad(backpackWeightAfter, dependencies.config.backpack).canCarry) {
    throw new SceneExplorationError('ACTION_NOT_AVAILABLE', '取得样本箱后无法携带')
  }

  const effects: SceneExplorationEffect[] = []
  const armor = snapshot.equipment[definition.impactProtection.equipmentSlot]
  if (
    metadata.impactProtectionActive &&
    armor &&
    metadata.armorResourceBefore !== null &&
    metadata.armorResourceAfter !== null
  ) {
    effects.push({
      kind: 'item-resource-consumed',
      source: 'pathogen-case-impact-protection',
      equipmentSlot: 'armor',
      instanceId: armor.instanceId,
      definitionId: armor.definitionId,
      resourceKind: 'integrity',
      currentBefore: metadata.armorResourceBefore,
      requestedCost: metadata.requestedIntegrityCost,
      consumed: metadata.actualIntegrityConsumed,
      currentAfter: metadata.armorResourceAfter,
      depleted: metadata.armorDepleted,
    })
  }
  const streamId = createStreamId(
    'scene-task-event',
    snapshot.sceneInstanceId,
    definition.id,
    metadata.optionId,
    '0',
    'contamination-risk',
  )
  const draw = metadata.effectiveRiskPercent === 0
    ? null
    : drawIntInclusive(createRandomCursor(dependencies.runSeed, streamId), 1, 100)
  const exposureAdded = draw && draw.value <= metadata.effectiveRiskPercent
    ? dependencies.config.scene.pathogenCaseRetrieval.exposureOnRiskSuccess
    : 0
  const riskTrace: Extract<SceneExplorationEffect, { readonly kind: 'scene-task-risk-resolved' }> = {
    kind: 'scene-task-risk-resolved',
    eventId: definition.id,
    optionId: metadata.optionId,
    algorithmVersion: RANDOM_ALGORITHM_VERSION,
    streamId,
    drawIndex: draw ? draw.nextCursor.drawIndex - 1 : null,
    roll: draw?.value ?? null,
    rawRiskPercent: metadata.rawRiskPercent,
    effectiveRiskPercent: metadata.effectiveRiskPercent,
    protectionApplied: metadata.impactProtectionActive,
    exposureAdded,
  }
  effects.push(riskTrace)
  let conditionAfter = snapshot.condition
  if (exposureAdded > 0) {
    effects.push({
      kind: 'scene-infection-exposure-added',
      source: 'pathogen-case-retrieval',
      exposuresBefore: snapshot.condition.pendingInfectionExposures,
      added: exposureAdded,
      exposuresAfter: snapshot.condition.pendingInfectionExposures + exposureAdded,
    })
    conditionAfter = addPendingInfectionExposure(conditionAfter, exposureAdded)
  }
  const itemState = createFullItemState(outputItem, dependencies.itemResourceCatalog)
  effects.push({
    kind: 'scene-task-item-acquired',
    eventId: definition.id,
    optionId: metadata.optionId,
    nodeId: snapshot.currentNodeId,
    instanceId: outputInstanceId,
    definitionId: outputItem.definitionId,
    placement: command.placement,
    itemState,
  })
  if (!snapshot.runIntelLog.intelIds.includes(definition.originIntelId)) {
    effects.push({ kind: 'run-intel-added', intelId: definition.originIntelId })
  }
  effects.push({
    kind: 'scene-task-event-completed',
    eventId: definition.id,
    optionId: metadata.optionId,
  })
  return deepFreeze({
    command,
    metadata,
    primaryEffects: effects,
    riskTrace,
    backpackAfter,
    conditionAfter,
    outputItem,
    outputPlacementCells: getOccupiedCells(
      backpackAfter,
      dependencies.physicalCatalog,
    ).filter(({ instanceId }) => instanceId === outputInstanceId)
      .map(({ x, y }) => ({ x, y })),
    backpackWeightAfter,
  })
}
