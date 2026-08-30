import { deepFreeze } from '../config'
import {
  getPlayerVisibleHubItemSource,
  type PlayerVisibleHubItemSource,
} from '../hub-inventory'
import {
  previewHubSurvivalCommand,
  type CurrentDayHubDependencies,
  type CurrentDayHubError,
  type CurrentDayHubSnapshot,
  type HubSurvivalCommand,
} from './current-day-hub'

export interface PlayerVisibleHubSurvivalResult {
  readonly action: HubSurvivalCommand['kind']
  readonly source: PlayerVisibleHubItemSource
  readonly sourceQuantityBefore: number
  readonly sourceQuantityAfter: number
  readonly satietyBefore: number
  readonly satietyRestored: number
  readonly satietyAfter: number
  readonly suppressionUsesBefore: number
  readonly suppressionUsesAfter: number
  readonly suppressionAmountBefore: number
  readonly suppressionAmountAfter: number
  readonly infectionExposuresBefore: number
  readonly infectionExposuresAfter: number
  readonly worldThreatProgressBefore: number
  readonly worldThreatProgressAfter: number
  readonly hubSceneTime: 0
}

export type PlayerVisibleHubSurvivalEvaluation =
  | Readonly<{ canExecute: true; result: PlayerVisibleHubSurvivalResult }>
  | Readonly<{
      canExecute: false
      rejectionCode: CurrentDayHubError['code']
      rejectionMessage: string
    }>

/** Player-safe allow-list projection of the formal Hub survival plan. */
export function previewPlayerVisibleHubSurvivalCommand(
  snapshot: CurrentDayHubSnapshot,
  command: unknown,
  dependencies: CurrentDayHubDependencies,
): PlayerVisibleHubSurvivalEvaluation {
  const preview = previewHubSurvivalCommand(snapshot, command, dependencies)
  if (!preview.canExecute) return preview
  const plan = preview.result
  const consumption = plan.effects.find(
    (candidate) => candidate.kind === 'hub-survival-item-consumed',
  )
  if (!consumption || consumption.kind !== 'hub-survival-item-consumed') {
    throw new Error('正式中枢生存计划缺少物品消费事实')
  }
  const satiety = plan.effects.find(
    (candidate) => candidate.kind === 'hub-satiety-restored',
  )
  const suppression = plan.effects.find(
    (candidate) => candidate.kind === 'hub-threat-suppression-changed',
  )
  return deepFreeze({
    canExecute: true as const,
    result: {
      action: plan.command.kind,
      source: getPlayerVisibleHubItemSource(
        snapshot.runLoadout,
        plan.command.source,
      ),
      sourceQuantityBefore: consumption.consumption.quantityBefore,
      sourceQuantityAfter: consumption.consumption.quantityAfter,
      satietyBefore: snapshot.satiety.current,
      satietyRestored: satiety?.kind === 'hub-satiety-restored'
        ? satiety.restored
        : 0,
      satietyAfter: plan.snapshot.satiety.current,
      suppressionUsesBefore: snapshot.dailyState.threatSuppression.usesToday,
      suppressionUsesAfter: plan.snapshot.dailyState.threatSuppression.usesToday,
      suppressionAmountBefore: snapshot.dailyState.threatSuppression.suppressionAmountToday,
      suppressionAmountAfter: plan.snapshot.dailyState.threatSuppression.suppressionAmountToday,
      infectionExposuresBefore: snapshot.playerCondition.pendingInfectionExposures,
      infectionExposuresAfter: plan.snapshot.playerCondition.pendingInfectionExposures,
      worldThreatProgressBefore: snapshot.worldThreat.progress,
      worldThreatProgressAfter: plan.snapshot.worldThreat.progress,
      hubSceneTime: 0,
    },
  })
}
