import { CombatError } from './combat-errors'

export interface CombatSceneTimeConversionRules {
  readonly minimumSceneTime: number
  readonly ctbPerStep: number
  readonly sceneTimePerStep: number
}

export function convertCombatElapsedCtbToSceneTime(
  elapsedCtb: number,
  rules: CombatSceneTimeConversionRules,
): number {
  if (!Number.isSafeInteger(elapsedCtb) || elapsedCtb < 0) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '战斗经过CTB必须是非负安全整数')
  }
  for (const value of [
    rules.minimumSceneTime,
    rules.ctbPerStep,
    rules.sceneTimePerStep,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new CombatError('INVALID_COMBAT_DEPENDENCIES', '战斗场景时间换算规则无效')
    }
  }
  return Math.max(
    rules.minimumSceneTime,
    Math.ceil(elapsedCtb / rules.ctbPerStep) * rules.sceneTimePerStep,
  )
}

export function evaluateCombatSceneTime(
  elapsedCtb: number,
  remainingTime: number,
  rules: CombatSceneTimeConversionRules,
): Readonly<{
  sceneTimeCost: number
  remainingTimeAfter: number
  overtimeDebt: number
}> {
  if (!Number.isSafeInteger(remainingTime) || remainingTime < 0) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '场景剩余时间必须是非负安全整数')
  }
  const sceneTimeCost = convertCombatElapsedCtbToSceneTime(elapsedCtb, rules)
  return Object.freeze({
    sceneTimeCost,
    remainingTimeAfter: Math.max(0, remainingTime - sceneTimeCost),
    overtimeDebt: Math.max(0, sceneTimeCost - remainingTime),
  })
}
