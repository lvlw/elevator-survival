import { deepFreeze } from '../config'
import { ConditionError } from './condition-errors'
import type {
  PlayerConditionSnapshot,
  PlayerHealthRules,
} from './condition-types'

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConditionError(
      'INVALID_CONDITION_COUNT',
      `${label}必须是非负安全整数`,
    )
  }
}

function assertRules(rules: PlayerHealthRules): void {
  if (!Number.isSafeInteger(rules.maxHealth) || rules.maxHealth <= 0) {
    throw new ConditionError(
      'INVALID_MAX_HEALTH',
      '最大生命必须是正安全整数',
    )
  }
}

export function createPlayerCondition(
  input: PlayerConditionSnapshot,
  rules: PlayerHealthRules,
): PlayerConditionSnapshot {
  assertRules(rules)
  if (
    !Number.isSafeInteger(input.currentHealth) ||
    input.currentHealth < 0 ||
    input.currentHealth > rules.maxHealth
  ) {
    throw new ConditionError(
      'INVALID_CURRENT_HEALTH',
      '当前生命必须是0到最大生命之间的安全整数',
    )
  }
  assertNonNegativeSafeInteger(
    input.untreatedOpenWounds,
    '未处理开放伤口数量',
  )
  assertNonNegativeSafeInteger(
    input.treatedOpenWounds,
    '已处理开放伤口数量',
  )
  assertNonNegativeSafeInteger(input.minorContusions, '轻微挫伤数量')
  if (
    typeof input.bleeding !== 'boolean' ||
    typeof input.painkillerActive !== 'boolean'
  ) {
    throw new ConditionError(
      'INVALID_CONDITION_COUNT',
      '流血和镇痛状态必须是布尔值',
    )
  }
  return deepFreeze({ ...input })
}

export function createInitialPlayerCondition(
  rules: PlayerHealthRules,
): PlayerConditionSnapshot {
  return createPlayerCondition(
    {
      currentHealth: rules.maxHealth,
      bleeding: false,
      untreatedOpenWounds: 0,
      treatedOpenWounds: 0,
      minorContusions: 0,
      painkillerActive: false,
    },
    rules,
  )
}

export function cloneCondition(
  state: PlayerConditionSnapshot,
  changes: Partial<PlayerConditionSnapshot>,
): PlayerConditionSnapshot {
  return deepFreeze({ ...state, ...changes })
}
