import { deepFreeze } from '../config'
import { CombatError } from './combat-errors'
import type {
  CombatPlayerActionCommand,
  TemporaryDefenseSnapshot,
} from './combat-types'

export function hasExactObjectKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createCombatPlayerActionCommand(
  input: CombatPlayerActionCommand,
): CombatPlayerActionCommand {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '玩家战斗命令结构无效')
  }
  if (input.kind === 'use-quick-slot-item') {
    const withTarget = Object.prototype.hasOwnProperty.call(
      input,
      'targetOpenWoundId',
    )
    if (
      !hasExactObjectKeys(
        input,
        withTarget
          ? ['kind', 'quickSlotIndex', 'targetOpenWoundId']
          : ['kind', 'quickSlotIndex'],
      ) ||
      !Number.isSafeInteger(input.quickSlotIndex) ||
      input.quickSlotIndex < 0 ||
      (withTarget && (
        typeof input.targetOpenWoundId !== 'string' ||
        input.targetOpenWoundId.trim().length === 0
      ))
    ) {
      throw new CombatError('INVALID_COMBAT_COMMAND', '快捷物品战斗命令结构无效')
    }
    return deepFreeze(withTarget
      ? {
          kind: input.kind,
          quickSlotIndex: input.quickSlotIndex,
          targetOpenWoundId: input.targetOpenWoundId,
        }
      : { kind: input.kind, quickSlotIndex: input.quickSlotIndex })
  }
  if (!hasExactObjectKeys(input, ['kind'])) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '玩家战斗命令结构无效')
  }
  if (
    input.kind !== 'metal-pipe-basic-attack' &&
    input.kind !== 'metal-pipe-charged-strike' &&
    input.kind !== 'defend' &&
    input.kind !== 'temporary-attack' &&
    input.kind !== 'escape'
  ) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '未知玩家战斗命令')
  }
  return deepFreeze({ kind: input.kind })
}

export function createTemporaryDefenseSnapshot(
  input: TemporaryDefenseSnapshot,
): TemporaryDefenseSnapshot {
  if (
    !hasExactObjectKeys(input, [
      'activatedAtCtb',
      'availableDirectAttackUses',
      'expiresAtPlayerActionCtb',
    ]) ||
    !Number.isSafeInteger(input.activatedAtCtb) ||
    input.activatedAtCtb < 0 ||
    !Number.isSafeInteger(input.expiresAtPlayerActionCtb) ||
    input.expiresAtPlayerActionCtb <= input.activatedAtCtb ||
    input.availableDirectAttackUses !== 1
  ) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '临时防御状态无效')
  }
  return deepFreeze({
    activatedAtCtb: input.activatedAtCtb,
    expiresAtPlayerActionCtb: input.expiresAtPlayerActionCtb,
    availableDirectAttackUses: 1,
  })
}
