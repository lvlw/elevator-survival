import { deepFreeze } from '../config'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneMedicalItemSource,
  SceneMedicalTarget,
  UseSceneMedicalItemCommand,
} from './scene-exploration-types'

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function normalizeSource(input: unknown): SceneMedicalItemSource {
  if (hasExactKeys(input, ['container', 'itemInstanceId']) && input.container === 'backpack' && typeof input.itemInstanceId === 'string' && input.itemInstanceId.trim().length > 0) {
    return deepFreeze({ container: 'backpack', itemInstanceId: input.itemInstanceId })
  }
  const quickSlotIndex = input && typeof input === 'object'
    ? (input as Record<string, unknown>).quickSlotIndex
    : undefined
  if (hasExactKeys(input, ['container', 'quickSlotIndex']) && input.container === 'quick-slot' && typeof quickSlotIndex === 'number' && Number.isSafeInteger(quickSlotIndex) && quickSlotIndex >= 0) {
    return deepFreeze({ container: 'quick-slot', quickSlotIndex })
  }
  throw new SceneExplorationError('INVALID_SCENE_MEDICAL_COMMAND', '探索医疗物品来源无效')
}

function normalizeTarget(input: unknown): SceneMedicalTarget {
  if (hasExactKeys(input, ['kind', 'woundId']) && input.kind === 'open-wound' && typeof input.woundId === 'string' && input.woundId.trim().length > 0) {
    return deepFreeze({ kind: 'open-wound', woundId: input.woundId })
  }
  if (hasExactKeys(input, ['kind']) && input.kind === 'minor-contusion') {
    return deepFreeze({ kind: 'minor-contusion' })
  }
  throw new SceneExplorationError('INVALID_SCENE_MEDICAL_COMMAND', '探索医疗目标无效')
}

export function createUseSceneMedicalItemCommand(
  input: UseSceneMedicalItemCommand,
): UseSceneMedicalItemCommand {
  const hasTarget = Boolean(
    input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    Object.prototype.hasOwnProperty.call(input, 'target'),
  )
  if (!hasExactKeys(input, hasTarget ? ['source', 'target'] : ['source'])) {
    throw new SceneExplorationError('INVALID_SCENE_MEDICAL_COMMAND', '探索医疗命令结构无效')
  }
  const source = normalizeSource(input.source)
  if (!hasTarget) return deepFreeze({ source })
  return deepFreeze({ source, target: normalizeTarget(input.target) })
}
