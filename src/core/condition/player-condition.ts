import { deepFreeze } from '../config'
import { ConditionError } from './condition-errors'
import type {
  OpenWoundSnapshot,
  PlayerConditionSnapshot,
  PlayerHealthRules,
} from './condition-types'

const CONDITION_KEYS = [
  'bleeding',
  'currentHealth',
  'minorContusions',
  'openWounds',
  'painkillerActive',
  'pendingInfectionExposures',
] as const

const OPEN_WOUND_KEYS = ['id', 'kind', 'treatment'] as const

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createOpenWoundSnapshot(input: OpenWoundSnapshot): OpenWoundSnapshot {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !hasExactKeys(input, OPEN_WOUND_KEYS) ||
    typeof input.id !== 'string' ||
    input.id.trim().length === 0 ||
    (input.kind !== 'laceration' && input.kind !== 'puncture' && input.kind !== 'bite') ||
    (input.treatment !== 'untreated' && input.treatment !== 'treated')
  ) {
    throw new ConditionError('INVALID_OPEN_WOUND', '开放伤口记录无效')
  }
  return deepFreeze({
    id: input.id,
    kind: input.kind,
    treatment: input.treatment,
  })
}

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
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !hasExactKeys(input, CONDITION_KEYS)
  ) {
    throw new ConditionError('INVALID_CONDITION_SHAPE', '玩家条件状态字段无效')
  }
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
    const normalized = createOpenWoundSnapshot(wound)
    if (woundIds.has(normalized.id)) {
      throw new ConditionError('DUPLICATE_OPEN_WOUND_ID', `开放伤口ID重复：${normalized.id}`)
    }
    woundIds.add(normalized.id)
    return normalized
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
  return deepFreeze({
    currentHealth: input.currentHealth,
    bleeding: input.bleeding,
    openWounds,
    minorContusions: input.minorContusions,
    painkillerActive: input.painkillerActive,
    pendingInfectionExposures: input.pendingInfectionExposures,
  })
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
  const openWounds = changes.openWounds ?? state.openWounds
  return deepFreeze({
    currentHealth: changes.currentHealth ?? state.currentHealth,
    bleeding: changes.bleeding ?? state.bleeding,
    openWounds: openWounds.map((wound) => createOpenWoundSnapshot(wound)),
    minorContusions: changes.minorContusions ?? state.minorContusions,
    painkillerActive: changes.painkillerActive ?? state.painkillerActive,
    pendingInfectionExposures:
      changes.pendingInfectionExposures ?? state.pendingInfectionExposures,
  })
}
