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
  if (!Array.isArray(input.openWounds)) {
    throw new ConditionError('INVALID_OPEN_WOUND', '开放伤口必须是数组')
  }
  const woundIds = new Set<string>()
  const openWounds = input.openWounds.map((wound) => {
    if (
      !wound ||
      typeof wound !== 'object' ||
      Object.keys(wound).sort().join('|') !== 'id|kind|treatment' ||
      typeof wound.id !== 'string' ||
      wound.id.trim().length === 0 ||
      !['laceration', 'puncture', 'bite'].includes(wound.kind) ||
      !['untreated', 'treated'].includes(wound.treatment)
    ) {
      throw new ConditionError('INVALID_OPEN_WOUND', '开放伤口记录无效')
    }
    if (woundIds.has(wound.id)) {
      throw new ConditionError('DUPLICATE_OPEN_WOUND_ID', `开放伤口ID重复：${wound.id}`)
    }
    woundIds.add(wound.id)
    return { ...wound }
  }).sort((left, right) => left.id.localeCompare(right.id))
  assertNonNegativeSafeInteger(input.minorContusions, '轻微挫伤数量')
  assertNonNegativeSafeInteger(input.pendingInfectionExposures, '待处理感染暴露数量')
  if (
    typeof input.bleeding !== 'boolean' ||
    typeof input.painkillerActive !== 'boolean'
  ) {
    throw new ConditionError(
      'INVALID_CONDITION_COUNT',
      '流血和镇痛状态必须是布尔值',
    )
  }
  return deepFreeze({ ...input, openWounds })
}

export function createInitialPlayerCondition(
  rules: PlayerHealthRules,
): PlayerConditionSnapshot {
  return createPlayerCondition(
    {
      currentHealth: rules.maxHealth,
      bleeding: false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    },
    rules,
  )
}

export function cloneCondition(
  state: PlayerConditionSnapshot,
  changes: Partial<PlayerConditionSnapshot>,
): PlayerConditionSnapshot {
  return deepFreeze({
    ...state,
    ...changes,
    openWounds: (changes.openWounds ?? state.openWounds).map((wound) => ({ ...wound })),
  })
}
