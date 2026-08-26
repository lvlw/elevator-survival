import { deepFreeze } from '../config'
import { getPlayerVisibleOpenWoundLabels } from '../condition'
import type { TimedSceneActionOutcome } from '../scene'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import type { SceneExplorationErrorCode } from './scene-exploration-errors'
import { previewSceneMedicalCommand } from './scene-medical-command'
import { createUseSceneMedicalItemCommand } from './scene-medical-validation'
import { previewSceneWithdrawalCommand } from './scene-withdrawal-resolution'
import type {
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneExplorationStatus,
  SceneMedicalCommandDependencies,
  SceneMedicalItemKind,
} from './scene-exploration-types'

export type PlayerVisibleSceneMedicalSource =
  | Readonly<{
      container: 'backpack'
      column: number
      row: number
    }>
  | Readonly<{
      container: 'quick-slot'
      slotNumber: number
    }>

export type PlayerVisibleSceneMedicalTarget =
  | Readonly<{ kind: 'none' }>
  | Readonly<{
      kind: 'open-wound'
      woundKind: 'laceration' | 'puncture' | 'bite'
      treatment: 'untreated' | 'treated'
      ordinal: number
    }>
  | Readonly<{ kind: 'minor-contusion' }>

export interface PlayerVisibleSceneMedicalEvaluation {
  readonly medicalItem: SceneMedicalItemKind
  readonly source: PlayerVisibleSceneMedicalSource
  readonly target: PlayerVisibleSceneMedicalTarget
  readonly quantityBefore: number
  readonly quantityAfter: number
  readonly actualHealthRecovery: number
  readonly healthBefore: number
  readonly healthAfterPrimaryEffect: number
  readonly bleedingBefore: boolean
  readonly bleedingAfterPrimaryEffect: boolean
  readonly woundChange: 'treated' | 'removed' | null
  readonly minorContusionRemoved: boolean
  readonly painkillerActivated: boolean
  readonly infectionExposureBefore: number
  readonly actualInfectionExposureReduction: number
  readonly infectionExposureAfter: number
  readonly disinfectantUsesBefore: number
  readonly disinfectantUsesAfter: number
  readonly actionTime: number
  readonly remainingTimeBefore: number
  readonly remainingTimeAfter: number
  readonly postActionBleedingDamage: number
  readonly returnEstimateAfterAction: number
  readonly estimatedRemainingTimeAfterReturn: number | null
  readonly sceneOutcome: TimedSceneActionOutcome
  readonly finalHealth: number
  readonly finalSceneStatus: SceneExplorationStatus
  readonly completionNodeName: string
}

export type PlayerVisibleSceneMedicalPreview =
  | Readonly<{ canExecute: true; result: PlayerVisibleSceneMedicalEvaluation }>
  | Readonly<{ canExecute: false; rejectionCode: SceneExplorationErrorCode }>

function findEffect<TKind extends SceneExplorationEffect['kind']>(
  effects: readonly SceneExplorationEffect[],
  kind: TKind,
): Extract<SceneExplorationEffect, { readonly kind: TKind }> | undefined {
  return effects.find(
    (effect): effect is Extract<SceneExplorationEffect, { readonly kind: TKind }> =>
      effect.kind === kind,
  )
}

function projectSource(
  snapshot: SceneExplorationSnapshot,
  source: ReturnType<typeof createUseSceneMedicalItemCommand>['source'],
): PlayerVisibleSceneMedicalSource {
  if (source.container === 'quick-slot') {
    return deepFreeze({ container: 'quick-slot', slotNumber: source.quickSlotIndex + 1 })
  }
  const placement = snapshot.backpack.placements.find(
    ({ instanceId }) => instanceId === source.itemInstanceId,
  )
  if (!placement) throw new Error('正式探索医疗背包来源缺少摆放')
  return deepFreeze({
    container: 'backpack',
    column: placement.x + 1,
    row: placement.y + 1,
  })
}

function projectTarget(
  snapshot: SceneExplorationSnapshot,
  target: ReturnType<typeof createUseSceneMedicalItemCommand>['target'],
): PlayerVisibleSceneMedicalTarget {
  if (!target) return deepFreeze({ kind: 'none' })
  if (target.kind === 'minor-contusion') {
    return deepFreeze({ kind: 'minor-contusion' })
  }
  const woundIndex = snapshot.condition.openWounds.findIndex(
    ({ id }) => id === target.woundId,
  )
  if (woundIndex < 0) throw new Error('正式探索医疗目标伤口不存在')
  const label = getPlayerVisibleOpenWoundLabels(snapshot.condition.openWounds)[woundIndex]
  if (!label) throw new Error('正式探索医疗目标伤口缺少玩家可见标签')
  return deepFreeze({
    kind: 'open-wound',
    woundKind: label.kind,
    treatment: label.treatment,
    ordinal: label.ordinal,
  })
}

function estimatedRemainingAfterReturn(
  snapshot: SceneExplorationSnapshot,
  dependencies: SceneMedicalCommandDependencies,
): number | null {
  if (snapshot.status !== 'active') return snapshot.remainingTime
  const withdrawal = previewSceneWithdrawalCommand(
    snapshot,
    { kind: 'withdraw-from-scene' },
    dependencies,
  )
  return withdrawal.canExecute ? withdrawal.result.snapshot.remainingTime : null
}

/**
 * Projects the formal Scene Medical transaction into confirmation-safe facts.
 * It deliberately exposes no item/wound identity, Effect, plan, or snapshot.
 */
export function previewPlayerVisibleSceneMedicalCommand(
  snapshotInput: SceneExplorationSnapshot,
  commandInput: unknown,
  dependencies: SceneMedicalCommandDependencies,
): PlayerVisibleSceneMedicalPreview {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  const preview = previewSceneMedicalCommand(snapshot, commandInput, dependencies)
  if (!preview.canExecute) return deepFreeze(preview)

  const command = createUseSceneMedicalItemCommand(commandInput)
  const { result } = preview
  const consumed = findEffect(result.effects, 'scene-medical-item-consumed')
  const health = findEffect(result.effects, 'scene-health-restored')
  const bleeding = findEffect(result.effects, 'scene-bleeding-changed')
  const woundTreated = findEffect(result.effects, 'scene-open-wound-treated')
  const woundRemoved = findEffect(result.effects, 'scene-open-wound-removed')
  const contusion = findEffect(result.effects, 'scene-minor-contusion-removed')
  const painkiller = findEffect(result.effects, 'scene-painkiller-changed')
  const exposure = findEffect(result.effects, 'scene-infection-exposure-reduced')
  const dailyUsage = findEffect(result.effects, 'daily-medical-usage-changed')
  const time = findEffect(result.effects, 'scene-time-resolved')
  if (!consumed || !time) throw new Error('正式探索医疗计划缺少消费或时间事实')

  const completionNode = dependencies.graph.nodes.find(
    ({ id }) => id === result.snapshot.currentNodeId,
  )
  if (!completionNode) throw new Error('正式探索医疗结果引用未知节点')

  return deepFreeze({
    canExecute: true,
    result: {
      medicalItem: result.medicalItem,
      source: projectSource(snapshot, command.source),
      target: projectTarget(snapshot, command.target),
      quantityBefore: consumed.quantityBefore,
      quantityAfter: consumed.quantityAfter,
      actualHealthRecovery: health?.actualRecovery ?? 0,
      healthBefore: health?.healthBefore ?? snapshot.condition.currentHealth,
      healthAfterPrimaryEffect: health?.healthAfter ?? snapshot.condition.currentHealth,
      bleedingBefore: snapshot.condition.bleeding,
      bleedingAfterPrimaryEffect: bleeding?.after ?? snapshot.condition.bleeding,
      woundChange: woundTreated ? 'treated' : woundRemoved ? 'removed' : null,
      minorContusionRemoved: Boolean(contusion),
      painkillerActivated: Boolean(painkiller),
      infectionExposureBefore:
        exposure?.exposuresBefore ?? snapshot.condition.pendingInfectionExposures,
      actualInfectionExposureReduction: exposure?.actualReduction ?? 0,
      infectionExposureAfter:
        exposure?.exposuresAfter ?? snapshot.condition.pendingInfectionExposures,
      disinfectantUsesBefore:
        dailyUsage?.usesBefore ?? snapshot.dailyMedicalUsage.disinfectantUsesToday,
      disinfectantUsesAfter:
        dailyUsage?.usesAfter ?? snapshot.dailyMedicalUsage.disinfectantUsesToday,
      actionTime: result.actionTime,
      remainingTimeBefore: time.remainingTimeBefore,
      remainingTimeAfter: time.remainingTimeAfter,
      postActionBleedingDamage: result.sceneOutcome.postActionBleedingDamage,
      returnEstimateAfterAction: result.returnRoute.estimatedReturnTime,
      estimatedRemainingTimeAfterReturn: estimatedRemainingAfterReturn(
        result.snapshot,
        dependencies,
      ),
      sceneOutcome: result.sceneOutcome,
      finalHealth: result.sceneOutcome.vitals.currentHealth,
      finalSceneStatus: result.snapshot.status,
      completionNodeName: completionNode.name,
    },
  })
}
