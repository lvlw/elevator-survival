import type { FrozenRuleConfig } from '../config'
import type { SceneAlertState } from './scene-exploration-types'

export function selectInfectedOrderlyFirstActionTime(
  alertState: SceneAlertState,
  config: FrozenRuleConfig,
): number {
  return alertState === 'alerted'
    ? config.combat.infectedOrderly.firstActionTime.alerted
    : config.combat.infectedOrderly.firstActionTime.unaware
}
