import { deepFreeze, type FrozenRuleConfig } from '../config'
import { createPlayerCondition, type PlayerConditionSnapshot } from '../condition'
import {
  hasSameRunPhaseContinuity,
  restoreRuleBoundRunPhaseContinuity,
  type RunPhaseContinuitySnapshot,
} from '../domain'
import {
  createDailyRunStateSnapshot,
  type DailyRunStateSnapshot,
  type DailyThreatSuppressionSnapshot,
} from '../daily-state'
import {
  HubInventoryError,
  consumeOneHubItem,
  createHubItemSource,
  getAvailableHubItemSources,
  resolveHubItemSource,
  type HubItemConsumption,
  type HubItemSource,
} from '../hub-inventory'
import type { MedicalContentBindings } from '../medical'
import {
  createRunHubMedicalSnapshot,
  resolveRunHubMedicalCommand,
  type RunHubMedicalEffect,
  type UseRunHubMedicalItemCommand,
} from '../run-hub-medical'
import { createRunIntelLogSnapshot, type RunIntelLogSnapshot } from '../run-intel'
import {
  createRunLoadoutDependenciesFromReturn,
  createRunLoadoutSnapshot,
  createRunLoadoutSnapshotFromReturn,
  projectRunStoredInventoryFromRunLoadout,
  resolveRunLoadoutCommand,
  type RunLoadoutCommand,
  type RunLoadoutEffect,
  type RunLoadoutSnapshot,
} from '../run-loadout'
import {
  createRunReturnLedgerSnapshot,
  createRunReturnSnapshot,
  restoreRunReturnCarryForwardSnapshot,
  type RunReturnCarryForwardSnapshot,
  type RunReturnDependencies,
  type RunReturnLedgerSnapshot,
  type RunReturnSnapshot,
} from '../run-return'
import { createSatietySnapshot, restoreSatiety, type SatietySnapshot } from '../satiety'
import {
  createWorldThreatDefinition,
  createWorldThreatSnapshot,
  getWorldThreatStage,
  type WorldThreatCatalog,
  type WorldThreatSnapshot,
} from '../world-threat'

export interface HubSurvivalContentBindings {
  readonly infectionSuppressantDefinitionId: string
  readonly rationDefinitionId: string
}

export interface CurrentDayHubDependencies {
  readonly returnDependencies: RunReturnDependencies
  readonly medicalBindings: MedicalContentBindings
  readonly survivalBindings: HubSurvivalContentBindings
  readonly worldThreatCatalog: WorldThreatCatalog
}

export interface CurrentDayHubSnapshot {
  readonly continuity: RunPhaseContinuitySnapshot
  readonly runLoadout: RunLoadoutSnapshot
  readonly playerCondition: PlayerConditionSnapshot
  readonly runIntelLog: RunIntelLogSnapshot
  readonly dailyState: DailyRunStateSnapshot
  readonly worldThreat: WorldThreatSnapshot
  readonly satiety: SatietySnapshot
  readonly returnLedger: RunReturnLedgerSnapshot
}

export interface CurrentDayHubCarryForwardFacts {
  readonly continuity: RunPhaseContinuitySnapshot
  readonly worldThreat: WorldThreatSnapshot
  readonly satiety: SatietySnapshot
  readonly threatSuppression: DailyThreatSuppressionSnapshot
  readonly maintenanceLaborRemaining: number
}

export type HubSurvivalCommand =
  | Readonly<{ kind: 'use-hub-infection-suppressant'; source: HubItemSource }>
  | Readonly<{ kind: 'use-hub-ration'; source: HubItemSource }>

export type HubSurvivalEffect =
  | Readonly<{ kind: 'hub-survival-item-consumed'; consumption: HubItemConsumption }>
  | Readonly<{
      kind: 'hub-threat-suppression-changed'
      usesBefore: number
      usesAfter: number
      amountBefore: number
      amountAfter: number
    }>
  | Readonly<{
      kind: 'hub-satiety-restored'
      before: number
      requested: number
      restored: number
      after: number
    }>
  | Readonly<{ kind: 'hub-survival-zero-time-confirmed'; hubSceneTime: 0 }>
  | Readonly<{ kind: 'current-day-hub-state-committed'; snapshot: CurrentDayHubSnapshot }>

export interface HubSurvivalTransitionPlan {
  readonly command: HubSurvivalCommand
  readonly effects: readonly HubSurvivalEffect[]
  readonly snapshot: CurrentDayHubSnapshot
}

export class CurrentDayHubError extends Error {
  public readonly code: 'INVALID_INPUT' | 'ACTION_NOT_AVAILABLE' | 'EFFECT_MISMATCH'
  public constructor(code: CurrentDayHubError['code'], message: string) {
    super(message); this.name = 'CurrentDayHubError'; this.code = code
  }
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function configOf(dependencies: CurrentDayHubDependencies): FrozenRuleConfig {
  return dependencies.returnDependencies.scene.config
}

function invalid(message: string): never { throw new CurrentDayHubError('INVALID_INPUT', message) }
function unavailable(message: string): never { throw new CurrentDayHubError('ACTION_NOT_AVAILABLE', message) }

export function validateHubSurvivalContentBindings(dependencies: CurrentDayHubDependencies): void {
  const bindings = dependencies.survivalBindings
  if (!exact(bindings, ['infectionSuppressantDefinitionId', 'rationDefinitionId']) ||
    typeof bindings.infectionSuppressantDefinitionId !== 'string' || !bindings.infectionSuppressantDefinitionId.trim() ||
    typeof bindings.rationDefinitionId !== 'string' || !bindings.rationDefinitionId.trim() ||
    bindings.infectionSuppressantDefinitionId === bindings.rationDefinitionId) invalid('中枢生存物品绑定无效')
  const loadout = createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies)
  for (const id of [bindings.infectionSuppressantDefinitionId, bindings.rationDefinitionId]) {
    if (!loadout.physicalCatalog.has(id) || loadout.itemResourceCatalog.get(id).kind !== 'none' ||
      loadout.lifecycleCatalog.get(id).kind !== 'ordinary') invalid('中枢生存物品绑定不符合物品语义')
  }
  const config = configOf(dependencies)
  const configuredThreat = dependencies.worldThreatCatalog[config.worldThreat.definitionId]
  if (!configuredThreat ||
    JSON.stringify(configuredThreat) !== JSON.stringify(createWorldThreatDefinition(config.worldThreat))) {
    invalid('世界威胁目录与当前规则版本不一致')
  }
  if (config.worldThreat.suppressant.hubSceneTime !== 0 || config.dailySettlement.rationHubSceneTime !== 0) {
    invalid('当前版本中枢生存物品时间必须为0')
  }
}

export function createCurrentDayHubSnapshot(
  input: unknown,
  dependencies: CurrentDayHubDependencies,
): CurrentDayHubSnapshot {
  validateHubSurvivalContentBindings(dependencies)
  if (!exact(input, [
    'continuity', 'dailyState', 'playerCondition', 'returnLedger', 'runIntelLog',
    'runLoadout', 'satiety', 'worldThreat',
  ])) invalid('当前日中枢快照结构无效')
  const config = configOf(dependencies)
  try {
    const continuity = restoreRuleBoundRunPhaseContinuity(
      input.continuity,
      config,
    )
    const playerCondition = createPlayerCondition(input.playerCondition as PlayerConditionSnapshot, config.combat.player)
    if (playerCondition.currentHealth === 0) invalid('死亡玩家不能进入当前日中枢状态')
    const worldThreat = createWorldThreatSnapshot(input.worldThreat, dependencies.worldThreatCatalog)
    if (worldThreat.definitionId !== config.worldThreat.definitionId) invalid('当前日中枢威胁定义与规则版本不一致')
    if (getWorldThreatStage(worldThreat, dependencies.worldThreatCatalog).terminal) {
      invalid('终末世界威胁不能恢复为活动当前日中枢状态')
    }
    const returnLedger = createRunReturnLedgerSnapshot(input.returnLedger as RunReturnLedgerSnapshot)
    if (!returnLedger.sceneInstanceIds.includes(continuity.sceneInstanceId)) {
      invalid('当前日中枢返回记录缺少连续性绑定的场景')
    }
    return deepFreeze({
      continuity,
      runLoadout: createRunLoadoutSnapshot(
        input.runLoadout as RunLoadoutSnapshot,
        createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies),
      ),
      playerCondition,
      runIntelLog: createRunIntelLogSnapshot(input.runIntelLog as RunIntelLogSnapshot),
      dailyState: createDailyRunStateSnapshot(input.dailyState, config),
      worldThreat,
      satiety: createSatietySnapshot(input.satiety, config),
      returnLedger,
    })
  } catch (error) {
    if (error instanceof CurrentDayHubError) throw error
    invalid(error instanceof Error ? error.message : '当前日中枢快照无效')
  }
}

export function createCurrentDayHubSnapshotFromReturn(
  returnInput: RunReturnSnapshot,
  factsInput: CurrentDayHubCarryForwardFacts,
  dependencies: CurrentDayHubDependencies,
): CurrentDayHubSnapshot {
  if (!exact(factsInput, ['continuity', 'maintenanceLaborRemaining', 'satiety', 'threatSuppression', 'worldThreat'])) {
    invalid('当前日中枢跨场景事实结构无效')
  }
  const returned = createRunReturnSnapshot(returnInput, dependencies.returnDependencies)
  let factsContinuity: RunPhaseContinuitySnapshot
  try {
    factsContinuity = restoreRuleBoundRunPhaseContinuity(
      factsInput.continuity,
      configOf(dependencies),
    )
  } catch (error) {
    invalid(error instanceof Error ? error.message : '当前日中枢跨场景连续性无效')
  }
  if (!hasSameRunPhaseContinuity(returned.continuity, factsContinuity)) {
    invalid('Run返回与当前日中枢跨场景事实的连续性不一致')
  }
  return createCurrentDayHubSnapshot({
    continuity: returned.continuity,
    runLoadout: createRunLoadoutSnapshotFromReturn(returned, dependencies.returnDependencies),
    playerCondition: returned.player.condition,
    runIntelLog: returned.runIntelLog,
    dailyState: {
      medicalUsage: returned.dailyMedicalUsage,
      threatSuppression: factsInput.threatSuppression,
      maintenanceLaborRemaining: factsInput.maintenanceLaborRemaining,
    },
    worldThreat: factsInput.worldThreat,
    satiety: factsInput.satiety,
    returnLedger: returned.returnLedger,
  }, dependencies)
}

export function resolveCurrentDayHubLoadoutCommand(
  snapshotInput: CurrentDayHubSnapshot,
  command: RunLoadoutCommand,
  dependencies: CurrentDayHubDependencies,
): Readonly<{ effects: readonly RunLoadoutEffect[]; snapshot: CurrentDayHubSnapshot }> {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies)
  const result = resolveRunLoadoutCommand(
    snapshot.runLoadout,
    command,
    createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies),
  )
  return deepFreeze({ effects: result.effects, snapshot: createCurrentDayHubSnapshot({ ...snapshot, runLoadout: result.snapshot }, dependencies) })
}

export function resolveCurrentDayHubMedicalCommand(
  snapshotInput: CurrentDayHubSnapshot,
  command: UseRunHubMedicalItemCommand,
  dependencies: CurrentDayHubDependencies,
): Readonly<{ effects: readonly RunHubMedicalEffect[]; snapshot: CurrentDayHubSnapshot }> {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies)
  const medicalDependencies = {
    runLoadout: createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies),
    config: configOf(dependencies),
    medicalBindings: dependencies.medicalBindings,
  }
  const medical = createRunHubMedicalSnapshot({
    runLoadout: snapshot.runLoadout,
    playerCondition: snapshot.playerCondition,
    dailyMedicalUsage: snapshot.dailyState.medicalUsage,
  }, medicalDependencies)
  const result = resolveRunHubMedicalCommand(medical, command, medicalDependencies)
  return deepFreeze({
    effects: result.effects,
    snapshot: createCurrentDayHubSnapshot({
      ...snapshot,
      runLoadout: result.snapshot.runLoadout,
      playerCondition: result.snapshot.playerCondition,
      dailyState: { ...snapshot.dailyState, medicalUsage: result.snapshot.dailyMedicalUsage },
    }, dependencies),
  })
}

export function createHubSurvivalCommand(input: unknown): HubSurvivalCommand {
  if (!exact(input, ['kind', 'source']) ||
    (input.kind !== 'use-hub-infection-suppressant' && input.kind !== 'use-hub-ration')) {
    invalid('中枢生存物品命令结构无效')
  }
  try { return deepFreeze({ kind: input.kind, source: createHubItemSource(input.source) }) }
  catch { invalid('中枢生存物品命令来源无效') }
}

function requiredDefinition(command: HubSurvivalCommand, bindings: HubSurvivalContentBindings): string {
  return command.kind === 'use-hub-infection-suppressant'
    ? bindings.infectionSuppressantDefinitionId
    : bindings.rationDefinitionId
}

function isEligible(snapshot: CurrentDayHubSnapshot, command: HubSurvivalCommand, config: FrozenRuleConfig): boolean {
  return command.kind === 'use-hub-infection-suppressant'
    ? (snapshot.playerCondition.pendingInfectionExposures > 0 || snapshot.worldThreat.progress > 0) &&
      snapshot.dailyState.threatSuppression.usesToday < config.worldThreat.suppressant.maxUsesPerDay
    : snapshot.satiety.current < config.dailySettlement.maxSatiety
}

function sortKey(command: HubSurvivalCommand): string {
  const source = command.source.container === 'quick-slot'
    ? `quick-slot:${command.source.quickSlotIndex}`
    : `${command.source.container}:${command.source.itemInstanceId}`
  return `${command.kind}:${source}`
}

export function getAvailableHubSurvivalCommands(
  snapshotInput: CurrentDayHubSnapshot,
  dependencies: CurrentDayHubDependencies,
): readonly HubSurvivalCommand[] {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies)
  const config = configOf(dependencies)
  const commands: HubSurvivalCommand[] = []
  for (const source of getAvailableHubItemSources(snapshot.runLoadout)) {
    let item
    try { item = resolveHubItemSource(snapshot.runLoadout, source).item } catch { continue }
    const kind = item.definitionId === dependencies.survivalBindings.infectionSuppressantDefinitionId
      ? 'use-hub-infection-suppressant' as const
      : item.definitionId === dependencies.survivalBindings.rationDefinitionId
        ? 'use-hub-ration' as const
        : null
    if (kind) {
      const command = deepFreeze({ kind, source })
      if (isEligible(snapshot, command, config)) commands.push(command)
    }
  }
  return deepFreeze(commands.sort((left, right) => sortKey(left).localeCompare(sortKey(right))))
}

function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right) }

export function buildHubSurvivalTransitionPlan(
  snapshotInput: CurrentDayHubSnapshot,
  commandInput: HubSurvivalCommand,
  dependencies: CurrentDayHubDependencies,
): HubSurvivalTransitionPlan {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies)
  const command = createHubSurvivalCommand(commandInput)
  if (!getAvailableHubSurvivalCommands(snapshot, dependencies).some((candidate) => same(candidate, command))) {
    unavailable('中枢生存物品、来源或当前状态不符合正式规则')
  }
  let resolved
  try { resolved = resolveHubItemSource(snapshot.runLoadout, command.source) }
  catch (error) {
    if (error instanceof HubInventoryError) unavailable(error.message)
    throw error
  }
  if (resolved.item.definitionId !== requiredDefinition(command, dependencies.survivalBindings)) {
    unavailable('指定来源不是命令所需的物品')
  }
  const loadoutDependencies = createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies)
  const consumed = consumeOneHubItem(snapshot.runLoadout, resolved, loadoutDependencies)
  const config = configOf(dependencies)
  let nextDaily = snapshot.dailyState
  let nextSatiety = snapshot.satiety
  const effects: HubSurvivalEffect[] = [{ kind: 'hub-survival-item-consumed', consumption: consumed.consumption }]
  if (command.kind === 'use-hub-infection-suppressant') {
    const before = snapshot.dailyState.threatSuppression
    const after = {
      usesToday: before.usesToday + 1,
      suppressionAmountToday: before.suppressionAmountToday + config.worldThreat.suppressant.dailyReduction,
    }
    nextDaily = createDailyRunStateSnapshot({ ...snapshot.dailyState, threatSuppression: after }, config)
    effects.push({
      kind: 'hub-threat-suppression-changed',
      usesBefore: before.usesToday,
      usesAfter: after.usesToday,
      amountBefore: before.suppressionAmountToday,
      amountAfter: after.suppressionAmountToday,
    })
  } else {
    const restored = restoreSatiety(snapshot.satiety, config.dailySettlement.rationRecovery, config)
    nextSatiety = restored.snapshot
    effects.push({ kind: 'hub-satiety-restored', ...restored.result })
  }
  const finalSnapshot = createCurrentDayHubSnapshot({
    ...snapshot,
    runLoadout: consumed.snapshot,
    dailyState: nextDaily,
    satiety: nextSatiety,
  }, dependencies)
  effects.push(
    { kind: 'hub-survival-zero-time-confirmed', hubSceneTime: 0 },
    { kind: 'current-day-hub-state-committed', snapshot: finalSnapshot },
  )
  return deepFreeze({ command, effects, snapshot: finalSnapshot })
}

export function applyHubSurvivalEffects(
  snapshot: CurrentDayHubSnapshot,
  command: HubSurvivalCommand,
  effects: readonly HubSurvivalEffect[],
  dependencies: CurrentDayHubDependencies,
): Readonly<{ effects: readonly HubSurvivalEffect[]; snapshot: CurrentDayHubSnapshot }> {
  const expected = buildHubSurvivalTransitionPlan(snapshot, command, dependencies)
  if (!same(effects, expected.effects)) throw new CurrentDayHubError('EFFECT_MISMATCH', '中枢生存Effect与冻结正式计划不一致')
  return deepFreeze({ effects: expected.effects, snapshot: expected.snapshot })
}

export function resolveHubSurvivalCommand(
  snapshot: CurrentDayHubSnapshot,
  command: HubSurvivalCommand,
  dependencies: CurrentDayHubDependencies,
) {
  const plan = buildHubSurvivalTransitionPlan(snapshot, command, dependencies)
  return applyHubSurvivalEffects(snapshot, plan.command, plan.effects, dependencies)
}

/** Projects the one formal pre-Return carry-forward aggregate from stable Hub facts. */
export function projectRunReturnCarryForwardFromCurrentDayHub(
  snapshotInput: CurrentDayHubSnapshot,
  dependencies: CurrentDayHubDependencies,
): RunReturnCarryForwardSnapshot {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies)
  return restoreRunReturnCarryForwardSnapshot({
    continuity: snapshot.continuity,
    storedInventory: projectRunStoredInventoryFromRunLoadout(
      snapshot.runLoadout,
      createRunLoadoutDependenciesFromReturn(dependencies.returnDependencies),
    ),
    returnLedger: snapshot.returnLedger,
  }, dependencies.returnDependencies)
}
