import { deepFreeze } from '../config'
import { addRunIntel } from '../run-intel'
import {
  addMinorContusion,
  applyHealthLoss,
  type PlayerHealthRules,
} from '../condition'
import {
  calculateBackpackWeightSubtotal,
} from '../inventory'
import {
  consumeCommittedResource,
  getItemState,
  replaceItemState,
} from '../item-state'
import { classifyLoad } from '../load'
import {
  applyCombatEffects,
  createFirstCombatEncounter,
  createReentryCombatEncounter,
} from '../combat'
import { createSceneObstaclePrimaryPlan } from '../scene-obstacle'
import {
  addSceneItems,
  getSceneNodeItems,
  removeSceneItemQuantity,
} from '../scene-items'
import {
  createSceneItemSnapshot,
  revealPreparedMainSearchOutcome,
} from '../scene-search'
import { SceneExplorationError } from './scene-exploration-errors'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { buildSceneCombatPlayerActionEffects } from './scene-combat-transition-plan'
import { createMoveThroughSceneEdgeCommand } from './scene-move-command'
import { buildSceneMoveTransitionPlan } from './scene-move-transition-plan'
import { applySceneMedicalEffects } from './scene-medical-effect-application'
import { applySceneBatteryEffects } from './scene-battery-effect-application'
import { applySceneWithdrawalEffects } from './scene-withdrawal-effect-application'
import { applySceneInventoryEffects } from './scene-inventory-command'
import { buildNodeItemPickupTransitionPlan } from './node-item-pickup-command'
import { planNodeItemPickupStacking } from './node-item-pickup-stacking'
import { applySceneTaskEventEffects } from './scene-task-event-command'
import type {
  SceneExplorationEffect,
  SceneExplorationDependencies,
  SceneExplorationEffectCommandBinding,
  SceneExplorationSnapshot,
  SceneObstacleCommandDependencies,
} from './scene-exploration-types'

const HEALTH_SOURCE_ORDER = [
  'post-action-bleeding',
  'forced-return-base',
  'forced-return-bleeding',
] as const

function fail(
  code:
    | 'INVALID_EFFECT_ORDER'
    | 'EFFECT_NODE_MISMATCH'
    | 'EFFECT_TIME_MISMATCH'
    | 'EFFECT_HEALTH_MISMATCH'
    | 'EFFECT_STATUS_MISMATCH'
    | 'EFFECT_HEALTH_RESULT_MISMATCH'
    | 'EFFECT_RESOURCE_MISMATCH'
    | 'EFFECT_SEARCH_MISMATCH'
    | 'EFFECT_PICKUP_MISMATCH'
    | 'EFFECT_OBSTACLE_MISMATCH'
    | 'EFFECT_ALERT_MISMATCH'
    | 'EFFECT_CONTUSION_MISMATCH'
    | 'EFFECT_SPAWN_MISMATCH'
    | 'EFFECT_RISK_MISMATCH'
    | 'EFFECT_COMBAT_MISMATCH'
    | 'EFFECT_MEDICAL_MISMATCH'
    | 'EFFECT_BATTERY_MISMATCH'
    | 'EFFECT_TASK_EVENT_MISMATCH'
    | 'EFFECT_WITHDRAWAL_MISMATCH'
    | 'INCOMPLETE_EFFECT_PLAN',
  message: string,
): never {
  throw new SceneExplorationError(code, message)
}

function summarizeRevealedItems(
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

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function applySceneCombatStartedEffects(
  initial: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  const startIndex = effects.findIndex(({ kind }) => kind === 'scene-combat-started')
  const startEffect = effects[startIndex]
  const statusEffect = effects[startIndex + 1]
  if (
    startIndex < 0 ||
    !startEffect || startEffect.kind !== 'scene-combat-started' ||
    effects.filter(({ kind }) => kind === 'scene-combat-started').length !== 1 ||
    effects.length !== startIndex + 2 ||
    !statusEffect || statusEffect.kind !== 'scene-status-changed' ||
    statusEffect.fromStatus !== 'active' ||
    statusEffect.toStatus !== 'combat' ||
    statusEffect.reason !== 'combat-started' ||
    !dependencies.sceneCombat
  ) {
    fail('EFFECT_COMBAT_MISMATCH', '战斗开始Effect计划不完整')
  }
  const beforeStart = applySceneExplorationEffectsInternal(
    initial,
    effects.slice(0, startIndex),
    dependencies,
    true,
    true,
  )
  if (beforeStart.status !== 'active' || beforeStart.currentNodeId !== startEffect.nodeId) {
    fail('EFFECT_COMBAT_MISMATCH', '战斗开始时的场景状态或节点无效')
  }
  const definition = dependencies.sceneCombat.encounterCatalog.get(startEffect.encounterId)
  const encounterIndex = beforeStart.combatState.encounters.findIndex(
    ({ encounterId }) => encounterId === definition.id,
  )
  const encounter = beforeStart.combatState.encounters[encounterIndex]
  const movementEffect = effects[0]
  if (
    !movementEffect ||
    movementEffect.kind !== 'scene-node-changed' ||
    movementEffect.reason !== 'movement' ||
    encounter?.kind !== 'dormant' || encounter.enemy.defeated ||
    startEffect.eventId !== definition.eventId ||
    startEffect.nodeId !== definition.nodeId ||
    startEffect.returnNodeId !== movementEffect.fromNodeId ||
    startEffect.nodeId !== movementEffect.toNodeId ||
    startEffect.entryEdgeId !== movementEffect.edgeId ||
    startEffect.enemyInstanceId !== encounter.enemy.enemyInstanceId ||
    !dependencies.graph.nodes.some(({ id }) => id === startEffect.returnNodeId)
  ) {
    fail('EFFECT_COMBAT_MISMATCH', '战斗开始Effect与遭遇状态不一致')
  }
  const combatInput = {
    playerCondition: beforeStart.condition,
    backpack: beforeStart.backpack,
    equipment: beforeStart.equipment,
    quickSlots: beforeStart.quickSlots,
    itemStates: beforeStart.itemStates,
    enemy: encounter.enemy,
    usage: beforeStart.combatState.usage,
  }
  const engagement = encounter.enemy.hasBeenEncountered ? 'reentry' : 'first-entry'
  const expected = engagement === 'reentry'
    ? createReentryCombatEncounter(combatInput, dependencies.sceneCombat.combat)
    : createFirstCombatEncounter(
        combatInput,
        beforeStart.alertState,
        dependencies.sceneCombat.combat,
      )
  if (startEffect.engagement !== engagement || !sameValue(startEffect.combat, expected)) {
    fail('EFFECT_COMBAT_MISMATCH', '战斗开始快照未由正式规则生成')
  }
  const encounters = [...beforeStart.combatState.encounters]
  encounters[encounterIndex] = deepFreeze({
    kind: 'active' as const,
    encounterId: definition.id,
    eventId: definition.eventId,
    nodeId: definition.nodeId,
    returnNodeId: startEffect.returnNodeId,
    entryEdgeId: startEffect.entryEdgeId,
    engagement,
    combat: expected,
  })
  return createSceneExplorationSnapshot({
    ...beforeStart,
    status: 'combat',
    combatState: {
      encounters,
      usage: expected.usage,
    },
    condition: expected.playerCondition,
    backpack: expected.backpack,
    equipment: expected.equipment,
    quickSlots: expected.quickSlots,
    itemStates: expected.itemStates,
  }, dependencies)
}

function applySceneCombatActionEffects(
  initial: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  const advanced = effects[0]
  if (
    !advanced || advanced.kind !== 'scene-combat-advanced' ||
    !dependencies.sceneCombat || initial.status !== 'combat'
  ) {
    fail('EFFECT_COMBAT_MISMATCH', '场景战斗推进Effect起点无效')
  }
  const expected = buildSceneCombatPlayerActionEffects(
    initial,
    advanced.command,
    dependencies,
  )
  if (!sameValue(effects, expected) || !sameValue(advanced.command, advanced.combatPlan.command)) {
    fail('EFFECT_COMBAT_MISMATCH', '场景战斗Effect与唯一正式计划不一致')
  }
  const activeIndex = initial.combatState.encounters.findIndex(
    ({ kind }) => kind === 'active',
  )
  const active = initial.combatState.encounters[activeIndex]
  if (active?.kind !== 'active' || active.encounterId !== advanced.encounterId) {
    fail('EFFECT_COMBAT_MISMATCH', '场景活跃遭遇与战斗推进Effect不一致')
  }
  const combat = applyCombatEffects(
    active.combat,
    advanced.command,
    advanced.combatPlan.effects,
    dependencies.sceneCombat.combat,
  )
  const encounters = [...initial.combatState.encounters]
  if (combat.status === 'awaiting-player') {
    encounters[activeIndex] = deepFreeze({ ...active, combat })
    return createSceneExplorationSnapshot({
      ...initial,
      combatState: { encounters, usage: combat.usage },
      condition: combat.playerCondition,
      backpack: combat.backpack,
      equipment: combat.equipment,
      quickSlots: combat.quickSlots,
      itemStates: combat.itemStates,
    }, dependencies)
  }

  const ended = effects.find(({ kind }) => kind === 'scene-combat-ended')
  const time = effects.find(({ kind }) => kind === 'scene-combat-time-resolved')
  const finalStatus = [...effects].reverse().find(
    ({ kind }) => kind === 'scene-status-changed',
  )
  if (
    !ended || ended.kind !== 'scene-combat-ended' ||
    !time || time.kind !== 'scene-combat-time-resolved' ||
    !finalStatus || finalStatus.kind !== 'scene-status-changed'
  ) {
    fail('INCOMPLETE_EFFECT_PLAN', '终局场景战斗Effect不完整')
  }
  encounters[activeIndex] = deepFreeze({
    kind: 'dormant' as const,
    encounterId: active.encounterId,
    eventId: active.eventId,
    nodeId: active.nodeId,
    enemy: combat.enemy,
  })
  let condition = combat.playerCondition
  for (const effect of effects) {
    if (effect.kind === 'health-lost') {
      condition = applyHealthLoss(
        condition,
        effect.requestedLoss,
        dependencies.config.combat.player,
      ).state
    }
  }
  const lastNodeChange = [...effects].reverse().find(
    ({ kind }) => kind === 'scene-node-changed',
  )
  const currentNodeId = lastNodeChange?.kind === 'scene-node-changed'
    ? lastNodeChange.toNodeId
    : initial.currentNodeId
  return createSceneExplorationSnapshot({
    ...initial,
    status: finalStatus.toStatus,
    currentNodeId,
    remainingTime: time.remainingTimeAfter,
    combatState: { encounters, usage: combat.usage },
    condition,
    backpack: combat.backpack,
    equipment: combat.equipment,
    quickSlots: combat.quickSlots,
    itemStates: combat.itemStates,
  }, dependencies)
}

function applySceneExplorationEffectsInternal(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  rulesOrDependencies: PlayerHealthRules | SceneExplorationDependencies,
  movementPlanValidated = false,
  deferStrictSnapshot = false,
): SceneExplorationSnapshot {
  const dependencies =
    'graph' in rulesOrDependencies ? rulesOrDependencies : null
  const healthRules = dependencies
    ? dependencies.config.combat.player
    : (rulesOrDependencies as PlayerHealthRules)
  const firstEffect = effects[0]
  if (
    !movementPlanValidated &&
    firstEffect?.kind === 'scene-node-changed' &&
    firstEffect.reason === 'movement'
  ) {
    if (!dependencies) {
      fail('INCOMPLETE_EFFECT_PLAN', '移动Effect回放需要完整场景探索依赖')
    }
    const command = createMoveThroughSceneEdgeCommand({
      edgeId: firstEffect.edgeId,
    })
    const expected = buildSceneMoveTransitionPlan(
      initialSnapshot,
      command,
      dependencies,
    )
    if (!sameValue(effects, expected.effects)) {
      fail('INCOMPLETE_EFFECT_PLAN', '移动Effect与唯一正式移动计划不一致')
    }
    return applySceneExplorationEffectsInternal(
      initialSnapshot,
      effects,
      dependencies,
      true,
    )
  }
  if (effects.some(({ kind }) => kind === 'scene-combat-started')) {
    if (!dependencies) {
      fail('EFFECT_COMBAT_MISMATCH', '战斗开始Effect需要完整场景依赖')
    }
    return applySceneCombatStartedEffects(initialSnapshot, effects, dependencies)
  }
  if (effects.some(({ kind }) => kind === 'scene-combat-advanced')) {
    if (!dependencies) {
      fail('EFFECT_COMBAT_MISMATCH', '场景战斗Effect需要完整场景依赖')
    }
    return applySceneCombatActionEffects(initialSnapshot, effects, dependencies)
  }
  if (effects.some(({ kind }) => kind === 'scene-medical-item-consumed')) {
    const medicalDependencies = dependencies?.medicalBindings
      ? dependencies as import('./scene-exploration-types').SceneMedicalCommandDependencies
      : null
    if (!medicalDependencies) {
      fail('EFFECT_MEDICAL_MISMATCH', '探索医疗 Effect 回放需要完整医疗内容绑定')
    }
    return applySceneMedicalEffects(initialSnapshot, effects, medicalDependencies)
  }
  if (effects.some(({ kind }) => kind === 'scene-battery-consumed')) {
    const batteryDependencies = dependencies && 'deviceRechargeCatalog' in dependencies
      ? dependencies as import('./scene-exploration-types').SceneBatteryCommandDependencies
      : null
    if (!batteryDependencies) fail('EFFECT_BATTERY_MISMATCH', '场景电池 Effect 回放需要完整充能目录')
    return applySceneBatteryEffects(initialSnapshot, effects, batteryDependencies)
  }
  if (effects.some(({ kind }) => kind === 'scene-active-withdrawal-resolved')) {
    if (!dependencies) {
      fail('EFFECT_WITHDRAWAL_MISMATCH', '主动撤离Effect回放需要完整场景探索依赖')
    }
    return applySceneWithdrawalEffects(initialSnapshot, effects, dependencies)
  }
  if (effects.some(({ kind }) => kind === 'scene-inventory-committed')) {
    fail('EFFECT_RESOURCE_MISMATCH', '场景整理Effect必须通过独立命令绑定应用')
  }
  if (effects.some(({ kind }) =>
    kind === 'scene-task-risk-resolved' ||
    kind === 'scene-task-item-acquired' ||
    kind === 'scene-task-event-completed' ||
    kind === 'scene-task-event-declined' ||
    kind === 'scene-infection-exposure-added' ||
    (kind === 'item-resource-consumed' && effects.some((effect) => effect.kind === 'item-resource-consumed' && effect.source === 'pathogen-case-impact-protection')),
  )) {
    const taskDependencies = dependencies && dependencies.taskEventCatalog && 'runSeed' in rulesOrDependencies
      ? rulesOrDependencies as import('./scene-exploration-types').SceneTaskEventCommandDependencies
      : null
    if (!taskDependencies) fail('EFFECT_TASK_EVENT_MISMATCH', '任务事件 Effect 回放需要完整任务事件依赖')
    return applySceneTaskEventEffects(initialSnapshot, effects, taskDependencies)
  }
  if (effects.length === 0) {
    throw new SceneExplorationError('EMPTY_EFFECTS', 'Effect计划不能为空')
  }
  const obstacleKinds = new Set([
    'scene-edge-enabled',
    'scene-item-spawned',
    'scene-alert-changed',
    'scene-obstacle-risk-resolved',
    'minor-contusion-added',
    'scene-obstacle-declined',
  ])
  const hasObstacleEffect = effects.some(
    (effect) =>
      obstacleKinds.has(effect.kind) ||
      (effect.kind === 'item-resource-consumed' &&
        effect.source.startsWith('fire-door-')),
  )
  let expectedObstacleActionTime: number | null = null
  let expectedObstaclePlan: ReturnType<typeof createSceneObstaclePrimaryPlan> | null = null
  if (hasObstacleEffect) {
    const obstacleDependencies =
      dependencies && 'runSeed' in rulesOrDependencies
        ? (rulesOrDependencies as SceneObstacleCommandDependencies)
        : null
    if (!obstacleDependencies) {
      fail(
        'EFFECT_RISK_MISMATCH',
        '障碍Effect回放需要包含Run seed的完整场景障碍依赖',
      )
    }
    const edgeEffects = effects.filter(
      (effect) => effect.kind === 'scene-edge-enabled',
    )
    const declineEffects = effects.filter(
      (effect) => effect.kind === 'scene-obstacle-declined',
    )
    if (
      edgeEffects.length + declineEffects.length !== 1 ||
      (edgeEffects.length === 1 && declineEffects.length === 1)
    ) {
      fail(
        'INCOMPLETE_EFFECT_PLAN',
        '障碍Effect计划必须恰好声明一个正式主要结果',
      )
    }
    const identity = edgeEffects[0] ?? declineEffects[0]
    const expected = createSceneObstaclePrimaryPlan(
      initialSnapshot,
      {
        obstacleId: identity.obstacleId,
        optionId: identity.optionId,
      },
      obstacleDependencies,
    )
    expectedObstaclePlan = expected
    if (
      !sameValue(
        effects.slice(0, expected.primaryEffects.length),
        expected.primaryEffects,
      )
    ) {
      fail(
        'INCOMPLETE_EFFECT_PLAN',
        '障碍主要Effect的数量、内容或顺序与唯一正式计划不一致',
      )
    }
    if (expected.actionTime === 0) {
      if (effects.length !== expected.primaryEffects.length) {
        fail('INVALID_EFFECT_ORDER', '放弃障碍必须只有一个Effect')
      }
    } else {
      const timeEffect = effects[expected.primaryEffects.length]
      if (
        !timeEffect ||
        timeEffect.kind !== 'scene-time-resolved' ||
        timeEffect.actionTimeCost !== expected.actionTime
      ) {
        fail(
          'EFFECT_TIME_MISMATCH',
          '障碍时间Effect缺失或不符合正式行动时间',
        )
      }
      expectedObstacleActionTime = expected.actionTime
    }
  }
  const declaredHealthOrder = effects
    .filter((effect) => effect.kind === 'health-lost')
    .map((effect) => HEALTH_SOURCE_ORDER.indexOf(effect.source))
  if (
    declaredHealthOrder.some(
      (order, index) =>
        order < 0 ||
        (index > 0 && order <= declaredHealthOrder[index - 1]),
    )
  ) {
    throw new SceneExplorationError(
      'INVALID_EFFECT_ORDER',
      '生命损失来源顺序非法或重复',
    )
  }

  let state = deepFreeze({
    ...initialSnapshot,
    searchState: initialSnapshot.searchState,
    sceneItems: initialSnapshot.sceneItems,
    equipment: initialSnapshot.equipment,
    quickSlots: initialSnapshot.quickSlots,
    itemStates: initialSnapshot.itemStates,
    enabledEdgeIds: [...initialSnapshot.enabledEdgeIds],
    backpack: {
      ...initialSnapshot.backpack,
      items: initialSnapshot.backpack.items.map((item) => ({ ...item })),
      placements: initialSnapshot.backpack.placements.map((placement) => ({
        ...placement,
      })),
    },
    condition: { ...initialSnapshot.condition },
  })
  let primaryKind: 'movement' | 'main-search' | 'pickup' | 'obstacle' | 'decline' | null = null
  let sawResourceConsumption = false
  let consumedResourceEffect: Extract<
    SceneExplorationEffect,
    { readonly kind: 'item-resource-consumed' }
  > | null = null
  let activeObstacleId: string | null = null
  let activeObstacleOptionId: string | null = null
  let sawTime = false
  let sawForcedReturn = false
  let sawStatus = false
  let lastHealthOrder = -1
  let expectedMainSearchIntelIds: readonly string[] | null = null
  const addedMainSearchIntelIds: string[] = []

  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index] as SceneExplorationEffect & {
      readonly kind: string
    }
    if (sawStatus) {
      fail('INVALID_EFFECT_ORDER', '状态变化必须是最后一个Effect')
    }

    switch (effect.kind) {
      case 'scene-item-picked-up': {
        if (
          index !== 0 ||
          effects.length !== 1 ||
          primaryKind !== null ||
          sawResourceConsumption ||
          sawTime
        ) {
          fail('INVALID_EFFECT_ORDER', '拾取Effect必须是唯一Effect')
        }
        if (!dependencies) {
          fail(
            'EFFECT_PICKUP_MISMATCH',
            '拾取Effect回放需要完整场景探索依赖',
          )
        }
        if (
          effect.nodeId !== state.currentNodeId ||
          state.status !== 'active' ||
          state.condition.currentHealth === 0
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect的场景状态无效')
        }
        const source = getSceneNodeItems(
          state.sceneItems,
          effect.nodeId,
        ).find(
          (entity) =>
            entity.item.instanceId === effect.sourceInstanceId,
        )
        if (
          !source ||
          source.item.definitionId !== effect.definitionId ||
          source.item.quantity !== effect.quantityBefore ||
          !Number.isSafeInteger(effect.quantityPicked) ||
          effect.quantityPicked <= 0 ||
          effect.quantityPicked > effect.quantityBefore ||
          effect.quantityRemaining !==
            effect.quantityBefore - effect.quantityPicked
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect源物品或数量不一致')
        }
        const expectedKind =
          effect.quantityRemaining === 0 ? 'full' : 'partial'
        if (effect.pickupKind !== expectedKind) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect类型与剩余数量不一致')
        }
        let expectedStacking
        try {
          expectedStacking = planNodeItemPickupStacking({
            snapshot: state,
            source,
            quantity: effect.quantityPicked,
            placement: effect.transfers.find(({ kind }) => kind === 'create-stack')?.placement ?? effect.destinationPlacement,
            dependencies,
          })
        } catch {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect无法重建正式堆叠计划')
        }
        if (!sameValue(effect.transfers, expectedStacking.transfers)) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect堆叠分配被篡改')
        }
        const expectedFirstTransfer = expectedStacking.transfers[0]
        if (
          !expectedFirstTransfer ||
          effect.destinationInstanceId !== expectedFirstTransfer.targetInstanceId ||
          !sameValue(effect.destinationPlacement, expectedFirstTransfer.placement) ||
          !sameValue(effect.destinationItemState, expectedFirstTransfer.itemState)
        ) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect首个目标摘要被篡改')
        }
        const plannedWeight = calculateBackpackWeightSubtotal(
          expectedStacking.backpack,
          dependencies.physicalCatalog,
        )
        if (!classifyLoad(plannedWeight, dependencies.config.backpack).canCarry) {
          fail('EFFECT_PICKUP_MISMATCH', '拾取Effect导致无法携带')
        }
        const plannedSceneItems = removeSceneItemQuantity(
          state.sceneItems,
          effect.nodeId,
          effect.sourceInstanceId,
          effect.quantityPicked,
          {
            graph: dependencies.graph,
            itemCatalog: dependencies.physicalCatalog,
            itemResourceCatalog: dependencies.itemResourceCatalog,
          },
        )
        state = deepFreeze({
          ...state,
          sceneItems: plannedSceneItems,
          backpack: expectedStacking.backpack,
          itemStates: expectedStacking.itemStates,
        })
        primaryKind = 'pickup'
        break
      }
      case 'item-resource-consumed': {
        if (
          index !== 0 ||
          sawResourceConsumption ||
          primaryKind !== null ||
          sawTime
        ) {
          fail('INVALID_EFFECT_ORDER', '装备资源Effect顺序非法')
        }
        const equipped = state.equipment[effect.equipmentSlot]
        if (
          !equipped ||
          equipped.instanceId !== effect.instanceId ||
          equipped.definitionId !== effect.definitionId ||
          (effect.source === 'main-search-illumination' &&
            (effect.equipmentSlot !== 'utility' || effect.resourceKind !== 'charge'))
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '资源Effect与声明装备槽不一致')
        }
        const itemState = getItemState(state.itemStates, effect.instanceId)
        if (
          itemState.definitionId !== effect.definitionId ||
          itemState.resource.kind === 'none' ||
          itemState.resource.kind !== effect.resourceKind ||
          itemState.resource.current !== effect.currentBefore
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect的before不一致')
        }
        let result
        try {
          result = consumeCommittedResource(
            itemState,
            effect.requestedCost,
          )
        } catch {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect无法合法消费')
        }
        if (
          result.consumed !== effect.consumed ||
          result.currentAfter !== effect.currentAfter ||
          result.depleted !== effect.depleted
        ) {
          fail('EFFECT_RESOURCE_MISMATCH', '照明资源Effect声明与结算不一致')
        }
        state = deepFreeze({
          ...state,
          itemStates: replaceItemState(state.itemStates, result.state),
        })
        sawResourceConsumption = true
        consumedResourceEffect = effect
        break
      }
      case 'scene-edge-enabled': {
        const expectedIndex = sawResourceConsumption ? 1 : 0
        const obstacle = dependencies?.obstacleCatalog?.has(effect.obstacleId)
          ? dependencies.obstacleCatalog.get(effect.obstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === effect.optionId)
        const resourceMatches =
          option?.kind === 'equipped-resource'
            ? consumedResourceEffect !== null &&
              consumedResourceEffect.source === option.resourceSource &&
              consumedResourceEffect.equipmentSlot === option.equipmentSlot &&
              consumedResourceEffect.definitionId === option.requiredDefinitionId &&
              consumedResourceEffect.requestedCost === dependencies?.config.scene.fireDoor.equippedItemResourceCost
            : option?.kind === 'force-entry'
              ? consumedResourceEffect === null ||
                (consumedResourceEffect.source === 'fire-door-impact-protection' &&
                  consumedResourceEffect.equipmentSlot === 'armor' &&
                  consumedResourceEffect.definitionId === option.protectionDefinitionId &&
                  consumedResourceEffect.requestedCost === dependencies?.config.scene.fireDoor.impactProtectionIntegrityCost)
              : consumedResourceEffect === null
        if (
          index !== expectedIndex ||
          primaryKind !== null ||
          !obstacle ||
          !option ||
          option.kind === 'decline' ||
          !resourceMatches ||
          obstacle.edgeId !== effect.edgeId ||
          !obstacle.endpointNodeIds.includes(state.currentNodeId) ||
          effect.nodeId !== state.currentNodeId ||
          state.enabledEdgeIds.includes(effect.edgeId)
        ) {
          fail('EFFECT_OBSTACLE_MISMATCH', '障碍开边Effect与当前状态不一致')
        }
        state = deepFreeze({
          ...state,
          enabledEdgeIds: [...state.enabledEdgeIds, effect.edgeId].sort(),
        })
        primaryKind = 'obstacle'
        activeObstacleId = effect.obstacleId
        activeObstacleOptionId = effect.optionId
        break
      }
      case 'scene-item-spawned': {
        const obstacle = activeObstacleId
          ? dependencies?.obstacleCatalog?.get(activeObstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === activeObstacleOptionId)
        const matchesGrant =
          option?.kind === 'equipped-resource' &&
          obstacle?.eventId === effect.sourceEventId &&
          option.id === effect.sourceOptionId &&
          option.spawnGrants.some(
            (grant) =>
              grant.definitionId === effect.entity.item.definitionId &&
              grant.quantity === effect.entity.item.quantity,
          )
        if (primaryKind !== 'obstacle' || sawTime || effect.nodeId !== state.currentNodeId || !matchesGrant) {
          fail('INVALID_EFFECT_ORDER', '场景物品产出Effect顺序非法')
        }
        let entity
        try {
          entity = createSceneItemSnapshot(
            effect.entity,
            dependencies!.physicalCatalog,
            dependencies!.itemResourceCatalog,
          )
        } catch {
          fail('EFFECT_SPAWN_MISMATCH', '场景物品产出实体无效')
        }
        const sceneItems = addSceneItems(
          state.sceneItems,
          effect.nodeId,
          [entity],
          {
            graph: dependencies!.graph,
            itemCatalog: dependencies!.physicalCatalog,
            itemResourceCatalog: dependencies!.itemResourceCatalog,
          },
        )
        state = deepFreeze({ ...state, sceneItems })
        break
      }
      case 'scene-alert-changed': {
        const expectedReason = expectedObstaclePlan?.outcomeMetadata.alertReason ?? null
        if (
          primaryKind !== 'obstacle' ||
          sawTime ||
          state.alertState !== effect.fromAlertState ||
          effect.toAlertState !== 'alerted' ||
          effect.reason !== expectedReason
        ) {
          fail('EFFECT_ALERT_MISMATCH', '警觉Effect与当前状态不一致')
        }
        state = deepFreeze({ ...state, alertState: 'alerted' as const })
        break
      }
      case 'scene-obstacle-risk-resolved': {
        if (
          primaryKind !== 'obstacle' ||
          sawTime ||
          effect.obstacleId !== activeObstacleId ||
          effect.optionId !== activeObstacleOptionId
        ) {
          fail('EFFECT_RISK_MISMATCH', '障碍风险Effect顺序或身份不一致')
        }
        break
      }
      case 'minor-contusion-added': {
        const obstacle = activeObstacleId
          ? dependencies?.obstacleCatalog?.get(activeObstacleId)
          : null
        const option = obstacle?.options.find(({ id }) => id === activeObstacleOptionId)
        if (
          primaryKind !== 'obstacle' ||
          sawTime ||
          effect.added !== 1 ||
          state.condition.minorContusions !== effect.countBefore ||
          effect.countAfter !== effect.countBefore + 1 ||
          option?.kind !== 'force-entry'
        ) {
          fail('EFFECT_CONTUSION_MISMATCH', '轻微挫伤Effect与当前状态不一致')
        }
        state = deepFreeze({
          ...state,
          condition: addMinorContusion(state.condition),
        })
        break
      }
      case 'scene-obstacle-declined': {
        const obstacle = dependencies?.obstacleCatalog?.has(effect.obstacleId)
          ? dependencies.obstacleCatalog.get(effect.obstacleId)
          : null
        if (
          effects.length !== 1 ||
          index !== 0 ||
          !obstacle ||
          obstacle.options.find(({ id }) => id === effect.optionId)?.kind !== 'decline' ||
          obstacle.edgeId !== effect.edgeId ||
          effect.nodeId !== state.currentNodeId ||
          state.enabledEdgeIds.includes(effect.edgeId)
        ) {
          fail('EFFECT_OBSTACLE_MISMATCH', '放弃障碍Effect与当前状态不一致')
        }
        primaryKind = 'decline'
        break
      }
      case 'scene-main-search-revealed': {
        if (!dependencies) {
          fail('EFFECT_SEARCH_MISMATCH', '搜索Effect回放需要完整场景依赖')
        }
        if (
          primaryKind !== null ||
          sawTime ||
          index !== (sawResourceConsumption ? 1 : 0) ||
          effect.nodeId !== state.currentNodeId
        ) {
          fail('INVALID_EFFECT_ORDER', '主要搜索揭示Effect顺序非法')
        }
        const current = state.searchState.nodeStates.find(
          (node) => node.nodeId === effect.nodeId,
        )
        if (
          !current ||
          current.kind !== 'unsearched' ||
          current.preparedOutcome.searchOrdinal !== effect.searchOrdinal
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '主要搜索状态或序号不一致')
        }
        const revealed = revealPreparedMainSearchOutcome(
          state.searchState,
          effect.nodeId,
        )
        const actualIds = current.preparedOutcome.revealedItems.map(
          ({ item }) => item.instanceId,
        )
        const actualSummary = summarizeRevealedItems(
          current.preparedOutcome.revealedItems.map(({ item }) => item),
        )
        if (
          !sameValue(actualIds, effect.revealedItemInstanceIds) ||
          !sameValue(actualSummary, effect.revealedItemSummary) ||
          !sameValue(
            current.preparedOutcome.revealedIntelIds,
            effect.revealedIntelIds,
          )
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '主要搜索Effect的揭示列表被篡改')
        }
        const sceneItems = addSceneItems(
          state.sceneItems,
          effect.nodeId,
          current.preparedOutcome.revealedItems,
          {
            graph: dependencies.graph,
            itemCatalog: dependencies.physicalCatalog,
            itemResourceCatalog: dependencies.itemResourceCatalog,
          },
        )
        state = deepFreeze({ ...state, searchState: revealed, sceneItems })
        expectedMainSearchIntelIds = current.preparedOutcome.revealedIntelIds.filter(
          (intelId) => !state.runIntelLog.intelIds.includes(intelId),
        )
        primaryKind = 'main-search'
        break
      }
      case 'run-intel-added': {
        if (
          primaryKind !== 'main-search' || sawTime || !expectedMainSearchIntelIds ||
          effect.intelId !== expectedMainSearchIntelIds[addedMainSearchIntelIds.length]
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '搜索情报 Effect 与正式搜索结果不一致')
        }
        addedMainSearchIntelIds.push(effect.intelId)
        state = deepFreeze({ ...state, runIntelLog: addRunIntel(state.runIntelLog, effect.intelId) })
        break
      }
      case 'scene-node-changed': {
        if (effect.fromNodeId !== state.currentNodeId) {
          fail('EFFECT_NODE_MISMATCH', '节点Effect的from与当前节点不一致')
        }
        if (effect.reason === 'movement') {
          if (index !== 0 || primaryKind !== null || sawResourceConsumption) {
            fail('INVALID_EFFECT_ORDER', '主要移动节点变化必须唯一且位于首位')
          }
          primaryKind = 'movement'
        } else {
          if (primaryKind === null || !sawTime || sawForcedReturn) {
            fail('INVALID_EFFECT_ORDER', '强制返程节点变化顺序非法')
          }
          sawForcedReturn = true
        }
        state = deepFreeze({ ...state, currentNodeId: effect.toNodeId })
        break
      }
      case 'scene-time-resolved': {
        const expectedIndex =
          primaryKind === 'movement'
            ? 1
            : primaryKind === 'main-search'
              ? sawResourceConsumption
                ? 2 + (expectedMainSearchIntelIds?.length ?? 0)
                : 1 + (expectedMainSearchIntelIds?.length ?? 0)
              : primaryKind === 'obstacle'
                ? index
                : -1
        if (sawTime || index !== expectedIndex) {
          fail('INVALID_EFFECT_ORDER', '时间Effect必须紧随主要效果且只能出现一次')
        }
        if (
          primaryKind === 'main-search' &&
          (!expectedMainSearchIntelIds || !sameValue(expectedMainSearchIntelIds, addedMainSearchIntelIds))
        ) {
          fail('EFFECT_SEARCH_MISMATCH', '搜索情报 Effect 缺失或顺序被篡改')
        }
        if (effect.remainingTimeBefore !== state.remainingTime) {
          fail('EFFECT_TIME_MISMATCH', '时间Effect的before与当前时间不一致')
        }
        if (
          !Number.isSafeInteger(effect.actionTimeCost) ||
          effect.actionTimeCost <= 0 ||
          effect.remainingTimeAfter !==
            Math.max(0, effect.remainingTimeBefore - effect.actionTimeCost) ||
          effect.overtimeDebt !==
            Math.max(0, effect.actionTimeCost - effect.remainingTimeBefore)
        ) {
          fail('EFFECT_TIME_MISMATCH', '时间Effect声明的结算结果不一致')
        }
        if (
          primaryKind === 'obstacle' &&
          effect.actionTimeCost !== expectedObstacleActionTime
        ) {
          fail('EFFECT_TIME_MISMATCH', '障碍行动时间与正式配置不一致')
        }
        sawTime = true
        state = deepFreeze({
          ...state,
          remainingTime: effect.remainingTimeAfter,
        })
        break
      }
      case 'health-lost': {
        if (!sawTime || sawForcedReturn) {
          fail('INVALID_EFFECT_ORDER', '生命损失Effect顺序非法')
        }
        const sourceOrder = HEALTH_SOURCE_ORDER.indexOf(effect.source)
        if (sourceOrder < 0 || sourceOrder <= lastHealthOrder) {
          fail('INVALID_EFFECT_ORDER', '生命损失来源顺序非法或重复')
        }
        if (effect.healthBefore !== state.condition.currentHealth) {
          fail('EFFECT_HEALTH_MISMATCH', '生命Effect的before与当前生命不一致')
        }
        const result = applyHealthLoss(
          state.condition,
          effect.requestedLoss,
          healthRules,
        )
        if (
          result.actualLoss !== effect.actualLoss ||
          result.healthAfter !== effect.healthAfter
        ) {
          fail(
            'EFFECT_HEALTH_RESULT_MISMATCH',
            '生命Effect声明与条件模块结算不一致',
          )
        }
        lastHealthOrder = sourceOrder
        state = deepFreeze({ ...state, condition: result.state })
        break
      }
      case 'scene-status-changed': {
        if (primaryKind === null || !sawTime || index !== effects.length - 1) {
          fail('INVALID_EFFECT_ORDER', '状态变化顺序非法')
        }
        if (effect.fromStatus !== state.status) {
          fail('EFFECT_STATUS_MISMATCH', '状态Effect的before与当前状态不一致')
        }
        const expectedReason =
          effect.toStatus === 'dead'
            ? 'death'
            : effect.toStatus === 'safe-returned'
              ? 'safe-return'
              : effect.toStatus === 'forced-returned'
                ? 'forced-return'
                : null
        if (expectedReason === null || effect.reason !== expectedReason) {
          fail('EFFECT_STATUS_MISMATCH', '状态变化原因与目标状态不一致')
        }
        if (
          (effect.toStatus === 'dead') !==
          (state.condition.currentHealth === 0)
        ) {
          fail('EFFECT_STATUS_MISMATCH', '死亡状态与生命结果不一致')
        }
        if (effect.toStatus === 'forced-returned' && !sawForcedReturn) {
          fail('INCOMPLETE_EFFECT_PLAN', '强制返程状态缺少节点变化Effect')
        }
        if (effect.toStatus !== 'forced-returned' && sawForcedReturn) {
          fail('EFFECT_STATUS_MISMATCH', '非强制返程状态包含返程节点变化')
        }
        sawStatus = true
        state = deepFreeze({ ...state, status: effect.toStatus })
        break
      }
      default:
        throw new SceneExplorationError(
          'UNKNOWN_EFFECT',
          `未知场景探索Effect：${String(
            (effects[index] as unknown as { readonly kind: unknown }).kind,
          )}`,
        )
    }
  }

  if (
    primaryKind === null ||
    (primaryKind !== 'pickup' && primaryKind !== 'decline' && !sawTime) ||
    (primaryKind === 'pickup' && sawTime)
  ) {
    fail('INCOMPLETE_EFFECT_PLAN', 'Effect计划缺少主要效果或时间结算')
  }
  if (sawResourceConsumption && primaryKind !== 'main-search') {
    if (primaryKind !== 'obstacle') {
      fail('INCOMPLETE_EFFECT_PLAN', '装备资源消费后缺少对应主要效果')
    }
  }
  if (state.condition.currentHealth === 0 && state.status !== 'dead') {
    fail('INCOMPLETE_EFFECT_PLAN', '生命归零后必须提交dead状态')
  }
  if (sawForcedReturn && state.status !== 'forced-returned') {
    fail('INCOMPLETE_EFFECT_PLAN', '强制返程节点变化后必须提交对应状态')
  }
  return dependencies && !deferStrictSnapshot
    ? createSceneExplorationSnapshot(state, dependencies)
    : deepFreeze(state)
}

export function applySceneExplorationEffects(
  initialSnapshot: SceneExplorationSnapshot,
  effects: readonly SceneExplorationEffect[],
  rulesOrDependencies: PlayerHealthRules | SceneExplorationDependencies,
  commandBinding?: SceneExplorationEffectCommandBinding,
): SceneExplorationSnapshot {
  const dependencies = 'graph' in rulesOrDependencies
    ? rulesOrDependencies
    : null
  if (effects.some(({ kind }) => kind === 'scene-inventory-committed')) {
    if (!dependencies || commandBinding?.kind !== 'scene-inventory') {
      fail('EFFECT_RESOURCE_MISMATCH', '场景整理Effect缺少独立规范化命令')
    }
    return applySceneInventoryEffects(
      initialSnapshot,
      commandBinding.command,
      effects,
      dependencies,
    )
  }
  const hasPickup = effects.some(({ kind }) => kind === 'scene-item-picked-up')
  const expectedPickupPlan = hasPickup && dependencies &&
    commandBinding?.kind === 'node-item-pickup'
    ? buildNodeItemPickupTransitionPlan(
        initialSnapshot,
        commandBinding.command,
        dependencies,
      )
    : null
  if (hasPickup && !expectedPickupPlan) {
    fail('EFFECT_PICKUP_MISMATCH', '拾取Effect缺少独立规范化命令')
  }
  const snapshot = applySceneExplorationEffectsInternal(
    initialSnapshot,
    effects,
    rulesOrDependencies,
  )
  if (expectedPickupPlan && !sameValue(effects, expectedPickupPlan.effects)) {
    fail('EFFECT_PICKUP_MISMATCH', '拾取Effect与独立命令不一致')
  }
  return snapshot
}
