import {
  createPerformMainSearchCommand,
  createPerformSceneObstacleOptionCommand,
  createMoveThroughSceneEdgeCommand,
  createPickUpRevealedNodeItemCommand,
  createWithdrawFromSceneCommand,
  getPlayerVisibleSceneNodeState,
  getPlayerVisibleSceneObstacles,
  previewMainSearchCommand,
  previewNodeItemPickupCommand,
  previewSceneMoveCommand,
  previewSceneWithdrawalCommand,
  type SearchIlluminationChoice,
  type SceneExplorationEffect,
} from '../../core/scene-exploration'
import type { TimedSceneActionOutcome } from '../../core/scene'
import { previewBackpackPlacement } from '../../core/inventory'
import {
  createLaunchMainSceneCommand,
  getRunSceneRuntime,
  previewSceneLaunch,
} from '../../core/scene-launch'
import {
  createStableRunApplicationCommand,
  type StableRunApplicationCommand,
} from '../../state/run-application'
import {
  getStableRunPhaseIdentity,
  type StableRunPhase,
} from '../../state/run-save'
import {
  createStableRunLifecycleCommand,
  getStableRunLifecycleCommandAvailability,
} from '../../state/run-lifecycle'
import type { StableRunUiPresentationDependencies } from '../presentation'
import { getCurrentTraversableAdjacentEdges } from './current-traversable-adjacent-edges'

export type StableRunUiActionKind =
  | 'launch-main-scene'
  | 'scene-move'
  | 'scene-main-search'
  | 'scene-obstacle'
  | 'scene-withdraw'
  | 'settle-terminal-scene'

/** An internal reference only; ordinary player ViewModels never expose it. */
export interface StableRunUiPickupOpportunity {
  readonly id: string
  readonly name: string
  readonly groundQuantity: number
  readonly canRotate: boolean
}

export interface StableRunUiPickupDraft {
  readonly opportunityId: string
  readonly quantity: number
  readonly x: number
  readonly y: number
  readonly rotated: boolean
}

export interface StableRunUiPickupPreview {
  readonly canExecute: boolean
  readonly rejection: string | null
  readonly command: StableRunApplicationCommand | null
  readonly facts: readonly StableRunUiActionPreviewFact[]
  readonly candidateCells: readonly Readonly<{ x: number; y: number }> []
}

export interface StableRunUiActionPreviewFact {
  readonly label: string
  readonly value: string
}

/**
 * Explicit player-facing projection of a formal preview. It intentionally
 * contains no raw snapshots, Effects, identifiers, or pre-materialized
 * search outcomes.
 */
export interface StableRunUiActionPreviewViewModel {
  readonly title: string
  readonly facts: readonly StableRunUiActionPreviewFact[]
  readonly warnings: readonly string[]
  readonly branches: readonly Readonly<{
    title: string
    facts: readonly StableRunUiActionPreviewFact[]
    warnings: readonly string[]
  }>[]
}

export interface StableRunUiAction {
  readonly id: string
  readonly kind: StableRunUiActionKind
  readonly label: string
  /** Internal formal command; React submits it only after explicit confirm. */
  readonly command: StableRunApplicationCommand
  readonly preview: StableRunUiActionPreviewViewModel
}

export interface StableRunUiInteractionModel {
  readonly actions: readonly StableRunUiAction[]
  readonly pickupOpportunities: readonly StableRunUiPickupOpportunity[]
}

function freezePreview(
  title: string,
  facts: readonly StableRunUiActionPreviewFact[],
  warnings: readonly string[] = [],
  branches: StableRunUiActionPreviewViewModel['branches'] = [],
): StableRunUiActionPreviewViewModel {
  return Object.freeze({
    title,
    facts: Object.freeze(facts.map((fact) => Object.freeze({ ...fact }))),
    warnings: Object.freeze([...warnings]),
    branches: Object.freeze(branches.map((branch) => Object.freeze({
      title: branch.title,
      facts: Object.freeze(branch.facts.map((fact) => Object.freeze({ ...fact }))),
      warnings: Object.freeze([...branch.warnings]),
    }))),
  })
}

function sceneOutcomeWarnings(input: Readonly<{
  outcome: TimedSceneActionOutcome
  returnEstimate: number
}>): readonly string[] {
  const warnings: string[] = []
  if (input.outcome.overtimeDebt > 0) warnings.push(`超时债务：${input.outcome.overtimeDebt}`)
  if (input.outcome.kind === 'forced-return') warnings.push('行动完成后将进入强制返程。')
  if (input.outcome.kind === 'death') warnings.push('行动完成后生命将归零。')
  if (
    input.outcome.kind === 'continue' &&
    input.outcome.clock.remainingTime < input.returnEstimate
  ) warnings.push('行动后剩余时间低于预计安全返程线。')
  return Object.freeze(warnings)
}

/**
 * Player-facing allow-list of the formal timed-action result. No time or
 * forced-return formula is reimplemented in the interaction layer.
 */
function timedOutcomeFacts(
  outcome: TimedSceneActionOutcome,
): readonly StableRunUiActionPreviewFact[] {
  const healthFact: StableRunUiActionPreviewFact = {
    label: '行动后生命',
    value: String(outcome.vitals.currentHealth),
  }
  if (outcome.overtimeDebt === 0) return Object.freeze([healthFact])
  return Object.freeze([
    { label: '超时债务', value: String(outcome.overtimeDebt) },
    { label: '有效紧急撤离时间', value: String(outcome.effectiveEmergencyReturnTime) },
    { label: '强制返程基础损耗', value: String(outcome.forcedReturnBaseDamage) },
    { label: '强制返程流血追加', value: String(outcome.forcedReturnBleedingDamage) },
    { label: '强制返程总损耗', value: String(outcome.forcedReturnTotalDamage) },
    healthFact,
    { label: '死亡风险', value: outcome.isDead ? '将死亡' : '可生还' },
  ])
}

function applicationSceneCommand(
  kind: 'scene-move' | 'scene-main-search' | 'scene-node-item-pickup' | 'scene-withdraw' | 'scene-obstacle',
  command: unknown,
): StableRunApplicationCommand {
  return createStableRunApplicationCommand({
    kind: 'scene',
    command: { kind, command },
  })
}

function riskTierName(
  tier: 'none' | 'low' | 'medium' | 'high' | 'very-high',
): string {
  return tier === 'none'
    ? '无'
    : tier === 'low'
      ? '低'
      : tier === 'medium'
        ? '中'
        : tier === 'high'
          ? '高'
          : '极高'
}

function outcomeName(kind: TimedSceneActionOutcome['kind']): string {
  return kind === 'continue'
    ? '继续探索'
    : kind === 'forced-return'
      ? '强制返回'
      : kind === 'death'
        ? '死亡'
        : '安全返回'
}

function loadTierName(tier: 'normal' | 'loaded' | 'overloaded'): string {
  return tier === 'normal' ? '正常' : tier === 'loaded' ? '负载' : '超载'
}

function createLaunchAction(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiAction | null {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const command = createLaunchMainSceneCommand({ kind: 'launch-main-scene' })
  const preview = previewSceneLaunch(phase.payload, command, rules.sceneLaunch)
  if (!preview.canExecute) return null
  const initialScene = preview.result.session.scene
  return Object.freeze({
    id: 'launch-main-scene',
    kind: 'launch-main-scene',
    label: `进入 ${dependencies.labels.sceneName(
      rules.sceneLaunch.content.sceneDefinitionId,
    )}`,
    command: createStableRunApplicationCommand({ kind: 'lifecycle', command }),
    preview: freezePreview('确认进入主要场景', [
      { label: '进入', value: dependencies.labels.sceneName(rules.sceneLaunch.content.sceneDefinitionId) },
      { label: '当前游戏日', value: `第 ${phase.payload.continuity.currentDay} 日` },
      { label: '场景初始时间', value: String(initialScene.remainingTime) },
      { label: '今日主要场景', value: '确认后将被使用' },
    ]),
  })
}

function createMoveActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])
  return Object.freeze(getCurrentTraversableAdjacentEdges(scene, runtime).flatMap((edge) => {
    const command = createMoveThroughSceneEdgeCommand({ edgeId: edge.edgeId })
    const preview = previewSceneMoveCommand(scene, command, runtime.dependencies)
    if (!preview.canExecute) return []
    const result = preview.result
    const outcome = result.sceneOutcome
    const time = sceneTimeFacts(result.effects)
    return [Object.freeze({
      id: `scene-move:${edge.edgeId}`,
      kind: 'scene-move' as const,
      label: `前往 ${edge.destinationNodeName}`,
      command: applicationSceneCommand('scene-move', command),
      preview: freezePreview(`确认前往 ${edge.destinationNodeName}`, [
        { label: '目标节点', value: edge.destinationNodeName },
        { label: '本次移动耗时', value: String(result.finalMovementTime) },
        { label: '行动前剩余时间', value: String(time.before) },
        { label: '行动后剩余时间', value: String(time.after) },
        { label: '行动后预计返程', value: String(result.returnRoute.estimatedReturnTime) },
        ...timedOutcomeFacts(outcome),
      ], sceneOutcomeWarnings({
        outcome,
        returnEstimate: result.returnRoute.estimatedReturnTime,
      })),
    })]
  }))
}

function illuminationLabel(choice: SearchIlluminationChoice): string {
  return choice === 'use-equipped-flashlight' ? '使用手电筒' : '无照明'
}

function isMainSearchIlluminationConsumption(
  effect: SceneExplorationEffect,
): effect is Extract<SceneExplorationEffect, {
  readonly kind: 'item-resource-consumed'
}> {
  return effect.kind === 'item-resource-consumed' &&
    effect.source === 'main-search-illumination'
}

function sceneTimeFacts(
  effects: readonly SceneExplorationEffect[],
): Readonly<{ before: number; after: number }> {
  const time = effects.find((effect): effect is Extract<SceneExplorationEffect, {
    readonly kind: 'scene-time-resolved'
  }> => effect.kind === 'scene-time-resolved')
  if (!time) throw new Error('正式场景 Preview 缺少时间结算事实')
  return Object.freeze({ before: time.remainingTimeBefore, after: time.remainingTimeAfter })
}

function createSearchActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])
  const choices: readonly SearchIlluminationChoice[] = Object.freeze([
    'use-equipped-flashlight',
    'search-without-flashlight',
  ])
  return Object.freeze(choices.flatMap((illumination) => {
    const command = createPerformMainSearchCommand({ illumination })
    const preview = previewMainSearchCommand(scene, command, runtime.dependencies)
    if (!preview.canExecute) return []
    const result = preview.result
    const resource = result.effects.find(isMainSearchIlluminationConsumption)
    const time = sceneTimeFacts(result.effects)
    const facts: StableRunUiActionPreviewFact[] = [
      { label: '搜索方式', value: illuminationLabel(illumination) },
      { label: '行动耗时', value: String(result.actionTime) },
      { label: '行动前剩余时间', value: String(time.before) },
      { label: '行动后剩余时间', value: String(time.after) },
      { label: '行动后预计返程', value: String(result.returnRoute.estimatedReturnTime) },
    ]
    if (resource) facts.push({
      label: '照明资源',
      value: `${resource.currentBefore} → ${resource.currentAfter}`,
    })
    facts.push(...timedOutcomeFacts(result.sceneOutcome))
    return [Object.freeze({
      id: `scene-main-search:${illumination}`,
      kind: 'scene-main-search' as const,
      label: `主要搜索 · ${illuminationLabel(illumination)}`,
      command: applicationSceneCommand('scene-main-search', command),
      preview: freezePreview('确认主要搜索', facts, sceneOutcomeWarnings({
        outcome: result.sceneOutcome,
        returnEstimate: result.returnRoute.estimatedReturnTime,
      })),
    })]
  }))
}

function obstacleOutcomeFacts(
  actionTime: number,
  outcome: TimedSceneActionOutcome,
  returnEstimate: number,
): readonly StableRunUiActionPreviewFact[] {
  return Object.freeze([
    { label: '行动耗时', value: String(actionTime) },
    { label: '行动后剩余时间', value: String(outcome.clock.remainingTime) },
    { label: '行动后预计返程', value: String(returnEstimate) },
    { label: '预计结果', value: outcomeName(outcome.kind) },
    ...timedOutcomeFacts(outcome),
  ])
}

function createObstacleActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])

  return Object.freeze(getPlayerVisibleSceneObstacles(scene, runtime.dependencies).flatMap(
    (obstacle) => obstacle.options.map((option) => {
      const optionName = dependencies.labels.obstacleOptionName(option.command.optionId)
      const facts: StableRunUiActionPreviewFact[] = [
        { label: '处理方式', value: optionName },
        { label: '是否触发警觉', value: option.setsAlert ? '是' : '否' },
      ]
      if (option.resourceChange) {
        const definition = runtime.dependencies.physicalCatalog.get(
          option.resourceChange.definitionId,
        )
        facts.push({
          label: dependencies.labels.itemName(
            option.resourceChange.definitionId,
            definition.name,
          ),
          value: `${option.resourceChange.currentBefore} → ${option.resourceChange.currentAfter}`,
        })
      }
      for (const spawned of option.spawnedItems) {
        const definition = runtime.dependencies.physicalCatalog.get(spawned.definitionId)
        facts.push({
          label: '节点地面产物',
          value: `${dependencies.labels.itemName(spawned.definitionId, definition.name)} ×${spawned.quantity}`,
        })
      }
      if (option.injuryRiskTier !== null) {
        facts.push({ label: '轻度挫伤风险', value: riskTierName(option.injuryRiskTier) })
        facts.push({
          label: '冲击防护',
          value: option.impactProtectionActive ? '当前防护装备生效' : '未生效',
        })
      }

      const deterministic = option.outcomes.find(({ kind }) => kind === 'deterministic')
      const warnings = deterministic
        ? sceneOutcomeWarnings({
            outcome: deterministic.sceneOutcome,
            returnEstimate: deterministic.returnRoute.estimatedReturnTime,
          })
        : []
      if (deterministic) {
        facts.push(...obstacleOutcomeFacts(
          option.actionTime,
          deterministic.sceneOutcome,
          deterministic.returnRoute.estimatedReturnTime,
        ))
      } else {
        facts.push({ label: '行动耗时', value: String(option.actionTime) })
      }

      const branches = option.outcomes.flatMap((branch) => branch.kind === 'deterministic'
        ? []
        : [{
            title: branch.kind === 'minor-contusion' ? '若产生轻度挫伤' : '若未产生轻度挫伤',
            facts: obstacleOutcomeFacts(
              option.actionTime,
              branch.sceneOutcome,
              branch.returnRoute.estimatedReturnTime,
            ),
            warnings: sceneOutcomeWarnings({
              outcome: branch.sceneOutcome,
              returnEstimate: branch.returnRoute.estimatedReturnTime,
            }),
          }])
      return Object.freeze({
        id: `scene-obstacle:${option.command.obstacleId}:${option.command.optionId}`,
        kind: 'scene-obstacle' as const,
        label: `${dependencies.labels.obstacleName(obstacle.obstacleId)} · ${optionName}`,
        command: applicationSceneCommand(
          'scene-obstacle',
          createPerformSceneObstacleOptionCommand(option.command),
        ),
        preview: freezePreview(
          `确认${optionName}`,
          facts,
          warnings,
          branches,
        ),
      })
    }),
  ))
}

function createWithdrawalAction(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiAction | null {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return null
  const command = createWithdrawFromSceneCommand({ kind: 'withdraw-from-scene' })
  const preview = previewSceneWithdrawalCommand(scene, command, runtime.dependencies)
  if (!preview.canExecute) return null
  const result = preview.result
  const route = result.returnRoute.nodeIds.map((nodeId) =>
    runtime.dependencies.graph.nodes.find(({ id }) => id === nodeId)?.name ?? nodeId,
  ).join(' → ')
  const outcome = result.sceneOutcome
  return Object.freeze({
    id: 'scene-withdraw',
    kind: 'scene-withdraw',
    label: '主动撤离',
    command: applicationSceneCommand('scene-withdraw', command),
    preview: freezePreview('确认主动撤离', [
      { label: '返程路线', value: route },
      { label: '预计返程时间', value: String(result.returnRoute.estimatedReturnTime) },
      { label: '当前剩余时间', value: String(scene.remainingTime) },
      { label: '返程后预计剩余时间', value: String(result.snapshot.remainingTime) },
      { label: '返程后生命', value: String(result.snapshot.condition.currentHealth) },
      { label: '预计结果', value: result.snapshot.status === 'safe-returned' ? '安全返回' : result.snapshot.status === 'forced-returned' ? '强制返回' : '死亡' },
      ...(outcome ? timedOutcomeFacts(outcome) : []),
    ], outcome ? sceneOutcomeWarnings({
      outcome,
      returnEstimate: result.returnRoute.estimatedReturnTime,
    }) : []),
  })
}

function createSettlementAction(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
): StableRunUiAction | null {
  const command = createStableRunLifecycleCommand({ kind: 'settle-terminal-scene' })
  const availability = getStableRunLifecycleCommandAvailability(phase, command)
  if (!availability.canExecute || availability.settlementOutcome === null) return null
  const returning = availability.settlementOutcome === 'return-to-hub'
  return Object.freeze({
    id: 'settle-terminal-scene',
    kind: 'settle-terminal-scene',
    label: returning ? '完成返程结算' : '结算战败',
    command: createStableRunApplicationCommand({ kind: 'lifecycle', command }),
    preview: freezePreview(
      returning ? '确认完成返程结算' : '确认结算战败',
      returning
        ? [
            { label: '结果', value: '进入电梯中枢' },
            { label: '日期', value: '不会因此推进' },
          ]
        : [{ label: '结果', value: '进入 Run Failure' }],
    ),
  })
}

function pickupOpportunities(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiPickupOpportunity[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])
  return Object.freeze(getPlayerVisibleSceneNodeState(scene, scene.currentNodeId).groundItems.map((item) => {
    const definition = runtime.dependencies.physicalCatalog.get(item.definitionId)
    return Object.freeze({
      id: item.instanceId,
      name: dependencies.labels.itemName(item.definitionId, definition.name),
      groundQuantity: item.quantity,
      canRotate: definition.canRotate,
    })
  }))
}

/**
 * Re-reads the current canonical Scene every time a draft changes. It does
 * not retain a raw preview, perform auto-placement, or create item identities.
 */
export function previewStableRunUiPickupDraft(
  phase: StableRunPhase,
  draft: StableRunUiPickupDraft,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiPickupPreview | null {
  if (phase.kind !== 'scene-session' || phase.payload.scene.status !== 'active') return null
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const source = getPlayerVisibleSceneNodeState(
    phase.payload.scene,
    phase.payload.scene.currentNodeId,
  ).groundItems.find((item) => item.instanceId === draft.opportunityId)
  if (!source) return null
  const placement = { x: draft.x, y: draft.y, rotated: draft.rotated }
  const geometry = previewBackpackPlacement(
    phase.payload.scene.backpack,
    source,
    { ...placement, instanceId: source.instanceId },
    runtime.dependencies.physicalCatalog,
  )
  let command
  try {
    command = createPickUpRevealedNodeItemCommand({
      nodeItemInstanceId: source.instanceId,
      quantity: draft.quantity,
      placement,
    })
  } catch {
    return Object.freeze({
      canExecute: false,
      rejection: '拾取参数无效。',
      command: null,
      facts: Object.freeze([]),
      candidateCells: Object.freeze([]),
    })
  }
  const preview = previewNodeItemPickupCommand(
    phase.payload.scene,
    command,
    runtime.dependencies,
  )
  if (!preview.canExecute) {
    return Object.freeze({
      canExecute: false,
      rejection: '该数量或摆放无法执行，请调整选择。',
      command: null,
      facts: Object.freeze([]),
      candidateCells: Object.freeze(geometry.cells.map(({ x, y }) => Object.freeze({ x, y }))),
    })
  }
  const result = preview.result
  return Object.freeze({
    canExecute: true,
    rejection: null,
    command: applicationSceneCommand('scene-node-item-pickup', command),
    facts: Object.freeze([
      { label: '本次拾取数量', value: String(result.quantityPicked) },
      { label: '地面剩余数量', value: String(result.quantityRemaining) },
      { label: '目标坐标', value: `${result.destinationPlacement.x}, ${result.destinationPlacement.y}` },
      { label: '旋转状态', value: result.destinationPlacement.rotated ? '已旋转' : '未旋转' },
      { label: '背包负重', value: `${result.backpackWeightBefore} → ${result.backpackWeightAfter}` },
      { label: '拾取后负重状态', value: loadTierName(result.loadTierAfter) },
    ]),
    candidateCells: Object.freeze(geometry.cells.map(({ x, y }) => Object.freeze({ x, y }))),
  })
}

/**
 * Produces only the currently wired player actions. This is a pure projection:
 * it previews formal rules but never executes a resolver or changes a Run.
 */
export function createStableRunUiInteractionModel(
  phase: StableRunPhase,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiInteractionModel {
  const actions = phase.kind === 'current-day-hub'
    ? [createLaunchAction(phase, dependencies)].filter(
        (action): action is StableRunUiAction => action !== null,
      )
    : phase.kind === 'scene-session'
      ? [
          ...createMoveActions(phase, dependencies),
          ...createSearchActions(phase, dependencies),
          ...createObstacleActions(phase, dependencies),
          ...[createWithdrawalAction(phase, dependencies), createSettlementAction(phase)].filter(
            (action): action is StableRunUiAction => action !== null,
          ),
        ]
      : []
  const opportunities = phase.kind === 'scene-session'
    ? pickupOpportunities(phase, dependencies)
    : Object.freeze([])
  return Object.freeze({ actions: Object.freeze(actions), pickupOpportunities: opportunities })
}
