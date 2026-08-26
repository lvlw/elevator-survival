import {
  getPlayerVisibleOpenWoundLabels,
  getUntreatedOpenWoundCount,
  type PlayerConditionSnapshot,
} from '../../core/condition'
import {
  convertCombatElapsedCtbToSceneTime,
  createPlayerVisibleCombatSnapshot,
  selectEnemyHealthPhase,
} from '../../core/combat'
import {
  calculateBackpackWeightSubtotal,
  getItemDimensions,
  getOccupiedCells,
  type BackpackSnapshot,
  type ItemCatalog,
} from '../../core/inventory'
import { classifyLoad } from '../../core/load'
import type { FrozenRuleConfig } from '../../core/config'
import type { RunReturnSummary } from '../../core/run-return'
import {
  getRunSceneRuntime,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import {
  getPlayerVisibleSceneNodeState,
  getPlayerVisibleSceneObstacles,
  previewSceneWithdrawalCommand,
  type SceneExplorationEffect,
  type SceneMedicalResolution,
} from '../../core/scene-exploration'
import { getWorldThreatStage } from '../../core/world-threat'
import {
  getStableRunPhaseIdentity,
  type RunSaveRulesRegistry,
  type StableRunPhase,
} from '../../state/run-save'
import { getCurrentTraversableAdjacentEdges } from '../interaction/current-traversable-adjacent-edges'

export interface StableRunUiLabels {
  sceneName(sceneDefinitionId: string): string
  itemName(definitionId: string, fallback: string): string
  enemyName(definitionId: string): string
  enemyIntentName(intentId: string): string
  worldThreatStageName(stageId: string): string
  failureReason(reason: string): string
  obstacleName(obstacleId: string): string
  obstacleOptionName(optionId: string): string
  taskEventName(eventId: string): string
  taskEventOptionName(optionId: string): string
}

export interface StableRunUiPresentationDependencies {
  readonly rulesRegistry: RunSaveRulesRegistry
  readonly labels: StableRunUiLabels
}

export interface PlayerVisibleConditionViewModel {
  readonly currentHealth: number
  readonly maximumHealth: number
  readonly bleeding: boolean
  readonly untreatedOpenWounds: number
  readonly treatedOpenWounds: number
  readonly minorContusions: number
  readonly painkillerActive: boolean
  readonly pendingInfectionExposures: number
  readonly wounds: readonly Readonly<{
    kind: 'laceration' | 'puncture' | 'bite'
    treatment: 'untreated' | 'treated'
    ordinal: number
  }>[]
}

export interface PlayerVisibleItemViewModel {
  readonly name: string
  readonly quantity: number
  readonly resource: Readonly<{ kind: 'durability' | 'integrity' | 'charge'; current: number }> | null
}

export interface PlayerVisibleLoadoutViewModel {
  readonly backpack: readonly PlayerVisibleItemViewModel[]
  readonly backpackWeight: number
  readonly loadTier: 'normal' | 'loaded' | 'overloaded' | 'cannot-carry'
  readonly backpackGrid: Readonly<{
    width: number
    height: number
    items: readonly Readonly<{
      name: string
      quantity: number
      x: number
      y: number
      rotated: boolean
      width: number
      height: number
    }>[]
    occupiedCells: readonly Readonly<{
      x: number
      y: number
      name: string
      quantity: number
      isAnchor: boolean
    }>[]
  }>
  readonly equipment: Readonly<{
    weapon: PlayerVisibleItemViewModel | null
    armor: PlayerVisibleItemViewModel | null
    utility: PlayerVisibleItemViewModel | null
  }>
  readonly quickSlots: readonly (PlayerVisibleItemViewModel | null)[]
}

export interface PlayerVisibleStatusBarViewModel {
  readonly currentDay: number
  readonly condition: PlayerVisibleConditionViewModel
  readonly worldThreatStage: string
  readonly satiety: number
  readonly mainSceneUsedToday: boolean
}

export interface PlayerVisibleCombatViewModel {
  readonly enemyName: string
  readonly enemyHealthStage: 'healthy' | 'wounded' | 'severely-wounded' | 'critical' | 'incapacitated'
  readonly currentIntent: string
  readonly currentIntentCategory: 'basic-attack' | 'special-attack'
  readonly currentIntentRelativeSpeed: 'normal' | 'slow'
  readonly currentIntentDirectDamageSeverity: 'medium' | 'high'
  readonly currentIntentMayCauseInjury: boolean
  readonly currentIntentMayCauseInfectionExposure: boolean
  readonly currentIntentMayCauseControl: boolean
  readonly currentCtb: number
  readonly playerNextActionCtb: number
  readonly enemyNextActionCtb: number
  readonly sceneRemainingTime: number
  readonly sceneTimeIfCombatEndedNow: number
  readonly minimumSceneTime: number
  readonly equipment: PlayerVisibleLoadoutViewModel['equipment']
  readonly quickSlots: PlayerVisibleLoadoutViewModel['quickSlots']
}

type ItemPresentationRuntime = Readonly<{
  dependencies: Readonly<{
    physicalCatalog: ItemCatalog
    config: FrozenRuleConfig
  }>
}>

export interface ReturnSummaryViewModel {
  readonly returnKind: 'safe' | 'forced'
  readonly remainingHealth: number
  readonly warehouseItems: readonly PlayerVisibleItemViewModel[]
  readonly taskItems: readonly PlayerVisibleItemViewModel[]
  readonly lostTaskItemCount: number
}

export interface CombatActionResultViewModel {
  readonly playerAction: string
  readonly playerHealthBefore: number
  readonly playerHealthAfter: number
  readonly enemyActionsResolved: number
  readonly newWounds: readonly string[]
  readonly treatedWounds: readonly string[]
  readonly bleedingChanged: 'started' | 'stopped' | null
  readonly infectionExposuresAdded: number
  readonly weaponResourceChange: string | null
  readonly armorResourceChange: string | null
  readonly consumedQuickSlotCount: number
  readonly enemyHealthStage: PlayerVisibleCombatViewModel['enemyHealthStage']
  readonly outcome: 'continue' | 'victory' | 'escaped' | 'defeat' | 'forced-returned'
  readonly sceneTimeCost: number | null
}

export interface TaskEventResultViewModel {
  readonly action: string
  readonly taskItemName: string | null
  readonly taskItemQuantity: number
  readonly eventCompleted: boolean
  readonly infectionExposuresAdded: number
  readonly armorResourceChange: string | null
  readonly originIntelRecorded: boolean
  readonly remainingTimeBefore: number
  readonly remainingTimeAfter: number
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly sceneStatus: 'active' | 'forced-returned' | 'dead'
  readonly safelyStored: false
}

export interface SceneMedicalResultViewModel {
  readonly action: string
  readonly source: string
  readonly itemConsumed: number
  readonly healthBefore: number
  readonly healthAfterPrimaryEffect: number
  readonly finalHealth: number
  readonly actualHealthRecovery: number
  readonly bleedingStopped: boolean
  readonly postActionBleedingDamage: number
  readonly woundTreated: string | null
  readonly woundRemoved: string | null
  readonly minorContusionRemoved: boolean
  readonly painkillerActivated: boolean
  readonly infectionExposureBefore: number
  readonly infectionExposureAfter: number
  readonly disinfectantUsesBefore: number
  readonly disinfectantUsesAfter: number
  readonly remainingTimeBefore: number
  readonly remainingTimeAfter: number
  readonly returnEstimateAfterAction: number
  readonly forcedReturnDamage: number
  readonly sceneStatus: 'active' | 'safe-returned' | 'forced-returned' | 'dead'
}

export type StableRunPlayerViewModel =
  | Readonly<{
      kind: 'current-day-hub'
      status: PlayerVisibleStatusBarViewModel
      loadout: PlayerVisibleLoadoutViewModel
      hub: Readonly<{
        maintenanceLaborRemaining: number
        warehouse: readonly PlayerVisibleItemViewModel[]
        taskStorage: readonly PlayerVisibleItemViewModel[]
      }>
    }>
  | Readonly<{
      kind: 'scene-session'
      status: PlayerVisibleStatusBarViewModel
      scene: Readonly<{
        status: 'active' | 'combat' | 'safe-returned' | 'forced-returned' | 'dead'
        remainingTime: number
        currentNodeName: string
        /**
         * Current traversable adjacency only. This is not a complete player-known
         * map: known-but-blocked routes require a future formal player-visible
         * navigation query before they can be presented.
        */
        traversableAdjacentNodeNames: readonly string[]
        returnEstimate: number | null
        returnAfterWithdrawalTime: number | null
        returnRisk: 'safe-returned' | 'forced-returned' | 'dead' | null
        currentNodeSearchState: 'not-available' | 'available-unsearched' | 'searched'
        currentObstacles: readonly Readonly<{ name: string }>[]
        groundItems: readonly PlayerVisibleItemViewModel[]
        loadout: PlayerVisibleLoadoutViewModel
        combat: PlayerVisibleCombatViewModel | null
      }>
    }>
  | Readonly<{
      kind: 'run-failure'
      failure: Readonly<{ currentDay: number; reason: string }>
    }>

function frozen<T>(value: T): Readonly<T> {
  return Object.freeze(value)
}

function woundName(kind: 'laceration' | 'puncture' | 'bite'): string {
  return kind === 'laceration' ? '撕裂伤' : kind === 'puncture' ? '穿刺伤' : '咬伤'
}

function conditionView(
  condition: PlayerConditionSnapshot,
  maximumHealth: number,
): PlayerVisibleConditionViewModel {
  const wounds = getPlayerVisibleOpenWoundLabels(condition.openWounds)
  return frozen({
    currentHealth: condition.currentHealth,
    maximumHealth,
    bleeding: condition.bleeding,
    untreatedOpenWounds: getUntreatedOpenWoundCount(condition),
    treatedOpenWounds: condition.openWounds.length - getUntreatedOpenWoundCount(condition),
    minorContusions: condition.minorContusions,
    painkillerActive: condition.painkillerActive,
    pendingInfectionExposures: condition.pendingInfectionExposures,
    wounds: frozen(wounds),
  })
}

function itemView(
  item: Readonly<{ definitionId: string; quantity: number; instanceId: string }>,
  itemStates: Readonly<{ states: readonly Readonly<{ instanceId: string; definitionId: string; resource: { kind: 'none' } | { kind: 'durability' | 'integrity' | 'charge'; current: number } }>[] }>,
  runtime: ItemPresentationRuntime,
  labels: StableRunUiLabels,
): PlayerVisibleItemViewModel {
  const definition = runtime.dependencies.physicalCatalog.get(item.definitionId)
  // Ordinary ground items may have no mutable resource state. ItemState is
  // still mandatory for resource-bearing carried items, but presentation must
  // not invent one merely to render a newly revealed physical item.
  const state = itemStates.states.find(
    ({ instanceId }) => instanceId === item.instanceId,
  )
  return frozen({
    name: labels.itemName(item.definitionId, definition.name),
    quantity: item.quantity,
    resource: !state || state.resource.kind === 'none'
      ? null
      : frozen({ kind: state.resource.kind, current: state.resource.current }),
  })
}

function loadoutView(
  input: Readonly<{
    backpack: BackpackSnapshot
    equipment: { weapon: Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null; armor: Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null; utility: Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null }
    quickSlots: { slots: readonly (Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null)[] }
    itemStates: Readonly<{ states: readonly Readonly<{ instanceId: string; definitionId: string; resource: { kind: 'none' } | { kind: 'durability' | 'integrity' | 'charge'; current: number } }>[] }>
  }>,
  runtime: ItemPresentationRuntime,
  labels: StableRunUiLabels,
): PlayerVisibleLoadoutViewModel {
  const map = (item: typeof input.equipment.weapon) =>
    item === null ? null : itemView(item, input.itemStates, runtime, labels)
  const itemById = new Map(input.backpack.items.map((item) => [item.instanceId, item]))
  const gridItems = input.backpack.placements.map((placement) => {
    const item = itemById.get(placement.instanceId)
    if (!item) throw new Error('正式背包摆放引用未知物品')
    const dimensions = getItemDimensions(
      runtime.dependencies.physicalCatalog.get(item.definitionId),
      placement.rotated,
    )
    const visible = itemView(item, input.itemStates, runtime, labels)
    return frozen({
      name: visible.name,
      quantity: visible.quantity,
      x: placement.x,
      y: placement.y,
      rotated: placement.rotated,
      width: dimensions.width,
      height: dimensions.height,
    })
  })
  const placementById = new Map(
    input.backpack.placements.map((placement) => [placement.instanceId, placement]),
  )
  const occupiedCells = getOccupiedCells(
    input.backpack,
    runtime.dependencies.physicalCatalog,
  ).map((cell) => {
    const item = itemById.get(cell.instanceId)
    const placement = placementById.get(cell.instanceId)
    if (!item || !placement) {
      throw new Error('正式背包占格引用未知物品或摆放')
    }
    const visible = itemView(item, input.itemStates, runtime, labels)
    return frozen({
      x: cell.x,
      y: cell.y,
      name: visible.name,
      quantity: visible.quantity,
      isAnchor: placement.x === cell.x && placement.y === cell.y,
    })
  })
  const backpackWeight = calculateBackpackWeightSubtotal(
    input.backpack,
    runtime.dependencies.physicalCatalog,
  )
  const load = classifyLoad(backpackWeight, runtime.dependencies.config.backpack)
  return frozen({
    backpack: frozen(input.backpack.items.map((item) => itemView(item, input.itemStates, runtime, labels))),
    backpackWeight,
    loadTier: load.tier,
    backpackGrid: frozen({
      width: input.backpack.width,
      height: input.backpack.height,
      items: frozen(gridItems),
      occupiedCells: frozen(occupiedCells),
    }),
    equipment: frozen({ weapon: map(input.equipment.weapon), armor: map(input.equipment.armor), utility: map(input.equipment.utility) }),
    quickSlots: frozen(input.quickSlots.slots.map((item) => map(item))),
  })
}

function projectFormalReturnRisk(
  status: 'active' | 'combat' | 'safe-returned' | 'forced-returned' | 'dead',
): 'safe-returned' | 'forced-returned' | 'dead' {
  if (
    status === 'safe-returned' ||
    status === 'forced-returned' ||
    status === 'dead'
  ) return status
  throw new Error('正式主动返程预览必须生成终局场景状态')
}

function createSceneView(
  session: RunSceneSessionSnapshot,
  dependencies: StableRunUiPresentationDependencies,
): Extract<StableRunPlayerViewModel, { kind: 'scene-session' }> {
  const identity = session.context.runReturnCarryForward.continuity.runIdentity
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(session, rules.sceneLaunch)
  const scene = session.scene
  const current = runtime.dependencies.graph.nodes.find(({ id }) => id === scene.currentNodeId)!
  const connected = getCurrentTraversableAdjacentEdges(scene, runtime)
    .map(({ destinationNodeName }) => destinationNodeName)
  const playerNode = getPlayerVisibleSceneNodeState(scene, scene.currentNodeId)
  const currentObstacles = getPlayerVisibleSceneObstacles(
    scene,
    runtime.dependencies,
  ).map(({ obstacleId }) => frozen({
    name: dependencies.labels.obstacleName(obstacleId),
  }))
  const withdrawal = scene.status === 'active'
    ? previewSceneWithdrawalCommand(scene, { kind: 'withdraw-from-scene' }, runtime.dependencies)
    : null
  const returnPreview = withdrawal?.canExecute === true
    ? frozen({
        estimatedReturnTime: withdrawal.result.returnRoute.estimatedReturnTime,
        remainingTimeAfter: withdrawal.result.snapshot.remainingTime,
        statusAfter: projectFormalReturnRisk(withdrawal.result.snapshot.status),
      })
    : null
  const activeEncounter = scene.combatState.encounters.find((encounter) => encounter.kind === 'active')
  const combat = activeEncounter?.kind === 'active'
    ? (() => {
        const visible = createPlayerVisibleCombatSnapshot(
          activeEncounter.combat,
          { encounterId: activeEncounter.encounterId, nodeId: activeEncounter.nodeId, engagement: activeEncounter.engagement },
          runtime.dependencies.sceneCombat!.combat,
        )
        return frozen({
          enemyName: dependencies.labels.enemyName(activeEncounter.combat.enemy.definitionId),
          enemyHealthStage: visible.enemy.healthPhase,
          currentIntent: dependencies.labels.enemyIntentName(visible.enemy.currentIntentId),
          currentIntentCategory: visible.enemy.currentIntentMetadata.category,
          currentIntentRelativeSpeed: visible.enemy.currentIntentMetadata.relativeSpeed,
          currentIntentDirectDamageSeverity:
            visible.enemy.currentIntentMetadata.directDamageSeverity,
          currentIntentMayCauseInjury:
            visible.enemy.currentIntentMetadata.mayCauseInjury,
          currentIntentMayCauseInfectionExposure:
            visible.enemy.currentIntentMetadata.mayCauseInfectionExposure,
          currentIntentMayCauseControl:
            visible.enemy.currentIntentMetadata.mayCauseControl,
          currentCtb: visible.player.currentCtb,
          playerNextActionCtb: visible.player.nextActionCtb,
          enemyNextActionCtb: visible.enemy.nextActionCtb,
          sceneRemainingTime: scene.remainingTime,
          sceneTimeIfCombatEndedNow: convertCombatElapsedCtbToSceneTime(
            visible.player.currentCtb,
            runtime.dependencies.config.combat.sceneTimeConversion,
          ),
          minimumSceneTime:
            runtime.dependencies.config.combat.sceneTimeConversion.minimumSceneTime,
          equipment: loadoutView(activeEncounter.combat, runtime, dependencies.labels).equipment,
          quickSlots: loadoutView(activeEncounter.combat, runtime, dependencies.labels).quickSlots,
        })
      })()
    : null
  const threatStage = getWorldThreatStage(
    session.context.worldThreat,
    rules.currentDayHub.worldThreatCatalog,
  )
  return frozen({
    kind: 'scene-session',
    status: frozen({
      currentDay: session.context.runReturnCarryForward.continuity.currentDay,
      condition: conditionView(scene.condition, runtime.dependencies.config.combat.player.maxHealth),
      worldThreatStage: dependencies.labels.worldThreatStageName(threatStage.id),
      satiety: session.context.satiety.current,
      mainSceneUsedToday: session.context.mainSceneUsedToday,
    }),
    scene: frozen({
      status: scene.status,
      remainingTime: scene.remainingTime,
      currentNodeName: current.name,
      traversableAdjacentNodeNames: frozen(connected),
      returnEstimate: returnPreview?.estimatedReturnTime ?? null,
      returnAfterWithdrawalTime: returnPreview?.remainingTimeAfter ?? null,
      returnRisk: returnPreview?.statusAfter ?? null,
      currentNodeSearchState: playerNode.search.kind,
      currentObstacles: frozen(currentObstacles),
      groundItems: frozen(playerNode.groundItems.map((item) => itemView(item, scene.itemStates, runtime, dependencies.labels))),
      loadout: loadoutView(scene, runtime, dependencies.labels),
      combat,
    }),
  })
}

export function createStableRunPlayerViewModel(
  phase: StableRunPhase,
  dependencies: StableRunUiPresentationDependencies,
): StableRunPlayerViewModel {
  if (phase.kind === 'scene-session') return createSceneView(phase.payload, dependencies)
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  if (phase.kind === 'run-failure') {
    const summary = phase.payload.source.kind === 'scene-defeat'
      ? phase.payload.source.context.runReturnCarryForward.continuity
      : phase.payload.source.terminalSnapshot.continuity
    return frozen({
      kind: 'run-failure',
      failure: frozen({ currentDay: summary.currentDay, reason: dependencies.labels.failureReason(phase.payload.reason) }),
    })
  }
  const hub = phase.payload
  const threatStage = getWorldThreatStage(hub.worldThreat, rules.currentDayHub.worldThreatCatalog)
  const items = rules.currentDayHub.returnDependencies.scene
  const pseudoRuntime: ItemPresentationRuntime = frozen({
    dependencies: frozen({ physicalCatalog: items.physicalCatalog, config: items.config }),
  })
  return frozen({
    kind: 'current-day-hub',
    status: frozen({
      currentDay: hub.continuity.currentDay,
      condition: conditionView(hub.playerCondition, items.config.combat.player.maxHealth),
      worldThreatStage: dependencies.labels.worldThreatStageName(threatStage.id),
      satiety: hub.satiety.current,
      mainSceneUsedToday: hub.dailyState.mainSceneUsedToday,
    }),
    loadout: loadoutView(hub.runLoadout, pseudoRuntime, dependencies.labels),
    hub: frozen({
      maintenanceLaborRemaining: hub.dailyState.maintenanceLaborRemaining,
      warehouse: frozen(hub.runLoadout.warehouse.items.map((item) => itemView(item, hub.runLoadout.itemStates, pseudoRuntime, dependencies.labels))),
      taskStorage: frozen(hub.runLoadout.taskStorage.items.map((item) => itemView(item, hub.runLoadout.itemStates, pseudoRuntime, dependencies.labels))),
    }),
  })
}

/**
 * Projects the core's completed return audit into a small player-visible
 * overlay. It never decides a destination or carries an instance ID onward.
 */
export function createReturnSummaryViewModel(
  summary: RunReturnSummary,
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  dependencies: StableRunUiPresentationDependencies,
): ReturnSummaryViewModel {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const hub = phase.payload
  const runtime: ItemPresentationRuntime = frozen({
    dependencies: frozen({
      physicalCatalog: rules.currentDayHub.returnDependencies.scene.physicalCatalog,
      config: rules.currentDayHub.returnDependencies.scene.config,
    }),
  })
  const byIds = (
    items: readonly Readonly<{ instanceId: string; definitionId: string; quantity: number }>[],
    instanceIds: readonly string[],
  ) => frozen(items.filter((item) => instanceIds.includes(item.instanceId)).map(
    (item) => itemView(item, hub.runLoadout.itemStates, runtime, dependencies.labels),
  ))
  return frozen({
    returnKind: summary.returnKind,
    remainingHealth: summary.remainingHealth,
    warehouseItems: byIds(hub.runLoadout.warehouse.items, summary.storedWarehouseInstanceIds),
    taskItems: byIds(hub.runLoadout.taskStorage.items, summary.storedTaskInstanceIds),
    lostTaskItemCount: summary.lostSceneTaskInstanceIds.length,
  })
}

/**
 * Compares two canonical Scene phases after one combat command. The returned
 * value contains only facts that have already happened; no raw resolution,
 * Effect, risk trace, instance identity, or exact enemy health is retained.
 */
export function createCombatActionResultViewModel(
  before: Extract<StableRunPhase, { kind: 'scene-session' }>,
  after: Extract<StableRunPhase, { kind: 'scene-session' }>,
  playerAction: string,
  formalResolution: unknown,
  dependencies: StableRunUiPresentationDependencies,
): CombatActionResultViewModel {
  const identity = getStableRunPhaseIdentity(after)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(after.payload, rules.sceneLaunch)
  const beforeScene = before.payload.scene
  const afterScene = after.payload.scene
  const beforeEncounter = beforeScene.combatState.encounters.find(
    ({ kind }) => kind === 'active',
  )
  if (beforeEncounter?.kind !== 'active') {
    throw new Error('战斗结果投影缺少行动前活跃遭遇')
  }
  const afterEncounter = afterScene.combatState.encounters.find(
    ({ encounterId }) => encounterId === beforeEncounter.encounterId,
  )
  if (!afterEncounter) throw new Error('战斗结果投影缺少行动后遭遇')
  const afterEnemy = afterEncounter.kind === 'active'
    ? afterEncounter.combat.enemy
    : afterEncounter.enemy
  const definition = runtime.dependencies.sceneCombat!.combat.enemyCatalog.get(
    afterEnemy.definitionId,
  )
  const beforeCondition = beforeEncounter.combat.playerCondition
  const afterCondition = afterScene.condition
  const beforeWounds = new Map(beforeCondition.openWounds.map((wound) => [wound.id, wound]))
  const newWounds = afterCondition.openWounds
    .filter(({ id }) => !beforeWounds.has(id))
    .map(({ kind }) => woundName(kind))
  const treatedWounds = afterCondition.openWounds
    .filter(({ id, treatment }) =>
      treatment === 'treated' && beforeWounds.get(id)?.treatment === 'untreated')
    .map(({ kind }) => woundName(kind))
  const resource = (slot: 'weapon' | 'armor') => {
    const beforeItem = beforeEncounter.combat.equipment[slot]
    const afterItem = afterScene.equipment[slot]
    if (!beforeItem || !afterItem || beforeItem.instanceId !== afterItem.instanceId) return null
    const beforeState = beforeEncounter.combat.itemStates.states.find(
      ({ instanceId }) => instanceId === beforeItem.instanceId,
    )
    const afterState = afterScene.itemStates.states.find(
      ({ instanceId }) => instanceId === afterItem.instanceId,
    )
    if (
      !beforeState || !afterState ||
      beforeState.resource.kind === 'none' || afterState.resource.kind === 'none' ||
      beforeState.resource.current === afterState.resource.current
    ) return null
    return `${beforeState.resource.current} → ${afterState.resource.current}`
  }
  const beforeQuickIds = new Set(beforeEncounter.combat.quickSlots.slots.flatMap(
    (item) => item ? [item.instanceId] : [],
  ))
  const afterQuickIds = new Set(afterScene.quickSlots.slots.flatMap(
    (item) => item ? [item.instanceId] : [],
  ))
  const enemyActionsResolved = afterEnemy.resolvedActionCount -
    beforeEncounter.combat.enemy.resolvedActionCount
  const outcome = afterScene.status === 'combat'
    ? 'continue'
    : afterScene.status === 'dead'
      ? 'defeat'
      : afterScene.status === 'forced-returned'
        ? 'forced-returned'
        : afterEnemy.defeated
          ? 'victory'
          : 'escaped'
  const resolutionRecord = formalResolution !== null &&
    typeof formalResolution === 'object' &&
    !Array.isArray(formalResolution)
    ? formalResolution as Record<string, unknown>
    : null
  const evaluation = resolutionRecord?.result !== null &&
    typeof resolutionRecord?.result === 'object' &&
    !Array.isArray(resolutionRecord.result)
    ? resolutionRecord.result as Record<string, unknown>
    : null
  const effects = Array.isArray(evaluation?.effects) ? evaluation.effects : []
  const timeEffect = effects.find((effect) => {
    if (effect === null || typeof effect !== 'object' || Array.isArray(effect)) return false
    return (effect as Record<string, unknown>).kind === 'scene-combat-time-resolved'
  })
  const sceneTimeCost = timeEffect && typeof timeEffect === 'object' &&
    Number.isSafeInteger((timeEffect as Record<string, unknown>).sceneTimeCost)
    ? (timeEffect as Record<string, unknown>).sceneTimeCost as number
    : null
  if (afterScene.status !== 'combat' && sceneTimeCost === null) {
    throw new Error('终局战斗结果缺少正式 Scene 时间结算事实')
  }
  return frozen({
    playerAction,
    playerHealthBefore: beforeCondition.currentHealth,
    playerHealthAfter: afterCondition.currentHealth,
    enemyActionsResolved,
    newWounds: frozen(newWounds),
    treatedWounds: frozen(treatedWounds),
    bleedingChanged: beforeCondition.bleeding === afterCondition.bleeding
      ? null
      : afterCondition.bleeding ? 'started' : 'stopped',
    infectionExposuresAdded:
      afterCondition.pendingInfectionExposures -
      beforeCondition.pendingInfectionExposures,
    weaponResourceChange: resource('weapon'),
    armorResourceChange: resource('armor'),
    consumedQuickSlotCount: [...beforeQuickIds].filter((id) => !afterQuickIds.has(id)).length,
    enemyHealthStage: selectEnemyHealthPhase(
      afterEnemy.currentHealth,
      definition.maxHealth,
    ),
    outcome,
    sceneTimeCost,
  })
}

/**
 * Projects only already-committed task-event state changes. Generated item
 * identities, random traces, effects, and the previous Scene are not retained.
 */
export function createTaskEventResultViewModel(
  before: Extract<StableRunPhase, { kind: 'scene-session' }>,
  after: Extract<StableRunPhase, { kind: 'scene-session' }>,
  action: string,
  dependencies: StableRunUiPresentationDependencies,
): TaskEventResultViewModel {
  const identity = getStableRunPhaseIdentity(after)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(after.payload, rules.sceneLaunch)
  const beforeScene = before.payload.scene
  const afterScene = after.payload.scene
  const beforeIds = new Set(beforeScene.backpack.items.map(({ instanceId }) => instanceId))
  const taskItem = afterScene.backpack.items.find((item) =>
    !beforeIds.has(item.instanceId) &&
    runtime.dependencies.lifecycleCatalog?.get(item.definitionId).kind === 'quest')
  const armorBefore = beforeScene.equipment.armor
  const armorAfter = afterScene.equipment.armor
  const resource = (scene: typeof beforeScene, instanceId: string) =>
    scene.itemStates.states.find((state) => state.instanceId === instanceId)?.resource
  const beforeArmorResource = armorBefore ? resource(beforeScene, armorBefore.instanceId) : null
  const afterArmorResource = armorAfter ? resource(afterScene, armorAfter.instanceId) : null
  const armorResourceChange = armorBefore && armorAfter &&
    armorBefore.instanceId === armorAfter.instanceId &&
    beforeArmorResource?.kind === 'integrity' &&
    afterArmorResource?.kind === 'integrity' &&
    beforeArmorResource.current !== afterArmorResource.current
    ? `${beforeArmorResource.current} → ${afterArmorResource.current}`
    : null
  const beforeIntel = new Set(beforeScene.runIntelLog.intelIds)
  const eventCompleted = afterScene.taskEvents.entries.some((entry) =>
    entry.status === 'completed' &&
    beforeScene.taskEvents.entries.find(({ eventId }) => eventId === entry.eventId)?.status === 'available')
  const taskDefinition = taskItem
    ? runtime.dependencies.physicalCatalog.get(taskItem.definitionId)
    : null
  if (
    afterScene.status !== 'active' &&
    afterScene.status !== 'forced-returned' &&
    afterScene.status !== 'dead'
  ) {
    throw new Error('任务事件结果必须保持在 active 或 terminal Scene')
  }
  return frozen({
    action,
    taskItemName: taskItem && taskDefinition
      ? dependencies.labels.itemName(taskItem.definitionId, taskDefinition.name)
      : null,
    taskItemQuantity: taskItem?.quantity ?? 0,
    eventCompleted,
    infectionExposuresAdded:
      afterScene.condition.pendingInfectionExposures -
      beforeScene.condition.pendingInfectionExposures,
    armorResourceChange,
    originIntelRecorded: afterScene.runIntelLog.intelIds.some((id) => !beforeIntel.has(id)),
    remainingTimeBefore: beforeScene.remainingTime,
    remainingTimeAfter: afterScene.remainingTime,
    backpackWeightBefore: calculateBackpackWeightSubtotal(
      beforeScene.backpack,
      runtime.dependencies.physicalCatalog,
    ),
    backpackWeightAfter: calculateBackpackWeightSubtotal(
      afterScene.backpack,
      runtime.dependencies.physicalCatalog,
    ),
    sceneStatus: afterScene.status,
    safelyStored: false,
  })
}

function requireSceneMedicalResolution(value: unknown): SceneMedicalResolution {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('result' in value) ||
    !('snapshot' in value)
  ) throw new Error('探索医疗结果投影缺少正式 resolution')
  const result = (value as { result?: unknown }).result
  if (
    result === null ||
    typeof result !== 'object' ||
    Array.isArray(result) ||
    !Array.isArray((result as { effects?: unknown }).effects)
  ) throw new Error('探索医疗结果投影缺少正式 Effect 事实')
  return value as SceneMedicalResolution
}

function medicalResultEffect<TKind extends SceneExplorationEffect['kind']>(
  effects: readonly SceneExplorationEffect[],
  kind: TKind,
): Extract<SceneExplorationEffect, { readonly kind: TKind }> | undefined {
  return effects.find(
    (effect): effect is Extract<SceneExplorationEffect, { readonly kind: TKind }> =>
      effect.kind === kind,
  )
}

function medicalResultWoundLabel(
  before: PlayerConditionSnapshot,
  woundId: string,
): string {
  const index = before.openWounds.findIndex(({ id }) => id === woundId)
  const visible = getPlayerVisibleOpenWoundLabels(before.openWounds)[index]
  if (!visible) throw new Error('探索医疗结果引用未知伤口')
  return `${woundName(visible.kind)} ${visible.ordinal}`
}

/**
 * Sanitizes one already-committed Scene Medical resolution. Raw Effects are
 * inspected only during projection and never retained in the returned model.
 */
export function createSceneMedicalResultViewModel(
  before: Extract<StableRunPhase, { kind: 'scene-session' }>,
  after: Extract<StableRunPhase, { kind: 'scene-session' }>,
  action: string,
  formalResolution: unknown,
): SceneMedicalResultViewModel {
  const resolution = requireSceneMedicalResolution(formalResolution)
  const effects = resolution.result.effects
  const consumed = medicalResultEffect(effects, 'scene-medical-item-consumed')
  const time = medicalResultEffect(effects, 'scene-time-resolved')
  if (!consumed || !time) throw new Error('探索医疗结果缺少消费或时间事实')

  const beforeScene = before.payload.scene
  const afterScene = after.payload.scene
  const health = medicalResultEffect(effects, 'scene-health-restored')
  const bleeding = medicalResultEffect(effects, 'scene-bleeding-changed')
  const treated = medicalResultEffect(effects, 'scene-open-wound-treated')
  const removed = medicalResultEffect(effects, 'scene-open-wound-removed')
  const exposure = medicalResultEffect(effects, 'scene-infection-exposure-reduced')
  const dailyUsage = medicalResultEffect(effects, 'daily-medical-usage-changed')
  const postActionBleeding = effects
    .filter((effect): effect is Extract<SceneExplorationEffect, { readonly kind: 'health-lost' }> =>
      effect.kind === 'health-lost' && effect.source === 'post-action-bleeding')
    .reduce((total, effect) => total + effect.actualLoss, 0)
  const source = consumed.sourceContainer === 'quick-slot'
    ? `快捷栏${(consumed.sourceSlotIndex ?? 0) + 1}`
    : (() => {
        const placement = beforeScene.backpack.placements.find(
          ({ instanceId }) => instanceId === consumed.instanceId,
        )
        if (!placement) throw new Error('探索医疗结果缺少背包来源摆放')
        return `背包格 ${placement.x + 1},${placement.y + 1}`
      })()
  if (afterScene.status === 'combat') {
    throw new Error('探索医疗结果不能进入战斗状态')
  }

  return frozen({
    action,
    source,
    itemConsumed: consumed.quantityConsumed,
    healthBefore: health?.healthBefore ?? beforeScene.condition.currentHealth,
    healthAfterPrimaryEffect: health?.healthAfter ?? beforeScene.condition.currentHealth,
    finalHealth: afterScene.condition.currentHealth,
    actualHealthRecovery: health?.actualRecovery ?? 0,
    bleedingStopped: Boolean(bleeding?.before && !bleeding.after),
    postActionBleedingDamage: postActionBleeding,
    woundTreated: treated
      ? medicalResultWoundLabel(beforeScene.condition, treated.woundId)
      : null,
    woundRemoved: removed
      ? medicalResultWoundLabel(beforeScene.condition, removed.woundId)
      : null,
    minorContusionRemoved: Boolean(
      medicalResultEffect(effects, 'scene-minor-contusion-removed'),
    ),
    painkillerActivated: Boolean(
      medicalResultEffect(effects, 'scene-painkiller-changed'),
    ),
    infectionExposureBefore:
      exposure?.exposuresBefore ?? beforeScene.condition.pendingInfectionExposures,
    infectionExposureAfter:
      exposure?.exposuresAfter ?? afterScene.condition.pendingInfectionExposures,
    disinfectantUsesBefore:
      dailyUsage?.usesBefore ?? beforeScene.dailyMedicalUsage.disinfectantUsesToday,
    disinfectantUsesAfter:
      dailyUsage?.usesAfter ?? afterScene.dailyMedicalUsage.disinfectantUsesToday,
    remainingTimeBefore: time.remainingTimeBefore,
    remainingTimeAfter: time.remainingTimeAfter,
    returnEstimateAfterAction: resolution.result.returnRoute.estimatedReturnTime,
    forcedReturnDamage: resolution.result.sceneOutcome.forcedReturnTotalDamage,
    sceneStatus: afterScene.status,
  })
}
