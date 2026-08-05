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
