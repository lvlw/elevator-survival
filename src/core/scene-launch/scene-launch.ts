import { deepFreeze } from '../config'
import {
  createCurrentDayHubSnapshot,
  createCurrentDayHubSnapshotFromReturn,
  projectRunReturnCarryForwardFromCurrentDayHub,
  type CurrentDayHubDependencies,
  type CurrentDayHubSnapshot,
} from '../current-day-hub'
import {
  bindRunPhaseContinuityToScene,
  deriveSceneInstanceIdFromRunFacts,
} from '../domain'
import type { ItemState } from '../item-state'
import {
  assertNoRunStorageScenePhysicalItemConflicts,
  bindRunReturnCarryForwardToScene,
  resolveRunReturn,
  restoreRunReturnCarryForwardSnapshot,
  type RunReturnCarryForwardSnapshot,
  type RunReturnInput,
  type RunReturnResult,
} from '../run-return'
import {
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  resolveSceneWithdrawalCommand,
  type MainSearchCommandDependencies,
  type SceneBatteryCommandDependencies,
  type SceneExplorationSnapshot,
  type SceneMedicalCommandDependencies,
  type SceneObstacleCommandDependencies,
  type SceneTaskEventCommandDependencies,
  type SceneWithdrawalResolution,
  type WithdrawFromSceneCommand,
} from '../scene-exploration'
import { createSceneSearchState } from '../scene-search'
import { createSatietySnapshot, type SatietySnapshot } from '../satiety'
import {
  createDailyThreatSuppressionSnapshot,
  type DailyThreatSuppressionSnapshot,
} from '../daily-state'
import {
  createWorldThreatSnapshot,
  getWorldThreatStage,
  type WorldThreatSnapshot,
} from '../world-threat'

export class SceneLaunchError extends Error {
  public readonly code:
    | 'INVALID_INPUT'
    | 'ACTION_NOT_AVAILABLE'
    | 'EFFECT_MISMATCH'

  public constructor(code: SceneLaunchError['code'], message: string) {
    super(message)
    this.name = 'SceneLaunchError'
    this.code = code
  }
}

export type FormalSceneRuntimeDependencies =
  MainSearchCommandDependencies &
  SceneMedicalCommandDependencies &
  SceneBatteryCommandDependencies &
  SceneObstacleCommandDependencies &
  SceneTaskEventCommandDependencies

export interface SceneRuntimeContentBundle {
  readonly sceneDefinitionId: string
  readonly entryNodeId: string
  readonly initialEnabledEdgeIds: readonly string[]
  readonly dependencies: FormalSceneRuntimeDependencies
}

export interface SceneLaunchContentDefinition {
  readonly sceneDefinitionId: string
  createRuntime(
    runSeed: string,
    sceneInstanceId: string,
  ): SceneRuntimeContentBundle
}

export interface SceneLaunchDependencies {
  readonly currentDayHub: CurrentDayHubDependencies
  readonly content: SceneLaunchContentDefinition
}

export interface RunSceneLifecycleContextSnapshot {
  readonly runReturnCarryForward: RunReturnCarryForwardSnapshot
  readonly worldThreat: WorldThreatSnapshot
  readonly satiety: SatietySnapshot
  readonly threatSuppression: DailyThreatSuppressionSnapshot
  readonly maintenanceLaborRemaining: number
  readonly mainSceneUsedToday: true
}

export interface RunSceneSessionSnapshot {
  readonly context: RunSceneLifecycleContextSnapshot
  readonly scene: SceneExplorationSnapshot
}

export interface LaunchMainSceneCommand {
  readonly kind: 'launch-main-scene'
}

export type SceneLaunchEffect =
  | Readonly<{
      kind: 'daily-main-scene-usage-changed'
      before: false
      after: true
    }>
  | Readonly<{
      kind: 'run-continuity-bound-to-scene'
      before: CurrentDayHubSnapshot['continuity']
      after: RunSceneLifecycleContextSnapshot['runReturnCarryForward']['continuity']
    }>
  | Readonly<{
      kind: 'formal-scene-initialized'
      scene: SceneExplorationSnapshot
    }>
  | Readonly<{
      kind: 'run-scene-session-committed'
      session: RunSceneSessionSnapshot
    }>

export interface SceneLaunchTransitionPlan {
  readonly command: LaunchMainSceneCommand
  readonly effects: readonly SceneLaunchEffect[]
  readonly session: RunSceneSessionSnapshot
}

export type SceneLaunchPreview =
  | Readonly<{ canExecute: true; result: SceneLaunchTransitionPlan }>
  | Readonly<{
      canExecute: false
      rejectionCode: SceneLaunchError['code']
    }>

export interface RunSceneReturnResolution {
  readonly runReturn: RunReturnResult
  readonly currentDayHub: CurrentDayHubSnapshot
}

export interface RunSceneWithdrawalResolution {
  readonly withdrawal: SceneWithdrawalResolution
  readonly session: RunSceneSessionSnapshot
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function invalid(message: string): never {
  throw new SceneLaunchError('INVALID_INPUT', message)
}

function unavailable(message: string): never {
  throw new SceneLaunchError('ACTION_NOT_AVAILABLE', message)
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function deriveSceneInstanceId(
  hubInput: CurrentDayHubSnapshot,
  sceneDefinitionId: string,
  dependencies: CurrentDayHubDependencies,
): string {
  const hub = createCurrentDayHubSnapshot(hubInput, dependencies)
  if (typeof sceneDefinitionId !== 'string' || sceneDefinitionId.trim().length === 0) {
    invalid('正式场景定义ID无效')
  }
  return deriveSceneInstanceIdFromRunFacts({
    runIdentity: hub.continuity.runIdentity,
    currentDay: hub.continuity.currentDay,
    sceneDefinitionId,
  })
}

function runtimeFor(
  continuity: RunSceneLifecycleContextSnapshot['runReturnCarryForward']['continuity'],
  dependencies: SceneLaunchDependencies,
): SceneRuntimeContentBundle {
  let runtime: SceneRuntimeContentBundle
  try {
    runtime = dependencies.content.createRuntime(
      continuity.runIdentity.seed,
      continuity.sceneInstanceId,
    )
  } catch (error) {
    invalid(error instanceof Error ? error.message : '正式场景runtime bundle创建失败')
  }
  if (!exact(runtime, [
    'dependencies',
    'entryNodeId',
    'initialEnabledEdgeIds',
    'sceneDefinitionId',
  ]) ||
    runtime.sceneDefinitionId !== dependencies.content.sceneDefinitionId ||
    typeof runtime.entryNodeId !== 'string' || !runtime.entryNodeId.trim() ||
    !Array.isArray(runtime.initialEnabledEdgeIds)) {
    invalid('正式场景runtime bundle结构无效')
  }
  const scene = runtime.dependencies
  if (!scene ||
    !scene.graph ||
    !scene.physicalCatalog ||
    !scene.equipmentCatalog ||
    !scene.quickSlotCatalog ||
    !scene.itemResourceCatalog ||
    !scene.config ||
    !scene.edgeAccessCatalog ||
    !scene.searchCatalog ||
    !scene.searchIlluminationCatalog ||
    !scene.obstacleCatalog ||
    !scene.sceneCombat ||
    !scene.taskEventCatalog ||
    !scene.medicalBindings ||
    !scene.lifecycleCatalog ||
    !scene.deviceRechargeCatalog ||
    scene.runSeed !== continuity.runIdentity.seed ||
    scene.config.metadata.rulesVersion !== continuity.runIdentity.rulesVersion ||
    scene.sceneCombat.combat.runSeed !== continuity.runIdentity.seed ||
    scene.sceneCombat.combat.sceneInstanceId !== continuity.sceneInstanceId ||
    !scene.graph.nodes.some(({ id }) => id === runtime.entryNodeId)) {
    invalid('正式场景runtime bundle不完整或与Run连续性不一致')
  }
  return runtime
}

export function restoreRunSceneLifecycleContext(
  input: unknown,
  dependencies: SceneLaunchDependencies,
): RunSceneLifecycleContextSnapshot {
  if (!exact(input, [
    'mainSceneUsedToday',
    'maintenanceLaborRemaining',
    'runReturnCarryForward',
    'satiety',
    'threatSuppression',
    'worldThreat',
  ]) || input.mainSceneUsedToday !== true) {
    invalid('Run场景生命周期上下文结构无效')
  }
  try {
    const config = dependencies.currentDayHub.returnDependencies.scene.config
    const carryForward = restoreRunReturnCarryForwardSnapshot(
      input.runReturnCarryForward,
      dependencies.currentDayHub.returnDependencies,
    )
    const actualSceneInstanceId = carryForward.continuity.sceneInstanceId
    const expectedSceneInstanceId = deriveSceneInstanceIdFromRunFacts({
      runIdentity: carryForward.continuity.runIdentity,
      currentDay: carryForward.continuity.currentDay,
      sceneDefinitionId: dependencies.content.sceneDefinitionId,
    })
    if (actualSceneInstanceId !== expectedSceneInstanceId) {
      invalid('Run场景生命周期的场景实例ID不符合正式确定性派生结果')
    }
    if (carryForward.returnLedger.sceneInstanceIds.includes(actualSceneInstanceId)) {
      invalid('Run场景生命周期的当前场景实例已经完成返回结算')
    }
    if (!Number.isSafeInteger(input.maintenanceLaborRemaining) ||
      (input.maintenanceLaborRemaining as number) < 0 ||
      (input.maintenanceLaborRemaining as number) > config.maintenance.dailyBaseLabor.points) {
      invalid('Run场景生命周期维护工时无效')
    }
    const worldThreat = createWorldThreatSnapshot(
      input.worldThreat,
      dependencies.currentDayHub.worldThreatCatalog,
    )
    if (worldThreat.definitionId !== config.worldThreat.definitionId ||
      getWorldThreatStage(worldThreat, dependencies.currentDayHub.worldThreatCatalog).terminal) {
      invalid('Run场景生命周期世界威胁状态无效')
    }
    return deepFreeze({
      runReturnCarryForward: carryForward,
      worldThreat,
      satiety: createSatietySnapshot(input.satiety, config),
      threatSuppression: createDailyThreatSuppressionSnapshot(
        input.threatSuppression,
        config,
      ),
      maintenanceLaborRemaining: input.maintenanceLaborRemaining as number,
      mainSceneUsedToday: true,
    })
  } catch (error) {
    if (error instanceof SceneLaunchError) throw error
    invalid(error instanceof Error ? error.message : 'Run场景生命周期上下文无效')
  }
}

export function createRunSceneSessionSnapshot(
  input: unknown,
  dependencies: SceneLaunchDependencies,
): RunSceneSessionSnapshot {
  if (!exact(input, ['context', 'scene'])) invalid('Run场景Session结构无效')
  try {
    const context = restoreRunSceneLifecycleContext(input.context, dependencies)
    const runtime = runtimeFor(context.runReturnCarryForward.continuity, dependencies)
    const scene = createSceneExplorationSnapshot(
      input.scene as SceneExplorationSnapshot,
      runtime.dependencies,
    )
    if (context.runReturnCarryForward.continuity.sceneInstanceId !== scene.sceneInstanceId) {
      invalid('Run场景Session的连续性与场景实例不一致')
    }
    assertNoRunStorageScenePhysicalItemConflicts(
      context.runReturnCarryForward.storedInventory,
      scene,
    )
    return deepFreeze({ context, scene })
  } catch (error) {
    if (error instanceof SceneLaunchError) throw error
    invalid(error instanceof Error ? error.message : 'Run场景快照无效')
  }
}

export function getRunSceneRuntime(
  sessionInput: RunSceneSessionSnapshot,
  dependencies: SceneLaunchDependencies,
): SceneRuntimeContentBundle {
  const session = createRunSceneSessionSnapshot(sessionInput, dependencies)
  return runtimeFor(session.context.runReturnCarryForward.continuity, dependencies)
}

/** Keeps Scene provenance intact while applying the formal non-combat return. */
export function resolveRunSceneSessionWithdrawal(
  sessionInput: RunSceneSessionSnapshot,
  command: WithdrawFromSceneCommand,
  dependencies: SceneLaunchDependencies,
): RunSceneWithdrawalResolution {
  const session = createRunSceneSessionSnapshot(sessionInput, dependencies)
  const runtime = runtimeFor(session.context.runReturnCarryForward.continuity, dependencies)
  const withdrawal = resolveSceneWithdrawalCommand(
    session.scene,
    command,
    runtime.dependencies,
  )
  const terminalSession = createRunSceneSessionSnapshot({
    context: session.context,
    scene: withdrawal.snapshot,
  }, dependencies)
  return deepFreeze({ withdrawal, session: terminalSession })
}

export function createLaunchMainSceneCommand(input: unknown): LaunchMainSceneCommand {
  if (!exact(input, ['kind']) || input.kind !== 'launch-main-scene') {
    invalid('主要场景启动命令结构无效')
  }
  return deepFreeze({ kind: 'launch-main-scene' })
}

function carriedStates(hub: CurrentDayHubSnapshot): readonly Readonly<ItemState>[] {
  const ids = new Set([
    ...hub.runLoadout.backpack.items,
    ...Object.values(hub.runLoadout.equipment).filter((item) => item !== null),
    ...hub.runLoadout.quickSlots.slots.filter((item) => item !== null),
  ].map((item) => item!.instanceId))
  return hub.runLoadout.itemStates.states.filter(({ instanceId }) => ids.has(instanceId))
}

export function buildSceneLaunchTransitionPlan(
  hubInput: CurrentDayHubSnapshot,
  commandInput: LaunchMainSceneCommand,
  dependencies: SceneLaunchDependencies,
): SceneLaunchTransitionPlan {
  const hub = createCurrentDayHubSnapshot(hubInput, dependencies.currentDayHub)
  const command = createLaunchMainSceneCommand(commandInput)
  if (hub.dailyState.mainSceneUsedToday) {
    unavailable('当天主要场景已经使用')
  }
  const sceneInstanceId = deriveSceneInstanceId(
    hub,
    dependencies.content.sceneDefinitionId,
    dependencies.currentDayHub,
  )
  const isInitialDayOneHub = hub.continuity.currentDay === 1 &&
    !hub.dailyState.mainSceneUsedToday && hub.returnLedger.sceneInstanceIds.length === 0
  if (isInitialDayOneHub && sceneInstanceId !== hub.continuity.sceneInstanceId) {
    invalid('首次出发前Day 1中枢的预绑定场景实例与正式派生结果不一致')
  }
  if (hub.returnLedger.sceneInstanceIds.includes(sceneInstanceId)) {
    unavailable('派生出的正式场景实例已经完成过返回结算')
  }
  const continuity = bindRunPhaseContinuityToScene(
    hub.continuity,
    sceneInstanceId,
    hub.continuity.runIdentity.rulesVersion,
  )
  const runtime = runtimeFor(continuity, dependencies)
  const runReturnCarryForward = bindRunReturnCarryForwardToScene(
    projectRunReturnCarryForwardFromCurrentDayHub(hub, dependencies.currentDayHub),
    sceneInstanceId,
    {
      ...dependencies.currentDayHub.returnDependencies,
      scene: runtime.dependencies,
    },
  )
  const context = restoreRunSceneLifecycleContext({
    runReturnCarryForward,
    worldThreat: hub.worldThreat,
    satiety: hub.satiety,
    threatSuppression: hub.dailyState.threatSuppression,
    maintenanceLaborRemaining: hub.dailyState.maintenanceLaborRemaining,
    mainSceneUsedToday: true,
  }, dependencies)
  const scene = createInitialSceneExplorationSnapshot({
    sceneInstanceId,
    searchState: createSceneSearchState({
      runSeed: hub.continuity.runIdentity.seed,
      sceneInstanceId,
      graph: runtime.dependencies.graph,
      searchCatalog: runtime.dependencies.searchCatalog,
      itemCatalog: runtime.dependencies.physicalCatalog,
      itemResourceCatalog: runtime.dependencies.itemResourceCatalog,
    }),
    currentNodeId: runtime.entryNodeId,
    remainingTime: runtime.dependencies.config.scene.totalTime,
    enabledEdgeIds: runtime.initialEnabledEdgeIds,
    backpack: hub.runLoadout.backpack,
    equipment: hub.runLoadout.equipment,
    quickSlots: hub.runLoadout.quickSlots,
    itemStates: { states: carriedStates(hub) },
    condition: hub.playerCondition,
    dailyMedicalUsage: hub.dailyState.medicalUsage,
    runIntelLog: hub.runIntelLog,
  }, runtime.dependencies)
  const session = createRunSceneSessionSnapshot({ context, scene }, dependencies)
  const effects: readonly SceneLaunchEffect[] = deepFreeze([
    { kind: 'daily-main-scene-usage-changed', before: false, after: true },
    { kind: 'run-continuity-bound-to-scene', before: hub.continuity, after: continuity },
    { kind: 'formal-scene-initialized', scene },
    { kind: 'run-scene-session-committed', session },
  ])
  return deepFreeze({ command, effects, session })
}

export function applySceneLaunchEffects(
  hubInput: CurrentDayHubSnapshot,
  commandInput: LaunchMainSceneCommand,
  effects: readonly SceneLaunchEffect[],
  dependencies: SceneLaunchDependencies,
): SceneLaunchTransitionPlan {
  const expected = buildSceneLaunchTransitionPlan(hubInput, commandInput, dependencies)
  if (!same(effects, expected.effects)) {
    throw new SceneLaunchError('EFFECT_MISMATCH', '场景启动Effect与冻结正式计划不一致')
  }
  return expected
}

export function resolveSceneLaunch(
  hubInput: CurrentDayHubSnapshot,
  commandInput: LaunchMainSceneCommand,
  dependencies: SceneLaunchDependencies,
): SceneLaunchTransitionPlan {
  const plan = buildSceneLaunchTransitionPlan(hubInput, commandInput, dependencies)
  return applySceneLaunchEffects(hubInput, plan.command, plan.effects, dependencies)
}

export function previewSceneLaunch(
  hubInput: CurrentDayHubSnapshot,
  commandInput: LaunchMainSceneCommand,
  dependencies: SceneLaunchDependencies,
): SceneLaunchPreview {
  try {
    return deepFreeze({
      canExecute: true,
      result: buildSceneLaunchTransitionPlan(hubInput, commandInput, dependencies),
    })
  } catch (error) {
    if (error instanceof SceneLaunchError) {
      return deepFreeze({ canExecute: false, rejectionCode: error.code })
    }
    throw error
  }
}

export function projectRunReturnInputFromRunSceneSession(
  sessionInput: RunSceneSessionSnapshot,
  dependencies: SceneLaunchDependencies,
): RunReturnInput {
  const session = createRunSceneSessionSnapshot(sessionInput, dependencies)
  if (session.scene.status !== 'safe-returned' && session.scene.status !== 'forced-returned') {
    unavailable('只有已经安全或强制返回的正式Scene Session可以进入返回结算')
  }
  return deepFreeze({
    terminalScene: session.scene,
    carryForward: session.context.runReturnCarryForward,
  })
}

export function resolveRunSceneSessionReturn(
  sessionInput: RunSceneSessionSnapshot,
  dependencies: SceneLaunchDependencies,
): RunSceneReturnResolution {
  const session = createRunSceneSessionSnapshot(sessionInput, dependencies)
  const runtime = runtimeFor(session.context.runReturnCarryForward.continuity, dependencies)
  const returnDependencies = {
    ...dependencies.currentDayHub.returnDependencies,
    scene: runtime.dependencies,
  }
  const runReturn = resolveRunReturn(
    projectRunReturnInputFromRunSceneSession(session, dependencies),
    returnDependencies,
  )
  const currentDayHubDependencies = {
    ...dependencies.currentDayHub,
    returnDependencies,
  }
  const currentDayHub = createCurrentDayHubSnapshotFromReturn(runReturn.snapshot, {
    continuity: runReturn.snapshot.continuity,
    worldThreat: session.context.worldThreat,
    satiety: session.context.satiety,
    threatSuppression: session.context.threatSuppression,
    maintenanceLaborRemaining: session.context.maintenanceLaborRemaining,
    mainSceneUsedToday: true,
  }, currentDayHubDependencies)
  return deepFreeze({ runReturn, currentDayHub })
}
