import { deepFreeze, type FrozenRuleConfig } from '../config'
import {
  DailyStateError,
  createDailyMedicalUsageSnapshot,
  createInitialDailyMedicalUsageSnapshot,
  type DailyMedicalUsageSnapshot,
} from './daily-medical-usage'

export interface DailyThreatSuppressionSnapshot {
  readonly usesToday: number
  readonly suppressionAmountToday: number
}

export interface DailyRunStateSnapshot {
  readonly medicalUsage: DailyMedicalUsageSnapshot
  readonly threatSuppression: DailyThreatSuppressionSnapshot
  readonly maintenanceLaborRemaining: number
}

type DailyConfig = Pick<FrozenRuleConfig, 'maintenance' | 'medical' | 'worldThreat'>

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

export function createDailyThreatSuppressionSnapshot(
  input: unknown,
  config: Pick<FrozenRuleConfig, 'worldThreat'>,
): DailyThreatSuppressionSnapshot {
  if (!exact(input, ['suppressionAmountToday', 'usesToday'])) {
    throw new DailyStateError('每日威胁抑制状态无效')
  }
  const uses = input.usesToday
  const amount = input.suppressionAmountToday
  if (!Number.isSafeInteger(uses) || (uses as number) < 0 ||
    (uses as number) > config.worldThreat.suppressant.maxUsesPerDay ||
    !Number.isSafeInteger(amount) || (amount as number) < 0 ||
    amount !== (uses as number) * config.worldThreat.suppressant.dailyReduction) {
    throw new DailyStateError('每日威胁抑制次数与抑制量不一致')
  }
  return deepFreeze({ usesToday: uses as number, suppressionAmountToday: amount as number })
}

export function createDailyRunStateSnapshot(
  input: unknown,
  config: DailyConfig,
): DailyRunStateSnapshot {
  if (!exact(input, ['maintenanceLaborRemaining', 'medicalUsage', 'threatSuppression'])) {
    throw new DailyStateError('每日Run状态结构无效')
  }
  if (!Number.isSafeInteger(input.maintenanceLaborRemaining) ||
    (input.maintenanceLaborRemaining as number) < 0 ||
    (input.maintenanceLaborRemaining as number) > config.maintenance.dailyBaseLabor.points) {
    throw new DailyStateError('每日维护工时状态无效')
  }
  return deepFreeze({
    medicalUsage: createDailyMedicalUsageSnapshot(input.medicalUsage, config),
    threatSuppression: createDailyThreatSuppressionSnapshot(input.threatSuppression, config),
    maintenanceLaborRemaining: input.maintenanceLaborRemaining as number,
  })
}

export function createInitialDailyRunStateSnapshot(config: DailyConfig): DailyRunStateSnapshot {
  return createDailyRunStateSnapshot({
    medicalUsage: createInitialDailyMedicalUsageSnapshot(),
    threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
    maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points,
  }, config)
}
