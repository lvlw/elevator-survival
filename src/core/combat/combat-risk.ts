import { combatRules } from './combat-legacy-profile'
import { isProfiledCombat, type CombatEngineDependencies } from './combat-profile'
import { deepFreeze } from '../config'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { CombatError } from './combat-errors'
import { z } from 'zod'
import { parseResidence, countSchema, idSchema } from '../residence-config/validation'
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
  dependencies: CombatEngineDependencies,
): CombatRiskTrace {
  const streamId = isProfiledCombat(dependencies)
    ? createStreamId('residence-combat-risk', dependencies.riskAddress.executionId, dependencies.riskAddress.catalogId,
        snapshot.enemy.enemyInstanceId, String(resolvedActionCount), actionId, purpose)
    : createStreamId(
    'combat-risk',
    dependencies.sceneInstanceId,
    snapshot.enemy.enemyInstanceId,
    String(resolvedActionCount),
    actionId,
    purpose,
  )
  const draw = (isProfiledCombat(dependencies) ? dependencies.draw : drawIntInclusive)(
    createRandomCursor(dependencies.runSeed, streamId),
    1,
    100,
  )
  if (isProfiledCombat(dependencies)) parseResidence(z.strictObject({ value: countSchema,
    nextCursor: z.strictObject({ seed:idSchema,streamId:idSchema,algorithmVersion:idSchema,drawIndex:countSchema }) }), draw)
  if (!Number.isSafeInteger(draw.value) || draw.value < 1 || draw.value > 100 ||
    draw.nextCursor.seed !== dependencies.runSeed || draw.nextCursor.streamId !== streamId || draw.nextCursor.drawIndex !== 1 ||
    draw.nextCursor.algorithmVersion !== RANDOM_ALGORITHM_VERSION) {
    throw new CombatError('INVALID_COMBAT_DEPENDENCIES', 'Invalid injected combat random result')
  }
  const riskPercent = combatRules(dependencies).riskTiers[finalTier]
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
