import { deepFreeze } from '../config'
import { getPlayerVisibleOpenWoundLabels } from '../condition'
import {
  getPlayerVisibleHubItemSource,
  type PlayerVisibleHubItemSource,
} from '../hub-inventory'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { classifyLoad, type LoadTier } from '../load'
import type { MedicalItemKind, MedicalPrimaryEffect } from '../medical'
import { previewRunHubMedicalCommand } from './run-hub-medical-command'
import type { RunHubMedicalErrorCode } from './run-hub-medical-errors'
import type {
  RunHubMedicalDependencies,
  RunHubMedicalSnapshot,
  UseRunHubMedicalItemCommand,
} from './run-hub-medical-types'

export type PlayerVisibleHubMedicalTarget =
  | Readonly<{
      kind: 'open-wound'
      woundKind: 'laceration' | 'puncture' | 'bite'
      ordinal: number
    }>
  | Readonly<{ kind: 'minor-contusion' }>
  | null

export interface PlayerVisibleRunHubMedicalResult {
  readonly medicalItem: MedicalItemKind
  readonly source: PlayerVisibleHubItemSource
  readonly sourceQuantityBefore: number
  readonly sourceQuantityAfter: number
  readonly target: PlayerVisibleHubMedicalTarget
  readonly healthBefore: number
  readonly healthAfter: number
  readonly actualHealthRecovery: number
  readonly bleedingBefore: boolean
  readonly bleedingAfter: boolean
  readonly woundTreated: PlayerVisibleHubMedicalTarget
  readonly woundRemoved: PlayerVisibleHubMedicalTarget
  readonly minorContusionsBefore: number
  readonly minorContusionsAfter: number
  readonly painkillerBefore: boolean
  readonly painkillerAfter: boolean
  readonly infectionExposuresBefore: number
  readonly infectionExposuresAfter: number
  readonly disinfectantUsesBefore: number
  readonly disinfectantUsesAfter: number
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly loadTierBefore: LoadTier
  readonly loadTierAfter: LoadTier
  readonly hubSceneTime: 0
}

export type PlayerVisibleRunHubMedicalEvaluation =
  | Readonly<{ canExecute: true; result: PlayerVisibleRunHubMedicalResult }>
  | Readonly<{
      canExecute: false
      rejectionCode: RunHubMedicalErrorCode
      rejectionMessage: string
    }>

function visibleTarget(
  snapshot: RunHubMedicalSnapshot,
  target: UseRunHubMedicalItemCommand['target'],
): PlayerVisibleHubMedicalTarget {
  if (!target) return null
  if (target.kind === 'minor-contusion') return deepFreeze({ kind: target.kind })
  const index = snapshot.playerCondition.openWounds.findIndex(
    ({ id }) => id === target.woundId,
  )
  if (index < 0) throw new Error('正式中枢医疗目标伤口不存在')
  const label = getPlayerVisibleOpenWoundLabels(
    snapshot.playerCondition.openWounds,
  )[index]
  return deepFreeze({
    kind: 'open-wound',
    woundKind: label.kind,
    ordinal: label.ordinal,
  })
}

function primaryEffect<K extends MedicalPrimaryEffect['kind']>(
  effects: readonly MedicalPrimaryEffect[],
  kind: K,
): Extract<MedicalPrimaryEffect, { kind: K }> | undefined {
  return effects.find(
    (candidate): candidate is Extract<MedicalPrimaryEffect, { kind: K }> =>
      candidate.kind === kind,
  )
}

/** Player-safe allow-list projection of the formal Hub medical plan. */
export function previewPlayerVisibleRunHubMedicalCommand(
  snapshot: RunHubMedicalSnapshot,
  command: unknown,
  dependencies: RunHubMedicalDependencies,
): PlayerVisibleRunHubMedicalEvaluation {
  const preview = previewRunHubMedicalCommand(snapshot, command, dependencies)
  if (!preview.canExecute) return preview
  const plan = preview.result
  const consumption = plan.effects.find(
    (candidate) => candidate.kind === 'run-hub-medical-item-consumed',
  )
  if (!consumption || consumption.kind !== 'run-hub-medical-item-consumed') {
    throw new Error('正式中枢医疗计划缺少物品消费事实')
  }
  const primary = plan.effects.flatMap((candidate) =>
    candidate.kind === 'run-hub-medical-primary-effect-applied'
      ? [candidate.effect]
      : [],
  )
  const health = primaryEffect(primary, 'health-restored')
  const treated = primaryEffect(primary, 'open-wound-treated')
  const removed = primaryEffect(primary, 'open-wound-removed')
  const target = visibleTarget(snapshot, plan.command.target)
  const weightBefore = calculateBackpackWeightSubtotal(
    snapshot.runLoadout.backpack,
    dependencies.runLoadout.physicalCatalog,
  )
  const weightAfter = calculateBackpackWeightSubtotal(
    plan.snapshot.runLoadout.backpack,
    dependencies.runLoadout.physicalCatalog,
  )
  return deepFreeze({
    canExecute: true as const,
    result: {
      medicalItem: plan.metadata.medicalItem,
      source: getPlayerVisibleHubItemSource(snapshot.runLoadout, plan.command.source),
      sourceQuantityBefore: consumption.quantityBefore,
      sourceQuantityAfter: consumption.quantityAfter,
      target,
      healthBefore: snapshot.playerCondition.currentHealth,
      healthAfter: plan.snapshot.playerCondition.currentHealth,
      actualHealthRecovery: health?.actualRecovery ?? 0,
      bleedingBefore: snapshot.playerCondition.bleeding,
      bleedingAfter: plan.snapshot.playerCondition.bleeding,
      woundTreated: treated ? target : null,
      woundRemoved: removed ? target : null,
      minorContusionsBefore: snapshot.playerCondition.minorContusions,
      minorContusionsAfter: plan.snapshot.playerCondition.minorContusions,
      painkillerBefore: snapshot.playerCondition.painkillerActive,
      painkillerAfter: plan.snapshot.playerCondition.painkillerActive,
      infectionExposuresBefore: snapshot.playerCondition.pendingInfectionExposures,
      infectionExposuresAfter: plan.snapshot.playerCondition.pendingInfectionExposures,
      disinfectantUsesBefore: snapshot.dailyMedicalUsage.disinfectantUsesToday,
      disinfectantUsesAfter: plan.snapshot.dailyMedicalUsage.disinfectantUsesToday,
      backpackWeightBefore: weightBefore,
      backpackWeightAfter: weightAfter,
      loadTierBefore: classifyLoad(weightBefore, dependencies.runLoadout.backpackRules).tier,
      loadTierAfter: classifyLoad(weightAfter, dependencies.runLoadout.backpackRules).tier,
      hubSceneTime: 0,
    },
  })
}
