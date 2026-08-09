import { deepFreeze, type FrozenRuleConfig } from '../config'

export interface DailyMedicalUsageSnapshot {
  readonly disinfectantUsesToday: number
}

export class DailyStateError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'DailyStateError'
  }
}

function hasExactUsageShape(value: unknown): value is DailyMedicalUsageSnapshot {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === 1 &&
    Object.prototype.hasOwnProperty.call(value, 'disinfectantUsesToday'),
  )
}

export function createInitialDailyMedicalUsageSnapshot(): DailyMedicalUsageSnapshot {
  return deepFreeze({ disinfectantUsesToday: 0 })
}

export function createDailyMedicalUsageSnapshot(
  input: unknown,
  config: Pick<FrozenRuleConfig, 'medical'>,
): DailyMedicalUsageSnapshot {
  if (!hasExactUsageShape(input)) {
    throw new DailyStateError('每日消毒剂使用状态无效')
  }
  const usesToday = input.disinfectantUsesToday
  const maxUsesPerDay = config.medical.disinfectant.maxUsesPerDay
  if (
    !Number.isSafeInteger(maxUsesPerDay) ||
    maxUsesPerDay < 0 ||
    !Number.isSafeInteger(usesToday) ||
    usesToday < 0 ||
    usesToday > maxUsesPerDay
  ) {
    throw new DailyStateError('每日消毒剂使用状态无效')
  }
  return deepFreeze({ disinfectantUsesToday: usesToday })
}
