import { deepFreeze } from '../config'
import {
  assertValidForcedReturnRules,
  calculateForcedReturnDamage,
} from './forced-return'
import { SceneResolutionError } from './scene-errors'
import {
  assertNonNegativeSafeInteger,
  assertPositiveSafeInteger,
} from './scene-time'
import type {
  ForcedReturnRules,
  SceneClockSnapshot,
  SceneVitalSnapshot,
  TimedSceneActionInput,
  TimedSceneActionOutcome,
  TimedSceneActionPreview,
} from './scene-types'

function validateSnapshots(
  clock: SceneClockSnapshot,
  vitals: SceneVitalSnapshot,
  action: TimedSceneActionInput,
): void {
  assertNonNegativeSafeInteger(
    clock.remainingTime,
    'INVALID_REMAINING_TIME',
    '场景剩余时间',
  )
  assertPositiveSafeInteger(
    vitals.maxHealth,
    'INVALID_MAX_HEALTH',
    '最大生命',
  )
  assertNonNegativeSafeInteger(
    vitals.currentHealth,
    'INVALID_CURRENT_HEALTH',
    '当前生命',
  )

  if (vitals.currentHealth > vitals.maxHealth) {
    throw new SceneResolutionError(
      'INVALID_CURRENT_HEALTH',
      '当前生命不能超过最大生命',
    )
  }

  assertPositiveSafeInteger(
    action.timeCost,
    'INVALID_ACTION_TIME',
    '行动时间',
  )
  assertNonNegativeSafeInteger(
    action.healthAfterPrimaryEffect,
    'INVALID_PRIMARY_EFFECT_HEALTH',
    '主要效果后的生命',
  )

  if (action.healthAfterPrimaryEffect > vitals.maxHealth) {
    throw new SceneResolutionError(
      'INVALID_PRIMARY_EFFECT_HEALTH',
      '主要效果后的生命不能超过最大生命',
    )
  }

  assertNonNegativeSafeInteger(
    action.estimatedReturnTimeAfterAction,
    'INVALID_RETURN_TIME',
    '行动后的预计返程时间',
  )
}

function assertCanStart(
  clock: SceneClockSnapshot,
  vitals: SceneVitalSnapshot,
): void {
  if (vitals.currentHealth === 0) {
    throw new SceneResolutionError(
      'PLAYER_DEAD',
      '生命为0的玩家不能开始普通场景行动',
    )
  }

  if (clock.remainingTime === 0) {
    throw new SceneResolutionError(
      'SCENE_TIME_EXHAUSTED',
      '场景时间为0时不能开始普通场景行动',
    )
  }
}

function createOutcome(
  clock: SceneClockSnapshot,
  vitals: SceneVitalSnapshot,
  action: TimedSceneActionInput,
  forcedReturnRules: ForcedReturnRules,
): TimedSceneActionOutcome {
  validateSnapshots(clock, vitals, action)
  assertCanStart(clock, vitals)
  assertValidForcedReturnRules(forcedReturnRules)

  const remainingTime = Math.max(0, clock.remainingTime - action.timeCost)
  const overtimeDebt = Math.max(0, action.timeCost - clock.remainingTime)
  const postActionBleedingDamage = action.bleedingAfterPrimaryEffect ? 1 : 0
  const healthAfterBleeding = Math.max(
    0,
    action.healthAfterPrimaryEffect - postActionBleedingDamage,
  )
  const emptyReturnDamage = {
    effectiveEmergencyReturnTime: 0,
    baseDamage: 0,
    bleedingExtraDamage: 0,
    totalDamage: 0,
  }

  if (healthAfterBleeding === 0) {
    return deepFreeze({
      kind: 'death',
      clock: { remainingTime },
      vitals: {
        currentHealth: 0,
        maxHealth: vitals.maxHealth,
        bleeding: action.bleedingAfterPrimaryEffect,
      },
      overtimeDebt,
      postActionBleedingDamage,
      effectiveEmergencyReturnTime:
        emptyReturnDamage.effectiveEmergencyReturnTime,
      forcedReturnBaseDamage: emptyReturnDamage.baseDamage,
      forcedReturnBleedingDamage: emptyReturnDamage.bleedingExtraDamage,
      forcedReturnTotalDamage: emptyReturnDamage.totalDamage,
      isDead: true,
      isSafelyReturned: false,
    })
  }

  if (remainingTime > 0) {
    const isSafelyReturned = action.reachesElevatorSafety

    return deepFreeze({
      kind: isSafelyReturned ? 'safe-return' : 'continue',
      clock: { remainingTime },
      vitals: {
        currentHealth: healthAfterBleeding,
        maxHealth: vitals.maxHealth,
        bleeding: action.bleedingAfterPrimaryEffect,
      },
      overtimeDebt,
      postActionBleedingDamage,
      effectiveEmergencyReturnTime: 0,
      forcedReturnBaseDamage: 0,
      forcedReturnBleedingDamage: 0,
      forcedReturnTotalDamage: 0,
      isDead: false,
      isSafelyReturned,
    })
  }

  const forcedReturnDamage = calculateForcedReturnDamage(
    overtimeDebt,
    action.estimatedReturnTimeAfterAction,
    action.bleedingAfterPrimaryEffect,
    forcedReturnRules,
  )
  const finalHealth = Math.max(
    0,
    healthAfterBleeding - forcedReturnDamage.totalDamage,
  )
  const isDead = finalHealth === 0
  const zeroDistanceSafeReturn =
    action.reachesElevatorSafety &&
    forcedReturnDamage.effectiveEmergencyReturnTime === 0

  return deepFreeze({
    kind: isDead
      ? 'death'
      : zeroDistanceSafeReturn
        ? 'safe-return'
        : 'forced-return',
    clock: { remainingTime },
    vitals: {
      currentHealth: finalHealth,
      maxHealth: vitals.maxHealth,
      bleeding: action.bleedingAfterPrimaryEffect,
    },
    overtimeDebt,
    postActionBleedingDamage,
    effectiveEmergencyReturnTime:
      forcedReturnDamage.effectiveEmergencyReturnTime,
    forcedReturnBaseDamage: forcedReturnDamage.baseDamage,
    forcedReturnBleedingDamage: forcedReturnDamage.bleedingExtraDamage,
    forcedReturnTotalDamage: forcedReturnDamage.totalDamage,
    isDead,
    isSafelyReturned: !isDead,
  })
}

export function previewTimedSceneAction(
  clock: SceneClockSnapshot,
  vitals: SceneVitalSnapshot,
  action: TimedSceneActionInput,
  forcedReturnRules: ForcedReturnRules,
): TimedSceneActionPreview {
  validateSnapshots(clock, vitals, action)
  assertValidForcedReturnRules(forcedReturnRules)

  if (vitals.currentHealth === 0) {
    return deepFreeze({
      canStart: false,
      rejectionCode: 'PLAYER_DEAD',
    })
  }

  if (clock.remainingTime === 0) {
    return deepFreeze({
      canStart: false,
      rejectionCode: 'SCENE_TIME_EXHAUSTED',
    })
  }

  return deepFreeze({
    canStart: true,
    outcome: createOutcome(clock, vitals, action, forcedReturnRules),
  })
}

export function resolveTimedSceneAction(
  clock: SceneClockSnapshot,
  vitals: SceneVitalSnapshot,
  action: TimedSceneActionInput,
  forcedReturnRules: ForcedReturnRules,
): TimedSceneActionOutcome {
  return createOutcome(clock, vitals, action, forcedReturnRules)
}
