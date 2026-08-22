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
  input: unknown,
): CombatPlayerActionCommand {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '玩家战斗命令结构无效')
  }
  const candidate = input as Record<string, unknown>
  if (candidate.kind === 'use-quick-slot-item') {
    const withTarget = Object.prototype.hasOwnProperty.call(
      candidate,
      'targetOpenWoundId',
    )
    if (
      !hasExactObjectKeys(
        candidate,
        withTarget
          ? ['kind', 'quickSlotIndex', 'targetOpenWoundId']
          : ['kind', 'quickSlotIndex'],
      ) ||
      !Number.isSafeInteger(candidate.quickSlotIndex) ||
      (candidate.quickSlotIndex as number) < 0 ||
      (withTarget && (
        typeof candidate.targetOpenWoundId !== 'string' ||
        candidate.targetOpenWoundId.trim().length === 0
      ))
    ) {
      throw new CombatError('INVALID_COMBAT_COMMAND', '快捷物品战斗命令结构无效')
    }
    return deepFreeze(withTarget
      ? {
          kind: 'use-quick-slot-item',
          quickSlotIndex: candidate.quickSlotIndex as number,
          targetOpenWoundId: candidate.targetOpenWoundId as string,
        }
      : {
          kind: 'use-quick-slot-item',
          quickSlotIndex: candidate.quickSlotIndex as number,
        })
  }
  if (!hasExactObjectKeys(candidate, ['kind'])) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '玩家战斗命令结构无效')
  }
  if (
    candidate.kind !== 'metal-pipe-basic-attack' &&
    candidate.kind !== 'metal-pipe-charged-strike' &&
    candidate.kind !== 'defend' &&
    candidate.kind !== 'temporary-attack' &&
    candidate.kind !== 'escape'
  ) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '未知玩家战斗命令')
  }
  return deepFreeze({ kind: candidate.kind })
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
