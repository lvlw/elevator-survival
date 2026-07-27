import { SceneResolutionError } from './scene-errors'

export function assertNonNegativeSafeInteger(
  value: number,
  code:
    | 'INVALID_REMAINING_TIME'
    | 'INVALID_CURRENT_HEALTH'
    | 'INVALID_PRIMARY_EFFECT_HEALTH'
    | 'INVALID_RETURN_TIME',
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new SceneResolutionError(code, `${label}必须是非负安全整数`)
  }
}

export function assertPositiveSafeInteger(
  value: number,
  code: 'INVALID_MAX_HEALTH' | 'INVALID_ACTION_TIME',
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new SceneResolutionError(code, `${label}必须是正安全整数`)
  }
}

export function addSafeTime(left: number, right: number): number {
  const result = left + right

  if (!Number.isSafeInteger(result)) {
    throw new SceneResolutionError(
      'TIME_CALCULATION_OVERFLOW',
      '场景时间计算超出安全整数范围',
    )
  }

  return result
}
