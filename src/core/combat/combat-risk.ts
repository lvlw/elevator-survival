import { deepFreeze } from '../config'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { CombatError } from './combat-errors'
import type {
  CombatDependencies,
  CombatEffect,
  CombatEncounterSnapshot,
  CombatRiskTier,
  CombatRiskTrace,
} from './combat-types'

const RISK_ORDER: readonly CombatRiskTier[] = [
  'none',
  'low',
  'medium',
  'high',
  'very-high',
]

export const riskTierToPercent = (
  tier: CombatRiskTier,
  config: CombatDependencies['config'],
): number => config.combat.riskTiers[tier]

export function reduceRiskTier(
  tier: CombatRiskTier,
  amount: number,
): CombatRiskTier {
  if (!RISK_ORDER.includes(tier) || !Number.isSafeInteger(amount) || amount < 0) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '风险降低量无效')
  }
  return RISK_ORDER[Math.max(0, RISK_ORDER.indexOf(tier) - amount)]
}

export function addCombatRiskEffect(
  effects: CombatEffect[],
  snapshot: CombatEncounterSnapshot,
  actionId: string,
  resolvedActionCount: number,
  purpose: 'injury' | 'infection-exposure',
  originalTier: CombatRiskTier,
  finalTier: CombatRiskTier,
  usedHeavyCoat: boolean,
  usedDefense: boolean,
  dependencies: CombatDependencies,
): CombatRiskTrace {
  const streamId = createStreamId(
    'combat-risk',
    dependencies.sceneInstanceId,
    snapshot.enemy.enemyInstanceId,
    String(resolvedActionCount),
    actionId,
    purpose,
  )
  const draw = drawIntInclusive(
    createRandomCursor(dependencies.runSeed, streamId),
    1,
    100,
  )
  const riskPercent = riskTierToPercent(finalTier, dependencies.config)
  const trace = deepFreeze({
    algorithmVersion: RANDOM_ALGORITHM_VERSION,
    streamId,
    drawIndex: draw.nextCursor.drawIndex - 1,
    roll: draw.value,
    originalTier,
    finalTier,
    riskPercent,
    succeeded: draw.value <= riskPercent,
    usedHeavyCoat,
    usedDefense,
  })
  effects.push({ kind: 'combat-risk-resolved', purpose, ...trace })
  return trace
}

export function createStableCombatWoundId(
  enemyInstanceId: string,
  actionCount: number,
  actionId: string,
): string {
  return [
    'combat-wound',
    enemyInstanceId,
    String(actionCount),
    actionId,
    'injury',
  ].map(encodeURIComponent).join(':')
}
