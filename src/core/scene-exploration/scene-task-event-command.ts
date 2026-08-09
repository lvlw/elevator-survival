import { deepFreeze } from '../config'
import { addPendingInfectionExposure, applyHealthLoss, hasMinorContusions } from '../condition'
import { addItemToBackpack, calculateBackpackWeightSubtotal, createItemInstance, InventoryError } from '../inventory'
import { consumeCommittedResource, createFullItemState, getItemState, replaceItemState } from '../item-state'
import { classifyLoad } from '../load'
import { RANDOM_ALGORITHM_VERSION, createRandomCursor, createStreamId, drawIntInclusive } from '../random'
import { addRunIntel } from '../run-intel'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute, SceneGraphError } from '../scene-graph'
import {
  completeSceneTaskEvent,
  createStableSceneTaskEventItemInstanceId,
  getSceneTaskEventStatus,
} from '../scene-task-event'
import { resolveTimedSceneAction } from '../scene'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type {
  PerformSceneTaskEventCommand,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneTaskEventCommandDependencies,
  SceneTaskEventEvaluation,
  SceneTaskEventPreview,
  SceneTaskEventResolution,
  SceneTaskEventTransitionPlan,
} from './scene-exploration-types'

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function command(input: PerformSceneTaskEventCommand): PerformSceneTaskEventCommand {
  const hasPlacement = !!input && typeof input === 'object' && !Array.isArray(input) && Object.prototype.hasOwnProperty.call(input, 'placement')
  if (!exact(input, hasPlacement ? ['eventId', 'optionId', 'placement'] : ['eventId', 'optionId']) ||
    typeof input.eventId !== 'string' || input.eventId.trim().length === 0 ||
    typeof input.optionId !== 'string' || input.optionId.trim().length === 0) {
    throw new SceneExplorationError('INVALID_SCENE_TASK_EVENT_COMMAND', '场景任务事件命令结构无效')
  }
  if (!hasPlacement) return deepFreeze({ eventId: input.eventId, optionId: input.optionId })
  const placement = (input as { placement?: unknown }).placement
  const fields = placement as { x?: unknown; y?: unknown; rotated?: unknown }
  if (!exact(placement, ['rotated', 'x', 'y']) || !Number.isSafeInteger(fields.x) || (fields.x as number) < 0 || !Number.isSafeInteger(fields.y) || (fields.y as number) < 0 || typeof fields.rotated !== 'boolean') {
    throw new SceneExplorationError('INVALID_SCENE_TASK_EVENT_COMMAND', '样本箱背包放置无效')
  }
  return deepFreeze({ eventId: input.eventId, optionId: input.optionId, placement: { x: fields.x as number, y: fields.y as number, rotated: fields.rotated as boolean } })
}

function graphFailure(error: unknown): never {
  if (error instanceof SceneGraphError) throw new SceneExplorationError(error.code === 'NO_RETURN_ROUTE' ? 'NO_RETURN_ROUTE' : 'INVALID_INPUT', error.message)
  throw error
}

function addHealthEffect(
  effects: SceneExplorationEffect[],
  source: 'post-action-bleeding' | 'forced-return-base' | 'forced-return-bleeding',
  requestedLoss: number,
  healthBefore: number,
): number {
  if (requestedLoss === 0) return healthBefore
  const actualLoss = Math.min(healthBefore, requestedLoss)
  const healthAfter = healthBefore - actualLoss
  effects.push({ kind: 'health-lost', source, requestedLoss, actualLoss, healthBefore, healthAfter })
  return healthAfter
}

function allKnownInstanceIds(snapshot: SceneExplorationSnapshot): Set<string> {
  const ids = new Set<string>()
  for (const item of snapshot.backpack.items) ids.add(item.instanceId)
  for (const item of Object.values(snapshot.equipment)) if (item) ids.add(item.instanceId)
  for (const item of snapshot.quickSlots.slots) if (item) ids.add(item.instanceId)
  for (const node of snapshot.searchState.nodeStates) {
    if (node.kind === 'unsearched') for (const entity of node.preparedOutcome.revealedItems) ids.add(entity.item.instanceId)
  }
  for (const node of snapshot.sceneItems.nodeStates) for (const entity of node.items) ids.add(entity.item.instanceId)
  return ids
}

function extractionRules(mode: 'direct' | 'cautious', dependencies: SceneTaskEventCommandDependencies) {
  const rules = dependencies.config.scene.pathogenCaseRetrieval
  return mode === 'direct'
    ? { actionTime: dependencies.config.scene.extractionTime.direct, rawRiskPercent: rules.directContaminationRiskPercent, protectedRiskPercent: rules.protectedDirectContaminationRiskPercent }
    : { actionTime: dependencies.config.scene.extractionTime.cautious, rawRiskPercent: rules.cautiousContaminationRiskPercent, protectedRiskPercent: rules.protectedCautiousContaminationRiskPercent }
}

export function buildSceneTaskEventTransitionPlan(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: PerformSceneTaskEventCommand,
  dependencies: SceneTaskEventCommandDependencies,
): SceneTaskEventTransitionPlan {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const normalized = command(commandInput)
  if (snapshot.status !== 'active') throw new SceneExplorationError('SCENE_NOT_ACTIVE', '当前场景状态不能执行任务事件')
  if (snapshot.condition.currentHealth === 0) throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能执行任务事件')
  if (snapshot.remainingTime === 0) throw new SceneExplorationError('SCENE_TIME_EXHAUSTED', '场景时间耗尽后不能开始任务事件')
  if (!dependencies.taskEventCatalog.has(normalized.eventId)) throw new SceneExplorationError('UNKNOWN_SCENE_TASK_EVENT', '未知场景任务事件')
  const definition = dependencies.taskEventCatalog.get(normalized.eventId)
  if (definition.nodeId !== snapshot.currentNodeId) throw new SceneExplorationError('SCENE_TASK_EVENT_NOT_AT_CURRENT_NODE', '任务事件不在当前节点')
  if (getSceneTaskEventStatus(snapshot.taskEvents, definition.id) !== 'available') throw new SceneExplorationError('SCENE_TASK_EVENT_ALREADY_COMPLETED', '任务事件已完成')
  const encounter = snapshot.combatState.encounters.find(({ encounterId }) => encounterId === definition.requiredDefeatedEncounterId)
  if (!encounter || encounter.kind !== 'dormant' || !encounter.enemy.defeated) throw new SceneExplorationError('SCENE_TASK_EVENT_QUALIFICATION_FAILED', '任务事件要求的遭遇尚未击败')
  const option = definition.options.find(({ id }) => id === normalized.optionId)
  if (!option) throw new SceneExplorationError('UNKNOWN_SCENE_TASK_EVENT_OPTION', '未知场景任务事件选项')
  if (option.kind === 'decline') {
    if ('placement' in normalized) throw new SceneExplorationError('INVALID_SCENE_TASK_EVENT_COMMAND', '放弃任务事件不得携带背包放置')
    return deepFreeze({
      command: normalized,
      metadata: { eventId: definition.id, optionId: option.id, actionTime: 0, riskTrace: null, returnRoute: null, sceneOutcome: null },
      effects: [{ kind: 'scene-task-event-declined', eventId: definition.id, optionId: option.id, nodeId: snapshot.currentNodeId }],
    })
  }
  if (!('placement' in normalized)) throw new SceneExplorationError('INVALID_SCENE_TASK_EVENT_COMMAND', '成功提取必须明确指定背包放置')

  const rules = extractionRules(option.extractionMode, dependencies)
  const armor = snapshot.equipment[definition.impactProtection.equipmentSlot]
  const armorState = armor?.definitionId === definition.impactProtection.definitionId
    ? getItemState(snapshot.itemStates, armor.instanceId)
    : null
  const protectionApplied = armorState?.resource.kind === 'integrity' && armorState.resource.current >= 1 && rules.protectedRiskPercent < rules.rawRiskPercent
  const effectiveRiskPercent = protectionApplied ? rules.protectedRiskPercent : rules.rawRiskPercent
  const outputInstanceId = createStableSceneTaskEventItemInstanceId(snapshot.sceneInstanceId, definition.id, definition.outputIndex)
  if (allKnownInstanceIds(snapshot).has(outputInstanceId)) throw new SceneExplorationError('SCENE_TASK_EVENT_ALREADY_COMPLETED', '样本箱稳定实例已存在')
  const outputItem = createItemInstance({ instanceId: outputInstanceId, definitionId: definition.outputDefinitionId, quantity: 1 }, dependencies.physicalCatalog)
  const placement = { x: normalized.placement.x, y: normalized.placement.y, rotated: normalized.placement.rotated }
  let backpackAfter
  try {
    backpackAfter = addItemToBackpack(snapshot.backpack, outputItem, { instanceId: outputInstanceId, ...placement }, dependencies.physicalCatalog)
  } catch (error) {
    if (error instanceof InventoryError) throw new SceneExplorationError('ACTION_NOT_AVAILABLE', error.message)
    throw error
  }
  const weightAfter = calculateBackpackWeightSubtotal(backpackAfter, dependencies.physicalCatalog)
  if (!classifyLoad(weightAfter, dependencies.config.backpack).canCarry) throw new SceneExplorationError('ACTION_NOT_AVAILABLE', '取得样本箱后无法携带')

  const effects: SceneExplorationEffect[] = []
  if (protectionApplied && armor && armorState?.resource.kind === 'integrity') {
    const resource = consumeCommittedResource(armorState, dependencies.config.scene.pathogenCaseRetrieval.impactProtectionIntegrityCost)
    effects.push({
      kind: 'item-resource-consumed', source: 'pathogen-case-impact-protection', equipmentSlot: 'armor',
      instanceId: armor.instanceId, definitionId: armor.definitionId, resourceKind: 'integrity',
      currentBefore: resource.currentBefore, requestedCost: resource.requestedCost, consumed: resource.consumed,
      currentAfter: resource.currentAfter, depleted: resource.depleted,
    })
  }
  const streamId = createStreamId('scene-task-event', snapshot.sceneInstanceId, definition.id, option.id, '0', 'contamination-risk')
  const draw = effectiveRiskPercent === 0 ? null : drawIntInclusive(createRandomCursor(dependencies.runSeed, streamId), 1, 100)
  const exposureAdded = draw && draw.value <= effectiveRiskPercent ? dependencies.config.scene.pathogenCaseRetrieval.exposureOnRiskSuccess : 0
  const riskTrace: Extract<SceneExplorationEffect, { readonly kind: 'scene-task-risk-resolved' }> = {
    kind: 'scene-task-risk-resolved', eventId: definition.id, optionId: option.id,
    algorithmVersion: RANDOM_ALGORITHM_VERSION, streamId,
    drawIndex: draw ? draw.nextCursor.drawIndex - 1 : null, roll: draw?.value ?? null,
    rawRiskPercent: rules.rawRiskPercent, effectiveRiskPercent, protectionApplied, exposureAdded,
  }
  effects.push(riskTrace)
  let conditionAfter = snapshot.condition
  if (exposureAdded > 0) {
    effects.push({ kind: 'scene-infection-exposure-added', source: 'pathogen-case-retrieval', exposuresBefore: conditionAfter.pendingInfectionExposures, added: exposureAdded, exposuresAfter: conditionAfter.pendingInfectionExposures + exposureAdded })
    conditionAfter = addPendingInfectionExposure(conditionAfter, exposureAdded)
  }
  const itemState = createFullItemState(outputItem, dependencies.itemResourceCatalog)
  effects.push({ kind: 'scene-task-item-acquired', eventId: definition.id, optionId: option.id, nodeId: snapshot.currentNodeId, instanceId: outputInstanceId, definitionId: outputItem.definitionId, placement, itemState })
  if (!snapshot.runIntelLog.intelIds.includes(definition.originIntelId)) effects.push({ kind: 'run-intel-added', intelId: definition.originIntelId })
  effects.push({ kind: 'scene-task-event-completed', eventId: definition.id, optionId: option.id })

  let returnRoute
  try {
    returnRoute = findReturnRoute({
      graph: dependencies.graph, currentNodeId: snapshot.currentNodeId,
      availability: { enabledEdgeIds: getEffectiveEnabledEdgeIds({ ...snapshot, backpack: backpackAfter }, dependencies.edgeAccessCatalog) },
      totalWeight: weightAfter, hasMinorContusion: hasMinorContusions(conditionAfter), analgesiaActive: conditionAfter.painkillerActive,
    }, dependencies.config)
  } catch (error) { graphFailure(error) }
  const currentIsSafetyNode = dependencies.graph.nodes.some(({ id, isReturnSafetyNode }) => id === snapshot.currentNodeId && isReturnSafetyNode)
  const sceneOutcome = resolveTimedSceneAction(
    { remainingTime: snapshot.remainingTime },
    { currentHealth: snapshot.condition.currentHealth, maxHealth: dependencies.config.combat.player.maxHealth, bleeding: snapshot.condition.bleeding },
    { timeCost: rules.actionTime, healthAfterPrimaryEffect: conditionAfter.currentHealth, bleedingAfterPrimaryEffect: conditionAfter.bleeding, estimatedReturnTimeAfterAction: returnRoute.estimatedReturnTime, endsExplorationAtSafety: false, isAtSafetyAfterAction: currentIsSafetyNode },
    { postActionBleedingDamage: dependencies.config.scene.postActionBleedingDamage, forcedReturn: dependencies.config.forcedReturn },
  )
  effects.push({ kind: 'scene-time-resolved', remainingTimeBefore: snapshot.remainingTime, actionTimeCost: rules.actionTime, remainingTimeAfter: sceneOutcome.clock.remainingTime, overtimeDebt: sceneOutcome.overtimeDebt })
  let health = conditionAfter.currentHealth
  health = addHealthEffect(effects, 'post-action-bleeding', sceneOutcome.postActionBleedingDamage, health)
  health = addHealthEffect(effects, 'forced-return-base', sceneOutcome.forcedReturnBaseDamage, health)
  addHealthEffect(effects, 'forced-return-bleeding', sceneOutcome.forcedReturnBleedingDamage, health)
  const status: SceneExplorationStatus = sceneOutcome.kind === 'death' ? 'dead' : sceneOutcome.kind === 'safe-return' ? 'safe-returned' : sceneOutcome.kind === 'forced-return' ? 'forced-returned' : 'active'
  if (status === 'forced-returned') effects.push({ kind: 'scene-node-changed', reason: 'forced-return', fromNodeId: snapshot.currentNodeId, toNodeId: returnRoute.safetyNodeId, routeNodeIds: [...returnRoute.nodeIds], routeEdgeIds: [...returnRoute.edgeIds] })
  if (status !== snapshot.status) effects.push({ kind: 'scene-status-changed', fromStatus: snapshot.status, toStatus: status, reason: status === 'dead' ? 'death' : status === 'safe-returned' ? 'safe-return' : 'forced-return' })
  return deepFreeze({ command: normalized, metadata: { eventId: definition.id, optionId: option.id, actionTime: rules.actionTime, riskTrace, returnRoute, sceneOutcome }, effects })
}

function materialize(initial: SceneExplorationSnapshot, plan: SceneTaskEventTransitionPlan, dependencies: SceneTaskEventCommandDependencies): SceneTaskEventEvaluation {
  const snapshot = applySceneExplorationEffects(initial, plan.effects, dependencies)
  return deepFreeze({ ...plan.metadata, effects: plan.effects, snapshot })
}

export function previewSceneTaskEventCommand(snapshot: SceneExplorationSnapshot, input: PerformSceneTaskEventCommand, dependencies: SceneTaskEventCommandDependencies): SceneTaskEventPreview {
  try {
    const initial = createSceneExplorationSnapshot(snapshot, dependencies)
    const plan = buildSceneTaskEventTransitionPlan(initial, input, dependencies)
    return deepFreeze({ canExecute: true, result: materialize(initial, plan, dependencies) })
  } catch (error) {
    if (error instanceof SceneExplorationError) return deepFreeze({ canExecute: false, rejectionCode: error.code })
    throw error
  }
}

export function resolveSceneTaskEventCommand(snapshot: SceneExplorationSnapshot, input: PerformSceneTaskEventCommand, dependencies: SceneTaskEventCommandDependencies): SceneTaskEventResolution {
  const initial = createSceneExplorationSnapshot(snapshot, dependencies)
  const plan = buildSceneTaskEventTransitionPlan(initial, input, dependencies)
  const result = materialize(initial, plan, dependencies)
  return deepFreeze({ result, snapshot: result.snapshot })
}

/** Kept here so effect application can share the single official evaluator. */
export function applySceneTaskEventEffects(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  dependencies: SceneTaskEventCommandDependencies,
): SceneExplorationSnapshot {
  const first = effects[0]
  if (!first) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 不能为空')
  const commandInput = first.kind === 'scene-task-event-declined'
    ? { eventId: first.eventId, optionId: first.optionId }
    : first.kind === 'item-resource-consumed' && first.source === 'pathogen-case-impact-protection'
      ? (() => {
          const acquired = effects.find((effect): effect is Extract<SceneExplorationEffect, { kind: 'scene-task-item-acquired' }> => effect.kind === 'scene-task-item-acquired')
          if (!acquired) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件缺少样本箱取得 Effect')
          return { eventId: acquired.eventId, optionId: acquired.optionId, placement: acquired.placement }
        })()
      : first.kind === 'scene-task-risk-resolved'
        ? (() => {
            const acquired = effects.find((effect): effect is Extract<SceneExplorationEffect, { kind: 'scene-task-item-acquired' }> => effect.kind === 'scene-task-item-acquired')
            if (!acquired) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件缺少样本箱取得 Effect')
            return { eventId: acquired.eventId, optionId: acquired.optionId, placement: acquired.placement }
          })()
        : null
  if (!commandInput) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 主体无效')
  const initial = createSceneExplorationSnapshot(initialSnapshot, dependencies)
  const expected = buildSceneTaskEventTransitionPlan(initial, commandInput, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 与冻结正式计划不一致')
  let state = initial
  for (const effect of effects) {
    switch (effect.kind) {
      case 'item-resource-consumed': {
        if (effect.source !== 'pathogen-case-impact-protection') throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件包含无关资源消耗')
        const current = getItemState(state.itemStates, effect.instanceId)
        const result = consumeCommittedResource(current, effect.requestedCost)
        state = deepFreeze({ ...state, itemStates: replaceItemState(state.itemStates, result.state) })
        break
      }
      case 'scene-task-risk-resolved':
        break
      case 'scene-infection-exposure-added':
        state = deepFreeze({ ...state, condition: addPendingInfectionExposure(state.condition, effect.added) })
        break
      case 'scene-task-item-acquired': {
        const item = createItemInstance({ instanceId: effect.instanceId, definitionId: effect.definitionId, quantity: 1 }, dependencies.physicalCatalog)
        state = deepFreeze({
          ...state,
          backpack: addItemToBackpack(state.backpack, item, { instanceId: item.instanceId, ...effect.placement }, dependencies.physicalCatalog),
          itemStates: { states: [...state.itemStates.states, effect.itemState] },
        })
        break
      }
      case 'run-intel-added':
        state = deepFreeze({ ...state, runIntelLog: addRunIntel(state.runIntelLog, effect.intelId) })
        break
      case 'scene-task-event-completed':
        state = deepFreeze({ ...state, taskEvents: completeSceneTaskEvent(state.taskEvents, effect.eventId) })
        break
      case 'scene-task-event-declined':
        break
      case 'scene-time-resolved': state = deepFreeze({ ...state, remainingTime: effect.remainingTimeAfter }); break
      case 'health-lost': state = deepFreeze({ ...state, condition: applyHealthLoss(state.condition, effect.requestedLoss, dependencies.config.combat.player).state }); break
      case 'scene-node-changed': state = deepFreeze({ ...state, currentNodeId: effect.toNodeId }); break
      case 'scene-status-changed': state = deepFreeze({ ...state, status: effect.toStatus }); break
      default: throw new SceneExplorationError('EFFECT_TASK_EVENT_MISMATCH', '任务事件包含无关 Effect')
    }
  }
  return createSceneExplorationSnapshot(state, dependencies)
}
