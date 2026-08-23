import {
  getUntreatedOpenWoundCount,
  type PlayerConditionSnapshot,
} from '../../core/condition'
import { createPlayerVisibleCombatSnapshot } from '../../core/combat'
import {
  getRunSceneRuntime,
  type RunSceneSessionSnapshot,
} from '../../core/scene-launch'
import {
  getPlayerVisibleSceneNodeState,
  previewSceneWithdrawalCommand,
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
}

export interface PlayerVisibleItemViewModel {
  readonly name: string
  readonly quantity: number
  readonly resource: Readonly<{ kind: 'durability' | 'integrity' | 'charge'; current: number }> | null
}

export interface PlayerVisibleLoadoutViewModel {
  readonly backpack: readonly PlayerVisibleItemViewModel[]
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
  readonly playerNextActionCtb: number
  readonly enemyNextActionCtb: number
  readonly equipment: PlayerVisibleLoadoutViewModel['equipment']
  readonly quickSlots: PlayerVisibleLoadoutViewModel['quickSlots']
}

type ItemPresentationRuntime = Readonly<{
  dependencies: Readonly<{
    physicalCatalog: Readonly<{
      get(definitionId: string): Readonly<{ name: string }>
    }>
  }>
}>

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
        currentNodeSearchState: 'not-available' | 'available-unsearched' | 'searched'
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

function conditionView(
  condition: PlayerConditionSnapshot,
  maximumHealth: number,
): PlayerVisibleConditionViewModel {
  return frozen({
    currentHealth: condition.currentHealth,
    maximumHealth,
    bleeding: condition.bleeding,
    untreatedOpenWounds: getUntreatedOpenWoundCount(condition),
    treatedOpenWounds: condition.openWounds.length - getUntreatedOpenWoundCount(condition),
    minorContusions: condition.minorContusions,
    painkillerActive: condition.painkillerActive,
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
    backpack: { items: readonly Readonly<{ definitionId: string; quantity: number; instanceId: string }>[] }
    equipment: { weapon: Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null; armor: Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null; utility: Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null }
    quickSlots: { slots: readonly (Readonly<{ definitionId: string; quantity: number; instanceId: string }> | null)[] }
    itemStates: Readonly<{ states: readonly Readonly<{ instanceId: string; definitionId: string; resource: { kind: 'none' } | { kind: 'durability' | 'integrity' | 'charge'; current: number } }>[] }>
  }>,
  runtime: ItemPresentationRuntime,
  labels: StableRunUiLabels,
): PlayerVisibleLoadoutViewModel {
  const map = (item: typeof input.equipment.weapon) =>
    item === null ? null : itemView(item, input.itemStates, runtime, labels)
  return frozen({
    backpack: frozen(input.backpack.items.map((item) => itemView(item, input.itemStates, runtime, labels))),
    equipment: frozen({ weapon: map(input.equipment.weapon), armor: map(input.equipment.armor), utility: map(input.equipment.utility) }),
    quickSlots: frozen(input.quickSlots.slots.map((item) => map(item))),
  })
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
  const withdrawal = scene.status === 'active'
    ? previewSceneWithdrawalCommand(scene, { kind: 'withdraw-from-scene' }, runtime.dependencies)
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
          playerNextActionCtb: visible.player.nextActionCtb,
          enemyNextActionCtb: visible.enemy.nextActionCtb,
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
      returnEstimate: withdrawal?.canExecute === true
        ? withdrawal.result.returnRoute.estimatedReturnTime
        : null,
      currentNodeSearchState: playerNode.search.kind,
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
    dependencies: frozen({ physicalCatalog: items.physicalCatalog }),
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
