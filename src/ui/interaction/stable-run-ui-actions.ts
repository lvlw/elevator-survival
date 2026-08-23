import {
  createPerformMainSearchCommand,
  createMoveThroughSceneEdgeCommand,
  previewMainSearchCommand,
  previewSceneMoveCommand,
  type SearchIlluminationChoice,
  type SceneExplorationEffect,
} from '../../core/scene-exploration'
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
import type { StableRunUiPresentationDependencies } from '../presentation'
import { getCurrentTraversableAdjacentEdges } from './current-traversable-adjacent-edges'

export type StableRunUiActionKind =
  | 'launch-main-scene'
  | 'scene-move'
  | 'scene-main-search'

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
}

function freezePreview(
  title: string,
  facts: readonly StableRunUiActionPreviewFact[],
  warnings: readonly string[] = [],
): StableRunUiActionPreviewViewModel {
  return Object.freeze({
    title,
    facts: Object.freeze(facts.map((fact) => Object.freeze({ ...fact }))),
    warnings: Object.freeze([...warnings]),
  })
}

function sceneOutcomeWarnings(input: Readonly<{
  outcome: Readonly<{
    kind: string
    overtimeDebt: number
    clock: Readonly<{ remainingTime: number }>
  }>
  returnEstimate: number
}>): readonly string[] {
  const warnings: string[] = []
  if (input.outcome.overtimeDebt > 0) warnings.push(`超时债务：${input.outcome.overtimeDebt}`)
  if (input.outcome.kind === 'forced-return') warnings.push('行动完成后将进入强制返程。')
  if (input.outcome.kind === 'death') warnings.push('行动完成后生命将归零。')
  if (
    input.outcome.kind === 'active' &&
    input.outcome.clock.remainingTime < input.returnEstimate
  ) warnings.push('行动后剩余时间低于预计安全返程线。')
  return Object.freeze(warnings)
}

function applicationSceneCommand(
  kind: 'scene-move' | 'scene-main-search',
  command: unknown,
): StableRunApplicationCommand {
  return createStableRunApplicationCommand({
    kind: 'scene',
    command: { kind, command },
  })
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
        { label: '行动后生命', value: String(result.snapshot.condition.currentHealth) },
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
      ? [...createMoveActions(phase, dependencies), ...createSearchActions(phase, dependencies)]
      : []
  return Object.freeze({ actions: Object.freeze(actions) })
}
